package snapshot

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"agenttm/internal/config"
	"agenttm/internal/project"
	"agenttm/internal/storage"
)

func git(t *testing.T, root string, args ...string) []byte {
	t.Helper()
	cmd := exec.Command("git", append([]string{"-C", root}, args...)...)
	b, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("git %v: %s %v", args, b, err)
	}
	return b
}
func write(t *testing.T, root, p string, b []byte) {
	t.Helper()
	full := filepath.Join(root, filepath.FromSlash(p))
	if err := os.MkdirAll(filepath.Dir(full), 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(full, b, 0600); err != nil {
		t.Fatal(err)
	}
}
func setup(t *testing.T) (*Engine, string) {
	t.Helper()
	root := filepath.Join(t.TempDir(), "project spaces 日本語")
	if err := os.MkdirAll(root, 0700); err != nil {
		t.Fatal(err)
	}
	git(t, root, "init")
	if err := project.Init(root); err != nil {
		t.Fatal(err)
	}
	s, err := storage.Open(root)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { s.DB.Close() })
	id, err := s.Start()
	if err != nil {
		t.Fatal(err)
	}
	return &Engine{Root: root, Store: s, Config: config.Default()}, id
}
func capture(t *testing.T, e *Engine, id, kind string) CaptureResult {
	t.Helper()
	r, err := e.Capture(context.Background(), id, kind)
	if err != nil {
		t.Fatal(err)
	}
	return r
}
func find(t *testing.T, m Manifest, p string) File {
	t.Helper()
	for _, f := range m.Files {
		if f.Path == p {
			return f
		}
	}
	t.Fatalf("missing %s", p)
	return File{}
}

func TestDirtyWorkspaceAndHistory(t *testing.T) {
	e, id := setup(t)
	root := e.Root
	write(t, root, "tracked.txt", []byte("staged\n"))
	git(t, root, "add", "tracked.txt")
	write(t, root, "tracked.txt", []byte("dirty\n"))
	write(t, root, "untracked.txt", []byte("same\n"))
	write(t, root, "duplicate.txt", []byte("same\n"))
	write(t, root, ".gitignore", []byte("ignored.txt\ntracked.txt\n"))
	write(t, root, "ignored.txt", []byte("not eligible"))
	write(t, root, "tracked-deleted.txt", []byte("gone"))
	git(t, root, "add", "tracked-deleted.txt")
	os.Remove(filepath.Join(root, "tracked-deleted.txt"))
	index, _ := os.ReadFile(filepath.Join(root, ".git", "index"))
	head, _ := os.ReadFile(filepath.Join(root, ".git", "HEAD"))
	before := git(t, root, "status", "--porcelain=v1", "-z")
	a := capture(t, e, id, "baseline")
	if !a.Created || a.Manifest.Partial || len(a.Manifest.Files) != 4 {
		t.Fatalf("unexpected baseline: %+v", a.Manifest)
	}
	if find(t, a.Manifest, "duplicate.txt").ObjectID != find(t, a.Manifest, "untracked.txt").ObjectID {
		t.Fatal("content not deduplicated")
	}
	b, err := e.File(a.Manifest.ID, "tracked.txt")
	if err != nil || string(b) != "dirty\n" {
		t.Fatalf("dirty content: %s %v", b, err)
	}
	if _, err = e.File(a.Manifest.ID, "ignored.txt"); err == nil {
		t.Fatal("ignored file captured")
	}
	same := capture(t, e, id, "final")
	if same.Created || same.Manifest.ID != a.Manifest.ID {
		t.Fatal("unchanged checkpoint not reused")
	}
	write(t, root, "tracked.txt", []byte("changed\n"))
	os.Remove(filepath.Join(root, "untracked.txt"))
	write(t, root, "added.bin", []byte{0, 1, 2})
	c := capture(t, e, id, "manual")
	if !c.Created || c.Manifest.ParentID != a.Manifest.ID {
		t.Fatal("bad parent chain")
	}
	diff, err := e.Diff(c.Manifest.ID)
	if err != nil {
		t.Fatal(err)
	}
	changes := map[string]Change{}
	for _, v := range diff {
		changes[v.Path] = v
	}
	if len(changes) != 3 || changes["added.bin"].Kind != "added" || !changes["added.bin"].Binary || changes["untracked.txt"].Kind != "removed" || !strings.Contains(changes["tracked.txt"].Patch, "-dirty\n+changed\n") {
		t.Fatalf("bad diff: %+v", diff)
	}
	b, err = e.File(a.Manifest.ID, "tracked.txt")
	if err != nil || string(b) != "dirty\n" {
		t.Fatal("historical contents changed")
	}
	// Capture itself must preserve current workspace state as well as Git metadata.
	current := git(t, root, "status", "--porcelain=v1", "-z")
	capture(t, e, id, "manual")
	if !bytes.Equal(current, git(t, root, "status", "--porcelain=v1", "-z")) {
		t.Fatal("capture modified workspace")
	}
	after, _ := os.ReadFile(filepath.Join(root, ".git", "index"))
	if !bytes.Equal(index, after) {
		t.Fatal("capture modified index")
	}
	after, _ = os.ReadFile(filepath.Join(root, ".git", "HEAD"))
	if !bytes.Equal(head, after) {
		t.Fatal("capture modified HEAD")
	}
	if bytes.Equal(before, current) {
		t.Fatal("test failed to mutate fixture")
	}
	events, err := e.Store.Events(id, 0, 100)
	if err != nil {
		t.Fatal(err)
	}
	if len(events) != 4 || events[1].CheckpointID != a.Manifest.ID || events[2].CheckpointID != c.Manifest.ID {
		t.Fatalf("bad checkpoint event linkage: %+v", events)
	}
	report := e.Doctor()
	if len(report.Problems) > 0 || len(report.Warnings) > 0 || report.Checkpoints != 2 {
		t.Fatalf("doctor: %+v", report)
	}
}

func TestExclusionsAndLimits(t *testing.T) {
	e, id := setup(t)
	for _, p := range []string{".env", "nested/.env.local", "private.pem", "node_modules/a.js", "nested/build/output", "credentials.json", "custom/skip.txt", "large.txt", "ok.txt"} {
		write(t, e.Root, p, []byte("12345"))
	}
	write(t, e.Root, "large.txt", []byte("12345678901"))
	e.Config.Storage.MaxFileBytes = 10
	e.Config.Storage.MaxSnapshotBytes = 20
	e.Config.Exclude = append(e.Config.Exclude, "custom/**")
	// Tracked secrets must still be excluded, even if otherwise Git-eligible.
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

func TestPathAndManifestValidation(t *testing.T) {
	for _, p := range []string{"../outside", "/absolute", "C:/escape", "a\\b", "a/../b", ".git/config", ".agenttm/config.json", "a/CON.txt", "a/trailing.", "a/trailing ", "a\x00b", "a:b"} {
		if ValidatePath(p) == nil {
			t.Errorf("accepted %q", p)
		}
	}
	if err := ValidatePath("src/日本語.go"); err != nil {
		t.Fatal(err)
	}
	e, id := setup(t)
	write(t, e.Root, "src/a", []byte("a"))
	m := capture(t, e, id, "baseline").Manifest
	original := m.Files[0]
	m.Files = append(m.Files, File{Path: "src/A", ObjectID: original.ObjectID, Size: 1, Mode: 0600})
	if m.Validate() == nil {
		t.Fatal("case collision accepted")
	}
	if _, err := e.Load("../../outside"); err == nil {
		t.Fatal("manifest traversal accepted")
	}
	if _, err := e.File(storage.ID(), "src/a"); err == nil {
		t.Fatal("unknown checkpoint accepted")
	}
	if _, err := e.File(m.ID, "../outside"); err == nil {
		t.Fatal("file traversal accepted")
	}
	if _, err := e.Capture(context.Background(), storage.ID(), "manual"); err == nil {
		t.Fatal("foreign session accepted")
	}
}

func TestIntegrityAndInterruptedWrites(t *testing.T) {
	e, id := setup(t)
	write(t, e.Root, "a", []byte("contents"))
	m := capture(t, e, id, "baseline").Manifest
	f := m.Files[0]
	p, _ := e.objectPath(f.ObjectID)
	if err := os.WriteFile(p, []byte("corrupt!"), 0600); err != nil {
		t.Fatal(err)
	}
	if _, err := e.File(m.ID, "a"); err == nil {
		t.Fatal("corrupt blob read")
	}
	if len(e.Doctor().Problems) == 0 {
		t.Fatal("doctor missed corrupt blob")
	}
	os.Remove(p)
	if len(e.Doctor().Problems) == 0 {
		t.Fatal("doctor missed missing blob")
	}
	write(t, e.Root, ".agenttm/objects/.tmp-interrupted", []byte("incomplete"))
	write(t, e.Root, ".agenttm/manifests/abandoned.json", []byte("{}"))
	orphan := []byte("orphan")
	if _, err := e.put(orphan); err != nil {
		t.Fatal(err)
	}
	lock := filepath.Join(e.Root, ".agenttm", "data", "snapshot.lock")
	os.WriteFile(lock, []byte(id), 0600)
	if _, err := e.Capture(context.Background(), id, "manual"); err == nil {
		t.Fatal("capture ignored lock")
	}
	report := e.Doctor()
	if len(report.Warnings) < 4 {
		t.Fatalf("recovery warnings missing: %+v", report)
	}
	os.Remove(lock)
	// Restore the blob, then tamper with the manifest: indexed checksum must fail.
	if _, err := e.put([]byte("contents")); err != nil {
		t.Fatal(err)
	}
	manifestPath := filepath.Join(e.Root, ".agenttm", "manifests", m.ID+".json")
	if err := os.WriteFile(manifestPath, []byte(`{}`), 0600); err != nil {
		t.Fatal(err)
	}
	if _, err := e.Load(m.ID); err == nil {
		t.Fatal("manifest corruption accepted")
	}
}

func TestModesDiffBoundsAndEmptyFiles(t *testing.T) {
	e, id := setup(t)
	write(t, e.Root, "run.sh", []byte("echo hi\n"))
	write(t, e.Root, "empty", nil)
	a := capture(t, e, id, "baseline").Manifest
	if runtime.GOOS != "windows" {
		if err := os.Chmod(filepath.Join(e.Root, "run.sh"), 0700); err != nil {
			t.Fatal(err)
		}
		b := capture(t, e, id, "manual").Manifest
		d, err := e.Diff(b.ID)
		if err != nil || len(d) != 1 || d[0].OldMode == d[0].NewMode || d[0].Patch != "" {
			t.Fatalf("mode diff %+v %v", d, err)
		}
	}
	write(t, e.Root, "empty", []byte("no final newline"))
	write(t, e.Root, "large", bytes.Repeat([]byte("x"), 200000))
	b := capture(t, e, id, "manual").Manifest
	d, err := e.Diff(b.ID)
	if err != nil {
		t.Fatal(err)
	}
	for _, v := range d {
		if v.Path == "empty" && !strings.Contains(v.Patch, "No newline at end of file") {
			t.Fatal("newline marker missing")
		}
		if v.Path == "large" && !v.Truncated {
			t.Fatal("large patch not bounded")
		}
	}
	content, err := e.File(a.ID, "empty")
	if err != nil || len(content) != 0 {
		t.Fatal("empty object not preserved")
	}
	if !json.Valid(mustJSON(t, b)) {
		t.Fatal("invalid manifest encoding")
	}
}
func mustJSON(t *testing.T, v any) []byte {
	t.Helper()
	b, e := json.Marshal(v)
	if e != nil {
		t.Fatal(e)
	}
	return b
}

func TestGlob(t *testing.T) {
	for _, v := range [][2]string{{"**/*.pem", "a.pem"}, {"**/*.pem", "a/b.pem"}, {"node_modules/**", "node_modules/a/b.js"}, {"custom/**", "custom"}, {".env.*", "a/.env.local"}, {"a/**/b", "a/b"}} {
		if !glob(v[0], v[1]) {
			t.Errorf("%v", v)
		}
	}
	if glob("a/*", "a/b/c") {
		t.Fatal("single wildcard crossed directory boundary")
	}
}

func TestConcurrentMutationDetection(t *testing.T) {
	root := t.TempDir()
	write(t, root, "a", []byte("before"))
	p := filepath.Join(root, "a")
	before, err := os.Stat(p)
	if err != nil {
		t.Fatal(err)
	}
	if !consistentRead(before, before, before, 6) {
		t.Fatal("stable read rejected")
	}
	write(t, root, "a", []byte("changed size during read"))
	after, err := os.Stat(p)
	if err != nil {
		t.Fatal(err)
	}
	if consistentRead(before, after, after, after.Size()) {
		t.Fatal("concurrent size mutation missed")
	}
	write(t, root, "replacement", []byte("before"))
	replacement, err := os.Stat(filepath.Join(root, "replacement"))
	if err != nil {
		t.Fatal(err)
	}
	if consistentRead(before, before, replacement, 6) {
		t.Fatal("concurrent file replacement missed")
	}
	if consistentRead(before, before, before, 3) {
		t.Fatal("short read accepted")
	}
}

func TestSymlinkAndSubmoduleOmission(t *testing.T) {
	e, id := setup(t)
	outside := t.TempDir()
	write(t, outside, "secret", []byte("must never capture"))
	if err := os.Symlink(outside, filepath.Join(e.Root, "escape")); err != nil {
		t.Skip("symlinks unavailable:", err)
	}
	m := capture(t, e, id, "baseline").Manifest
	if !m.Partial || len(m.Files) != 0 || len(m.Omissions) != 1 {
		t.Fatalf("symlink traversal: %+v", m)
	}
	store := filepath.Join(e.Root, ".agenttm", "objects")
	if err := os.Symlink(outside, filepath.Join(store, "aa")); err != nil {
		t.Fatal(err)
	}
	if len(e.Doctor().Problems) == 0 {
		t.Fatal("store symlink missed")
	}
}
