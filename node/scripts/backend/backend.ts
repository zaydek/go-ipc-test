import * as esbuild from "esbuild"
import * as path from "path"
import * as t from "./types"
import React from "react"
import ReactDOMServer from "react-dom/server"
import readline from "./readline"

import {
	buildClientConfiguration,
	commonConfiguration,
	resolveUserConfiguration,
} from "./configuration"

import {
	NODE_ENV,
	RETRO_OUT_DIR,
	RETRO_SRC_DIR,
} from "./env"

// Describes `retro.config.js`
let globalUserConfiguration: esbuild.BuildOptions | null = null

// Describes the bundled vendor (React) esbuild result
let globalVendorResult: esbuild.BuildResult | null = null

// Describes the bundled client (Retro) esbuild result
let globalClientResult: esbuild.BuildResult | esbuild.BuildIncremental | null = null

////////////////////////////////////////////////////////////////////////////////

// Builds the vendor bundle (e.g. React) and sets the global vendor variable
async function buildVendorBundle(): Promise<t.BundleResult> {
	const vendor: t.BundleResult = {
		Metafile: null,
		Warnings: [],
		Errors: [],
	}

	try {
		globalVendorResult = await esbuild.build({
			...commonConfiguration,
			entryNames: NODE_ENV !== "production"
				? undefined
				: "[dir]/[name]__[hash]",
			entryPoints: {
				"vendor": path.join(__dirname, "vendor.js"),
			},
			outdir: RETRO_OUT_DIR,
		})
		if (globalVendorResult.warnings.length > 0) { vendor.Warnings = globalVendorResult.warnings }
		if (globalVendorResult.errors.length > 0) { vendor.Errors = globalVendorResult.errors }
		vendor.Metafile = globalVendorResult.metafile
	} catch (caught) {
		if (caught.warnings.length > 0) { vendor.Warnings = caught.warnings }
		if (caught.errors.length > 0) { vendor.Errors = caught.errors }
	}

	return vendor
}

////////////////////////////////////////////////////////////////////////////////

// Builds the client bundle (e.g. Retro) and sets the global client variable
async function buildClientBundle(): Promise<t.BundleResult> {
	const client: t.BundleResult = {
		Metafile: null,
		Warnings: [],
		Errors: [],
	}

	try {
		globalClientResult = await esbuild.build({
			...buildClientConfiguration(globalUserConfiguration),
			entryNames: NODE_ENV !== "production"
				? undefined
				: "[dir]/[name]__[hash]",
			entryPoints: {
				"client": path.join(RETRO_SRC_DIR, "index.js"),
			},
			outdir: RETRO_OUT_DIR,
		})
		if (globalClientResult.warnings.length > 0) { client.Warnings = globalClientResult.warnings }
		if (globalClientResult.errors.length > 0) { client.Errors = globalClientResult.errors }
		client.Metafile = globalVendorResult.metafile
	} catch (caught) {
		if (caught.warnings.length > 0) { client.Warnings = caught.warnings }
		if (caught.errors.length > 0) { client.Errors = caught.errors }
	}

	return client
}

// Builds the vendor and client bundles
async function buildAll(): Promise<[t.BundleResult, t.BundleResult]> {
	const vendor = await buildVendorBundle()
	const client = await buildClientBundle()
	return [vendor, client]
}

////////////////////////////////////////////////////////////////////////////////

// Builds or rebuild the client bundle
async function rebuildClientBundle(): Promise<t.BundleResult> {
	if (globalClientResult === null) {
		return await buildClientBundle()
	}

	const client: t.BundleResult = {
		Metafile: null,
		Warnings: [],
		Errors: [],
	}

	try {
		const clientResult = await globalClientResult.rebuild()
		if (clientResult.warnings.length > 0) { client.Warnings = clientResult.warnings }
		if (clientResult.errors.length > 0) { client.Errors = clientResult.errors }
		client.Metafile = clientResult.metafile
	} catch (caught) {
		if (caught.warnings.length > 0) { client.Warnings = caught.warnings }
		if (caught.errors.length > 0) { client.Errors = caught.errors }
	}

	if (client.Warnings.length > 0) {
		console.error(client.Warnings)
		process.exit(1)
	}
	if (client.Errors.length > 0) {
		console.error(client.Errors)
		process.exit(1)
	}

	return client
}

////////////////////////////////////////////////////////////////////////////////

async function staticBuildAll(): Promise<[t.BundleResult, t.BundleResult, t.StaticRoute[]]> {
	const vendor = await buildVendorBundle()
	const client = await buildClientBundle()

	// Bundle `App.js` not `index.js` for `ReactDOMServer.renderToString`. `<App>`
	// should be a pure component where as `index.js` has the side effect of
	// mounting or hydrating to the DOM.
	try {
		const localClientResult = await esbuild.build({
			...buildClientConfiguration(globalUserConfiguration),
			entryPoints: [path.join(RETRO_SRC_DIR, "App.js")],
			outdir: path.join(RETRO_OUT_DIR, ".retro_temp"),

			// The default, browser, uses IIFE which breaks `require`
			platform: "node",

			// Disable minification to make debugging easier
			minify: false,
		})
		if (localClientResult.warnings.length > 0) { client.Warnings = localClientResult.warnings }
		if (localClientResult.errors.length > 0) { client.Errors = localClientResult.errors }
		client.Metafile = localClientResult.metafile
	} catch (caught) {
		if (caught.warnings.length > 0) { client.Warnings = caught.warnings }
		if (caught.errors.length > 0) { client.Errors = caught.errors }
	}

	// Load the bundled app component
	const BundledAppComponent: Function = require(
		path.join(process.cwd(), RETRO_OUT_DIR, ".retro_temp", "App.js"),
	).default

	// Load declarative routes
	const declarativeRoutes: t.DeclarativeRoute[] = require(
		path.join(process.cwd(), "routes.js"),
	)

	const staticRoutes: t.StaticRoute[] = []
	for (const route of declarativeRoutes) {
		const staticRoute: t.StaticRoute = {
			Filename: route.path.endsWith("/")
				? route.path + "index.html"
				: route.path + ".html",
			Head: route.head
				.trim()
				.split("\n") // FIXME: Assumes no wrapping lines
				.map(line => line.trim())
				.join(""),
			Body: ReactDOMServer.renderToString(
				React.createElement(
					BundledAppComponent,
					route.props,
				),
			),
		}

		staticRoutes.push(staticRoute)

		console.log({
			Kind: "STATIC_ROUTE__DONE",
			Data: {
				StaticRoute: staticRoute,
			},
		} as t.StaticRouteDoneMessage)
	}

	return [vendor, client, staticRoutes]
}

////////////////////////////////////////////////////////////////////////////////

// This becomes a Node.js IPC process, from Go to JavaScript. Messages are sent
// as plaintext strings (actions) and received as JSON-encoded payloads.
//
// stdout messages that aren't encoded should be logged regardless because
// plugins can implement logging. stderr messages are exceptions and should
// terminate the Node.js runtime.
async function main(): Promise<void> {
	esbuild.initialize({})
	globalUserConfiguration = await resolveUserConfiguration()

	while (true) {
		const action = await readline()
		try {
			switch (action) {
				case "BUILD_ALL": {
					const [vendor, client] = await buildAll()
					console.log(
						JSON.stringify({
							Kind: "BUILD_ALL__DONE",
							Data: {
								Vendor: vendor,
								Client: client,
							},
						} as t.BuildAllDoneMessage),
					)
					break
				}
				case "STATIC_BUILD_ALL": {
					const [vendor, client, routes] = await staticBuildAll()
					console.log(
						JSON.stringify({
							Kind: "STATIC_BUILD_ALL__DONE",
							Data: {
								Vendor: vendor,
								Client: client,
								StaticRoutes: routes,
							},
						} as t.StaticBuildAllDoneMessage),
					)
					break
				}
				case "REBUILD_CLIENT": {
					const client = await rebuildClientBundle()
					console.log(
						JSON.stringify({
							Kind: "REBUILD_CLIENT__DONE",
							Data: {
								Client: client,
							},
						} as t.RebuildClientDoneMessage),
					)
					break
				}
				case "TERMINATE":
					process.exit(1)
				case "DONE":
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
