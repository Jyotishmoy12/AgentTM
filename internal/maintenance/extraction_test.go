package maintenance

import (
	"archive/tar"
	"bytes"
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func archiveHeaders(t *testing.T, headers ...tar.Header) []byte {
	t.Helper()
	var output bytes.Buffer
	w := tar.NewWriter(&output)
	for _, header := range headers {
		if err := w.WriteHeader(&header); err != nil {
			t.Fatal(err)
		}
	}
	return output.Bytes()
}

func TestExtractionRejectsUnsafeEntriesBeforeWriting(t *testing.T) {
	for _, header := range []tar.Header{
		{Name: "../escaped", Typeflag: tar.TypeReg},
		{Name: "/absolute", Typeflag: tar.TypeReg},
		{Name: ".git/config", Typeflag: tar.TypeReg},
		{Name: "worktrees/copied-file", Typeflag: tar.TypeReg},
		{Name: "config.json", Typeflag: tar.TypeSymlink, Linkname: "outside"},
		{Name: "data/events.db-wal", Typeflag: tar.TypeReg},
		{Name: "backup.json", Typeflag: tar.TypeReg, Size: 4097},
	} {
		t.Run(strings.ReplaceAll(header.Name, "/", "_"), func(t *testing.T) {
			dest := t.TempDir()
			if _, err := extractBackup(context.Background(), bytes.NewReader(archiveHeaders(t, header)), dest); err == nil {
				t.Fatalf("unsafe entry accepted: %+v", header)
			}
			entries, err := os.ReadDir(dest)
			if err != nil || len(entries) != 0 {
				t.Fatalf("unsafe entry modified staging directory: %+v, %v", entries, err)
			}
		})
	}
}

func TestExtractionRejectsDuplicateAndTruncatedPayloads(t *testing.T) {
	duplicate := archiveHeaders(t, tar.Header{Name: "config.json", Typeflag: tar.TypeReg}, tar.Header{Name: "config.json", Typeflag: tar.TypeReg})
	if _, err := extractBackup(context.Background(), bytes.NewReader(duplicate), t.TempDir()); err == nil || !strings.Contains(err.Error(), "duplicate") {
		t.Fatalf("duplicate entry accepted: %v", err)
	}
	truncated := archiveHeaders(t, tar.Header{Name: "config.json", Typeflag: tar.TypeReg, Size: 8})
	if _, err := extractBackup(context.Background(), bytes.NewReader(truncated), t.TempDir()); err == nil || !strings.Contains(err.Error(), "truncated") {
		t.Fatalf("truncated payload accepted: %v", err)
	}
}

func TestExtractionCancellationDoesNotWriteFiles(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	dest := t.TempDir()
	data := archiveHeaders(t, tar.Header{Name: "config.json", Typeflag: tar.TypeReg})
	if _, err := extractBackup(ctx, bytes.NewReader(data), dest); !errors.Is(err, context.Canceled) {
		t.Fatalf("expected cancellation, got %v", err)
	}
	if _, err := os.Lstat(filepath.Join(dest, "config.json")); !os.IsNotExist(err) {
		t.Fatalf("cancelled extraction wrote content: %v", err)
	}
}
