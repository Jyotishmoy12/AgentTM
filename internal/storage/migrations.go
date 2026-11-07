package storage

import (
	_ "embed"
)

//go:embed migrations/001_initial.sql
var initial string

//go:embed migrations/002_snapshot_integrity.sql
var snapshotMigration string

//go:embed migrations/003_fork_status.sql
var forkMigration string

//go:embed migrations/004_operation_checkpoints.sql
var operationMigration string

//go:embed migrations/005_session_titles.sql
var titleMigration string

const SchemaVersion = 5
