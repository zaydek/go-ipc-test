// https://esbuild.github.io/api/#build-api

module.exports = {
	plugins: [
		// {
		// 	name: "esbuild-test-plugin",
		// 	setup(build) {
		// 		build.onResolve({ filter: /^esbuild:test-plugin$/ }, args => {
		// 			console.log("a")
		// 			return {
		// 				path: args.path,
		// 				namespace: "esbuild-test-plugin-ns",
		// 			}
		// 		})
		// 		build.onLoad({ filter: /.*/, namespace: "esbuild-test-plugin-ns" }, async args => {
		// 			console.log("b")
		// 			return {
		// 				contents: "export default {}",
		// 				loader: "js",
		// 			}
		// 		})
		// 	},
		// }
		{
			name: "env",
			setup(build) {
				// Intercept import paths called "env" so esbuild doesn't attempt
				// to map them to a file system location. Tag them with the "env-ns"
				// namespace to reserve them for this plugin.
				build.onResolve({ filter: /^env$/ }, args => {
					console.log("a")
					return {
						path: args.path,
						namespace: "env-ns",
					}
				})
				// Load paths tagged with the "env-ns" namespace and behave as if
				// they point to a JSON file containing the environment variables.
				build.onLoad({ filter: /.*/, namespace: "env-ns" }, () => {
					console.log("b")
					return {
						contents: JSON.stringify(process.env),
						loader: "json",
					}
				})
			},
		},
	],
}
