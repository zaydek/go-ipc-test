const React = require("react")
const ReactDOMServer = require("react-dom/server")

const esbuild = require("esbuild")

// node dependencies
const fsPromises = require("fs/promises")

// Resolves `retro.config.js` on the filesystem.
async function resolveUserConfiguration() {
	try {
		await fsPromises.stat("retro.config.js")
	} catch {
		return {}
	}
	const retroConfigFilename = path.join(process.cwd(), "retro.config.js")
	return require(retroConfigFilename)
}

const RETRO_OUT_DIR_STATIC = process.env["RETRO_OUT_DIR"] + "_static"

// No such file or default export for `src/App.js`. `src/App.js` should be a pure
// component whereas `src/index.js` has the side effect of mounting or hydrating
// the DOM.

// No such file or default export for `routes.js`. `routes.js` should be an
// array describing all paths, head metadata, and props for the render
// component.
//
// For example:
//
//   module.exports = [
//     {
//       path: "/",
//       head: `
//         <title>Hello, world!</title>
//         <meta name="title" content=${JSON.stringify("Hello, world!")}>
//         <meta name="description" content=${JSON.stringify("Hello, world!")}>
//       `,
//       props: {
//         greeting: "Hello, world!",
//       },
//     },
//   ]
//
// In effect:
//
//   const html = `
//     <!DOCTYPE html>
//     <html lang="en">
//       <head>
//         <meta charset="utf-8" />
//         <meta name="viewport" content="width=device-width, initial-scale=1.0" />
//         ${head}
//       </head>
//       <body>
//         <div id="root">${ReactDOMServer.renderToString(<App {...props} />)}</div>
//         <script src="/vendor.js"></script>
//         <script src="/bundle.js"></script>
//       </body>
//     </html>
//   `

async function main() {
	const userConfiguration = await resolveUserConfiguration()

	// From here we expect Retro to have created `out_static` based on the
	// environmental variable `RETRO_OUT_DIR`.
	//
	// Furthermore, we expect `RETRO_OUT_DIR/__temp__` to be created in order to
	// support bundling `src/App.js`.
	//
	// Finally, we expect Retro to remove the directory `RETRO_OUT_DIR/__temp__`,
	// which should include build artifacts such as `.css`, etc.

	// Bundle `App.js` not `index.js` for `ReactDOMServer.renderToString`. `<App>`
	// should be a pure component where as `index.js` has the side effect of
	// mounting or hydrating to the DOM.
	await esbuild.build({
		...userConfiguration,

		// Always bundle
		bundle: true,

		// Entry point for the bundle
		entryPoints: ["src/App.js"],

		// Dedupe React APIs from `bundle.js`; React APIs are bundled in
		// `vendor.js`. See `inject` for more context.
		external: [
			"react",
			"react-dom",
			"react-dom/server",
		],

		// Expose React APIs as global variables (defined on `window`). See
		// `external` for more context.
		// TODO: It's not clear whether this will work for SSG because of the use of
		// `window`. The problem is that we don't want to assume the app won't use
		// the shim because `ReactDOMServer.renderToString` is a valid use-case even
		// for CSR apps.
		inject: [path.join(__dirname, "scripts/require.js")],

		// Load JavaScript as JavaScript React
		loader: {
			".js": "jsx",
		},

		// Target directory
		outdir: path.join(RETRO_OUT_DIR_STATIC, "__temp__"),

		// This code is only run locally
		platform: "node",
	})

	// Load the bundled app
	const BundledAppDefault = require(path.join(RETRO_OUT_DIR_STATIC, "__temp__", "App.js")).default

	// Load routes
	const routes = require("./routes.js")

	const timerPerRenderedRoutes = Date.now()
	const renderedRoutes = []
	for (const route of routes) {
		const timerPerRenderedRoute = Date.now()

		// Set `window.location.pathname` safely
		if (typeof window === "undefined") {
			window = {
				location: {
					pathname: route.path
				},
			}
		} else {
			if (typeof window.location === "undefined") {
				window.location = {
					pathname: route.path,
				}
			} else {
				window.location.pathname = route.path
			}
		}

		// NOTE: Assumes `route.head` has no wrapping lines
		const head = route.head
			.trim()
			.split("\n")
			.map(line => "\t\t" + line.trim())
			.join("\n")

		// TODO: In theory we should be able to read this from the user's
		// `www/index.html`
		// TODO: This should be a structured parameter provided by Retro, i.e. the
		// head and body content. The HTML string can be created in the Node.js
		// runtime.
		// 		const html = `<!DOCTYPE html>
		// <html lang="en">
		//   <head>
		// 		${RetroHeadPart1}
		// 		${head}
		// 		${RetroHeadPart1}
		// 	</head>
		//   <body>
		//     <div id="root">${ReactDOMServer.renderToString(React.createElement(BundledAppDefault, route.props))}</div>
		//     ${RetroScripts}
		//   </body>
		// </html>
		// ` // Add EOF

		// Derive the filename from the path
		const filename = route.path.endsWith("/")
			? route.path + "index.html"
			: route.path + ".html"

		// TODO: This is a dummy string for testing practices. Realistically we
		// should use something example commented above.
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

		// // For simplicity sake, Node.js writes routes to the filesystem. Read /
		// // write operations would usually be delegated to Go for superior error-
		// // handling and performance characteristics, but because of the for-loop,
		// // it's easier to write files here.

		// // TODO: We probably want to communicate this back to Go so Go can handle
		// // the writing to disk, error-handling, and decorated messages
		// await fsPromises.writeFile(path.join(RETRO_OUT_DIR_STATIC, filename), html)
		// console.log(`ok - ${route.path}`)
	}

	// // TODO: It looks like right now are are unintentionally bundling `.js` and
	// // `.css` files or similar. Is there a way to communicate to esbuild we only
	// // want to bundle some files?
	// await fsPromises.unlink("out-ssr/App.js")
	// await fsPromises.unlink("out-ssr/App.css")

	console.log({
		Kind: "static-routes-done",
		Data: {
			routes: renderedRoutes,
			measuredMs: Date.now() - timerPerRenderedRoutes,
		}
	})
}

main()
