package retro

import (
	"fmt"
	"strings"

	"github.com/zaydek/go-ipc-test/go/pkg/terminal"
)

// (Node.js) stdout  ...
func decorateStdoutLine(line string) string {
	stdout := fmt.Sprintf(
		"%s %s  %s",
		terminal.Dim("(Node.js)"),
		terminal.BoldCyan("stdout"),
		line,
	)
	return stdout
}

// (Node.js) stderr  ...
func decorateStderrLine(line string) string {
	stdout := fmt.Sprintf(
		"%s %s  %s",
		terminal.Dim("(Node.js)"),
		terminal.BoldRed("stderr"),
		line,
	)
	return stdout
}

// (Node.js) stdout  ...
// (Node.js) stdout  ...
func decorateStdoutText(stdoutMultiline string) string {
	var stdout string
	split := strings.Split(strings.TrimRight(stdoutMultiline, "\n"), "\n")
	for lineIndex, line := range split {
		if lineIndex > 0 {
			stdout += "\n"
		}
		stdout += decorateStdoutLine(line)
	}
	return stdout
}

// (Node.js) stderr  ...
// (Node.js) stderr  ...
func decorateStderrText(stderrText string) string {
	var stderr string
	split := strings.Split(strings.TrimRight(stderrText, "\n"), "\n")
	for lineIndex, line := range split {
		if lineIndex > 0 {
			stderr += "\n"
		}
		stderr += decorateStderrLine(line)
	}
	return stderr
}
