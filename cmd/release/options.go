package main

import (
	"flag"
	"fmt"
	"strings"
)

func readReleaseOptions() releaseOptions {
	version := flag.String("version", "0.1.0", "release semantic version")
	output := flag.String("out", "dist", "new archive output directory")
	targets := flag.String("targets", "windows/amd64,windows/arm64,linux/amd64,linux/arm64,darwin/amd64,darwin/arm64", "comma-separated GOOS/GOARCH targets")
	desktop := flag.Bool("desktop-windows", false, "also package the native Windows amd64 desktop preview (Windows amd64 host required)")
	verifyOnly := flag.Bool("verify-only", false, "verify existing archive checksums, contents, and executable modes without building")
	requireAll := flag.Bool("require-all-targets", false, "verification also requires all six CLI platform archives")
	flag.Parse()
	return releaseOptions{
		version: *version, output: *output, targets: *targets,
		desktop: *desktop, verifyOnly: *verifyOnly, requireAll: *requireAll,
	}
}

func parseReleaseTarget(target string) (releaseTarget, error) {
	parts := strings.Split(target, "/")
	if len(parts) != 2 || parts[0] != "windows" && parts[0] != "linux" && parts[0] != "darwin" || parts[1] != "amd64" && parts[1] != "arm64" {
		return releaseTarget{}, fmt.Errorf("unsupported release target %q", target)
	}
	result := releaseTarget{os: parts[0], arch: parts[1], binary: "agenttm", extension: ".tar.gz"}
	if result.os == "windows" {
		result.binary += ".exe"
		result.extension = ".zip"
	}
	return result, nil
}
