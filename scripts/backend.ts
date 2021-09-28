import * as esbuild from "esbuild"
import * as fsPromises from "fs/promises"
import * as path from "path"
import React from "react"
import ReactDOMServer from "react-dom/server"

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

interface BuildResponse {
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

////////////////////////////////////////////////////////////////////////////////

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

	// // Hash filenames for production
	// entryNames: NODE_ENV !== "production"
	// 	? undefined
	// 	: "[dir]/[name]__[hash]",

	// Load JavaScript as JavaScript React
	loader: {
		".js": "jsx",
	},

	// Don't log because warnings and errors are handled programmatically
	logLevel: "silent",

	// Includes the generated hashed filenames
	// TODO: We don't really need this all the time do we? This is only actually
	// useful with entry names.
	metafile: true,

	// Minify for production
	minify: NODE_ENV === "production",

	// // Target directory
	// // TODO: This should not be here
	// outdir: RETRO_OUT_DIR,

	// Add `*.map` files
	sourcemap: true,
}

const buildConfiguration = userConfiguration => ({
	...internalOptions,
	...userConfiguration,

	// Global variables
	define: {
		...internalOptions.define,
		...userConfiguration.define,
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
		...internalOptions.loader,
		...userConfiguration.loader,
	},
})

// const buildStaticConfiguration = userConfiguration => ({
// 	...buildConfiguration(userConfiguration),
// })

////////////////////////////////////////////////////////////////////////////////

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

async function build(): Promise<BuildResponse> {
	const buildResult: BuildResponse = {
		Metafile: {
			Vendor: null,
			Client: null,
		},
		Warnings: [],
		Errors: [],
	}

	const userConfiguration = await resolveUserConfiguration()

	try {
		// Build the vendor bundle (e.g. React)
		//
		// NOTE: Vendor bundles don't support configuration
		vendorResult = await esbuild.build({
			...internalOptions,
			entryPoints: {
				"vendor": path.join(__dirname, "vendor.js"),
			},
			// Hash filenames for production
			entryNames: NODE_ENV !== "production"
				? undefined
				: "[dir]/[name]__[hash]",
			outdir: RETRO_OUT_DIR,
		})
		buildResult.Metafile.Vendor = vendorResult.metafile!

		// Build the client bundle (e.g. Retro)
		clientResult = await esbuild.build({
			...buildConfiguration(userConfiguration),
			entryPoints: {
				"client": path.join(RETRO_SRC_DIR, "index.js"),
			},
			outdir: RETRO_OUT_DIR,
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

async function buildStatic() /* : Promise<BackendResponse> */ {
	// const buildStaticResponse: BuildResponse = {
	// 	// Metafile: {
	// 	// 	Vendor: null,
	// 	// 	Client: null,
	// 	// },
	// 	// Warnings: [],
	// 	// Errors: [],
	// }

	const buildStaticResponse = {}

	const userConfiguration = await resolveUserConfiguration()

	// Bundle `App.js` not `index.js` for `ReactDOMServer.renderToString`. `<App>`
	// should be a pure component where as `index.js` has the side effect of
	// mounting or hydrating to the DOM.
	await esbuild.build({
		...buildConfiguration(userConfiguration),
		entryPoints: {
			"App": path.join(RETRO_SRC_DIR, "App.js"),
		},
		outdir: path.join(RETRO_OUT_DIR + "_static", "__temp__"),
		// Add `---platform=node` for `build_static` because this code never runs on
		// the browser
		platform: "node",

		// DEBUG
		minify: false,
		sourcemap: false,
	})

	// Load the bundled app
	const BundledAppDefault = require(path.join(process.cwd(), RETRO_OUT_DIR + "_static", "__temp__", "App.js")).default

	// Load routes
	const routes = require(path.join(process.cwd(), "routes.js"))

	const timerPerRenderedRoutes = Date.now()
	const renderedRoutes = []
	for (const route of routes) {
		const timerPerRenderedRoute = Date.now()

		// // Set `window.location.pathname` safely
		// if (typeof window === "undefined") {
		// 	window = {
		// 		// @ts-ignore: Ignore `window.location` typing
		// 		location: {
		// 			pathname: route.path
		// 		},
		// 	}
		// } else {
		// 	if (typeof window.location === "undefined") {
		// 		// @ts-ignore: Ignore `window.location` typing
		// 		window.location = {
		// 			pathname: route.path,
		// 		}
		// 	} else {
		// 		window.location.pathname = route.path
		// 	}
		// }

		// NOTE: Assumes `route.head` has no wrapping lines
		const head = route.head
			.trim()
			.split("\n")
			.map(line => "\t\t" + line.trim())
			.join("\n")

		// Derive the filename from the path
		const filename = route.path.endsWith("/")
			? route.path + "index.html"
			: route.path + ".html"

		// 		const html = `<!DOCTYPE html>
		// <html lang="en">
		// 	<head>
		// 		${headBefore}
		// 		${head}
		// 		${headAfter}
		// 	</head>
		// 	<body>
		// 		${bodyBefore}
		// 		<div id="root">${ReactDOMServer.renderToString(React.createElement(BundledAppDefault, route.props))}</div>
		// 		${bodyAfter}
		// 	</body>
		// </html>
		// ` // Add EOF

		const html = `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
${head}
	</head>
	<body>
		<div id="root">${ReactDOMServer.renderToString(React.createElement(BundledAppDefault, route.props))}</div>
		<script src="/vendor.js"></script>
		<script src="/bundle.js"></script>
	</body>
</html>
` // Add EOF

		// TODO: We could also add a timer for ever rendered route as well as a
		// timer for all rendered routes
		renderedRoutes.push({
			route: {
				filename,
				html,
			},
			measuredMs: Date.now() - timerPerRenderedRoute,
		})

		// console.log({
		// 	Kind: "static-route-done",
		// 	Data: {
		//    // TODO: Should the properties of the destructured object be title
		//    // case for Go?
		// 		...renderedRoutes[renderedRoutes.length - 1],
		// 	},
		// })
	}

	// console.log({
	// 	Kind: "static-routes-done",
	// 	Data: {
	// 		routes: renderedRoutes,
	// 		measuredMs: Date.now() - timerPerRenderedRoutes,
	// 	}
	// })

	return {
		routes: renderedRoutes,
		measuredMs: Date.now() - timerPerRenderedRoutes,
	}

	// In theory from here we need to recompile that app from `index.js` as the
	// entry point and generate the vendor bundle as well. It might make sense if
	// we make the vendor bundle step its own function.

	// buildReact()
	// buildApp()
	// buildAppStatic()
}

////////////////////////////////////////////////////////////////////////////////

// Rebuilds the build result by reusing `build` literally. Note that only the
// client result is rebuilt, not the vendor result.
async function rebuild(): Promise<BuildResponse> {
	if (clientResult?.rebuild === undefined) {
		return await build()
	}

	const rebuildResult: BuildResponse = {
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
				case "BUILD":
					const buildResult = await build()
					console.log(
						JSON.stringify({
							Kind: "BUILD_DONE",
							Data: buildResult,
						} as Message),
					)
					break
				case "BUILD_STATIC":
					const buildStaticResult = await buildStatic()
					console.log(
						JSON.stringify({
							Kind: "BUILD_STATIC_DONE",
							Data: buildStaticResult,
						} as Message),
					)
					break
				case "REBUILD":
					const rebuildResult = await rebuild()
					console.log(
						JSON.stringify({
							Kind: "REBUILD_DONE",
							Data: rebuildResult,
						} as Message),
					)
					break
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
