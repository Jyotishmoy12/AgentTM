package config

import (
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func TestStrictConfigDecoding(t *testing.T) {
	for _, text := range []string{
		``, `null`, ` null `, `[]`, `"string"`, `true`, `42`, `{`,
		`{} {}`, `{} null`, `{} trailing`, `{"unknown":true}`,
		`{"storage":{"unknown":true}}`, `{"capture":{"unknown":true}}`,
		`{"server":{"unknown":true}}`, `{"server":{"port":"7331"}}`,
		`{"exclude":[1]}`,
	} {
		if _, err := loadJSON(t, text); err == nil {
			t.Errorf("invalid configuration accepted: %q", text)
		}
	}
	if _, err := loadJSON(t, "\n {} \t\n"); err != nil {
		t.Fatalf("trailing whitespace rejected: %v", err)
	}
}

func TestLoadingErrorsKeepExistingReturnContract(t *testing.T) {
	got, err := Load(filepath.Join(t.TempDir(), "missing.json"))
	if !errors.Is(err, os.ErrNotExist) || !reflect.DeepEqual(got, Default()) {
		t.Fatalf("missing file return contract changed: %+v, %v", got, err)
	}
	got, err = loadJSON(t, `{"server":{"port":7332},"schema_version":99}`)
	if err == nil || err.Error() != "unsupported schema_version 99; expected 1" || got.Server.Port != 7332 {
		t.Fatalf("validation no longer returns decoded config: %+v, %v", got, err)
	}
	if _, err = loadJSON(t, `{} {}`); err == nil || !strings.Contains(err.Error(), "one JSON object") {
		t.Fatalf("trailing-object error changed: %v", err)
	}
}
