package main

import (
	"fmt"

	"github.com/zaydek/go-ipc-test/go/cmd/retro"
)

func main() {
	app := &retro.RetroApp{}
	if err := app.BuildAll(); err != nil {
		panic(fmt.Errorf("app.BuildAll: %w", err))
	}
}
