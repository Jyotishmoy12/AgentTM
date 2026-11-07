package cli

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func runCLIChild() {
	args := strings.Join(os.Args[1:], " ")
	if args == "--version" {
		fmt.Println("codex-cli synthetic-test")
		os.Exit(0)
	}
	if args == "exec --help" {
		fmt.Println("--json")
		os.Exit(0)
	}
	if args == "login status" {
		if os.Getenv("AGENTTM_CLI_TEST_LOGIN_ERROR") == "1" {
			os.Exit(1)
		}
		os.Exit(0)
	}
	task, _ := io.ReadAll(os.Stdin)
	mode := string(task)
	fmt.Println(`{"type":"turn.started"}`)
	if mode == "operation" {
		fmt.Println(`{"type":"item.started","item":{"id":"operation-1","type":"command_execution","status":"in_progress"}}`)
	}
	if mode != "unchanged" {
		if err := os.WriteFile("observed.txt", []byte("written by synthetic child"), 0600); err != nil {
			os.Exit(9)
		}
	}
	if mode == "operation" {
		fmt.Println(`{"type":"item.completed","item":{"id":"operation-1","type":"command_execution","status":"completed","exit_code":0}}`)
	}
	if mode == "final-failure" {
		if err := os.WriteFile(filepath.Join(".agenttm", "data", "snapshot.lock"), []byte("synthetic lock"), 0600); err != nil {
			os.Exit(9)
		}
	}
	switch mode {
	case "cancel":
		time.Sleep(time.Minute)
	case "fail":
		fmt.Println(`{"type":"turn.failed","error":{"message":"synthetic failure"}}`)
		os.Exit(7)
	default:
		fmt.Println(`{"type":"turn.completed"}`)
		os.Exit(0)
	}
	os.Exit(0)
}
