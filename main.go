package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/evanw/esbuild/pkg/api"
	"github.com/zaydek/go-ipc-test/pkg/ipc"
	"github.com/zaydek/go-ipc-test/pkg/terminal"
)

type BuildResponse struct {
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

func setEnvVars(commandMode CommandMode) {
	setEnvVar := func(envName, fallbackValue string) {
		if env := os.Getenv(envName); env != "" {
			os.Setenv(envName, env)
		} else {
			os.Setenv(envName, fallbackValue)
		}
	}
	switch commandMode {
	case ModeDev:
		setEnvVar("NODE_ENV", "development")
	case ModeBuild:
		fallthrough
	case ModeBuildStatic:
		setEnvVar("NODE_ENV", "production")
	}
	switch commandMode {
	case ModeDev:
		setEnvVar("RETRO_CMD", "dev")
	case ModeBuild:
		setEnvVar("RETRO_CMD", "build")
	case ModeBuildStatic:
		setEnvVar("RETRO_CMD", "build_static")
	}
	setEnvVar("RETRO_WWW_DIR", "www")
	setEnvVar("RETRO_SRC_DIR", "src")
	setEnvVar("RETRO_OUT_DIR", "out")
}

func warmUp(commandMode CommandMode) error {
	setEnvVars(commandMode)
	if err := os.RemoveAll(os.Getenv("RETRO_OUT_DIR")); err != nil {
		return err
	}
	return nil
}

////////////////////////////////////////////////////////////////////////////////

type RetroApp struct {
	// ...
}

type CommandMode = string

var (
	ModeDev         CommandMode = "dev"
	ModeBuild       CommandMode = "build"
	ModeBuildStatic CommandMode = "build_static"
)

func (r *RetroApp) Build() {
	if err := warmUp(ModeBuild); err != nil {
		panic(fmt.Sprintf("warmUp: %s", err))
	}
	stdin, stdout, stderr, err := ipc.NewCommand("node", "scripts/backend.esbuild.js")
	if err != nil {
		panic(fmt.Sprintf("ipc.NewCommand: %s", err))
	}

	// defer func() {
	// 	stdin <- "done"
	// }()

	var buildResponse BuildResponse

	stdin <- "BUILD"
loop:
	for {
		select {
		case stdoutLine := <-stdout:
			if stdoutLine == "BUILD_DONE" {
				break loop
			}
			if err := json.Unmarshal([]byte(stdoutLine), &buildResponse); err != nil {
				// Propagate JSON unmarshal errors as stdout for the user, e.g.
				// debugging Retro plugins
				fmt.Println(decorateStdoutLine(stdoutLine))
			} else {
				stdin <- "DONE"
				break loop
			}
		case stderrText := <-stderr:
			fmt.Println(decorateStderrText(stderrText))
			break loop
		}
	}

	// byteStr, err := json.MarshalIndent(buildResponse, "", "  ")
	// if err != nil {
	// 	panic(fmt.Sprintf("json.MarshalIndent: %s", err))
	// }
	// fmt.Println(string(byteStr))
}

func (r *RetroApp) BuildStatic() {
	if err := warmUp(ModeBuildStatic); err != nil {
		panic(fmt.Sprintf("warmUp: %s", err))
	}
	stdin, stdout, stderr, err := ipc.NewCommand("node", "scripts/backend.esbuild.js")
	if err != nil {
		panic(fmt.Sprintf("ipc.NewCommand: %s", err))
	}

	var buildStaticResponse BuildStaticResponse

	stdin <- "BUILD_STATIC"
	// defer func() {
	// 	stdin <- "DONE"
	// }()

loop:
	for {
		select {
		case stdoutLine := <-stdout:
			if stdoutLine == "BUILD_STATIC_DONE" {
				break loop
			}
			if err := json.Unmarshal([]byte(stdoutLine), &buildStaticResponse); err != nil {
				// Propagate JSON unmarshal errors as stdout for the user, e.g.
				// debugging Retro plugins
				fmt.Println(decorateStdoutLine(stdoutLine))
			} else {
				byteStr, err := json.MarshalIndent(buildStaticResponse, "", "  ")
				if err != nil {
					panic(fmt.Sprintf("json.MarshalIndent: %s", err))
				}
				fmt.Println(string(byteStr))
				stdin <- "DONE"
				break loop
			}
		case stderrText := <-stderr:
			fmt.Println(decorateStderrText(stderrText))
			break loop
		}
	}
}

func main() {
	retro := &RetroApp{}
	retro.BuildStatic()
}

// func main() {
// 	warmUp()
//
// 	var (
// 		// CLI arguments
// 		cmdArgs = []string{"node", "backend.esbuild.js"}
// 		cmdStr  = func() string {
// 			var _cmdStr string
// 			for argIndex, arg := range cmdArgs {
// 				if argIndex > 0 {
// 					_cmdStr += " "
// 				}
// 				_cmdStr += arg
// 			}
// 			return _cmdStr
// 		}()
// 	)
//
// 	stdin, stdout, stderr, err := ipc.NewCommand(cmdArgs...)
// 	if err != nil {
// 		log.Fatalf("ipc.NewCommand: %s\n", err)
// 	}
//
// 	// fmt.Println(terminal.Dimf("%% %s", cmdStr))
// 	stdin <- "build"
// 	select {
// 	case stdoutLine := <-stdout:
// 		if stdoutLine == "<eof>" {
// 			break
// 		}
//
// 		// Unmarshal the build response
// 		var buildResponse BackendResponse
// 		if err := json.Unmarshal([]byte(stdoutLine), &buildResponse); err != nil {
// 			panic(err)
// 		}
//
// 		// Marshal the build response
// 		byteStr, err := json.MarshalIndent(buildResponse, "", "  ")
// 		if err != nil {
// 			panic(err)
// 		}
// 		fmt.Println(string(byteStr))
//
// 	case stderrText := <-stderr:
// 		// fmt.Println(decorateStdoutLine(stdoutLine))
// 		fmt.Println(decorateStderrText(stderrText))
// 		break
// 	}
// }
