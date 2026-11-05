//go:build windows

package main

import (
	"os"
	"path/filepath"
	"testing"

	desktopproject "agenttm/internal/desktop"
	"agenttm/internal/interactive"
	"agenttm/internal/project"
)

func TestProjectWindowCommandKeepsSelectedDirectory(t *testing.T) {
	executable := `C:\Apps\Agent TM\AgentTM.exe`
	root := `C:\Projects\workspace with spaces`
	cmd := projectWindowCommand(executable, root)
	if cmd.Path != executable || len(cmd.Args) != 3 || cmd.Args[1] != "--project" || cmd.Args[2] != root || cmd.Dir != root {
		t.Fatalf("selected project was not passed intact: %#v", cmd)
	}
	if cmd.SysProcAttr != nil && cmd.SysProcAttr.HideWindow {
		t.Fatal("an interactive project window must not be launched hidden")
	}
}

func TestPendingProjectAttachesWithoutReplacingOpenWorkspace(t *testing.T) {
	root := t.TempDir()
	if _, err := project.Git(root, "init"); err != nil {
		t.Fatal(err)
	}
	if err := project.Init(root); err != nil {
		t.Fatal(err)
	}
	d := &Desktop{pendingProject: root, launcher: &desktopproject.Launcher{}, chat: &interactive.Manager{}}
	if _, err := d.ProjectPath(); err == nil {
		t.Fatal("reported a project before opening it")
	}
	opened, err := d.ChooseProject()
	if err != nil || !opened {
		t.Fatalf("selected project did not open: %v", err)
	}
	defer d.engine.Store.DB.Close()
	got, err := d.ProjectPath()
	if err != nil || filepath.Clean(got) != filepath.Clean(d.engine.Root) || d.pendingProject != "" {
		t.Fatalf("wrong project after open: %q, %v", got, err)
	}
	if d.chat.Engine != d.engine {
		t.Fatal("chat is not attached to the selected project")
	}
	original := d.engine
	if opened, err := d.ChooseProject(); err == nil || opened || d.engine != original {
		t.Fatal("an existing workspace was replaced")
	}
}

func TestPendingUninitializedProjectKeepsSelectionAndRequiresConsent(t *testing.T) {
	for _, consent := range []bool{false, true} {
		t.Run(map[bool]string{false: "cancel", true: "initialize"}[consent], func(t *testing.T) {
			root := t.TempDir()
			if _, err := project.Git(root, "init"); err != nil {
				t.Fatal(err)
			}
			root, err := project.Root(root)
			if err != nil {
				t.Fatal(err)
			}
			before, err := project.Git(root, "status", "--porcelain")
			if err != nil {
				t.Fatal(err)
			}
			d := &Desktop{pendingProject: root, launcher: &desktopproject.Launcher{}, chat: &interactive.Manager{}}
			confirmed := false
			opened, err := d.chooseProject(func() (string, error) {
				t.Fatal("the selected folder was discarded and the picker opened again")
				return "", nil
			}, func(selected string) (bool, error) {
				confirmed = true
				if selected != root {
					t.Fatalf("initialization asked for wrong project: %s", selected)
				}
				return consent, nil
			})
			if err != nil || opened != consent || !confirmed || d.pendingProject != "" {
				t.Fatalf("selection/consent failed: %v, %v", opened, err)
			}
			if !consent {
				if d.engine != nil {
					t.Fatal("attached a project after cancellation")
				}
				if _, err := os.Lstat(filepath.Join(root, ".agenttm")); !os.IsNotExist(err) {
					t.Fatal("cancellation wrote history")
				}
			} else {
				defer d.engine.Store.DB.Close()
				if d.root != root || d.chat.Engine != d.engine {
					t.Fatal("selected project was not attached")
				}
			}
			after, err := project.Git(root, "status", "--porcelain")
			if err != nil || before != after {
				t.Fatalf("changed working tree: %q -> %q, %v", before, after, err)
			}
		})
	}
}
