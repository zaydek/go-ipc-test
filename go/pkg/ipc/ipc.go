package ipc

import (
	"bufio"
	"fmt"
	"os/exec"
	"strings"
)

// Starts a long-lived IPC process. stdout messages are read line-by-line
// whereas stderr messages are read once.
func NewCommand(args ...string) (stdin, stdout, stderr chan string, err error) {
	cmd := exec.Command(args[0], args[1:]...)

	// The ready channels orchestrate the goroutines. This blocks the goroutines
	// in the event the command errs. If the command errs without the ready
	// channels, Go panics:
	//
	//   panic: bufio.Scan: too many empty tokens without progressing
	//
	// Or:
	//
	//   panic: close of nil channel
	//
	var (
		r1 = make(chan struct{})
		r2 = make(chan struct{})
		r3 = make(chan struct{})

		// Describes whether to eagerly return from the goroutines
		statusIsHealthy = false
	)

	// Process stdin
	stdinPipe, err := cmd.StdinPipe()
	if err != nil {
		return nil, nil, nil, err
	}
	stdin = make(chan string)
	go func() {
		defer stdinPipe.Close()
		<-r1
		if !statusIsHealthy {
			return
		}
		for str := range stdin {
			fmt.Fprintln(stdinPipe, str) // Add EOF
		}
	}()

	// Process stdout
	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		return nil, nil, nil, err
	}
	stdout = make(chan string)
	go func() {
		defer func() {
			stdoutPipe.Close()
			close(stdout)
		}()
		<-r2
		if !statusIsHealthy {
			return
		}
		scanner := bufio.NewScanner(stdoutPipe)
		scanner.Buffer(
			make([]byte, 1024*1024), // Buffer
			1024*1024,               // Buffer length
		)
		for scanner.Scan() {
			if stdoutLine := scanner.Text(); stdoutLine != "" {
				stdout <- stdoutLine
			}
		}
		if err := scanner.Err(); err != nil {
			panic(err)
		}
	}()

	// Process stderr
	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		return nil, nil, nil, err
	}
	stderr = make(chan string)
	go func() {
		defer func() {
			stderrPipe.Close()
			close(stderr)
		}()
		<-r3
		if !statusIsHealthy {
			return
		}
		// NOTE: Use `scanner.Split` instead of `scanner.Buffer` because
		// `scanner.Buffer` only captures the first line of stderr for Node.js
		// exceptions
		scanner := bufio.NewScanner(stderrPipe)
		scanner.Split(func(data []byte, atEOF bool) (advance int, token []byte, err error) {
			return len(data), data, nil
		})
		for scanner.Scan() {
			if stderrMultiline := scanner.Text(); stderrMultiline != "" {
				stderr <- strings.TrimRight(stderrMultiline, "\n")
			}
			// // Add a micro-delay to prevent Go from panicking:
			// //
			// //   panic: bufio.Scan: too many empty tokens without progressing
			// //
			// time.Sleep(10 * time.Millisecond)
		}
		if err := scanner.Err(); err != nil {
			panic(err)
		}
	}()

	// Start the command
	if err := cmd.Start(); err != nil {
		return nil, nil, nil, err
	}

	statusIsHealthy = true // Takes precedence
	r1 <- struct{}{}
	r2 <- struct{}{}
	r3 <- struct{}{}

	return stdin, stdout, stderr, nil
}
