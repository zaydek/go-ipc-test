package ipc

import (
	"fmt"
	"log"
	"os"
	"strings"
	"testing"

	"github.com/zaydek/go-ipc-test/pkg/expect"
)

func TestCommandFooFailure(t *testing.T) {
	_, _, _, err := NewCommand("foo")
	if err.Error() == `exec: "foo": executable file not found in $PATH` {
		// Success
		return
	}
	t.Fatalf("NewCommand: got %q want %q", err, `exec: "foo": executable file not found in $PATH`)
}

func TestCommandEchoSuccess(t *testing.T) {
	_, stdout, stderr, err := NewCommand("echo", "foo bar")
	if err != nil {
		t.Fatalf("NewCommand: got %q want <nil>", err)
	}
	select {
	case stdoutLine := <-stdout:
		if stdoutLine == "foo bar" {
			// Success
			return
		}
		t.Fatalf("stdout: unexpected stdoutLine=%q", stdoutLine)
	case stderrText := <-stderr:
		t.Fatalf("stderr: unexpected stderrText=%q", stderrText)
	}
}

func TestNodeSyntaxError(t *testing.T) {
	const (
		MODE_DIR  = 0755
		MODE_FILE = 0644
	)

	js := `
		async function sleep(milliseconds) {
			await new Promise(resolve => setTimeout(resolve, milliseconds))
		}

		function main() {
			console.log("ok (1 of 2)")
			await sleep(1_000)
			console.log("ok (2 of 2)")
			await sleep(1_000)
			console.log("<eof>")
		}

		main()
	`

	if err := os.WriteFile("ipc_test.go.script.js", []byte(js), MODE_FILE); err != nil {
		t.Fatalf("os.WriteFile: %s", err)
	}
	defer os.Remove("ipc_test.go.script.js")

	_, stdout, stderr, err := NewCommand("node", "ipc_test.go.script.js")
	if err != nil {
		log.Fatalf("ipc.NewCommand: %s\n", err)
	}

	var out string

loop:
	for {
		select {
		case stdoutLine := <-stdout:
			if stdoutLine == "<eof>" {
				break loop
			}
			out += fmt.Sprintf("stdout: %s\n", stdoutLine)
		case stderrText := <-stderr:
			out += fmt.Sprintf("stderr: %s\n", stderrText)
			break loop
		}
	}

	if strings.Contains(out, "pkg/ipc/ipc_test.go.script.js:8") {
		// Success
		return
	}

	t.Fatalf("unexpected out=%q", out)
}

func TestNodeSuccess(t *testing.T) {
	const (
		MODE_DIR  = 0755
		MODE_FILE = 0644
	)

	js := `
		async function sleep(milliseconds) {
			await new Promise(resolve => setTimeout(resolve, milliseconds))
		}

		async function main() {
			console.log("ok (1 of 2)")
			await sleep(1_000)
			console.log("ok (2 of 2)")
			await sleep(1_000)
			console.log("<eof>")
		}

		main()
	`

	if err := os.WriteFile("ipc_test.go.script.js", []byte(js), MODE_FILE); err != nil {
		t.Fatalf("os.WriteFile: %s", err)
	}
	defer os.Remove("ipc_test.go.script.js")

	_, stdout, stderr, err := NewCommand("node", "ipc_test.go.script.js")
	if err != nil {
		log.Fatalf("ipc.NewCommand: %s\n", err)
	}

	var out string

loop:
	for {
		select {
		case stdoutLine := <-stdout:
			if stdoutLine == "<eof>" {
				break loop
			}
			out += fmt.Sprintf("stdout: %s\n", stdoutLine)
		case stderrText := <-stderr:
			out += fmt.Sprintf("stderr: %s\n", stderrText)
			break loop
		}
	}

	expect.DeepEqual(t, out, "stdout: ok (1 of 2)\nstdout: ok (2 of 2)\n")
}
