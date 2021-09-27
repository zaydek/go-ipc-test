package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/evanw/esbuild/pkg/api"
	"github.com/zaydek/go-ipc-test/pkg/ipc"
	"github.com/zaydek/go-ipc-test/pkg/terminal"
)

type BackendResponse struct {
	Kind string
	Data struct {
		Metafile struct {
			Vendor map[string]interface{}
			Bundle map[string]interface{}
		}
		Errors   []api.Message
		Warnings []api.Message
	}
}

func decorateStdoutLine(stdoutLine string) string {
	return fmt.Sprintf("%s  %s", terminal.BoldCyan("stdout"), stdoutLine)
}

func decorateStderrText(stderrText string) string {
	var decoratedErrStr string
	for lineIndex, line := range strings.Split(strings.TrimRight(stderrText, "\n"), "\n") {
		if lineIndex > 0 {
			decoratedErrStr += "\n"
		}
		decoratedErrStr += fmt.Sprintf("%s  %s", terminal.BoldRed("stderr"), line)
	}
	return decoratedErrStr
}

func setEnvVars() {
	// NODE_ENV=...
	if env := os.Getenv("NODE_ENV"); env != "" {
		os.Setenv("NODE_ENV", env)
	} else {
		// TODO: Not configurable yet
		os.Setenv("NODE_ENV", "development")
	}
	// RETRO_CMD=...
	if env := os.Getenv("RETRO_CMD"); env != "" {
		os.Setenv("RETRO_CMD", env)
	} else {
		// TODO: Not configurable yet
		os.Setenv("RETRO_CMD", "dev")
	}
	// RETRO_WWW_DIR=...
	if env := os.Getenv("RETRO_WWW_DIR"); env != "" {
		os.Setenv("RETRO_WWW_DIR", env)
	} else {
		os.Setenv("RETRO_WWW_DIR", "www")
	}
	// RETRO_SRC_DIR=...
	if env := os.Getenv("RETRO_SRC_DIR"); env != "" {
		os.Setenv("RETRO_SRC_DIR", env)
	} else {
		os.Setenv("RETRO_SRC_DIR", "src")
	}
	// RETRO_OUT_DIR=...
	if env := os.Getenv("RETRO_OUT_DIR"); env != "" {
		os.Setenv("RETRO_OUT_DIR", env)
	} else {
		os.Setenv("RETRO_OUT_DIR", "out")
	}
}

func initialize() {
	setEnvVars()
	if err := os.RemoveAll(os.Getenv("RETRO_OUT_DIR")); err != nil {
		panic(err)
	}
}

func main() {
	initialize()

	var (
		// CLI arguments
		cmdArgs = []string{"node", "backend.esbuild.js"}
		cmdStr  = func() string {
			var _cmdStr string
			for argIndex, arg := range cmdArgs {
				if argIndex > 0 {
					_cmdStr += " "
				}
				_cmdStr += arg
			}
			return _cmdStr
		}()
	)

	stdin, stdout, stderr, err := ipc.NewCommand(cmdArgs...)
	if err != nil {
		log.Fatalf("ipc.NewCommand: %s\n", err)
	}

	fmt.Println(terminal.Dimf("%% %s", cmdStr))
	stdin <- "build"
	select {
	case stdoutLine := <-stdout:
		if stdoutLine == "<eof>" {
			break
		}

		// Unmarshal the build response
		var buildResponse BackendResponse
		if err := json.Unmarshal([]byte(stdoutLine), &buildResponse); err != nil {
			panic(err)
		}

		// Marshal the build response
		byteStr, err := json.MarshalIndent(buildResponse, "", "  ")
		if err != nil {
			panic(err)
		}
		fmt.Println(string(byteStr))

	case stderrText := <-stderr:
		// fmt.Println(decorateStdoutLine(stdoutLine))
		fmt.Println(decorateStderrText(stderrText))
		break
	}
}
