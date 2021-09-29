package retro

import (
	"fmt"
	"strings"

	"github.com/zaydek/go-ipc-test/go/pkg/terminal"
)

// (Node.js) stdout  ...
func decorateStdoutLine(stdoutLine string) string {
	stdout := fmt.Sprintf(
		"%s %s  %s",
		terminal.Dim("(Node.js)"),
		terminal.BoldCyan("stdout"),
		stdoutLine,
	)
	return stdout
}

// (Node.js) stderr  ...
func decorateStderrLine(stdoutLine string) string {
	stdout := fmt.Sprintf(
		"%s %s  %s",
		terminal.Dim("(Node.js)"),
		terminal.BoldRed("stderr"),
		stdoutLine,
	)
	return stdout
}

// (Node.js) stderr  ...
// (Node.js) stderr  ...
func decorateStderrMultiline(stderrMultiline string) string {
	var stderr string
	for lineIndex, line := range strings.Split(strings.TrimRight(stderrMultiline, "\n"), "\n") {
		if lineIndex > 0 {
			stderr += "\n"
		}
		stderr += decorateStderrLine(line)
	}
	return stderr
}
