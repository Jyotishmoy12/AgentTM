package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

func (b *releaseBuilder) buildCLI(target string) error {
	platform, err := parseReleaseTarget(target)
	if err != nil {
		return err
	}
	targetDir := filepath.Join(b.temp, platform.os+"-"+platform.arch)
	if err = os.Mkdir(targetDir, 0700); err != nil {
		return err
	}
	fmt.Println("Building", target)
	output := filepath.Join(targetDir, platform.binary)
	if err = b.cliBuildCommand(platform, output).Run(); err != nil {
		return err
	}
	executable, err := os.ReadFile(output)
	if err != nil {
		return err
	}
	if target == "windows/amd64" {
		b.windowsCLI = executable
	}
	name := "agenttm_" + b.options.version + "_" + platform.os + "_" + platform.arch + platform.extension
	return b.writeArchive(name, platform.binary, b.archiveFiles(platform.binary, executable, b.documents.readme))
}

func (b *releaseBuilder) cliBuildCommand(target releaseTarget, output string) *exec.Cmd {
	flags := "-s -w -X agenttm/internal/cli.Version=" + b.options.version + " -X agenttm/internal/cli.Commit=" + b.commit + " -X agenttm/internal/cli.BuildDate=" + b.date
	command := exec.Command("go", "build", "-trimpath", "-ldflags", flags, "-o", output, "./cmd/agenttm")
	command.Dir = b.root
	command.Env = append(os.Environ(), "GOOS="+target.os, "GOARCH="+target.arch, "CGO_ENABLED=0")
	command.Stdout = os.Stdout
	command.Stderr = os.Stderr
	return command
}
