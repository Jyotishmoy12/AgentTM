package config

func Default() Config {
	var c Config
	c.SchemaVersion = 1
	c.Storage.MaxFileBytes = 2 << 20
	c.Storage.MaxSnapshotBytes = 200 << 20
	c.Capture.PromptMode = "metadata_only"
	c.Capture.MaxEventPayloadBytes = 65536
	c.Capture.SnapshotAfterTool = true
	c.Exclude = []string{".env", ".env.*", "**/*.pem", "**/*.key", "node_modules/**", "vendor/**", "dist/**", "build/**", ".agenttm/**"}
	c.Server.Host = "127.0.0.1"
	c.Server.Port = 7331
	return c
}
