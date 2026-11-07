package main

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"

	"agenttm/internal/project"
)

func runRelease(options releaseOptions) error {
	if !regexp.MustCompile(`^[0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9.-]+)?$`).MatchString(options.version) {
		return fmt.Errorf("invalid release version")
	}
	root, err := os.Getwd()
	if err != nil {
		return err
	}
	out, err := filepath.Abs(options.output)
	if err != nil {
		return err
	}
	if err = project.SafePath(out); err != nil {
		return err
	}
	if options.verifyOnly {
		if err = verifyRelease(out, options.version); err != nil {
			return err
		}
		if options.requireAll {
			return verifyExpectedTargets(out, options.version, options.desktop)
		}
		return nil
	}
	if options.desktop && (runtime.GOOS != "windows" || runtime.GOARCH != "amd64" || !strings.Contains(","+options.targets+",", ",windows/amd64,")) {
		return fmt.Errorf("--desktop-windows requires a Windows amd64 host and windows/amd64 in --targets")
	}
	if err = os.MkdirAll(out, 0700); err != nil {
		return err
	}
	temp, err := os.MkdirTemp(out, ".build-")
	if err != nil {
		return err
	}
	defer func() {
		if store, e := os.OpenRoot(out); e == nil {
			_ = store.RemoveAll(filepath.Base(temp))
			store.Close()
		}
	}()
	builder := releaseBuilder{options: options, root: root, out: out, temp: temp, checksums: map[string]string{}}
	if err = builder.loadDocuments(); err != nil {
		return err
	}
	for _, target := range strings.Split(options.targets, ",") {
		if err = builder.buildCLI(target); err != nil {
			return err
		}
	}
	if options.desktop {
		if err = builder.buildDesktop(); err != nil {
			return err
		}
	}
	if err = builder.writeChecksums(); err != nil {
		return err
	}
	fmt.Println("Archives and SHA256SUMS:", out)
	return verifyRelease(out, options.version)
}
