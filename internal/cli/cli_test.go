package cli

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"testing"

	"agenttm/internal/events"
	"agenttm/internal/storage"
)

func TestCLIAndObservedFixture(t *testing.T) {
	fixture, e := os.ReadFile(filepath.Join("..", "..", "tests", "fixtures", "codex-real-failed.jsonl"))
	if e != nil {
		t.Fatal(e)
	}
	root := t.TempDir()
	if b, e := exec.Command("git", "init", root).CombinedOutput(); e != nil {
		t.Fatalf("%s %v", b, e)
	}
	t.Chdir(root)
	var out, stderr bytes.Buffer
	run := func(args ...string) int {
		out.Reset()
		stderr.Reset()
		return Run(context.Background(), args, &out, &stderr)
	}
	if code := run("version"); code != 0 || !bytes.Contains(out.Bytes(), []byte(Version)) {
		t.Fatal("version failed", stderr.String())
	}
	if code := run("init"); code != 0 {
		t.Fatal("init failed", stderr.String())
	}
	if code := run("init"); code != 0 {
		t.Fatal("idempotent init failed", stderr.String())
	}
	if code := run("sessions"); code != 0 || !bytes.Contains(out.Bytes(), []byte("No sessions")) {
		t.Fatal("empty sessions failed", stderr.String())
	}
	s, e := storage.Open(root)
	if e != nil {
		t.Fatal(e)
	}
	id, e := s.Start()
	if e != nil {
		t.Fatal(e)
	}
	count := 0
	e = events.ReadJSONL(bytes.NewReader(fixture), 4<<20, func(b []byte, oversized bool) error {
		count++
		r := events.Normalize(b, 65536, "")
		return s.Append(id, r.Kind, r.Tool, r.Call, r.Payload)
	})
	if e != nil {
		t.Fatal(e)
	}
	if e = s.Finish(id, "failed", 1); e != nil {
		t.Fatal(e)
	}
	s.DB.Close()
	if code := run("sessions"); code != 0 || !bytes.Contains(out.Bytes(), []byte("failed")) {
		t.Fatal("sessions failed", stderr.String())
	}
	if code := run("events", id, "--limit", "2"); code != 0 {
		t.Fatal(stderr.String())
	}
	var ev storage.Event
	dec := json.NewDecoder(&out)
	for i := 0; i < 2; i++ {
		if e = dec.Decode(&ev); e != nil {
			t.Fatal(e)
		}
		if ev.Sequence != int64(i+1) {
			t.Fatal("wrong sequence")
		}
	}
	if code := run("events", id, "--after", "4"); code != 0 {
		t.Fatal(stderr.String())
	}
	if e = json.Unmarshal(bytes.TrimSpace(out.Bytes()), &ev); e != nil || ev.Kind != "turn.failed" || count != 5 {
		t.Fatalf("bad real fixture ingestion: %+v %v", ev, e)
	}
	if code := run("events", id, "--limit", "1001"); code == 0 {
		t.Fatal("unbounded output accepted")
	}
	if code := run("fork", "anything"); code != 2 {
		t.Fatal("unsupported command not rejected")
	}
}
