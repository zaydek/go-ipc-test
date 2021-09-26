package main

import "os"

func main() {
	if err := os.WriteFile("deleteme", []byte("<eof>"), 0666); err != nil {
		panic(err)
	}
}
