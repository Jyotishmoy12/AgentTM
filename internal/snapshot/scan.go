package snapshot

import (
	"context"
	"fmt"
	"io"
	"os"
	"strings"
)

func (e *Engine) scan(ctx context.Context) (Manifest, error) {
	m := Manifest{Files: []File{}, Omissions: []Omission{}}
	list, err := candidates(ctx, e.Root)
	if err != nil {
		return m, err
	}
	root, err := os.OpenRoot(e.Root)
	if err != nil {
		return m, err
	}
	defer root.Close()
	omit := func(p, reason string) { m.Omissions = append(m.Omissions, Omission{p, reason}); m.Partial = true }
	seen := map[string]string{}
	total := int64(0)
	for _, p := range list {
		if err = ctx.Err(); err != nil {
			return m, err
		}
		if internalPath(p) {
			continue
		}
		if err = ValidatePath(p); err != nil {
			omit(p, "unsafe or non-portable path")
			continue
		}
		lower := strings.ToLower(p)
		if old, ok := seen[lower]; ok {
			return m, fmt.Errorf("case-insensitive path collision: %q and %q", old, p)
		}
		seen[lower] = p
		if reason := e.excluded(p); reason != "" {
			omit(p, reason)
			continue
		}
		blocked := ""
		parts := strings.Split(p, "/")
		for i := 1; i <= len(parts); i++ {
			sub := strings.Join(parts[:i], "/")
			st, statErr := root.Lstat(sub)
			if os.IsNotExist(statErr) {
				blocked = "missing"
				break
			}
			if statErr != nil {
				blocked = "unreadable path"
				break
			}
			if st.Mode()&os.ModeSymlink != 0 {
				blocked = "symlink omitted"
				break
			}
			if st.IsDir() {
				if _, gitErr := root.Lstat(sub + "/.git"); gitErr == nil {
					blocked = "nested Git repository/submodule omitted"
					break
				} else if !os.IsNotExist(gitErr) {
					blocked = "unreadable nested repository marker"
					break
				}
			}
		}
		if blocked == "missing" {
			continue
		}
		if blocked != "" {
			omit(p, blocked)
			continue
		}
		var b []byte
		var mode uint32
		stable := false
		missing := false
		for attempt := 0; attempt < 3; attempt++ {
			before, readErr := root.Lstat(p)
			if os.IsNotExist(readErr) {
				missing = true
				break
			}
			if readErr != nil {
				blocked = "unreadable file"
				break
			}
			if !before.Mode().IsRegular() {
				blocked = "non-regular file omitted"
				break
			}
			if before.Size() > e.Config.Storage.MaxFileBytes {
				blocked = "file size limit"
				break
			}
			if before.Size() > e.Config.Storage.MaxSnapshotBytes-total {
				blocked = "total snapshot size limit"
				break
			}
			f, readErr := root.Open(p)
			if readErr != nil {
				blocked = "unreadable file"
				break
			}
			opened, readErr := f.Stat()
			if readErr != nil || !opened.Mode().IsRegular() || !os.SameFile(before, opened) {
				f.Close()
				continue
			}
			limit := min(e.Config.Storage.MaxFileBytes, e.Config.Storage.MaxSnapshotBytes-total)
			b, readErr = io.ReadAll(io.LimitReader(f, limit+1))
			after, statErr := f.Stat()
			f.Close()
			final, finalErr := root.Lstat(p)
			if readErr != nil {
				blocked = "file read failed"
				break
			}
			if statErr == nil && finalErr == nil && consistentRead(before, after, final, int64(len(b))) {
				mode = uint32(after.Mode().Perm())
				stable = true
				break
			}
		}
		if missing {
			continue
		}
		if !stable {
			if blocked == "" {
				blocked = "file changed during bounded read retries"
				m.PotentiallyInconsistent = true
			}
			omit(p, blocked)
			continue
		}
		id, putErr := e.put(b)
		if putErr != nil {
			return m, putErr
		}
		m.Files = append(m.Files, File{p, id, mode, int64(len(b))})
		total += int64(len(b))
	}
	return m, nil
}

func consistentRead(before, after, final os.FileInfo, readBytes int64) bool {
	return final.Mode().IsRegular() && os.SameFile(before, after) && os.SameFile(before, final) && before.Size() == after.Size() && after.Size() == readBytes && final.Size() == readBytes && before.ModTime() == after.ModTime() && after.ModTime() == final.ModTime() && before.Mode() == after.Mode() && after.Mode() == final.Mode()
}
