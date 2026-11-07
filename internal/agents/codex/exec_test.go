package codex

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"agenttm/internal/events"
)

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
