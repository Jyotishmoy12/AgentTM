package snapshot

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"path/filepath"
)

func (e *Engine) Load(id string) (Manifest, error) {
	var m Manifest
	if !ValidID(id) {
		return m, fmt.Errorf("invalid checkpoint UUID")
	}
	var rel, hash, session, event, created string
	var parent sql.NullString
	var partial bool
	err := e.Store.DB.QueryRow("SELECT c.manifest_path,c.manifest_sha256,c.session_id,c.event_id,c.created_at,c.parent_id,c.partial FROM checkpoints c JOIN sessions s ON s.id=c.session_id WHERE c.id=? AND s.project_id=?", id, e.Store.ProjectID).Scan(&rel, &hash, &session, &event, &created, &parent, &partial)
	if errors.Is(err, sql.ErrNoRows) {
		return m, fmt.Errorf("checkpoint not found in current project")
	}
	if err != nil {
		return m, err
	}
	if rel != "manifests/"+id+".json" || !ValidHash(hash) {
		return m, fmt.Errorf("invalid manifest index for checkpoint %s", id)
	}
	b, err := boundedRead(filepath.Join(e.Root, ".agenttm", filepath.FromSlash(rel)), MaxManifestBytes)
	if err != nil {
		return m, err
	}
	if Hash(b) != hash {
		return m, fmt.Errorf("manifest integrity check failed: %s", id)
	}
	if err = json.Unmarshal(b, &m); err != nil {
		return m, fmt.Errorf("invalid manifest JSON: %w", err)
	}
	if err = m.Validate(); err != nil {
		return m, err
	}
	if m.ID != id || m.ProjectID != e.Store.ProjectID || m.SessionID != session || m.EventID != event || m.ParentID != parent.String || m.CreatedAt != created || m.Partial != partial {
		return m, fmt.Errorf("manifest/index metadata mismatch")
	}
	return m, nil
}

func (e *Engine) File(id, p string) ([]byte, error) {
	if err := ValidatePath(p); err != nil {
		return nil, err
	}
	m, err := e.Load(id)
	if err != nil {
		return nil, err
	}
	for _, f := range m.Files {
		if f.Path == p {
			return e.ReadObject(f)
		}
	}
	return nil, fmt.Errorf("file not captured in this checkpoint; inspect its manifest omissions")
}
