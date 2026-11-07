package main

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"fmt"
	"os"
	"sort"
	"strings"
)

func archive(p, binary string, files map[string][]byte) (err error) {
	f, err := os.OpenFile(p, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return fmt.Errorf("refusing to replace release archive: %w", err)
	}
	defer func() {
		if e := f.Close(); err == nil {
			err = e
		}
	}()
	names := make([]string, 0, len(files))
	for name := range files {
		names = append(names, name)
	}
	sort.Strings(names)
	if strings.HasSuffix(p, ".zip") {
		writer := zip.NewWriter(f)
		for _, name := range names {
			header := &zip.FileHeader{Name: name, Method: zip.Deflate}
			mode := os.FileMode(0644)
			if name == binary {
				mode = 0755
			}
			header.SetMode(mode)
			entry, e := writer.CreateHeader(header)
			if e != nil {
				writer.Close()
				return e
			}
			if _, e = entry.Write(files[name]); e != nil {
				writer.Close()
				return e
			}
		}
		return writer.Close()
	}
	compressed := gzip.NewWriter(f)
	writer := tar.NewWriter(compressed)
	for _, name := range names {
		mode := int64(0644)
		if name == binary {
			mode = 0755
		}
		b := files[name]
		if err = writer.WriteHeader(&tar.Header{Name: name, Mode: mode, Size: int64(len(b)), Typeflag: tar.TypeReg}); err != nil {
			writer.Close()
			compressed.Close()
			return err
		}
		if _, err = writer.Write(b); err != nil {
			writer.Close()
			compressed.Close()
			return err
		}
	}
	if err = writer.Close(); err != nil {
		compressed.Close()
		return err
	}
	return compressed.Close()
}
