import * as esbuild from "esbuild"
// import * as fsPromises from "fs/promises"
import * as path from "path"
import * as t from "./types"
// import React from "react"
// import ReactDOMServer from "react-dom/server"
import readline from "./readline"

import {
	buildClientConfiguration,
	commonConfiguration,
	resolveUserConfiguration,
} from "./configuration"

import {
	NODE_ENV,
	// RETRO_CMD,
	RETRO_OUT_DIR,
	RETRO_SRC_DIR,
	// RETRO_WWW_DIR,
} from "./env"

// Describes the bundled vendor (React) esbuild result
let globalVendorResult: esbuild.BuildResult | null = null

// Describes the bundled client (Retro) esbuild result
let globalClientResult: esbuild.BuildResult | esbuild.BuildIncremental | null = null

// Builds the vendor bundle (e.g. React) and sets the global vendor variable
// (for incremental recompilation).
async function buildVendorBundle(): Promise<t.BundleResult> {
	const vendor: t.BundleResult = {
		Metafile: null,
		Warnings: [],
		Errors: [],
	}

	// Hash filenames for production
	const entryNames = NODE_ENV !== "production"
		? undefined
		: "[dir]/[name]__[hash]"

	try {
		globalVendorResult = await esbuild.build({
			...commonConfiguration,
			entryPoints: {
				"vendor": path.join(__dirname, "vendor.js"),
			},
			entryNames,
			outdir: RETRO_OUT_DIR,
		})
		// Structure warnings and errors
		if (globalVendorResult.warnings.length > 0) { vendor.Warnings = globalVendorResult.warnings }
		if (globalVendorResult.errors.length > 0) { vendor.Errors = globalVendorResult.errors }
		vendor.Metafile = globalVendorResult.metafile
	} catch (caught) {
		// Structure caught warnings and errors
		if (caught.warnings.length > 0) { vendor.Warnings = caught.warnings }
		if (caught.errors.length > 0) { vendor.Errors = caught.errors }
	}

	return vendor
}

// Builds the client bundle (e.g. Retro) and sets the global client variable
// (for incremental recompilation).
async function buildClientBundle(): Promise<t.BundleResult> {
	const client: t.BundleResult = {
		Metafile: null,
		Warnings: [],
		Errors: [],
	}

	const userConfiguration = await resolveUserConfiguration()

	// Hash filenames for production
	const entryNames = NODE_ENV !== "production"
		? undefined
		: "[dir]/[name]__[hash]"

	try {
		globalClientResult = await esbuild.build({
			...buildClientConfiguration(userConfiguration),
			entryPoints: {
				"client": path.join(RETRO_SRC_DIR, "index.js"),
			},
			entryNames,
			outdir: RETRO_OUT_DIR,
		})
		// Structure warnings and errors
		if (globalClientResult.warnings.length > 0) { client.Warnings = globalClientResult.warnings }
		if (globalClientResult.errors.length > 0) { client.Errors = globalClientResult.errors }
		client.Metafile = globalVendorResult.metafile
	} catch (caught) {
		// Structure caught warnings and errors
		if (caught.warnings.length > 0) { client.Warnings = caught.warnings }
		if (caught.errors.length > 0) { client.Errors = caught.errors }
	}

	return client
}

// Builds the vendor and client bundles.
async function buildAll(): Promise<[t.BundleResult, t.BundleResult]> {
	const vendor = await buildVendorBundle()
	const client = await buildClientBundle()
	return [vendor, client]
}

// Builds or rebuild teh client bundle.
async function rebuildClientBundle(): Promise<t.BundleResult> {
	if (
		globalClientResult === null || // Zero value
		globalClientResult.rebuild === undefined) {
		return await buildClientBundle()
	}

	const client: t.BundleResult = {
		Metafile: null,
		Warnings: [],
		Errors: [],
	}

	try {
		const clientResult = await globalClientResult.rebuild()
		// Structure warnings and errors
		if (clientResult.warnings.length > 0) { client.Warnings = clientResult.warnings }
		if (clientResult.errors.length > 0) { client.Errors = clientResult.errors }
		client.Metafile = clientResult.metafile
	} catch (caught) {
		// Structure caught warnings and errors
		if (caught.warnings.length > 0) { client.Warnings = caught.warnings }
		if (caught.errors.length > 0) { client.Errors = caught.errors }
	}

	return client
}

// This becomes a Node.js IPC process, from Go to JavaScript. Messages are sent
// as plaintext strings (actions) and received as JSON-encoded payloads.
//
// stdout messages that aren't encoded should be logged regardless because
// plugins can implement logging. stderr messages are exceptions and should
// terminate the Node.js runtime.
async function main(): Promise<void> {
	// Warm up esbuild
	esbuild.initialize({})

	while (true) {
		const action = await readline()
		try {
			switch (action) {
				case "BUILD":
					const buildResult = await buildAll()
					console.log(
						JSON.stringify({
							Kind: "BUILD_DONE",
							Data: buildResult,
						} as t.Message),
					)
					break
				case "BUILD_STATIC":
					const buildStaticResult = await buildAllStatic()
					console.log(
						JSON.stringify({
							Kind: "BUILD_STATIC_DONE",
							Data: buildStaticResult,
						} as t.Message),
					)
					break
				case "REBUILD_CLIENT":
					const clientRebuildResult = await rebuildClientBundle()
					console.log(
						JSON.stringify({
							Kind: "REBUILD_CLIENT_DONE",
							Data: clientRebuildResult,
						} as t.Message),
					)
					break
				case "END_EARLY":
					process.exit(1)
				case "END":
					process.exit(0)
				default:
					throw new Error("Internal error")
			}
		} catch (error) {
			console.error(error.stack)
			process.exit(1)
		}
	}
}

main()
