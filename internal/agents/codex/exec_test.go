package codex

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
	"testing"
	"time"

	"agenttm/internal/events"
)

// A synthetic child process exercises supervision, never serves as a real Codex
// integration claim. Observed real CLI fixtures live separately in tests/fixtures.
func TestMain(m *testing.M) {
	if os.Getenv("AGENTTM_TEST_CHILD") == "1" {
		args := strings.Join(os.Args[1:], " ")
		if args == "--version" {
			fmt.Println("codex-cli synthetic-test")
			os.Exit(0)
		}
		if args == "exec --help" {
			fmt.Println("--json")
			os.Exit(0)
		}
		task, _ := io.ReadAll(os.Stdin)
		if strings.Contains(string(task), "sleep") {
			time.Sleep(time.Minute)
			os.Exit(0)
		}
		fmt.Println(`{"type":"thread.started","thread_id":"test-thread"}`)
		fmt.Println(`malformed`)
		fmt.Println(`{"type":"future.event","secret":"must not persist"}`)
		if strings.Contains(string(task), "fail") {
			fmt.Println(`{"type":"turn.failed","error":{"message":"test failure"}}`)
			os.Exit(7)
		}
		fmt.Println(`{"type":"turn.completed","usage":{"input_tokens":1,"output_tokens":1}}`)
		os.Exit(0)
	}
	os.Exit(m.Run())
}
func TestLifecycle(t *testing.T) {
	t.Setenv("AGENTTM_TEST_CHILD", "1")
	a := Adapter{Executable: os.Args[0], MaxPayload: 1024}
	if _, e := a.Available(context.Background()); e != nil {
		t.Fatal(e)
	}
	var kinds []string
	sink := func(r events.Record) error { kinds = append(kinds, r.Kind); return nil }
	r, e := a.Run(context.Background(), t.TempDir(), "success", sink)
	if e != nil || r.ExitCode != 0 || !r.Completed || len(kinds) != 4 {
		t.Fatalf("%+v %v %v", r, e, kinds)
	}
	r, e = a.Run(context.Background(), t.TempDir(), "fail", sink)
	if e == nil || r.ExitCode != 7 || !r.Failed {
		t.Fatalf("%+v %v", r, e)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
	defer cancel()
	r, e = a.Run(ctx, t.TempDir(), "sleep", sink)
	if e == nil || r.ExitCode != 130 {
		t.Fatalf("cancellation: %+v %v", r, e)
	}
	_, e = a.Run(context.Background(), t.TempDir(), "success", func(events.Record) error { return errors.New("storage failed") })
	if e == nil {
		t.Fatal("recording failure ignored")
	}
}
