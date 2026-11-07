package cli

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"agenttm/internal/storage"
)

func TestRecordingOperationFlagsAndFinalFailure(t *testing.T) {
	installCLIChild(t)
	for _, mode := range []string{"enabled", "disabled", "final-failure"} {
		t.Run(mode, func(t *testing.T) {
			root := initializeCLIProject(t)
			task := "operation"
			if mode == "final-failure" {
				task = mode
			}
			args := []string{"run", "codex", fmt.Sprintf("--snapshot-after-tool=%t", mode != "disabled"), "--", task}
			var out, diagnostic bytes.Buffer
			code := Run(context.Background(), args, &out, &diagnostic)
			wantCode, wantStatus := 0, "completed"
			if mode == "final-failure" {
				wantCode, wantStatus = 1, "recording_failed"
			}
			if code != wantCode || out.Len() != 0 {
				t.Fatalf("recording output/exit changed: %d, %s", code, diagnostic.String())
			}
			s, err := storage.Open(root)
			if err != nil {
				t.Fatal(err)
			}
			defer s.DB.Close()
			sessions, err := s.Sessions()
			if err != nil || len(sessions) != 1 || sessions[0].Status != wantStatus || sessions[0].ExitCode.Int64 != int64(wantCode) {
				t.Fatalf("session finalization changed: %+v, %v", sessions, err)
			}
			id := sessions[0].ID
			log, err := os.ReadFile(filepath.Join(root, ".agenttm", "logs", id+".json"))
			if err != nil {
				t.Fatal(err)
			}
			var summary map[string]any
			if err = json.Unmarshal(log, &summary); err != nil || summary["status"] != wantStatus {
				t.Fatalf("operational summary changed: %s, %v", log, err)
			}
			if mode == "final-failure" {
				if summary["exit_code"] != float64(0) || !strings.Contains(diagnostic.String(), "Final snapshot failed") {
					t.Fatal("process success hid the final capture failure")
				}
				return
			}
			operations, err := s.Operations(id, 0, 100)
			if err != nil || len(operations) != 1 || operations[0].Status != "completed" {
				t.Fatalf("operation recording changed: %+v, %v", operations, err)
			}
			operation := operations[0]
			if mode == "disabled" {
				if operation.CaptureStatus != "disabled" || operation.Before != "" || operation.After != "" {
					t.Fatalf("disabled observations captured files: %+v", operation)
				}
			} else if operation.CaptureStatus != "complete" || operation.Before == "" || operation.After == "" || operation.Before == operation.After {
				t.Fatalf("operation checkpoint boundaries lost: %+v", operation)
			}
			out.Reset()
			if code = Run(context.Background(), []string{"operations", id, "--limit", "1"}, &out, &diagnostic); code != 0 {
				t.Fatal(diagnostic.String())
			}
			var observed storage.Operation
			if err = json.Unmarshal(out.Bytes(), &observed); err != nil || observed.ID != operation.ID {
				t.Fatalf("operations command changed: %s, %v", out.String(), err)
			}
			out.Reset()
			if code = Run(context.Background(), []string{"operations", id, "--after", fmt.Sprint(operation.Cursor)}, &out, &diagnostic); code != 0 || out.Len() != 0 {
				t.Fatalf("operation cursor changed: %d, %s", code, diagnostic.String())
			}
		})
	}
}
