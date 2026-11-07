package maintenance

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"agenttm/internal/project"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
	"filippo.io/age"
)

func Backup(ctx context.Context, e *snapshot.Engine, destination, password string) (err error) {
	if len(password) < 12 || len(password) > 1024 {
		return fmt.Errorf("use a backup passphrase of 12..1024 characters")
	}
	destination, err = canonicalBackupFile(destination)
	if err != nil {
		return err
	}
	root, err := filepath.Abs(e.Root)
	if err != nil {
		return err
	}
	if err = project.SafePath(filepath.Join(root, ".agenttm")); err != nil {
		return err
	}
	root, err = filepath.EvalSymlinks(root)
	if err != nil {
		return err
	}
	base := filepath.Join(root, ".agenttm")
	if rel, relErr := filepath.Rel(base, destination); relErr == nil && (rel == "." || rel != ".." && !strings.HasPrefix(rel, ".."+string(os.PathSeparator))) {
		return fmt.Errorf("save the backup outside .agenttm")
	}
	release, err := Quiesce(e.Root, e.Store)
	if err != nil {
		return err
	}
	defer release()
	var projects int
	if err = e.Store.DB.QueryRow("SELECT count(*) FROM projects").Scan(&projects); err != nil {
		return err
	}
	if projects != 1 {
		return fmt.Errorf("backup requires a single-project history database")
	}
	stage, err := os.MkdirTemp(filepath.Join(base, "data"), ".backup-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(stage)
	database := filepath.Join(stage, "events.db")
	if _, err = e.Store.DB.ExecContext(ctx, "VACUUM INTO ?", database); err != nil {
		return err
	}
	out, err := os.OpenFile(destination, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return err
	}
	defer func() {
		out.Close()
		if err != nil {
			os.Remove(destination)
		}
	}()
	recipient, err := age.NewScryptRecipient(password)
	if err != nil {
		return err
	}
	encrypted, err := age.Encrypt(out, recipient)
	if err != nil {
		return err
	}
	compressed := gzip.NewWriter(encrypted)
	archive := tar.NewWriter(compressed)
	var total int64
	add := func(name string, reader io.Reader, size int64) error {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		total += size
		if total > backupLimit {
			return fmt.Errorf("backup exceeds 20 GiB limit")
		}
		if err := archive.WriteHeader(&tar.Header{Name: name, Mode: 0600, Size: size, Typeflag: tar.TypeReg}); err != nil {
			return err
		}
		_, err := io.CopyN(archive, reader, size)
		return err
	}
	metadata, _ := json.Marshal(BackupInfo{1, e.Store.ProjectID, storage.Now()})
	if err = add("backup.json", strings.NewReader(string(metadata)), int64(len(metadata))); err != nil {
		return err
	}
	addFile := func(name, p string) error {
		if !allowedBackupPath(name) {
			return fmt.Errorf("unexpected file in history store; run agenttm doctor before backing up")
		}
		if err := project.SafePath(p); err != nil {
			return err
		}
		file, err := os.Open(p)
		if err != nil {
			return err
		}
		defer file.Close()
		info, err := file.Stat()
		if err != nil {
			return err
		}
		if !info.Mode().IsRegular() {
			return fmt.Errorf("backup only supports regular files")
		}
		if info.Size() > backupEntryLimit(name) {
			return fmt.Errorf("backup entry exceeds supported size: %s", name)
		}
		return add(name, file, info.Size())
	}
	if err = addFile("data/events.db", database); err != nil {
		return err
	}
	if err = addFile("config.json", filepath.Join(base, "config.json")); err != nil {
		return err
	}
	for _, area := range []string{"manifests", "objects", "logs"} {
		directory := filepath.Join(base, area)
		if err = project.SafePath(directory); err != nil {
			return err
		}
		err = filepath.WalkDir(directory, func(p string, d fs.DirEntry, walkErr error) error {
			if os.IsNotExist(walkErr) && p == directory {
				return nil
			}
			if walkErr != nil {
				return walkErr
			}
			if d.Type()&os.ModeSymlink != 0 {
				return fmt.Errorf("refusing symlink in backup input")
			}
			if d.IsDir() {
				return nil
			}
			rel, _ := filepath.Rel(base, p)
			return addFile(filepath.ToSlash(rel), p)
		})
		if err != nil {
			return err
		}
	}
	if err = archive.Close(); err != nil {
		return err
	}
	if err = compressed.Close(); err != nil {
		return err
	}
	if err = encrypted.Close(); err != nil {
		return err
	}
	return out.Sync()
}
