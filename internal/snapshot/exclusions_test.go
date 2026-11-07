package snapshot

import (
	"bytes"
	"os"
	"path/filepath"
	"testing"
)

func TestExclusionsAndLimits(t *testing.T) {
	e, id := setup(t)
	for _, p := range []string{".env", "nested/.env.local", "private.pem", "node_modules/a.js", "nested/build/output", "credentials.json", "custom/skip.txt", "large.txt", "ok.txt"} {
		write(t, e.Root, p, []byte("12345"))
	}
	write(t, e.Root, "large.txt", []byte("12345678901"))
	e.Config.Storage.MaxFileBytes = 10
	e.Config.Storage.MaxSnapshotBytes = 20
	e.Config.Exclude = append(e.Config.Exclude, "custom/**")
	git(t, e.Root, "add", ".env")
	nested := filepath.Join(e.Root, "inner")
	os.Mkdir(nested, 0700)
	git(t, nested, "init")
	write(t, nested, "nested.txt", []byte("private nested data"))
	a := capture(t, e, id, "baseline").Manifest
	if !a.Partial || len(a.Files) != 1 || a.Files[0].Path != "ok.txt" || len(a.Omissions) != 9 {
		t.Fatalf("bad exclusions: %+v", a)
	}
	for _, f := range a.Files {
		b, err := e.ReadObject(f)
		if err != nil || bytes.Contains(b, []byte("private")) {
			t.Fatal("excluded contents stored")
		}
	}
	e2, id2 := setup(t)
	e2.Config.Storage.MaxFileBytes = 10
	e2.Config.Storage.MaxSnapshotBytes = 10
	write(t, e2.Root, "a", []byte("123456"))
	write(t, e2.Root, "b", []byte("123456"))
	b := capture(t, e2, id2, "baseline").Manifest
	if !b.Partial || len(b.Files) != 1 || len(b.Omissions) != 1 || b.Omissions[0].Reason != "total snapshot size limit" {
		t.Fatalf("total limit: %+v", b)
	}
}
