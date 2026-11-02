package snapshot

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path"
	"sort"
	"strings"
)

type limitedBuffer struct {
	bytes.Buffer
	max int
}

func (b *limitedBuffer) Write(p []byte) (int, error) {
	if len(p) > b.max-b.Len() {
		return 0, fmt.Errorf("Git candidate list exceeds 16 MiB")
	}
	return b.Buffer.Write(p)
}
func candidates(ctx context.Context, root string) ([]string, error) {
	cmd := exec.CommandContext(ctx, "git", "-C", root, "ls-files", "--cached", "--others", "--exclude-standard", "-z")
	b := &limitedBuffer{max: 16 << 20}
	cmd.Stdout = b
	cmd.Stderr = io.Discard
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("cannot enumerate Git snapshot candidates: %w", err)
	}
	unique := map[string]bool{}
	for _, v := range strings.Split(b.String(), "\x00") {
		if v != "" {
			unique[strings.TrimSuffix(v, "/")] = true
		}
	}
	if len(unique) > MaxFiles {
		return nil, fmt.Errorf("snapshot candidate limit exceeded (%d)", MaxFiles)
	}
	out := make([]string, 0, len(unique))
	for v := range unique {
		out = append(out, v)
	}
	sort.Strings(out)
	return out, nil
}
func glob(pattern, p string) bool {
	var match func([]string, []string) bool
	type key struct{ a, b int }
	memo := map[key]bool{}
	done := map[key]bool{}
	match = func(a, b []string) bool {
		k := key{len(a), len(b)}
		if done[k] {
			return memo[k]
		}
		done[k] = true
		result := false
		if len(a) == 0 {
			result = len(b) == 0
		} else if a[0] == "**" {
			result = match(a[1:], b) || len(b) > 0 && match(a, b[1:])
		} else if len(b) > 0 {
			ok, _ := path.Match(a[0], b[0])
			result = ok && match(a[1:], b[1:])
		}
		memo[k] = result
		return result
	}
	if !strings.Contains(pattern, "/") {
		for _, part := range strings.Split(p, "/") {
			ok, _ := path.Match(pattern, part)
			if ok {
				return true
			}
		}
		return false
	}
	return match(strings.Split(pattern, "/"), strings.Split(p, "/"))
}
func (e *Engine) excluded(p string) string {
	parts := strings.Split(strings.ToLower(p), "/")
	dirs := map[string]bool{"node_modules": true, "vendor": true, "dist": true, "build": true, "target": true, ".cache": true, "__pycache__": true, ".venv": true, "venv": true, "coverage": true, ".next": true, "bin": true, "obj": true}
	for _, part := range parts {
		if dirs[part] {
			return "dependency/build/cache exclusion"
		}
		if part == ".aws" || part == ".ssh" {
			return "secret exclusion"
		}
	}
	name := parts[len(parts)-1]
	if strings.HasPrefix(name, ".env") || name == "id_rsa" || name == "id_ed25519" || name == "id_dsa" || name == "credentials" || name == "credentials.json" || name == ".npmrc" || name == ".netrc" || name == ".pypirc" || name == ".git-credentials" {
		return "secret exclusion"
	}
	for _, suffix := range []string{".pem", ".key", ".p12", ".pfx"} {
		if strings.HasSuffix(name, suffix) {
			return "secret exclusion"
		}
	}
	for _, pattern := range e.Config.Exclude {
		if glob(pattern, p) {
			return "configured exclusion"
		}
	}
	return ""
}
func internalPath(p string) bool {
	for _, v := range strings.Split(strings.ToLower(p), "/") {
		if v == ".git" || v == ".agenttm" {
			return true
		}
	}
	return false
}

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
		// Inspect all parents before reading; OpenRoot additionally prevents escape
		// if a parent is swapped for an outside symlink between these operations.
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
		// A tracked file absent in the working tree is a deletion, not an omission.
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
