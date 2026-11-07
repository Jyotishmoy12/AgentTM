package fork

import (
	"context"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"

	"agenttm/internal/project"
	"agenttm/internal/snapshot"
)

func (s Service) materialize(ctx context.Context, dest string, m snapshot.Manifest) error {
	if err := project.SafePath(dest); err != nil {
		return err
	}
	root, err := os.OpenRoot(dest)
	if err != nil {
		return err
	}
	defer root.Close()
	expected := map[string]snapshot.File{}
	for _, entry := range m.Files {
		if err = ctx.Err(); err != nil {
			return err
		}
		if err = snapshot.ValidatePath(entry.Path); err != nil {
			return err
		}
		target := filepath.Join(dest, filepath.FromSlash(entry.Path))
		if err = project.SafePath(target); err != nil {
			return err
		}
		if dir := filepath.ToSlash(filepath.Dir(entry.Path)); dir != "." {
			if err = root.MkdirAll(dir, 0700); err != nil {
				return err
			}
		}
		b, readErr := s.Engine.ReadObject(entry)
		if readErr != nil {
			return readErr
		}
		f, openErr := root.OpenFile(entry.Path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
		if openErr != nil {
			return openErr
		}
		_, err = f.Write(b)
		if err == nil {
			err = f.Sync()
		}
		closeErr := f.Close()
		if err == nil {
			err = closeErr
		}
		if err != nil {
			return err
		}
		if err = root.Chmod(entry.Path, os.FileMode(entry.Mode)); err != nil {
			return err
		}
		f, err = root.Open(entry.Path)
		if err != nil {
			return err
		}
		restored, readErr := io.ReadAll(io.LimitReader(f, entry.Size+1))
		info, statErr := f.Stat()
		f.Close()
		if readErr != nil || statErr != nil || !info.Mode().IsRegular() || int64(len(restored)) != entry.Size || "sha256:"+snapshot.Hash(restored) != entry.ObjectID {
			return fmt.Errorf("restored content verification failed: %s", entry.Path)
		}
		if runtime.GOOS != "windows" && uint32(info.Mode().Perm()) != entry.Mode {
			return fmt.Errorf("restored mode verification failed: %s", entry.Path)
		}
		expected[entry.Path] = entry
	}
	return fs.WalkDir(root.FS(), ".", func(p string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if p == "." {
			return nil
		}
		if p == ".git" {
			if !d.Type().IsRegular() {
				return fmt.Errorf("unexpected Git worktree marker type")
			}
			return nil
		}
		if d.Type()&os.ModeSymlink != 0 {
			return fmt.Errorf("unexpected symlink in restored worktree")
		}
		if d.IsDir() {
			return nil
		}
		if _, ok := expected[p]; !ok {
			return fmt.Errorf("unexpected file in restored worktree: %s", p)
		}
		return nil
	})
}
