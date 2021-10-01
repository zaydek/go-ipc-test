package retro

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/zaydek/go-ipc-test/go/pkg/ipc"
)

var (
	NODE_ENV      = ""
	RETRO_CMD     = ""
	RETRO_WWW_DIR = ""
	RETRO_SRC_DIR = ""
	RETRO_OUT_DIR = ""
)

func setEnvVars(commandMode CommandMode) {
	setEnvVar := func(envKey, fallbackValue string) {
		envValue := os.Getenv(envKey)
		if envValue == "" {
			envValue = fallbackValue
		}
		switch envKey {
		case "NODE_ENV":
			NODE_ENV = envValue
		case "RETRO_CMD":
			RETRO_CMD = envValue
		case "RETRO_WWW_DIR":
			RETRO_WWW_DIR = envValue
		case "RETRO_SRC_DIR":
			RETRO_SRC_DIR = envValue
		case "RETRO_OUT_DIR":
			RETRO_OUT_DIR = envValue
		}
		os.Setenv(envKey, envValue)
	}
	switch commandMode {
	case ModeDev:
		setEnvVar("NODE_ENV", "development")
	case ModeBuild:
		setEnvVar("NODE_ENV", "production")
	}
	switch commandMode {
	case ModeDev:
		setEnvVar("RETRO_CMD", ModeDev)
	case ModeBuild:
		setEnvVar("RETRO_CMD", ModeBuild)
	}
	setEnvVar("RETRO_WWW_DIR", "www")
	setEnvVar("RETRO_SRC_DIR", "src")
	setEnvVar("RETRO_OUT_DIR", "out")
}

type RetroApp struct{}

func warmUp(commandMode CommandMode) error {
	setEnvVars(commandMode) // Takes precedence

	if err := os.RemoveAll(RETRO_OUT_DIR); err != nil {
		return fmt.Errorf("os.RemoveAll: %w", err)
	}

	// Check for the presence of `www/index.html`
	if _, err := os.Stat(filepath.Join(RETRO_WWW_DIR, "index.html")); err != nil {
		return fmt.Errorf("os.Stat: %w", err)
	} else if os.IsNotExist(err) {
		fmt.Fprintln(
			os.Stderr,
			"Missing `www/index.html` entry point.",
		)
		os.Exit(1)
	}

	// Check for the presence of `src/index.js`
	if _, err := os.Stat(filepath.Join(RETRO_SRC_DIR, "index.js")); err != nil {
		return fmt.Errorf("os.Stat: %w", err)
	} else if os.IsNotExist(err) {
		fmt.Fprintln(
			os.Stderr,
			"Missing `src/index.js` entry point.",
		)
		os.Exit(1)
	}

	// Check for the presence of `src/App.js`
	if _, err := os.Stat(filepath.Join(RETRO_SRC_DIR, "App.js")); err != nil {
		return fmt.Errorf("os.Stat: %w", err)
	} else if os.IsNotExist(err) {
		fmt.Fprintln(
			os.Stderr,
			"Missing `src/App.js` entry point.",
		)
		os.Exit(1)
	}

	return nil
}

func (r *RetroApp) Build() error {
	if err := warmUp(ModeBuild); err != nil {
		return fmt.Errorf("warmUp: %w", err)
	}

	stdin, stdout, stderr, err := ipc.NewCommand("node", "node/scripts/backend.esbuild.js")
	if err != nil {
		return fmt.Errorf("ipc.NewCommand: %w", err)
	}

	var message BuildDoneMessage

	stdin <- "build"
loop:
	for {
		select {
		case line := <-stdout:
			if err := json.Unmarshal([]byte(line), &message); err != nil {
				// Log unmarshal errors as stdout so users can debug plugins, etc.
				fmt.Println(decorateStdoutLine(line))
				continue
			}
			stdin <- "done"
			break loop
		case text := <-stderr:
			fmt.Println(decorateStderrText(text))
			stdin <- "done"
			break loop
		}
	}

	// DEBUG
	byteStr, err := json.MarshalIndent(message, "", "  ")
	if err != nil {
		return fmt.Errorf("json.MarshalIndent: %w", err)
	}
	fmt.Println(string(byteStr))

	return nil
}
