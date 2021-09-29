import esbuild from "esbuild"
import fsPromises from "fs/promises"
import path from "path"

import {
	NODE_ENV,
	RETRO_CMD,
	RETRO_WWW_DIR,
	RETRO_SRC_DIR,
	RETRO_OUT_DIR,
} from "./env"

// Resolves `retro.config.js`
export async function resolveUserConfiguration(): Promise<esbuild.BuildOptions> {
	try {
		await fsPromises.stat("retro.config.js")
	} catch {
		return {}
	}
	return require(path.join(process.cwd(), "retro.config.js"))
}

export const commonConfiguration: esbuild.BuildOptions = {
	// Always bundle
	bundle: true,

	// Propagate environmental variables
	define: {
		// React and React DOM environmental variables
		"process.env.NODE_ENV": JSON.stringify(NODE_ENV),

		// Retro environmental variables
		"process.env.RETRO_CMD": JSON.stringify(RETRO_CMD),
		"process.env.RETRO_WWW_DIR": JSON.stringify(RETRO_WWW_DIR),
		"process.env.RETRO_SRC_DIR": JSON.stringify(RETRO_SRC_DIR),
		"process.env.RETRO_OUT_DIR": JSON.stringify(RETRO_OUT_DIR),
	},

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

	// Add sourcemaps
	sourcemap: true,
}

export const buildClientConfiguration = (userConfiguration: esbuild.BuildOptions): esbuild.BuildOptions => ({
	...commonConfiguration,
	...userConfiguration,

	// Global variables
	define: {
		...commonConfiguration.define,
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

	// Expose React APIs as require shims on `window`. See property `external` for
	// more context.
	inject: [path.join(__dirname, "require.js")],

	loader: {
		...commonConfiguration.loader,
		...userConfiguration.loader,
	},
})
