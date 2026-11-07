package maintenance

import (
	"archive/tar"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

func extractBackup(ctx context.Context, input io.Reader, base string) (map[string]bool, error) {
	var err error
	archive := tar.NewReader(input)
	seen := map[string]bool{}
	var total int64
	for count := 0; ; count++ {
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		header, readErr := archive.Next()
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			return nil, fmt.Errorf("backup is truncated or corrupt")
		}
		name := header.Name
		if count > 1000000 || header.Typeflag != tar.TypeReg || !allowedBackupPath(name) || seen[name] || header.Size < 0 || header.Size > backupEntryLimit(name) {
			return nil, fmt.Errorf("unsafe or duplicate backup entry")
		}
		total += header.Size
		if total > backupLimit {
			return nil, fmt.Errorf("backup exceeds 20 GiB extraction limit")
		}
		seen[name] = true
		p := filepath.Join(base, filepath.FromSlash(name))
		if err = os.MkdirAll(filepath.Dir(p), 0700); err != nil {
			return nil, err
		}
		file, err := os.OpenFile(p, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
		if err != nil {
			return nil, err
		}
		_, copyErr := io.CopyN(file, archive, header.Size)
		closeErr := file.Close()
		if copyErr != nil {
			return nil, fmt.Errorf("backup is truncated or corrupt")
		}
		if closeErr != nil {
			return nil, closeErr
		}
	}
	return seen, nil
}
