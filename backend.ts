import * as esbuild from "esbuild"
import * as fs from "fs"
import * as path from "path"

////////////////////////////////////////////////////////////////////////////////

const readline = ((): (() => Promise<string>) => {
	async function* createReadlineGenerator(): AsyncGenerator<string> {
		const readlineImpl = require("readline").createInterface({ input: process.stdin })
		for await (const line of readlineImpl) {
			yield line
		}
	}
	const generate = createReadlineGenerator()
	return async () => {
		return (await generate.next()).value
	}
})()

////////////////////////////////////////////////////////////////////////////////

interface Message {
	Kind: string
	Data: any // TODO: Should this be an object or unknown?
}

interface BackendResponse {
	Metafile: {
		Vendor: esbuild.Metafile | null
		Bundle: esbuild.Metafile | null
	}
	Errors: esbuild.Message[]
	Warnings: esbuild.Message[]
}

////////////////////////////////////////////////////////////////////////////////

// Lazily wraps `throw new Error(...)` because throws aren't legal expressions.
function InternalError() {
	throw new Error("Internal Error")
}

const CMD = process.env["CMD"] ?? InternalError()
const ENV = process.env["ENV"] ?? InternalError()
const WWW_DIR = process.env["WWW_DIR"] ?? InternalError()
const SRC_DIR = process.env["SRC_DIR"] ?? InternalError()
const OUT_DIR = process.env["OUT_DIR"] ?? InternalError()

// Describes the bundled React esbuild result
let vendorResult: esbuild.BuildResult | null = null

// Describes the bundled Retro esbuild result
let bundleResult: esbuild.BuildResult | esbuild.BuildIncremental | null = null

const common: esbuild.BuildOptions = {
	color: true,

	// Propagate env vars
	define: {
		// For React and React DOM
		"process.env.NODE_ENV": JSON.stringify(ENV),

		// For Retro
		"process.env.CMD": JSON.stringify(CMD),
		"process.env.ENV": JSON.stringify(ENV),
		"process.env.WWW_DIR": JSON.stringify(WWW_DIR),
		"process.env.SRC_DIR": JSON.stringify(SRC_DIR),
		"process.env.OUT_DIR": JSON.stringify(OUT_DIR),
	},

	// Load JavaScript as JavaScript React
	loader: { ".js": "jsx" },
	logLevel: "silent",
	minify: ENV === "production",
	// TODO
	sourcemap: true,
}

// Resolves `retro.config.js` on the filesystem. Returns an empty object if no
// such configuration exists.
async function resolveRetroConfig(): Promise<esbuild.BuildOptions> {
	try {
		await fs.promises.stat("retro.config.js")
	} catch {
		return {}
	}
	// TODO: Do we need to create an absolute path? Can we not use a relative path
	// instead?
	const retroConfigFilename = path.join(process.cwd(), "retro.config.js")
	return require(retroConfigFilename)
}

////////////////////////////////////////////////////////////////////////////////

async function build(): Promise<BackendResponse> {
	const buildRes: BackendResponse = {
		Metafile: {
			Vendor: null,
			Bundle: null,
		},
		Warnings: [],
		Errors: [],
	}

	const config = await resolveRetroConfig()

	try {
		vendorResult = await esbuild.build({
			...common,

			// Add support for target
			target: config.target,

			bundle: true,
			entryNames: ENV !== "production" ? undefined : "[dir]/[name]__[hash]",
			entryPoints: {
				"vendor": path.join(__dirname, "react.js"),
			},
			metafile: true,
			outdir: OUT_DIR,
		})
		buildRes.Metafile.Vendor = vendorResult.metafile!

		bundleResult = await esbuild.build({
			...config,
			...common,

			define: { ...config.define, ...common.define },
			loader: { ...config.loader, ...common.loader },

			bundle: true,
			entryNames: ENV !== "production" ? undefined : "[dir]/[name]__[hash]",
			entryPoints: {
				"bundle": path.join(SRC_DIR, "index.js"),
			},
			metafile: true,
			outdir: OUT_DIR,

			external: ["react", "react-dom", "react-dom/server"], // Dedupe React APIs
			inject: [path.join(__dirname, "shims/require.js")], // Add React APIs
			plugins: config?.plugins,

			incremental: ENV === "development",
		})
		buildRes.Metafile.Bundle = bundleResult.metafile!

		if (bundleResult.warnings.length > 0) {
			buildRes.Warnings = bundleResult.warnings
		}
	} catch (caught) {
		if (caught.errors.length > 0) {
			buildRes.Errors = caught.errors
		}
		if (caught.warnings.length > 0) {
			buildRes.Warnings = caught.warnings
		}
	}

	return buildRes
}

////////////////////////////////////////////////////////////////////////////////

async function rebuild(): Promise<BackendResponse> {
	if (bundleResult?.rebuild === undefined) {
		return await build()
	}

	const rebuildRes: BackendResponse = {
		Metafile: {
			Vendor: null,
			Bundle: null,
		},
		Warnings: [],
		Errors: [],
	}

	try {
		const result2 = await bundleResult.rebuild()
		if (result2.warnings.length > 0) {
			rebuildRes.Warnings = result2.warnings
		}
	} catch (caught) {
		if (caught.errors.length > 0) {
			rebuildRes.Errors = caught.errors
		}
		if (caught.warnings.length > 0) {
			rebuildRes.Warnings = caught.warnings
		}
	}

	return rebuildRes
}

////////////////////////////////////////////////////////////////////////////////

async function main(): Promise<void> {
	// Warm up esbuild
	esbuild.initialize({})

	while (true) {
		const line = await readline()
		const message: Message = JSON.parse(line)
		try {
			switch (message.Kind) {
				// Incoming `build` events
				case "build":
					const buildResult = await build()
					// Outgoing `build-done` events
					console.log(
						JSON.stringify({
							Kind: "build-done",
							Data: buildResult,
						}),
					)
					break
				// Incoming `rebuild` events
				case "rebuild":
					const rebuildResult = await rebuild()
					// Outgoing `rebuild-done` events
					console.log(
						JSON.stringify({
							Kind: "rebuild-done",
							Data: rebuildResult,
						}),
					)
					break
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
