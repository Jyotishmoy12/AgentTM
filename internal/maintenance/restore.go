package maintenance

import (
	"compress/gzip"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"agenttm/internal/config"
	"agenttm/internal/project"
	"agenttm/internal/snapshot"
	"filippo.io/age"
)

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
	archivePath, err = canonicalBackupFile(archivePath)
	if err != nil {
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
	seen, err := extractBackup(ctx, compressed, base)
	if err != nil {
		return err
	}
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
	verifyErr := verifyBackupDatabase(db, stage, root, meta, c)
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
