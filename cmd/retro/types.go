package retro

import "github.com/evanw/esbuild/pkg/api"

type BundleResult struct {
	Metafile map[string]interface{}
	Warnings []api.Message
	Errors   []api.Message
}

type BuildResponse struct {
	Kind string
	Data []BundleResult
}

// TODO: This likely needs to embed Build Response too or similar
type BuildStaticResponse struct {
	Kind string
	Data struct {
		Routes []struct {
			Route struct {
				Filename string
				HTML     string
			}
			MeasuredMs int
		}
		MeasuredMs int
	}
}
