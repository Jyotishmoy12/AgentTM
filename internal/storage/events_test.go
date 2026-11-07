package storage

import (
	"testing"
)

func TestFailedAppendRollsBackAndPreservesNextSequence(t *testing.T) {
	s := storageFixture(t)
	session, err := s.Start()
	if err != nil {
		t.Fatal(err)
	}
	if id, err := s.AppendID(ID(), "test", "", "", []byte(`{}`)); err == nil || id != "" {
		t.Fatalf("orphan event accepted: %q, %v", id, err)
	}
	if _, err := s.DB.Exec(`CREATE TRIGGER reject_event BEFORE INSERT ON events WHEN NEW.kind='rejected' BEGIN SELECT RAISE(ABORT,'synthetic event failure'); END`); err != nil {
		t.Fatal(err)
	}
	if id, err := s.AppendID(session, "rejected", "", "", []byte(`{}`)); err == nil || id != "" {
		t.Fatalf("failed insert returned event identity: %q, %v", id, err)
	}
	id, err := s.AppendID(session, "accepted", "command_execution", "call", []byte(`{"retained":true}`))
	if err != nil {
		t.Fatal(err)
	}
	events, err := s.Events(session, 0, 10)
	if err != nil || len(events) != 1 || events[0].ID != id || events[0].Sequence != 1 || string(events[0].Payload) != `{"retained":true}` {
		t.Fatalf("failed append altered event sequence or payload: %+v, %v", events, err)
	}
}

func TestSessionReadsAndFinishRespectProjectScope(t *testing.T) {
	s := storageFixture(t)
	session, err := s.Start()
	if err != nil {
		t.Fatal(err)
	}
	other := &Store{DB: s.DB, ProjectID: ID()}
	if sessions, err := other.Sessions(); err != nil || len(sessions) != 0 {
		t.Fatalf("foreign sessions exposed: %+v, %v", sessions, err)
	}
	if _, err := other.Events(session, 0, 10); err == nil {
		t.Fatal("foreign events exposed")
	}
	if _, err := other.Operations(session, 0, 10); err == nil {
		t.Fatal("foreign operations exposed")
	}
	if err := other.Finish(session, "failed", 1); err != nil {
		t.Fatal(err)
	}
	sessions, err := s.Sessions()
	if err != nil || len(sessions) != 1 || sessions[0].Status != "active" || sessions[0].EndedAt.Valid {
		t.Fatalf("foreign finish altered session: %+v, %v", sessions, err)
	}
}
