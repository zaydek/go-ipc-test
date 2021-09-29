import * as esbuild from "esbuild"

export interface Message {
	Kind: string
	Data: any
}

export interface BuildResponse {
	Metafile: {
		Vendor: esbuild.Metafile | null
		Client: esbuild.Metafile | null
	}
	Warnings: esbuild.Message[]
	Errors: esbuild.Message[]
}

export interface BundleResult {
	Metafile: esbuild.Metafile
	Warnings: esbuild.Message[]
	Errors: esbuild.Message[]
}
