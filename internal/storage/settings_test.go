package storage

import "testing"

func TestDatabaseSafetySettings(t *testing.T) {
	s := storageFixture(t)
	var foreignKeys, timeout, version int
	var mode, integrity string
	for _, query := range []struct {
		sql         string
		destination any
	}{
		{"PRAGMA foreign_keys", &foreignKeys},
		{"PRAGMA busy_timeout", &timeout},
		{"PRAGMA user_version", &version},
		{"PRAGMA journal_mode", &mode},
		{"PRAGMA integrity_check", &integrity},
	} {
		if err := s.DB.QueryRow(query.sql).Scan(query.destination); err != nil {
			t.Fatal(err)
		}
	}
	if foreignKeys != 1 || timeout != 5000 || version != SchemaVersion || mode != "wal" || integrity != "ok" || s.DB.Stats().MaxOpenConnections != 1 {
		t.Fatalf("database safety settings changed: FK=%d timeout=%d version=%d mode=%s integrity=%s connections=%d", foreignKeys, timeout, version, mode, integrity, s.DB.Stats().MaxOpenConnections)
	}
}
