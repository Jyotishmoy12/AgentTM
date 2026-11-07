package config

import (
	"encoding/json"
	"reflect"
	"testing"
)

func TestDefaultJSONContractAndIndependentValues(t *testing.T) {
	const expected = `{"schema_version":1,"storage":{"max_file_bytes":2097152,"max_snapshot_bytes":209715200},"capture":{"prompt_mode":"metadata_only","max_event_payload_bytes":65536,"snapshot_after_tool":true},"exclude":[".env",".env.*","**/*.pem","**/*.key","node_modules/**","vendor/**","dist/**","build/**",".agenttm/**"],"server":{"host":"127.0.0.1","port":7331}}`
	first, second := Default(), Default()
	data, err := json.Marshal(first)
	if err != nil || string(data) != expected {
		t.Fatalf("default JSON contract changed: %s, %v", data, err)
	}
	first.Exclude[0] = "changed"
	if second.Exclude[0] != ".env" || Default().Exclude[0] != ".env" {
		t.Fatal("default exclusions share mutable storage")
	}
	loaded, err := loadJSON(t, `{}`)
	if err != nil || !reflect.DeepEqual(loaded, second) {
		t.Fatalf("empty object no longer overlays defaults: %+v, %v", loaded, err)
	}
}

func TestPartialConfigKeepsUnspecifiedDefaultsAndExplicitFalse(t *testing.T) {
	got, err := loadJSON(t, `{"capture":{"snapshot_after_tool":false},"server":{"port":7332},"exclude":["scratch/**"]}`)
	if err != nil {
		t.Fatal(err)
	}
	want := Default()
	want.Capture.SnapshotAfterTool = false
	want.Server.Port = 7332
	want.Exclude = []string{"scratch/**"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("partial config merge changed: %+v", got)
	}
	got, err = loadJSON(t, `{"storage":null,"capture":null,"server":null,"exclude":null}`)
	want = Default()
	want.Exclude = nil
	if err != nil || !reflect.DeepEqual(got, want) {
		t.Fatalf("existing null-field handling changed: %+v, %v", got, err)
	}
}
