package snapshot

const MaxManifestBytes = 32 << 20
const MaxFiles = 100000
const MaxBlobBytes = 64 << 20

type File struct {
	Path     string `json:"path"`
	ObjectID string `json:"object_id"`
	Mode     uint32 `json:"mode"`
	Size     int64  `json:"size"`
}
type Omission struct {
	Path   string `json:"path"`
	Reason string `json:"reason"`
}
type Manifest struct {
	Version                 int        `json:"version"`
	ID                      string     `json:"id"`
	ProjectID               string     `json:"project_id"`
	SessionID               string     `json:"session_id"`
	ParentID                string     `json:"parent_id,omitempty"`
	EventID                 string     `json:"event_id"`
	ObservedEventID         string     `json:"observed_event_id,omitempty"`
	CreatedAt               string     `json:"created_at"`
	BaseCommit              string     `json:"base_commit,omitempty"`
	Kind                    string     `json:"kind"`
	Fidelity                string     `json:"fidelity"`
	Partial                 bool       `json:"partial"`
	PotentiallyInconsistent bool       `json:"potentially_inconsistent"`
	Files                   []File     `json:"files"`
	Omissions               []Omission `json:"omissions"`
}
