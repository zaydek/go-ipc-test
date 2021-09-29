package retro

import (
	"fmt"
	"strings"

	"github.com/zaydek/go-ipc-test/go/pkg/terminal"
)

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
