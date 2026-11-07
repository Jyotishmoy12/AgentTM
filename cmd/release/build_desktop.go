package main

import (
	"os"
	"os/exec"
	"path/filepath"
)

func (b *releaseBuilder) buildDesktop() error {
	output := filepath.Join(b.temp, "AgentTM.exe")
	if err := b.desktopBuildCommand(output).Run(); err != nil {
		return err
	}
	binary, err := os.ReadFile(output)
	if err != nil {
		return err
	}
	name := "agenttm-desktop_" + b.options.version + "_windows_amd64.zip"
	files := b.archiveFiles("AgentTM.exe", binary, releaseReadme(b.options.version, true))
	files["agenttm-cli.exe"] = b.windowsCLI
	return b.writeArchive(name, "AgentTM.exe", files)
}

func (b *releaseBuilder) desktopBuildCommand(output string) *exec.Cmd {
	flags := "-H windowsgui -s -w -X agenttm/internal/cli.Version=" + b.options.version + " -X agenttm/internal/cli.Commit=" + b.commit + " -X agenttm/internal/cli.BuildDate=" + b.date
	command := exec.Command("go", "build", "-trimpath", "-tags", "production", "-ldflags", flags, "-o", output, "./cmd/agenttm-desktop")
	command.Dir = b.root
	command.Env = append(os.Environ(), "CGO_ENABLED=0")
	command.Stdout = os.Stdout
	command.Stderr = os.Stderr
	return command
}
