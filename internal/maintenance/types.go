package maintenance

const backupLimit int64 = 20 << 30

type BackupInfo struct {
	Version   int    `json:"version"`
	ProjectID string `json:"project_id"`
	Created   string `json:"created_at"`
}

type GCReport struct {
	Objects    int    `json:"objects"`
	Referenced int    `json:"referenced"`
	Candidates int    `json:"candidates"`
	Bytes      int64  `json:"bytes"`
	Removed    int    `json:"removed"`
	Token      string `json:"token"`
}

type PurgeResult struct {
	SessionID   string   `json:"session_id"`
	Events      int      `json:"events"`
	Checkpoints int      `json:"checkpoints"`
	Warnings    []string `json:"warnings"`
}

type Usage struct {
	Total      int64  `json:"total"`
	Blobs      int64  `json:"blobs"`
	Database   int64  `json:"database"`
	Manifests  int64  `json:"manifests"`
	Logs       int64  `json:"logs"`
	Other      int64  `json:"other"`
	MeasuredAt string `json:"measured_at"`
}
