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
	case ModeBuildAll:
		fallthrough
	case ModeStaticBuildAll:
		setEnvVar("NODE_ENV", "production")
	}
	switch commandMode {
	case ModeDev:
		setEnvVar("RETRO_CMD", ModeDev)
	case ModeBuildAll:
		setEnvVar("RETRO_CMD", ModeBuildAll)
	case ModeStaticBuildAll:
		setEnvVar("RETRO_CMD", ModeStaticBuildAll)
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
	if commandMode == ModeStaticBuildAll {
		if _, err := os.Stat(filepath.Join(RETRO_SRC_DIR, "App.js")); err != nil {
			return fmt.Errorf("os.Stat: %w", err)
		} else if os.IsNotExist(err) {
			fmt.Fprintln(
				os.Stderr,
				"Missing `src/App.js` entry point.",
			)
			os.Exit(1)
		}
	}

	// Check for the presence of `routes.js`
	if commandMode == ModeStaticBuildAll {
		if _, err := os.Stat("routes.js"); err != nil {
			return fmt.Errorf("os.Stat: %w", err)
		} else if os.IsNotExist(err) {
			fmt.Fprintln(
				os.Stderr,
				"Missing `routes.js` entry point.",
			)
			os.Exit(1)
		}
	}

	return nil
}

////////////////////////////////////////////////////////////////////////////////

func (r *RetroApp) BuildAll() error {
	if err := warmUp(ModeBuildAll); err != nil {
		return fmt.Errorf("warmUp: %w", err)
	}

	stdin, stdout, stderr, err := ipc.NewCommand("node", "node/scripts/backend.esbuild.js")
	if err != nil {
		return fmt.Errorf("ipc.NewCommand: %w", err)
	}

	var doneMessage BuildAllDoneMessage

	stdin <- "BUILD_ALL"
loop:
	for {
		select {
		case stdoutLine := <-stdout:
			if stdoutLine == "BUILD_ALL__DONE" {
				break loop
			}
			if err := json.Unmarshal([]byte(stdoutLine), &doneMessage); err != nil {
				// Propagate JSON unmarshal errors as stdout for debugging plugins
				fmt.Println(decorateStdoutLine(stdoutLine))
			} else {
				stdin <- "DONE"
				break loop
			}
		case stderrText := <-stderr:
			stdin <- "TERMINATE"
			fmt.Println(decorateStderrMultiline(stderrText))
			break loop
		}
	}

	// // DEBUG
	// byteStr, err := json.MarshalIndent(buildAllMessage, "", "  ")
	// if err != nil {
	// 	return fmt.Errorf("json.MarshalIndent: %w", err)
	// }
	// fmt.Println(string(byteStr))

	return nil
}

////////////////////////////////////////////////////////////////////////////////

func (r *RetroApp) StaticBuildAll() error {
	if err := warmUp(ModeStaticBuildAll); err != nil {
		return fmt.Errorf("warmUp: %w", err)
	}

	stdin, stdout, stderr, err := ipc.NewCommand("node", "node/scripts/backend.esbuild.js")
	if err != nil {
		return fmt.Errorf("ipc.NewCommand: %w", err)
	}

	var doneMessage StaticBuildAllDoneMessage

	stdin <- "STATIC_BUILD_ALL"
loop:
	for {
		select {
		case stdoutLine := <-stdout:
			if stdoutLine == "STATIC_BUILD_ALL__DONE" {
				break loop
			}
			if err := json.Unmarshal([]byte(stdoutLine), &doneMessage); err != nil {
				// Propagate JSON unmarshal errors as stdout for debugging plugins
				fmt.Println(decorateStdoutLine(stdoutLine))
			} else {
				stdin <- "DONE"
				break loop
			}
		case stderrMultiline := <-stderr:
			stdin <- "TERMINATE"
			fmt.Println(decorateStderrMultiline(stderrMultiline))
			break loop
		}
	}

	// // DEBUG
	// byteStr, err := json.MarshalIndent(doneMessage, "", "  ")
	// if err != nil {
	// 	return fmt.Errorf("json.MarshalIndent: %w", err)
	// }
	// fmt.Println(string(byteStr))

	// Save routes as pages
	for _, route := range doneMessage.Data.StaticRoutes {
		filename := filepath.Join(RETRO_OUT_DIR, route.Filename)
		html := `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Hello, world!</title>
		<link rel="stylesheet" href="/bundle.css" />
		` + splitMulitlineBrackets(route.Head) + `
	</head>
	<body>
		<div id="root">` + route.Body + `</div>
		<script src="/vendor.js"></script>
		<script src="/bundle.js"></script>
	</body>
</html>
` // Add EOF
		if err := os.WriteFile(filename, []byte(html), permFile); err != nil {
			return fmt.Errorf("os.WriteFile: %w", err)
		}
	}

	return nil
}
