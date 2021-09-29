package retro

import "github.com/evanw/esbuild/pkg/api"

type BundleResult struct {
	Metafile map[string]interface{}
	Warnings []api.Message
	Errors   []api.Message
}

type BuildAllDoneMessage struct {
	Kind string
	Data struct {
		Vendor BundleResult
		Client BundleResult
	}
}

type StaticRoute struct {
	Filename string
	Head     string
	Body     string
}

type StaticRouteDoneMessage struct {
	Kind string
	Data struct {
		StaticRoute StaticRoute
	}
}

type StaticBuildAllDoneMessage struct {
	Kind string
	Data struct {
		Vendor       BundleResult
		Client       BundleResult
		StaticRoutes []StaticRoute
	}
}
