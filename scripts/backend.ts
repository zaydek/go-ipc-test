import * as esbuild from "esbuild"
import * as fsPromises from "fs/promises"
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
		Client: esbuild.Metafile | null
	}
	Warnings: esbuild.Message[]
	Errors: esbuild.Message[]
}

////////////////////////////////////////////////////////////////////////////////

// Lazily wraps `throw new Error(...)` because throws aren't legal expressions.
function InternalError<Type>(returnType: Type): Type {
	throw new Error("Internal Error")
	return returnType
}

// TODO: Should we be qualifying the values of the environmental variables here?
const NODE_ENV = process.env["NODE_ENV"] ?? InternalError("")
const RETRO_CMD = process.env["RETRO_CMD"] ?? InternalError("")
const RETRO_WWW_DIR = process.env["RETRO_WWW_DIR"] ?? InternalError("")
const RETRO_SRC_DIR = process.env["RETRO_SRC_DIR"] ?? InternalError("")
const RETRO_OUT_DIR = process.env["RETRO_OUT_DIR"] ?? InternalError("")

// Describes the bundled vendor (React) esbuild result
let vendorResult: esbuild.BuildResult | null = null

// Describes the bundled client (Retro) esbuild result
let clientResult: esbuild.BuildResult | esbuild.BuildIncremental | null = null

const internalOptions: esbuild.BuildOptions = {
	// Always bundle
	bundle: true,

	// Propagate environmental variables
	define: {
		// React and React DOM
		"process.env.NODE_ENV": JSON.stringify(NODE_ENV),

		// Retro
		"process.env.RETRO_CMD": JSON.stringify(RETRO_CMD),
		"process.env.RETRO_WWW_DIR": JSON.stringify(RETRO_WWW_DIR),
		"process.env.RETRO_SRC_DIR": JSON.stringify(RETRO_SRC_DIR),
		"process.env.RETRO_OUT_DIR": JSON.stringify(RETRO_OUT_DIR),
	},

	// Hash filenames for production
	entryNames: NODE_ENV !== "production"
		? undefined
		: "[dir]/[name]__[hash]",

	// Load JavaScript as JavaScript React
	loader: {
		".js": "jsx",
	},

	// Don't log because warnings and errors are handled programmatically
	logLevel: "silent",

	// Includes the generated hashed filenames
	metafile: true,

	// Minify for production
	minify: NODE_ENV === "production",

	// Target directory
	outdir: RETRO_OUT_DIR,

	// Add `*.map` files
	sourcemap: true,
}

// Resolves `retro.config.js` on the filesystem.
async function resolveUserConfiguration(): Promise<esbuild.BuildOptions> {
	try {
		await fsPromises.stat("retro.config.js")
	} catch {
		return {}
	}
	return require(path.join(process.cwd(), "retro.config.js"))
}

////////////////////////////////////////////////////////////////////////////////

async function build(): Promise<BackendResponse> {
	// Create an empty backend response
	const buildResult: BackendResponse = {
		Metafile: {
			Vendor: null,
			Client: null,
		},
		Warnings: [],
		Errors: [],
	}

	// Resolve `.retro.config.js`
	const userConfiguration = await resolveUserConfiguration()

	try {
		// Build the vendor bundle (e.g. React)
		//
		// NOTE: Vendor bundles don't support configuration
		vendorResult = await esbuild.build({
			...internalOptions,

			// Entry point for the bundle
			entryPoints: {
				"vendor": path.join(__dirname, "vendor.js"),
			},
		})
		buildResult.Metafile.Vendor = vendorResult.metafile!

		// Build the client bundle (e.g. Retro)
		clientResult = await esbuild.build({
			...internalOptions,   // Takes precedence
			...userConfiguration, // Can override internal options

			// Global variables
			define: {
				...internalOptions.define,   // Takes precedence
				...userConfiguration.define, // Can override internal options
			},

			// Entry point for the bundle
			entryPoints: {
				"client": path.join(RETRO_SRC_DIR, "index.js"),
			},

			// Dedupe React APIs from `bundle.js`; React APIs are bundled in
			// `vendor.js`. See `inject` for more context.
			external: [
				"react",
				"react-dom",
				"react-dom/server",
			],

			// Enable incremental compilation for development
			incremental: NODE_ENV === "development",

			// Expose React APIs as global variables (defined on `window`). See
			// `external` for more context.
			inject: [path.join(__dirname, "require.js")],

			loader: {
				...internalOptions.loader,   // Takes precedence
				...userConfiguration.loader, // Can override common options
			},
		})
		buildResult.Metafile.Client = clientResult.metafile!

		if (clientResult.warnings.length > 0) {
			buildResult.Warnings = clientResult.warnings
		}
	} catch (caught) {
		// NOTE: esbuild warnings and errors are silent (via `logLevel: "silent"`)
		// because warnings and errors are managed by Retro. Retro decorates esbuild
		// errors and propagates them to the terminal and browser.
		if (caught.warnings.length > 0) {
			buildResult.Warnings = caught.warnings
		}
		if (caught.errors.length > 0) {
			buildResult.Errors = caught.errors
		}
	}

	return buildResult
}

////////////////////////////////////////////////////////////////////////////////

// Rebuilds the build result by reusing `build` literally. Note that only the
// client result is rebuilt, not the vendor result.
async function rebuild(): Promise<BackendResponse> {
	if (clientResult?.rebuild === undefined) {
		return await build()
	}

	const rebuildResult: BackendResponse = {
		Metafile: {
			Vendor: null,
			Client: null,
		},
		Warnings: [],
		Errors: [],
	}

	try {
		const result2 = await clientResult.rebuild()
		if (result2.warnings.length > 0) {
			rebuildResult.Warnings = result2.warnings
		}
	} catch (caught) {
		// NOTE: esbuild warnings and errors are silent (via `logLevel: "silent"`)
		// because warnings and errors are managed by Retro. Retro decorates esbuild
		// errors and propagates them to the terminal and browser.
		if (caught.warnings.length > 0) {
			rebuildResult.Warnings = caught.warnings
		}
		if (caught.errors.length > 0) {
			rebuildResult.Errors = caught.errors
		}
	}

	return rebuildResult
}

////////////////////////////////////////////////////////////////////////////////

async function main(): Promise<void> {
	// Warm up esbuild
	esbuild.initialize({})

	while (true) {
		const action = await readline()
		try {
			switch (action) {
				case "build":
					const buildResult = await build()
					console.log(
						JSON.stringify({
							Kind: "build-done",
							Data: buildResult,
						} as Message),
					)
					break
				case "rebuild":
					const rebuildResult = await rebuild()
					console.log(
						JSON.stringify({
							Kind: "rebuild-done",
							Data: rebuildResult,
						} as Message),
					)
					break
				case "done":
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
