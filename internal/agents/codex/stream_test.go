package codex

import (
	"context"
	"errors"
	"os"
	"strings"
	"testing"
	"time"

	"agenttm/internal/events"
)

func TestIncompleteAndFailedStreamsRemainFailures(t *testing.T) {
	t.Setenv("AGENTTM_TEST_CHILD", "1")
	a := Adapter{Executable: os.Args[0], MaxPayload: 1024}
	for _, task := range []string{"no-completion", "failed-with-zero-exit", "nonzero-after-completion"} {
		t.Run(task, func(t *testing.T) {
			result, err := a.Run(context.Background(), t.TempDir(), task, func(events.Record) error { return nil })
			if err == nil {
				t.Fatalf("invalid stream accepted: %+v", result)
			}
			if task == "failed-with-zero-exit" && (!result.Failed || result.ExitCode != 0) {
				t.Fatalf("failure event was lost: %+v", result)
			}
			if task == "nonzero-after-completion" && (!result.Completed || result.ExitCode != 9) {
				t.Fatalf("process failure was hidden by completion: %+v", result)
			}
		})
	}
}

func TestOversizedStreamDrainsAndPreservesCompletion(t *testing.T) {
	t.Setenv("AGENTTM_TEST_CHILD", "1")
	a := Adapter{Executable: os.Args[0], MaxPayload: 1024}
	oversized := 0
	result, err := a.Run(context.Background(), t.TempDir(), "oversized", func(record events.Record) error {
		if record.Kind == "oversized" {
			oversized++
			if len(record.Payload) > 1024 || !strings.Contains(string(record.Payload), `"omitted":true`) {
				t.Errorf("unsafe oversized payload: %s", record.Payload)
			}
		}
		if strings.Contains(string(record.Payload), "must not persist") {
			t.Error("unknown event leaked raw source content")
		}
		return nil
	})
	if err != nil || !result.Completed || result.ExitCode != 0 || oversized != 1 {
		t.Fatalf("oversized stream did not recover: %+v, %v, oversized=%d", result, err, oversized)
	}
}

func TestSinkFailureAndCancellationReapActiveChild(t *testing.T) {
	t.Setenv("AGENTTM_TEST_CHILD", "1")
	a := Adapter{Executable: os.Args[0], MaxPayload: 1024}
	storageErr := errors.New("synthetic storage failure")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := a.Run(ctx, t.TempDir(), "wait-after-event", func(events.Record) error { return storageErr })
	if !errors.Is(err, storageErr) {
		t.Fatalf("sink error was not preserved: %v", err)
	}
	ctx, stop := context.WithCancel(context.Background())
	defer stop()
	result, err := a.Run(ctx, t.TempDir(), "wait-after-event", func(events.Record) error { stop(); return nil })
	if !errors.Is(err, context.Canceled) || result.ExitCode != 130 {
		t.Fatalf("cancellation contract changed: %+v, %v", result, err)
	}
}
