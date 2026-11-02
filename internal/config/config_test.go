package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestLoad(t *testing.T) {
	p := filepath.Join(t.TempDir(), "config.json")
	c := Default()
	b, _ := json.Marshal(c)
	if e := os.WriteFile(p, b, 0600); e != nil {
		t.Fatal(e)
	}
	got, e := Load(p)
	if e != nil || got.SchemaVersion != 1 {
		t.Fatalf("%+v %v", got, e)
	}
	for _, bad := range []string{`{"schema_version":99}`, `{"unknown":true}`, `{"capture":{"prompt_mode":"raw"}}`, `{"server":{"host":"0.0.0.0"}}`, `{} {}`, `null`, `{"storage":{"max_file_bytes":-1}}`, `{"storage":{"max_file_bytes":67108865}}`, `{"exclude":["../escape"]}`, `{"exclude":["["]}`} {
		os.WriteFile(p, []byte(bad), 0600)
		if _, e := Load(p); e == nil {
			t.Errorf("accepted %s", bad)
		}
	}
}
