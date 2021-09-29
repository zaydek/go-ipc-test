package main

import (
	"fmt"

	"github.com/zaydek/go-ipc-test/go/cmd/retro"
)

func main() {
	app := &retro.RetroApp{}
	if err := app.StaticBuildAll(); err != nil {
		panic(fmt.Errorf("app.StaticBuild: %w", err))
	}
}
