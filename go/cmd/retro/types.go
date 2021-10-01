package retro

import "github.com/evanw/esbuild/pkg/api"

type BundleResult struct {
	Metafile map[string]interface{}
	Warnings []api.Message
	Errors   []api.Message
}

type BuildDoneMessage struct {
	Kind string
	Data struct {
		Vendor BundleResult
		Client BundleResult
	}
}

type RebuildDoneMessage struct {
	Kind string
	Data struct {
		Client BundleResult
	}
}
