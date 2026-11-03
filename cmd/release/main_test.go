package main

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"crypto/sha256"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"testing"
)

func TestArchivesHaveOnlyExpectedFiles(t *testing.T) {
	for _, extension := range []string{".zip", ".tar.gz"} {
		p := filepath.Join(t.TempDir(), "release"+extension)
		files := map[string][]byte{"agenttm": []byte("binary"), "README.md": []byte("instructions")}
		if err := archive(p, "agenttm", files); err != nil {
			t.Fatal(err)
		}
		if err := archive(p, "agenttm", files); err == nil {
			t.Fatal("existing archive overwritten")
		}
		got := map[string]string{}
		if extension == ".zip" {
			r, err := zip.OpenReader(p)
			if err != nil {
				t.Fatal(err)
			}
			for _, entry := range r.File {
				f, err := entry.Open()
				if err != nil {
					t.Fatal(err)
				}
				b, err := io.ReadAll(f)
				f.Close()
				if err != nil {
					t.Fatal(err)
				}
				got[entry.Name] = string(b)
			}
			r.Close()
		} else {
			f, err := os.Open(p)
			if err != nil {
				t.Fatal(err)
			}
			gz, err := gzip.NewReader(f)
			if err != nil {
				t.Fatal(err)
			}
			r := tar.NewReader(gz)
			for {
				h, err := r.Next()
				if err == io.EOF {
					break
				}
				if err != nil {
					t.Fatal(err)
				}
				b, err := io.ReadAll(r)
				if err != nil {
					t.Fatal(err)
				}
				got[h.Name] = string(b)
				if h.Name == "agenttm" && h.Mode != 0755 {
					t.Fatal("executable bit lost")
				}
			}
			gz.Close()
			f.Close()
		}
		if len(got) != 2 || got["agenttm"] != "binary" || got["README.md"] != "instructions" {
			t.Fatalf("bad archive %+v", got)
		}
	}
}

func TestReleaseVerificationRejectsCorruptionAndMissingChecksums(t *testing.T) {
	root := t.TempDir()
	name := "agenttm_0.3.1_linux_amd64.tar.gz"
	p := filepath.Join(root, name)
	if err := archive(p, "agenttm", map[string][]byte{"agenttm": []byte("executable"), "README.md": []byte("guide"), "RESTORE.md": []byte("restore"), "THIRD_PARTY_NOTICES.txt": []byte("notices")}); err != nil {
		t.Fatal(err)
	}
	b, _ := os.ReadFile(p)
	hash := sha256.Sum256(b)
	if err := os.WriteFile(filepath.Join(root, "SHA256SUMS"), []byte(fmt.Sprintf("%x  %s\n", hash, name)), 0600); err != nil {
		t.Fatal(err)
	}
	if err := verifyRelease(root, "0.3.1"); err != nil {
		t.Fatal(err)
	}
	if err := verifyExpectedTargets(root, "0.3.1", false); err == nil {
		t.Fatal("missing platform archives accepted")
	}
	if err := verifyRelease(root, "0.3.2"); err == nil {
		t.Fatal("wrong version accepted")
	}
	if err := os.WriteFile(filepath.Join(root, "unlisted.zip"), []byte("bad"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := verifyRelease(root, "0.3.1"); err == nil {
		t.Fatal("unlisted archive accepted")
	}
	if err := os.Remove(filepath.Join(root, "unlisted.zip")); err != nil {
		t.Fatal(err)
	}
	b[0] ^= 1
	os.WriteFile(p, b, 0600)
	if err := verifyRelease(root, "0.3.1"); err == nil {
		t.Fatal("corrupt archive accepted")
	}
}
