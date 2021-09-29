package main

import (
	"fmt"

	"github.com/zaydek/go-ipc-test/go/cmd/retro"
)

func main() {
	app, err := retro.NewRetroApp(retro.ModeBuild)
	if err != nil {
		panic(fmt.Errorf("retro.NewRetroApp: %w", err))
	}
	// TODO: Refactor this? This seems a little awkward?
	app.BuildStatic()
}
