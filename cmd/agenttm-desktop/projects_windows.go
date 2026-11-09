//go:build windows

package main

import (
	"fmt"
	"os"
	"os/exec"

	"agenttm/internal/cli"
	desktopproject "agenttm/internal/desktop"
	"agenttm/internal/project"
	"agenttm/internal/server"
	"agenttm/internal/snapshot"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (d *Desktop) attach(engine *snapshot.Engine) {
	d.root = engine.Root
	d.engine = engine
	d.chat.Engine = engine
	d.launcher.Set(server.NewDesktop(engine, cli.Version))
}

func (d *Desktop) ChooseProject() (bool, error) {
	return d.chooseProject(func() (string, error) {
		return runtime.OpenDirectoryDialog(d.ctx, runtime.OpenDialogOptions{Title: "Choose an existing Git project"})
	}, func(root string) (bool, error) {
		return confirmNativeAction(d.ctx, "Initialize AgentTM history?",
			"Create local AgentTM history in:\n"+root+"\n\nThis creates .agenttm and adds it to the local Git exclusion file. It does not create a commit or change your tracked files.", runtime.MessageDialog)
	})
}

func (d *Desktop) chooseProject(pick func() (string, error), confirm func(string) (bool, error)) (bool, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.engine != nil {
		return false, fmt.Errorf("a project is already open; close and reopen AgentTM to choose another")
	}
	directory := d.pendingProject
	d.pendingProject = ""
	var err error
	if directory == "" {
		directory, err = pick()
	}
	if err != nil || directory == "" {
		return false, err
	}
	engine, err := desktopproject.Open(directory, confirm)
	if err != nil || engine == nil {
		return false, err
	}
	d.attach(engine)
	return true, nil
}

func (d *Desktop) ProjectPath() (string, error) {
	d.mu.Lock()
	defer d.mu.Unlock()
	if d.engine == nil {
		return "", fmt.Errorf("open a Git project first")
	}
	return d.root, nil
}

func projectWindowCommand(executable, root string) *exec.Cmd {
	command := exec.Command(executable, "--project", root)
	command.Dir = root
	return command
}

func (d *Desktop) OpenProjectWindow() (bool, error) {
	directory, err := runtime.OpenDirectoryDialog(d.ctx, runtime.OpenDialogOptions{Title: "Open a Git project in another AgentTM window"})
	if err != nil || directory == "" {
		return false, err
	}
	root, err := project.Root(directory)
	if err != nil {
		return false, fmt.Errorf("choose an existing Git working tree: %w", err)
	}
	executable, err := os.Executable()
	if err != nil {
		return false, err
	}
	command := projectWindowCommand(executable, root)
	if err = command.Start(); err != nil {
		return false, err
	}
	_ = command.Process.Release()
	return true, nil
}
