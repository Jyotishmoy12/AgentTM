package snapshot

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"agenttm/internal/events"
	"agenttm/internal/project"
	"agenttm/internal/storage"
)

func (e *Engine) capture(ctx context.Context, session, kind, observedEvent string) (CaptureResult, error) {
	var result CaptureResult
	if kind != "baseline" && kind != "final" && kind != "manual" && kind != "observed" && kind != "operation_before" && kind != "operation_after" {
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
	if kind == "operation_before" || kind == "operation_after" {
		verified, scanErr := e.scan(ctx)
		if scanErr != nil {
			return result, scanErr
		}
		if !sameState(m, verified) {
			verified.Partial = true
			verified.PotentiallyInconsistent = true
		}
		m = verified
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
	stateChanged := parent == nil || !sameState(*parent, m)
	changed := stateChanged || kind == "operation_after"
	checkpointID := m.ID
	if !changed {
		checkpointID = parent.ID
	}
	meta := map[string]any{"source": "agenttm", "observation": kind, "checkpoint_id": checkpointID, "created": changed, "partial": m.Partial, "potentially_inconsistent": m.PotentiallyInconsistent, "file_count": len(m.Files), "omission_count": len(m.Omissions), "fidelity": "workspace_scan", "attribution": "workspace_observation"}
	meta["state_changed"] = stateChanged
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
