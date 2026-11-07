package events

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestNormalize(t *testing.T) {
	for _, line := range []string{`{"type":"item.completed"}`, `{"type":"future","password":"hunter2"}`, `broken`, `null`} {
		r := Normalize([]byte(line), 1024, "")
		if !json.Valid(r.Payload) {
			t.Errorf("invalid payload: %s", r.Payload)
		}
		if strings.Contains(string(r.Payload), "hunter2") {
			t.Fatal("unknown secret retained")
		}
	}
	r := Normalize([]byte(`{"type":"item.completed","item":{"type":"command_execution","id":"item_1","command":"echo sk-abcdefghijklmnop","aggregated_output":"my private task","exit_code":0}}`), 1024, "my private task")
	if r.Tool != "command_execution" || r.Call != "item_1" || strings.Contains(string(r.Payload), "sk-abcdefghijklmnop") || strings.Contains(string(r.Payload), "my private task") {
		t.Fatalf("bad normalization: %+v", r)
	}
	r = Normalize([]byte(`{"type":"item.completed","item":{"type":"reasoning","text":"hidden text"}}`), 1024, "")
	if strings.Contains(string(r.Payload), "hidden text") {
		t.Fatal("reasoning persisted")
	}
	r = Normalize([]byte(`{"type":"error","message":"`+strings.Repeat("秘密", 10000)+`"}`), 1024, "")
	if len(r.Payload) > 1024 || !json.Valid(r.Payload) || !strings.Contains(string(r.Payload), "truncated") {
		t.Fatalf("invalid truncation %d", len(r.Payload))
	}
}

func TestEmbeddedSecretsAndUsageCounters(t *testing.T) {
	r := Normalize([]byte(`{"type":"error","message":"{\"api_key\":\"do-not-store\"}"}`), 4096, "")
	if strings.Contains(string(r.Payload), "do-not-store") {
		t.Fatal("embedded JSON secret leaked")
	}
	r = Normalize([]byte(`{"type":"turn.completed","usage":{"reasoning_output_tokens":12,"cache_write_input_tokens":34,"access_token":"do-not-store"}}`), 4096, "")
	if strings.Contains(string(r.Payload), "do-not-store") || !strings.Contains(string(r.Payload), `"reasoning_output_tokens":12`) || !strings.Contains(string(r.Payload), `"cache_write_input_tokens":34`) {
		t.Fatal("usage redaction lost numeric counters")
	}
}
