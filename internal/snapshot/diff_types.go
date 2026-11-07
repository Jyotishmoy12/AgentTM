package snapshot

type Change struct {
	Path      string `json:"path"`
	Kind      string `json:"kind"`
	Binary    bool   `json:"binary"`
	OldMode   uint32 `json:"old_mode,omitempty"`
	NewMode   uint32 `json:"new_mode,omitempty"`
	Patch     string `json:"patch,omitempty"`
	Truncated bool   `json:"truncated,omitempty"`
}
