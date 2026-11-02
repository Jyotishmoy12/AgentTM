package snapshot

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"agenttm/internal/config"
	"agenttm/internal/events"
	"agenttm/internal/project"
	"agenttm/internal/storage"
)

type Engine struct {
	Root   string
	Store  *storage.Store
	Config config.Config
}
type CaptureResult struct {
	Manifest Manifest
	Created  bool
}

func (e *Engine) session(id string) error {
	if !ValidID(id) {
		return fmt.Errorf("invalid session UUID")
	}
	var n int
	if err := e.Store.DB.QueryRow("SELECT count(*) FROM sessions WHERE id=? AND project_id=?", id, e.Store.ProjectID).Scan(&n); err != nil {
		return err
	}
	if n != 1 {
		return fmt.Errorf("session not found in current project")
	}
	return nil
}
func (e *Engine) List(session string) ([]Manifest, error) {
	if err := e.session(session); err != nil {
		return nil, err
	}
	rows, err := e.Store.DB.Query("SELECT id FROM checkpoints WHERE session_id=? ORDER BY rowid", session)
	if err != nil {
		return nil, err
	}
	var ids []string
	for rows.Next() {
		var id string
		if err = rows.Scan(&id); err != nil {
			rows.Close()
			return nil, err
		}
		ids = append(ids, id)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, err
	}
	out := []Manifest{}
	for _, id := range ids {
		m, err := e.Load(id)
		if err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, nil
}
func (e *Engine) latest(session string) (*Manifest, error) {
	var id string
	err := e.Store.DB.QueryRow("SELECT id FROM checkpoints WHERE session_id=? ORDER BY rowid DESC LIMIT 1", session).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	m, err := e.Load(id)
	return &m, err
}
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
func (e *Engine) Capture(ctx context.Context, session, kind string) (CaptureResult, error) {
	return e.capture(ctx, session, kind, "")
}
func (e *Engine) CaptureNear(ctx context.Context, session, event string) (CaptureResult, error) {
	if !ValidID(event) {
		return CaptureResult{}, fmt.Errorf("invalid observed event UUID")
	}
	var count int
	if err := e.Store.DB.QueryRow("SELECT count(*) FROM events WHERE id=? AND session_id=? AND kind='item.completed' AND tool_name IN ('command_execution','file_change')", event, session).Scan(&count); err != nil {
		return CaptureResult{}, err
	}
	if count != 1 {
		return CaptureResult{}, fmt.Errorf("event is not a supported completed tool observation")
	}
	return e.capture(ctx, session, "observed", event)
}
func (e *Engine) capture(ctx context.Context, session, kind, observedEvent string) (CaptureResult, error) {
	var result CaptureResult
	if kind != "baseline" && kind != "final" && kind != "manual" && kind != "observed" {
		return result, fmt.Errorf("invalid capture kind")
	}
	if err := e.session(session); err != nil {
		return result, err
	}
	if e.Config.Storage.MaxFileBytes < 1 || e.Config.Storage.MaxFileBytes > MaxBlobBytes || e.Config.Storage.MaxSnapshotBytes < e.Config.Storage.MaxFileBytes {
		return result, fmt.Errorf("invalid snapshot storage limits")
	}
	lockPath := filepath.Join(e.Root, ".agenttm", "data", "snapshot.lock")
	if err := project.SafePath(lockPath); err != nil {
		return result, err
	}
	lock, err := os.OpenFile(lockPath, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if os.IsExist(err) {
		return result, fmt.Errorf("snapshot capture is locked; another capture may be running; run agenttm doctor before removing a stale .agenttm/data/snapshot.lock")
	}
	if err != nil {
		return result, err
	}
	defer func() { lock.Close(); os.Remove(lockPath) }()
	if _, err = lock.WriteString(session + "\n"); err != nil {
		return result, err
	}
	parent, err := e.latest(session)
	if err != nil {
		return result, err
	}
	if kind == "baseline" && parent != nil {
		return result, fmt.Errorf("baseline already exists for session")
	}
	m, err := e.scan(ctx)
	if err != nil {
		return result, err
	}
	m.Version = 1
	m.ID = storage.ID()
	m.ProjectID = e.Store.ProjectID
	m.SessionID = session
	m.EventID = storage.ID()
	m.ObservedEventID = observedEvent
	m.CreatedAt = storage.Now()
	m.Kind = kind
	m.Fidelity = "workspace_scan"
	if parent != nil {
		m.ParentID = parent.ID
		m.BaseCommit = parent.BaseCommit
	} else {
		m.BaseCommit, _ = project.Git(e.Root, "rev-parse", "--verify", "HEAD")
	}
	if err = m.Validate(); err != nil {
		return result, err
	}
	changed := parent == nil || !sameState(*parent, m)
	checkpointID := m.ID
	if !changed {
		checkpointID = parent.ID
	}
	meta := map[string]any{"source": "agenttm", "observation": kind, "checkpoint_id": checkpointID, "created": changed, "partial": m.Partial, "potentially_inconsistent": m.PotentiallyInconsistent, "file_count": len(m.Files), "omission_count": len(m.Omissions), "fidelity": "workspace_scan", "attribution": "workspace_observation"}
	if observedEvent != "" {
		meta["observed_event_id"] = observedEvent
		meta["attribution"] = "observed_near_event"
	}
	if parent != nil {
		meta["changed_paths"] = ChangedPaths(*parent, m)
	}
	payload := events.Encode(meta, e.Config.Capture.MaxEventPayloadBytes, "")
	var manifestBytes []byte
	rel := "manifests/" + m.ID + ".json"
	if changed {
		manifestBytes, err = json.MarshalIndent(m, "", "  ")
		if err != nil {
			return result, err
		}
		if len(manifestBytes) > MaxManifestBytes {
			return result, fmt.Errorf("manifest size limit exceeded")
		}
		if err = atomicWrite(filepath.Join(e.Root, ".agenttm", filepath.FromSlash(rel)), manifestBytes); err != nil {
			return result, err
		}
	}
	// Files first, then one DB transaction publishes both checkpoint and linked
	// observation. A crash before commit leaves only unreferenced store files.
	tx, err := e.Store.DB.Begin()
	if err != nil {
		return result, err
	}
	defer tx.Rollback()
	if changed {
		_, err = tx.Exec("INSERT INTO checkpoints(id,session_id,parent_id,event_id,manifest_path,created_at,partial,manifest_sha256) VALUES (?,?,?,?,?,?,?,?)", m.ID, session, m.ParentID, m.EventID, rel, m.CreatedAt, m.Partial, Hash(manifestBytes))
		if err != nil {
			return result, err
		}
	}
	_, err = tx.Exec("INSERT INTO events(id,session_id,sequence,kind,received_at,payload_json,checkpoint_id) SELECT ?,?,COALESCE(MAX(sequence),0)+1,?,?,?,? FROM events WHERE session_id=?", m.EventID, session, "agenttm.snapshot."+kind, m.CreatedAt, string(payload), checkpointID, session)
	if err != nil {
		return result, err
	}
	if observedEvent != "" {
		if _, err = tx.Exec("UPDATE events SET checkpoint_id=? WHERE id=? AND session_id=?", checkpointID, observedEvent, session); err != nil {
			return result, err
		}
	}
	if err = tx.Commit(); err != nil {
		return result, err
	}
	if changed {
		return CaptureResult{m, true}, nil
	}
	return CaptureResult{*parent, false}, nil
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
