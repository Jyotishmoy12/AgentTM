package main

import (
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"
)

func TestReleaseChecksumAndVerificationWorkflow(t *testing.T) {
	out, err := filepath.EvalSymlinks(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	b := releaseBuilder{
		out: out, checksums: map[string]string{},
		documents: releaseDocuments{guide: []byte("restore"), notices: []byte("notices"), license: []byte("license"), ownership: []byte("ownership")},
	}
	for _, platform := range []string{"windows", "linux", "darwin"} {
		for _, arch := range []string{"amd64", "arm64"} {
			target, err := parseReleaseTarget(platform + "/" + arch)
			if err != nil {
				t.Fatal(err)
			}
			name := "agenttm_1.2.3_" + platform + "_" + arch + target.extension
			if err = b.writeArchive(name, target.binary, b.archiveFiles(target.binary, []byte("synthetic binary"), []byte("readme"))); err != nil {
				t.Fatal(err)
			}
		}
	}
	files := b.archiveFiles("AgentTM.exe", []byte("synthetic GUI"), []byte("desktop readme"))
	files["agenttm-cli.exe"] = []byte("synthetic helper")
	if err := b.writeArchive("agenttm-desktop_1.2.3_windows_amd64.zip", "AgentTM.exe", files); err != nil {
		t.Fatal(err)
	}
	if err := b.writeChecksums(); err != nil {
		t.Fatal(err)
	}
	manifest := filepath.Join(b.out, "SHA256SUMS")
	before, err := os.ReadFile(manifest)
	if err != nil {
		t.Fatal(err)
	}
	lines := strings.Split(strings.TrimSpace(string(before)), "\n")
	names := []string{}
	for _, line := range lines {
		parts := strings.Split(line, "  ")
		if len(parts) != 2 || len(parts[0]) != 64 {
			t.Fatalf("malformed checksum: %s", line)
		}
		names = append(names, parts[1])
	}
	if len(lines) != 7 || !sort.StringsAreSorted(names) {
		t.Fatalf("checksum ordering changed: %v", lines)
	}
	if err = b.writeChecksums(); err == nil {
		t.Fatal("existing checksum manifest overwritten")
	}
	if after, err := os.ReadFile(manifest); err != nil || string(before) != string(after) {
		t.Fatalf("checksum manifest changed on refused overwrite: %v", err)
	}
	if err = runRelease(releaseOptions{version: "1.2.3", output: b.out, verifyOnly: true, requireAll: true, desktop: true}); err != nil {
		t.Fatalf("combined verify-only workflow failed: %v", err)
	}
	if err = b.writeArchive(names[0], "AgentTM.exe", files); err == nil {
		t.Fatal("existing release archive overwritten")
	}
	if err = os.Remove(filepath.Join(b.out, "agenttm-desktop_1.2.3_windows_amd64.zip")); err != nil {
		t.Fatal(err)
	}
	if err = verifyExpectedTargets(b.out, "1.2.3", true); err == nil {
		t.Fatal("missing desktop archive accepted")
	}
}
