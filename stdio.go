package main

import (
	"bufio"
	"fmt"
	"io"
	"os/exec"
	"strings"

	"github.com/zaydek/go-ipc-test/go/pkg/terminal"
)

////////////////////////////////////////////////////////////////////////////////

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
func decorateStderrText(stderrMultiline string) string {
	var stderr string
	split := strings.Split(strings.TrimRight(stderrMultiline, "\n"), "\n")
	for lineIndex, line := range split {
		if lineIndex > 0 {
			stderr += "\n"
		}
		stderr += decorateStderrLine(line)
	}
	return stderr
}

////////////////////////////////////////////////////////////////////////////////

type Command struct {
	// Unexported
	cmd        *exec.Cmd
	stdinPipe  io.WriteCloser
	stdoutPipe io.ReadCloser
	stderrPipe io.ReadCloser

	// Exported
	CommandArgs []string
	Stdin       chan string
	Stdout      chan string
	Stderr      chan string
}

func NewCommand(commandArgs ...string) (stdin, stdout, stderr chan string, err error) {
	cmd := exec.Command(commandArgs[0], commandArgs[1:]...)

	// Get pipes
	stdinPipe, err := cmd.StdinPipe()
	if err != nil {
		returnError := fmt.Errorf("cmd.StdinPipe: %w", err)
		return nil, nil, nil, returnError
	}
	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		returnError := fmt.Errorf("cmd.StdoutPipe: %w", err)
		return nil, nil, nil, returnError
	}
	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		returnError := fmt.Errorf("cmd.StderrPipe: %w", err)
		return nil, nil, nil, returnError
	}

	// Start the command
	if err := cmd.Start(); err != nil {
		returnError := fmt.Errorf("cmd.Start: %w", err)
		return nil, nil, nil, returnError
	}

	stdin = make(chan string)
	go func() {
		defer func() {
			stdinPipe.Close()
			close(stdin)
		}()
		for message := range stdin {
			fmt.Fprintln(stdinPipe, message)
		}
	}()

	stdout = make(chan string)
	go func() {
		defer func() {
			stdoutPipe.Close()
			close(stdout)
		}()
		// Scan line-by-line
		scanner := bufio.NewScanner(stdoutPipe)
		scanner.Buffer(make([]byte, 1024*1024), 1024*1024)
		for scanner.Scan() {
			if line := scanner.Text(); line != "" {
				stdout <- line
			}
		}
	}()

	stderr = make(chan string)
	go func() {
		defer func() {
			stderrPipe.Close()
			close(stderr)
		}()
		// Scan once
		scanner := bufio.NewScanner(stderrPipe)
		scanner.Split(func(data []byte, atEOF bool) (advance int, token []byte, err error) {
			return len(data), data, nil
		})
		scanner.Scan()
		if text := scanner.Text(); text != "" {
			stderr <- strings.TrimRight(
				text,
				"\n", // Remove the EOF
			)
		}
	}()

	return stdin, stdout, stderr, nil
}

////////////////////////////////////////////////////////////////////////////////

func main() {
	stdin, stdout, stderr, err := NewCommand("node", "stdio.js")
	if err != nil {
		panic(fmt.Errorf("NewCommand: %w", err))
	}
	stdin <- "Hello, world!"

	defer func() {
		stdin <- "done"
	}()

loop:
	for {
		select {
		case line := <-stdout:
			fmt.Println(decorateStdoutLine(string(line)))
		case text := <-stderr:
			fmt.Println(decorateStderrText(string(text)))
			break loop
		}
	}

	fmt.Println("Hello, world!")
}
