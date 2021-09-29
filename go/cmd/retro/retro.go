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
	// Set environmental and global Go variables
	setEnvVars(commandMode)

	// Remove previous build artifacts
	if err := os.RemoveAll(RETRO_OUT_DIR); err != nil {
		return fmt.Errorf("os.RemoveAll: %w", err)
	}

	// // Remove previous static build artifacts
	// if err := os.RemoveAll(filepath.Join(RETRO_OUT_DIR, "_static")); err != nil {
	// 	return fmt.Errorf("os.RemoveAll: %w", err)
	// }

	// ERR_MISSING_WWW_INDEX_HTML
	// ERR_MISSING_SRC_INDEX_JS
	// ERR_MISSING_SRC_APP_JS_OR_EXPORT_DEFAULT
	// ERR_MISSING_ROUTES_JS_OR_EXPORT_DEFAULT

	// No such file or default export for `src/App.js`. `src/App.js` should be a pure
	// component whereas `src/index.js` has the side effect of mounting or hydrating
	// the DOM.

	// No such file or default export for `routes.js`. `routes.js` should be an
	// array describing all paths, head metadata, and props for the render
	// component.
	//
	// For example:
	//
	//   module.exports = [
	//     {
	//       path: "/",
	//       head: `
	//         <title>Hello, world!</title>
	//         <meta name="title" content=${JSON.stringify("Hello, world!")}>
	//         <meta name="description" content=${JSON.stringify("Hello, world!")}>
	//       `,
	//       props: {
	//         greeting: "Hello, world!",
	//       },
	//     },
	//   ]
	//
	// In effect:
	//
	//   const html = `
	//     <!DOCTYPE html>
	//     <html lang="en">
	//       <head>
	//         <meta charset="utf-8" />
	//         <meta name="viewport" content="width=device-width, initial-scale=1.0" />
	//         ${head}
	//       </head>
	//       <body>
	//         <div id="root">${ReactDOMServer.renderToString(<App {...props} />)}</div>
	//         <script src="/vendor.js"></script>
	//         <script src="/bundle.js"></script>
	//       </body>
	//     </html>
	//   `

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

	// TODO: In theory we should be able to read this from the user's
	// `www/index.html`
	// TODO: This should be a structured parameter provided by Retro, i.e. the
	// head and body content. The HTML string can be created in the Node.js
	// runtime.
	// 		const html = `<!DOCTYPE html>
	// <html lang="en">
	//   <head>
	// 		${RetroHeadPart1}
	// 		${head}
	// 		${RetroHeadPart1}
	// 	</head>
	//   <body>
	//     <div id="root">${ReactDOMServer.renderToString(React.createElement(BundledAppDefault, route.props))}</div>
	//     ${RetroScripts}
	//   </body>
	// </html>
	// ` // Add EOF

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

	var buildAllMessage BuildAllMessage

	stdin <- "BUILD_ALL"
loop:
	for {
		select {
		case stdoutLine := <-stdout:
			if stdoutLine == "BUILD_ALL__DONE" {
				break loop
			}
			if err := json.Unmarshal([]byte(stdoutLine), &buildAllMessage); err != nil {
				// Propagate JSON unmarshal errors as stdout for the user, e.g.
				// debugging Retro plugins
				fmt.Println(decorateStdoutLine(stdoutLine))
			} else {
				stdin <- "END"
				break loop
			}
		case stderrText := <-stderr:
			stdin <- "END_EARLY"
			fmt.Println(decorateStderrMultiline(stderrText))
			break loop
		}
	}

	// DEBUG
	byteStr, err := json.MarshalIndent(buildAllMessage, "", "  ")
	if err != nil {
		return fmt.Errorf("json.MarshalIndent: %w", err)
		// return err
	}
	fmt.Println(string(byteStr))

	// if err := r.coolDown(); err != nil {
	// 	return fmt.Errorf("coolDown: %w", err)
	// }

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

	var staticBuildAllResponse StaticBuildAllMessage

	stdin <- "STATIC_BUILD_ALL"
loop:
	for {
		select {
		case stdoutLine := <-stdout:
			if stdoutLine == "STATIC_BUILD_ALL__DONE" {
				break loop
			}
			if err := json.Unmarshal([]byte(stdoutLine), &staticBuildAllResponse); err != nil {
				// Propagate JSON unmarshal errors as stdout for the user, e.g.
				// debugging Retro plugins
				fmt.Println(decorateStdoutLine(stdoutLine))
			} else {
				stdin <- "END"
				break loop
			}
		case stderrMultiline := <-stderr:
			stdin <- "END_EARLY"
			fmt.Println(decorateStderrMultiline(stderrMultiline))
			break loop
		}
	}

	// DEBUG
	return nil

	// DEBUG
	byteStr, err := json.MarshalIndent(staticBuildAllResponse, "", "  ")
	if err != nil {
		return fmt.Errorf("json.MarshalIndent: %w", err)
	}
	fmt.Println(string(byteStr))

	// Remove `out/__temp__`
	if err := os.RemoveAll(filepath.Join(RETRO_OUT_DIR, "__temp__")); err != nil {
		panic(fmt.Sprintf("os.RemoveAll: %s", err))
	}

	// Write `out_static/*.html`
	for _, route := range staticBuildAllResponse.Data.StaticRoutes {
		filename := filepath.Join(RETRO_OUT_DIR, route.Filename)

		html := `<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta http-equiv="X-UA-Compatible" content="IE=edge">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Document</title>
		</head>
	<body>
		<div id="root">` + route.Body + `</div>
	</body>
</html>
`

		if err := os.WriteFile(filename, []byte(html), permFile); err != nil {
			return fmt.Errorf("os.WriteFile: %w", err)
		}
	}

	return nil
}
