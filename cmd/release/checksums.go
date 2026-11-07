package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

func (b *releaseBuilder) writeArchive(name, binary string, files map[string][]byte) error {
	path := filepath.Join(b.out, name)
	if err := archive(path, binary, files); err != nil {
		return err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	sum := sha256.Sum256(data)
	b.checksums[name] = hex.EncodeToString(sum[:])
	return nil
}

func (b *releaseBuilder) writeChecksums() error {
	names := make([]string, 0, len(b.checksums))
	for name := range b.checksums {
		names = append(names, name)
	}
	sort.Strings(names)
	var manifest strings.Builder
	for _, name := range names {
		fmt.Fprintf(&manifest, "%s  %s\n", b.checksums[name], name)
	}
	checksum, err := os.OpenFile(filepath.Join(b.out, "SHA256SUMS"), os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return fmt.Errorf("checksum output already exists or cannot be created; choose a new --out directory: %w", err)
	}
	_, err = io.WriteString(checksum, manifest.String())
	closeErr := checksum.Close()
	if err != nil {
		return err
	}
	return closeErr
}
