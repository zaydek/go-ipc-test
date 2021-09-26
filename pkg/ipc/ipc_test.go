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
			await sleep(100)
			console.log("ok (2 of 2)")
			await sleep(100)
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

func TestNodeStdoutSuccess(t *testing.T) {
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
			await sleep(100)
			console.log("ok (2 of 2)")
			await sleep(100)
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

func TestNodeStderrSuccess(t *testing.T) {
	const (
		MODE_DIR  = 0755
		MODE_FILE = 0644
	)

	js := `
		async function sleep(milliseconds) {
			await new Promise(resolve => setTimeout(resolve, milliseconds))
		}

		async function main() {
			console.error("stop")
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

	expect.DeepEqual(t, out, "stderr: stop\n")
}

func TestNodeStdinSuccess(t *testing.T) {
	const (
		MODE_DIR  = 0755
		MODE_FILE = 0644
	)

	js := `
		const readline = (() => {
			async function* createReadlineGenerator() {
				const readlineImpl = require("readline").createInterface({ input: process.stdin })
				for await (const line of readlineImpl) {
					yield line
				}
			}
			const generate = createReadlineGenerator()
			return async () => {
				return (await generate.next()).value
			}
		})()

		async function sleep(milliseconds) {
			await new Promise(resolve => setTimeout(resolve, milliseconds))
		}

		async function main() {
			console.log(` + "`" + `stdin=${JSON.stringify(await readline())}` + "`" + `)
			sleep(100)
			console.log(` + "`" + `stdin=${JSON.stringify(await readline())}` + "`" + `)
			sleep(100)
			console.log("<eof>")
		}

		main()
	`

	if err := os.WriteFile("ipc_test.go.script.js", []byte(js), MODE_FILE); err != nil {
		t.Fatalf("os.WriteFile: %s", err)
	}
	defer os.Remove("ipc_test.go.script.js")

	stdin, stdout, stderr, err := NewCommand("node", "ipc_test.go.script.js")
	if err != nil {
		log.Fatalf("ipc.NewCommand: %s\n", err)
	}

	var out string

	stdin <- "foo"
	select {
	case stdoutLine := <-stdout:
		if stdoutLine == "<eof>" {
			break
		}
		out += fmt.Sprintf("stdout: %s\n", stdoutLine)
	case stderrText := <-stderr:
		out += fmt.Sprintf("stderr: %s\n", stderrText)
		break
	}

	stdin <- "bar"
	select {
	case stdoutLine := <-stdout:
		if stdoutLine == "<eof>" {
			break
		}
		out += fmt.Sprintf("stdout: %s\n", stdoutLine)
	case stderrText := <-stderr:
		out += fmt.Sprintf("stderr: %s\n", stderrText)
		break
	}

	expect.DeepEqual(t, out, "stdout: stdin=\"foo\"\nstdout: stdin=\"bar\"\n")
}
