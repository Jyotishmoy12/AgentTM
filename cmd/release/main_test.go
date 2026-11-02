package main

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
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
