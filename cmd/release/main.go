package main

import (
	"fmt"
	"os"
)

func main() {
	if err := release(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func release() error {
	return runRelease(readReleaseOptions())
}
