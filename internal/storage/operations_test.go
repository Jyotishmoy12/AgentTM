package storage

import (
	"strings"
	"testing"
)

func addStoredOperation(t *testing.T, s *Store, session, item, paths string) string {
	t.Helper()
	id := ID()
	_, err := s.DB.Exec(`INSERT INTO operations(id,session_id,run_id,upstream_item_id,upstream_turn_id,tool_name,started_at,changed_paths_json,changed_path_count) VALUES (?,?,'run',?,'turn','command_execution',?,?,2)`, id, session, item, Now(), paths)
	if err != nil {
		t.Fatal(err)
	}
	return id
}

func TestOperationsCursorPaginationUsesRecordedRows(t *testing.T) {
	s := storageFixture(t)
	session, err := s.Start()
	if err != nil {
		t.Fatal(err)
	}
	other, err := s.Start()
	if err != nil {
		t.Fatal(err)
	}
	first := addStoredOperation(t, s, session, "first", `["a","b"]`)
	addStoredOperation(t, s, other, "unrelated", `[]`)
	second := addStoredOperation(t, s, session, "second", `["c","d"]`)
	page, err := s.Operations(session, 0, 1)
	if err != nil || len(page) != 1 || page[0].ID != first || page[0].ChangedPathCount != 2 || string(page[0].ChangedPaths) != `["a","b"]` {
		t.Fatalf("invalid first page: %+v, %v", page, err)
	}
	more, err := s.Operations(session, page[0].Cursor, 10)
	if err != nil || len(more) != 1 || more[0].ID != second || more[0].Cursor <= page[0].Cursor {
		t.Fatalf("cursor skipped or duplicated session rows: %+v, %v", more, err)
	}
	last, err := s.Operations(session, more[0].Cursor, 10)
	if err != nil || len(last) != 0 {
		t.Fatalf("unexpected trailing operations: %+v, %v", last, err)
	}
}

func TestOperationsRejectInvalidBoundsAndCorruptPaths(t *testing.T) {
	s := storageFixture(t)
	session, err := s.Start()
	if err != nil {
		t.Fatal(err)
	}
	for _, bound := range []struct {
		after int64
		limit int
	}{{-1, 1}, {0, 0}, {0, 101}} {
		if _, err := s.Operations(session, bound.after, bound.limit); err == nil {
			t.Fatalf("invalid operation bounds accepted: %+v", bound)
		}
	}
	addStoredOperation(t, s, session, "corrupt", `not-json`)
	if _, err := s.Operations(session, 0, 10); err == nil || !strings.Contains(err.Error(), "invalid operation changed paths") {
		t.Fatalf("corrupt changed paths accepted: %v", err)
	}
}
