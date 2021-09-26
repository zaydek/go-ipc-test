const esbuild = require("esbuild")
const fs = require("fs")
const path = require("path")

////////////////////////////////////////////////////////////////////////////////

// interface Message {
// 	Kind: string
// 	Data: any
// }
//
// interface BackendResponse {
// 	Metafile: {
// 		Vendor: esbuild.Metafile | null
// 		Bundle: esbuild.Metafile | null
// 	}
// 	Errors: esbuild.Message[]
// 	Warnings: esbuild.Message[]
// }

////////////////////////////////////////////////////////////////////////////////

// const stdout = (msg: Message) => console.log(JSON.stringify(msg))
// const stderr = console.error

const readline = (() => {
	async function* createReadlineGenerator() {
		const _readline = require("readline").createInterface({ input: process.stdin })
		for await (const stdin of _readline) {
			yield stdin
		}
	}
	const readlineGenerator = createReadlineGenerator()
	return async () => {
		return (await readlineGenerator.next()).value
	}
})()

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

const common = {
	color: true,

	// Propagate env vars
	define: {
		// React and React DOM
		"process.env.NODE_ENV": JSON.stringify(ENV),

		// Retro
		"process.env.CMD": JSON.stringify(CMD),
		"process.env.ENV": JSON.stringify(ENV),
		"process.env.WWW_DIR": JSON.stringify(WWW_DIR),
		"process.env.SRC_DIR": JSON.stringify(SRC_DIR),
		"process.env.OUT_DIR": JSON.stringify(OUT_DIR),
	},

	// Add support for JavaScript as JavaScript React
	loader: { ".js": "jsx" },
	logLevel: "silent",
	minify: ENV === "production",
	// TODO
	sourcemap: true,
}

// Resolves `retro.config.js` on the filesystem. Returns an empty object if no
// such configuration exists.
async function resolveRetroConfiguration() {
	try {
		await fs.promises.stat("retro.config.js")
	} catch {
		return {}
	}
	// TODO: Do we need to create an absolute path? Can we not use a relative path
	// instead?
	retroConfigurationFilename = path.join(process.cwd(), "retro.config.js")
	return require(retroConfigurationFilename)
}

// Describes the bundled React result
let vendorResult: esbuild.BuildResult | null = null

// Describes the bundled Retro result
let bundleResult: esbuild.BuildResult | esbuild.BuildIncremental | null = null

async function build(): Promise<BackendResponse> {
	const buildRes: BackendResponse = {
		Metafile: {
			Vendor: null,
			Bundle: null,
		},
		Warnings: [],
		Errors: [],
	}

	const config = await resolveRetroConfiguration()

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

async function main() {
	esbuild.initialize({})

	while (true) {
		const jsonstr = await readline()
		const msg = JSON.parse(jsonstr)
		try {
			switch (msg.Kind) {
				case "build":
					const buildRes = await build()
					stdout({ Kind: "build-done", Data: buildRes })
					break
				case "rebuild":
					const rebuildRes = await rebuild()
					stdout({ Kind: "rebuild-done", Data: rebuildRes })
					break
				default:
					throw new Error("Internal error")
			}
		} catch (error) {
			stderr(error.stack)
			process.exit(1)
		}
	}
}

main()
