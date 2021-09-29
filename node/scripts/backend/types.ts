import * as esbuild from "esbuild"

// Metadata associated with an esbuild bundle
export interface BundleResult {
	Metafile: esbuild.Metafile
	Warnings: esbuild.Message[]
	Errors: esbuild.Message[]
}

// Message for completed build all events
export interface BuildAllDoneMessage {
	Kind: "BUILD_ALL__DONE"
	Data: {
		Vendor: BundleResult
		Client: BundleResult
	}
}

// Message for completed rebuild client events
export interface RebuildClientDoneMessage {
	Kind: "REBUILD_CLIENT__DONE"
	Data: {
		Client: BundleResult
	}
}

// Describes a declarative route from `routes.js`
export interface DeclarativeRoute {
	path: string
	head: string
	props: Record<string, any>
}

// Describes a statically rendered route from a declarative route
export interface StaticRoute {
	Filename: string
	Head: string
	Body: string
}

// Message for completed static route events
export interface StaticRouteDoneMessage {
	Kind: "STATIC_ROUTE__DONE"
	Data: {
		StaticRoute: StaticRoute
	}
}

// Message for completed static build all events
export interface StaticBuildAllDoneMessage {
	Kind: "STATIC_BUILD_ALL__DONE"
	Data: {
		Vendor: BundleResult
		Client: BundleResult
		StaticRoutes: StaticRoute[]
	}
}
