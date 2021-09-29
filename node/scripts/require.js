if (typeof window === "undefined") {
	// For server-rendering
	React = require("react")
	ReactDOM = require("react-dom")
	ReactDOMServer = require("react-dom/server")
} else {
	// For client-side rendering
	window.require = function resolveVendorDepsAtRuntime(moduleName) {
		switch (moduleName) {
			case "react":
				return window["React"]
			case "react-dom":
				return window["ReactDOM"]
			case "react-dom/server":
				return window["ReactDOMServer"]
			default:
				throw new Error("Internal error")
		}
	}
}
