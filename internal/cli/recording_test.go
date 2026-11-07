package cli

import (
	"bytes"
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"

	"agenttm/internal/config"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
)

func TestRecordingSnapshots(t *testing.T) {
	installCLIChild(t)
	var err error
	for _, mode := range []string{"unchanged", "success", "fail", "cancel", "baseline-failure"} {
		t.Run(mode, func(t *testing.T) {
			root := t.TempDir()
			if b, err := exec.Command("git", "init", root).CombinedOutput(); err != nil {
				t.Fatalf("%s %v", b, err)
			}
			t.Chdir(root)
			var out, errOut bytes.Buffer
			if code := Run(context.Background(), []string{"init"}, &out, &errOut); code != 0 {
				t.Fatal(errOut.String())
			}
			if err = os.WriteFile("before.txt", []byte("baseline"), 0600); err != nil {
				t.Fatal(err)
			}
			if mode == "baseline-failure" {
				if err = os.WriteFile(filepath.Join(root, ".agenttm", "data", "snapshot.lock"), []byte("stale"), 0600); err != nil {
					t.Fatal(err)
				}
			}
			ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
			defer cancel()
			if mode == "cancel" {
				go func() {
					ticker := time.NewTicker(20 * time.Millisecond)
					defer ticker.Stop()
					for {
						select {
						case <-ctx.Done():
							return
						case <-ticker.C:
							if _, err := os.Stat(filepath.Join(root, "observed.txt")); err == nil {
								cancel()
								return
							}
						}
					}
				}()
			}
			code := Run(ctx, []string{"run", "codex", "--", mode}, &out, &errOut)
			want := 0
			if mode == "fail" {
				want = 7
			}
			if mode == "cancel" {
				want = 130
			}
			if mode == "baseline-failure" {
				want = 1
			}
			if code != want {
				t.Fatalf("exit %d want %d: %s", code, want, errOut.String())
			}
			s, err := storage.Open(root)
			if err != nil {
				t.Fatal(err)
			}
			defer s.DB.Close()
			sessions, err := s.Sessions()
			if err != nil || len(sessions) != 1 {
				t.Fatalf("%+v %v", sessions, err)
			}
			session := sessions[0]
			if mode == "baseline-failure" {
				if session.Status != "recording_failed" {
					t.Fatal("baseline failure reported successful")
				}
				if _, err = os.Stat("observed.txt"); !os.IsNotExist(err) {
					t.Fatal("child launched after baseline failure")
				}
				return
			}
			status := "completed"
			if mode == "fail" {
				status = "failed"
			}
			if mode == "cancel" {
				status = "cancelled"
			}
			if session.Status != status {
				t.Fatalf("status %+v", session)
			}
			engine := snapshot.Engine{Root: root, Store: s, Config: config.Default()}
			cps, err := engine.List(session.ID)
			if err != nil {
				t.Fatal(err)
			}
			count := 2
			if mode == "unchanged" {
				count = 1
			}
			if len(cps) != count {
				t.Fatalf("checkpoints %d want %d", len(cps), count)
			}
			if cps[0].Kind != "baseline" {
				t.Fatal("no baseline")
			}
			if mode != "unchanged" {
				b, err := engine.File(cps[1].ID, "observed.txt")
				if err != nil || string(b) != "written by synthetic child" {
					t.Fatalf("final checkpoint missing child changes %s %v", b, err)
				}
			}
			events, err := s.Events(session.ID, 0, 100)
			if err != nil {
				t.Fatal(err)
			}
			found := false
			for _, v := range events {
				if v.Kind == "agenttm.snapshot.final" && v.CheckpointID == cps[len(cps)-1].ID {
					found = true
				}
			}
			if !found {
				t.Fatal("final observation not linked")
			}
			for _, cmd := range [][]string{{"checkpoints", session.ID}, {"show", cps[0].ID}, {"cat", cps[0].ID, "before.txt"}, {"diff", cps[len(cps)-1].ID}} {
				out.Reset()
				errOut.Reset()
				if code := Run(context.Background(), cmd, &out, &errOut); code != 0 {
					t.Fatalf("%v: %s", cmd, errOut.String())
				}
			}
		})
	}
}
