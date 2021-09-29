// For SSG use-case
if (typeof window === "undefined") {
	window = {}
}

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
