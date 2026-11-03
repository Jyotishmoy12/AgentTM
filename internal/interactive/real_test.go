package interactive

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// Opt-in live acceptance test. Normal unit/CI tests never invoke a paid model.
func TestRealCodexModelCatalog(t *testing.T) {
	if os.Getenv("AGENTTM_REAL_CODEX") != "1" {
		t.Skip("opt-in real Codex catalog discovery")
	}
	root := t.TempDir()
	if specified := os.Getenv("AGENTTM_REAL_MODEL_ROOT"); specified != "" {
		root, _ = filepath.Abs(specified)
	}
	models, err := ListModels(context.Background(), "", root)
	if err != nil {
		t.Fatal(err)
	}
	if len(models) == 0 {
		t.Fatal("empty Codex model catalog")
	}
	t.Logf("discovered %d visible text models from the installed Codex CLI", len(models))
}

func TestRealCodexConversationResume(t *testing.T) {
	if os.Getenv("AGENTTM_REAL_CODEX") != "1" {
		t.Skip("set AGENTTM_REAL_CODEX=1 for a real Codex/model run")
	}
	model := os.Getenv("AGENTTM_REAL_MODEL")
	if model == "" {
		t.Fatal("set AGENTTM_REAL_MODEL to a model available to your account")
	}
	m := managerFixture(t)
	m.Executable = ""
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()
	wait := func() {
		t.Helper()
		for m.Status().Running {
			select {
			case <-ctx.Done():
				m.Stop()
				m.Shutdown()
				t.Fatal("real turn timed out")
			case <-time.After(100 * time.Millisecond):
			}
		}
		if state := m.Status(); state.Error != "" {
			t.Fatal(state.Error)
		}
		m.Shutdown()
	}
	id, err := m.Start(ctx, "", "Remember the token AGENTTM_HELLO_729. Reply only with that token. Do not call tools.", model, "read-only")
	if err != nil {
		t.Fatal(err)
	}
	wait()
	if _, err = m.Start(ctx, id, "What token did I ask you to remember? Reply only with that token. Do not call tools.", model, "read-only"); err != nil {
		t.Fatal(err)
	}
	wait()
	records, err := m.Engine.Store.Events(id, 0, 200)
	if err != nil {
		t.Fatal(err)
	}
	replies := 0
	for _, r := range records {
		var p struct {
			Item struct {
				Type string `json:"type"`
				Text string `json:"text"`
			} `json:"item"`
		}
		json.Unmarshal(r.Payload, &p)
		if r.Kind == "item.completed" && p.Item.Type == "agent_message" {
			replies++
			if !strings.Contains(p.Item.Text, "AGENTTM_HELLO_729") {
				t.Fatal("real reply did not retain the conversation token")
			}
		}
	}
	if replies < 2 {
		t.Fatalf("expected two real assistant replies, got %d", replies)
	}
	t.Logf("real two-turn Codex conversation recorded and resumed: %s", id)
}
