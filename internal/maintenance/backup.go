package maintenance

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"strings"

	"agenttm/internal/config"
	"agenttm/internal/project"
	"agenttm/internal/snapshot"
	"agenttm/internal/storage"
	"filippo.io/age"
)

const backupLimit int64 = 20 << 30

type BackupInfo struct {
	Version   int    `json:"version"`
	ProjectID string `json:"project_id"`
	Created   string `json:"created_at"`
}

// Backup streams history through tar/gzip and the standard age passphrase
// format. It excludes live worktrees, Git history, and Codex credentials.
func Backup(ctx context.Context, e *snapshot.Engine, destination, password string) (err error) {
	if len(password) < 12 || len(password) > 1024 {
		return fmt.Errorf("use a backup passphrase of 12..1024 characters")
	}
	destination, err = filepath.Abs(destination)
	if err != nil {
		return err
	}
	base := filepath.Join(e.Root, ".agenttm")
	if rel, relErr := filepath.Rel(base, destination); relErr == nil && (rel == "." || rel != ".." && !strings.HasPrefix(rel, ".."+string(os.PathSeparator))) {
		return fmt.Errorf("save the backup outside .agenttm")
	}
	if err = project.SafePath(destination); err != nil {
		return err
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
	// SQLite creates a consistent standalone copy, including committed WAL data.
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

// RestoreBackup publishes validated history only into a Git repository with no
// existing .agenttm directory. Neither current files nor Git refs are restored.
func RestoreBackup(ctx context.Context, archivePath, destination, password string) (err error) {
	root, err := project.Root(destination)
	if err != nil {
		return err
	}
	target := filepath.Join(root, ".agenttm")
	if err = project.SafePath(target); err != nil {
		return err
	}
	if _, err = os.Lstat(target); !os.IsNotExist(err) {
		return fmt.Errorf("destination already has .agenttm; restore into a clean clone")
	}
	if err = project.SafePath(archivePath); err != nil {
		return err
	}
	input, err := os.Open(archivePath)
	if err != nil {
		return err
	}
	defer input.Close()
	identity, err := age.NewScryptIdentity(password)
	if err != nil {
		return err
	}
	identity.SetMaxWorkFactor(18)
	decrypted, err := age.Decrypt(input, identity)
	if err != nil {
		return fmt.Errorf("cannot decrypt backup: wrong passphrase or damaged file")
	}
	compressed, err := gzip.NewReader(decrypted)
	if err != nil {
		return fmt.Errorf("invalid backup payload")
	}
	defer compressed.Close()
	stage, err := os.MkdirTemp(root, ".agenttm-restore-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(stage)
	base := filepath.Join(stage, ".agenttm")
	if err = os.Mkdir(base, 0700); err != nil {
		return err
	}
	archive := tar.NewReader(compressed)
	seen := map[string]bool{}
	var total int64
	for count := 0; ; count++ {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		header, readErr := archive.Next()
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			return fmt.Errorf("backup is truncated or corrupt")
		}
		name := header.Name
		if count > 1000000 || header.Typeflag != tar.TypeReg || !allowedBackupPath(name) || seen[name] || header.Size < 0 || header.Size > backupEntryLimit(name) {
			return fmt.Errorf("unsafe or duplicate backup entry")
		}
		total += header.Size
		if total > backupLimit {
			return fmt.Errorf("backup exceeds 20 GiB extraction limit")
		}
		seen[name] = true
		p := filepath.Join(base, filepath.FromSlash(name))
		if err = os.MkdirAll(filepath.Dir(p), 0700); err != nil {
			return err
		}
		file, err := os.OpenFile(p, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
		if err != nil {
			return err
		}
		_, copyErr := io.CopyN(file, archive, header.Size)
		closeErr := file.Close()
		if copyErr != nil {
			return fmt.Errorf("backup is truncated or corrupt")
		}
		if closeErr != nil {
			return closeErr
		}
	}
	// Consume both trailers: a valid tar EOF alone does not authenticate an age
	// stream's final chunk. No destination is published before authentication.
	if n, readErr := io.Copy(io.Discard, io.LimitReader(compressed, 1)); readErr != nil || n != 0 {
		return fmt.Errorf("backup authentication failed or trailing payload")
	}
	if _, err = io.Copy(io.Discard, decrypted); err != nil {
		return fmt.Errorf("backup authentication failed")
	}
	if !seen["backup.json"] || !seen["config.json"] || !seen["data/events.db"] {
		return fmt.Errorf("backup is incomplete")
	}
	b, err := os.ReadFile(filepath.Join(base, "backup.json"))
	if err != nil {
		return err
	}
	var meta BackupInfo
	if json.Unmarshal(b, &meta) != nil || meta.Version != 1 || !snapshot.ValidID(meta.ProjectID) {
		return fmt.Errorf("unsupported backup format")
	}
	c, err := config.Load(filepath.Join(base, "config.json"))
	if err != nil {
		return err
	}
	db, err := sql.Open("sqlite", filepath.Join(base, "data", "events.db"))
	if err != nil {
		return err
	}
	// Always close before the directory rename, particularly on Windows.
	verifyErr := func() error {
		var integrity string
		if err := db.QueryRow("PRAGMA integrity_check").Scan(&integrity); err != nil || integrity != "ok" {
			return fmt.Errorf("backup database integrity failed")
		}
		var version int
		if err := db.QueryRow("PRAGMA user_version").Scan(&version); err != nil || version < 3 || version > storage.SchemaVersion {
			return fmt.Errorf("unsupported backup database version")
		}
		violations, err := db.Query("PRAGMA foreign_key_check")
		if err != nil {
			return err
		}
		hasViolation := violations.Next()
		checkErr := violations.Err()
		violations.Close()
		if checkErr != nil || hasViolation {
			return fmt.Errorf("backup database contains broken references")
		}
		var count int
		if err := db.QueryRow("SELECT count(*) FROM projects").Scan(&count); err != nil || count != 1 {
			return fmt.Errorf("backup must contain one project")
		}
		if err := db.QueryRow("SELECT count(*) FROM projects WHERE id=?", meta.ProjectID).Scan(&count); err != nil || count != 1 {
			return fmt.Errorf("backup project mismatch")
		}
		store := &storage.Store{DB: db, ProjectID: meta.ProjectID}
		engine := snapshot.Engine{Root: stage, Store: store, Config: c}
		rows, err := db.Query("SELECT id FROM checkpoints")
		if err != nil {
			return err
		}
		var ids []string
		for rows.Next() {
			var id string
			if err = rows.Scan(&id); err != nil {
				rows.Close()
				return err
			}
			ids = append(ids, id)
		}
		err = rows.Err()
		rows.Close()
		if err != nil {
			return err
		}
		for _, id := range ids {
			m, err := engine.Load(id)
			if err != nil {
				return err
			}
			for _, f := range m.Files {
				if _, err = engine.ReadObject(f); err != nil {
					return err
				}
			}
		}
		if _, err = db.Exec("UPDATE projects SET root_path=? WHERE id=?", root, meta.ProjectID); err != nil {
			return err
		}
		_, err = db.Exec("PRAGMA wal_checkpoint(TRUNCATE)")
		return err
	}()
	closeErr := db.Close()
	if verifyErr != nil {
		return verifyErr
	}
	if closeErr != nil {
		return closeErr
	}
	if err = os.Remove(filepath.Join(base, "backup.json")); err != nil {
		return err
	}
	for _, area := range []string{"objects", "manifests", "logs"} {
		if err = os.MkdirAll(filepath.Join(base, area), 0700); err != nil {
			return err
		}
	}
	if _, err = os.Lstat(target); !os.IsNotExist(err) {
		return fmt.Errorf("destination changed; restore cancelled")
	}
	return os.Rename(base, target)
}

func allowedBackupPath(name string) bool {
	if name == "backup.json" || name == "config.json" || name == "data/events.db" {
		return true
	}
	if path.Clean(name) != name || strings.ContainsAny(name, "\\:") || strings.HasPrefix(name, "/") {
		return false
	}
	parts := strings.Split(name, "/")
	if len(parts) == 2 && (parts[0] == "manifests" || parts[0] == "logs") {
		return strings.HasSuffix(parts[1], ".json") && snapshot.ValidID(strings.TrimSuffix(parts[1], ".json"))
	}
	return len(parts) == 3 && parts[0] == "objects" && snapshot.ValidHash(parts[2]) && parts[1] == parts[2][:2]
}

func backupEntryLimit(name string) int64 {
	switch {
	case name == "backup.json":
		return 4096
	case name == "data/events.db":
		return 8 << 30
	case strings.HasPrefix(name, "objects/"):
		return snapshot.MaxBlobBytes
	case strings.HasPrefix(name, "manifests/"):
		return snapshot.MaxManifestBytes
	default:
		return 1 << 20
	}
}
