package main

import (
	"fmt"
	"log"
	"strings"

	"github.com/zaydek/go-ipc-test/pkg/ipc"
	"github.com/zaydek/go-ipc-test/pkg/terminal"
)

func decorateStdoutLine(stdoutLine string) string {
	return fmt.Sprintf("%s  %s", terminal.BoldCyan("stdout"), stdoutLine)
}

func decorateStderrText(stderrText string) string {
	var decoratedErrStr string
	for lineIndex, line := range strings.Split(strings.TrimSpace(stderrText), "\n") {
		if lineIndex > 0 {
			decoratedErrStr += "\n"
		}
		decoratedErrStr += fmt.Sprintf("%s  %s", terminal.BoldRed("stderr"), line)
	}
	return decoratedErrStr
}

// func main() {
// 	// Prepare command
// 	var (
// 		cmdArgs = []string{"node", "script.js"}
// 		cmdStr  = func() string {
// 			var cmdStr string
// 			for argIndex, arg := range cmdArgs {
// 				if argIndex > 0 {
// 					cmdStr += " "
// 				}
// 				cmdStr += arg
// 			}
// 			return cmdStr
// 		}()
// 	)
//
// 	// Run command
// 	stdin, stdout, stderr, err := ipc.NewCommand(cmdArgs...)
// 	if err != nil {
// 		log.Fatalf("ipc.NewCommand: %s\n", err)
// 	}
//
// 	// Messages
// 	fmt.Println(terminal.Dimf("%% %s", cmdStr))
// 	stdin <- "foo"
// loop:
// 	for {
// 		select {
// 		case stdoutLine := <-stdout:
// 			if stdoutLine == "<eof>" {
// 				break loop
// 			}
// 			fmt.Println(decorateStdoutLine(stdoutLine))
// 		case stderrText := <-stderr:
// 			fmt.Println(decorateStderrText(stderrText))
// 			break loop
// 		}
// 	}
// }

func main() {
	// _, stdout, stderr, err := ipc.NewCommand("echo", "foo bar")
	// _, stdout, stderr, err := ipc.NewCommand("foo")
	_, stdout, stderr, err := ipc.NewCommand("node", "script.js")
	if err != nil {
		log.Fatalln(err)
	}
	// select {
	// case stdoutLine := <-stdout:
	// 	fmt.Println(decorateStdoutLine(stdoutLine))
	// case stderrText := <-stderr:
	// 	fmt.Println(decorateStderrText(stderrText))
	// 	break
	// }

loop:
	for {
		select {
		case stdoutLine := <-stdout:
			if stdoutLine == "<eof>" {
				break loop
			}
			fmt.Println(decorateStdoutLine(stdoutLine))
		case stderrText := <-stderr:
			fmt.Println(decorateStderrText(stderrText))
			break loop
		}
	}

	// _, _, _, err := ipc.NewCommand("foo")
	// if err != nil {
	// 	log.Fatalln(err)
	// }
	// select {
	// case stdoutLine := <-stdout:
	// 	fmt.Println(decorateStdoutLine(stdoutLine))
	// case stderrText := <-stderr:
	// 	fmt.Println(decorateStderrText(stderrText))
	// 	break
	// }
}
