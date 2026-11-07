package codex

import (
	"fmt"
	"io"
	"os"
	"strings"
	"time"
)

func runCodexFixture() {
	args := strings.Join(os.Args[1:], " ")
	mode := os.Getenv("AGENTTM_TEST_CODEX_MODE")
	if args == "--version" {
		if mode == "version-fails" {
			fmt.Fprintln(os.Stderr, "private configuration must not escape")
			os.Exit(2)
		}
		if mode == "version-secret" {
			fmt.Println("codex-cli access_token=private-test-token")
			return
		}
		fmt.Println("codex-cli synthetic-test")
		return
	}
	if args == "exec --help" {
		if mode == "help-fails" {
			os.Exit(2)
		}
		if mode == "no-json" {
			fmt.Println("exec without machine output")
			return
		}
		fmt.Println("--json")
		return
	}
	task, _ := io.ReadAll(os.Stdin)
	if strings.Contains(string(task), "sleep") {
		time.Sleep(time.Minute)
		return
	}
	fmt.Println(`{"type":"thread.started","thread_id":"test-thread"}`)
	if string(task) == "wait-after-event" {
		time.Sleep(time.Minute)
		return
	}
	fmt.Println(`malformed`)
	fmt.Println(`{"type":"future.event","secret":"must not persist"}`)
	if string(task) == "oversized" {
		fmt.Println(strings.Repeat("x", (4<<20)+1))
	}
	if string(task) == "no-completion" {
		return
	}
	if string(task) == "failed-with-zero-exit" {
		fmt.Println(`{"type":"turn.failed","error":{"message":"test failure"}}`)
		return
	}
	if strings.Contains(string(task), "fail") {
		fmt.Println(`{"type":"turn.failed","error":{"message":"test failure"}}`)
		os.Exit(7)
	}
	fmt.Println(`{"type":"turn.completed","usage":{"input_tokens":1,"output_tokens":1}}`)
	if string(task) == "nonzero-after-completion" {
		os.Exit(9)
	}
}
