package config

type Config struct {
	SchemaVersion int `json:"schema_version"`
	Storage       struct {
		MaxFileBytes     int64 `json:"max_file_bytes"`
		MaxSnapshotBytes int64 `json:"max_snapshot_bytes"`
	} `json:"storage"`
	Capture struct {
		PromptMode           string `json:"prompt_mode"`
		MaxEventPayloadBytes int    `json:"max_event_payload_bytes"`
		SnapshotAfterTool    bool   `json:"snapshot_after_tool"`
	} `json:"capture"`
	Exclude []string `json:"exclude"`
	Server  struct {
		Host string `json:"host"`
		Port int    `json:"port"`
	} `json:"server"`
}
