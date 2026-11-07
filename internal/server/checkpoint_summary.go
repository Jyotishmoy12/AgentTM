package server

import "agenttm/internal/snapshot"

func summary(m snapshot.Manifest) map[string]any {
	return map[string]any{"id": m.ID, "session_id": m.SessionID, "parent_id": m.ParentID, "event_id": m.EventID, "created_at": m.CreatedAt, "kind": m.Kind, "partial": m.Partial, "potentially_inconsistent": m.PotentiallyInconsistent, "fidelity": m.Fidelity, "file_count": len(m.Files), "omission_count": len(m.Omissions), "base_commit": m.BaseCommit}
}
