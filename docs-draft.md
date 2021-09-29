
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
