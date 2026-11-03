package snapshot

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"path"
	"reflect"
	"strings"
	"unicode"
	"unicode/utf8"
)

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

func Hash(b []byte) string { h := sha256.Sum256(b); return hex.EncodeToString(h[:]) }
func ValidID(s string) bool {
	if len(s) != 36 {
		return false
	}
	for i, c := range s {
		if i == 8 || i == 13 || i == 18 || i == 23 {
			if c != '-' {
				return false
			}
		} else if !strings.ContainsRune("0123456789abcdef", c) {
			return false
		}
	}
	return true
}
func ValidHash(s string) bool {
	if len(s) != 64 {
		return false
	}
	_, e := hex.DecodeString(s)
	return e == nil && s == strings.ToLower(s)
}

// Require paths that are safe and unambiguous on every supported platform,
// even when a manifest was produced on a case-sensitive filesystem.
func ValidatePath(p string) error {
	if p == "" || len(p) > 4096 || !utf8.ValidString(p) || path.IsAbs(p) || path.Clean(p) != p || strings.ContainsAny(p, "\\:") {
		return fmt.Errorf("unsafe snapshot path %q", p)
	}
	for _, c := range p {
		if unicode.IsControl(c) {
			return fmt.Errorf("control character in snapshot path")
		}
	}
	for _, part := range strings.Split(p, "/") {
		lower := strings.ToLower(part)
		if part == "." || part == ".." || strings.TrimRight(part, " .") != part || lower == ".git" || lower == ".agenttm" || strings.ContainsAny(part, "<>\"|?*") {
			return fmt.Errorf("unsafe snapshot path %q", p)
		}
		stem := strings.Split(lower, ".")[0]
		if stem == "con" || stem == "prn" || stem == "aux" || stem == "nul" || len(stem) == 4 && (strings.HasPrefix(stem, "com") || strings.HasPrefix(stem, "lpt")) && stem[3] >= '0' && stem[3] <= '9' {
			return fmt.Errorf("reserved snapshot path %q", p)
		}
	}
	return nil
}
func (m Manifest) Validate() error {
	if m.Version != 1 || !ValidID(m.ID) || !ValidID(m.ProjectID) || !ValidID(m.SessionID) || !ValidID(m.EventID) || m.ParentID != "" && !ValidID(m.ParentID) {
		return fmt.Errorf("unsupported or invalid manifest identity")
	}
	if m.Kind != "baseline" && m.Kind != "final" && m.Kind != "manual" && m.Kind != "observed" && m.Kind != "operation_before" && m.Kind != "operation_after" {
		return fmt.Errorf("invalid checkpoint kind")
	}
	if m.ObservedEventID != "" && !ValidID(m.ObservedEventID) {
		return fmt.Errorf("invalid observed event ID")
	}
	if m.Fidelity != "workspace_scan" {
		return fmt.Errorf("unsupported snapshot fidelity")
	}
	if len(m.Files) > MaxFiles || len(m.Omissions) > MaxFiles {
		return fmt.Errorf("manifest entry limit exceeded")
	}
	if m.Partial != (len(m.Omissions) > 0 || m.PotentiallyInconsistent) {
		return fmt.Errorf("inconsistent partial snapshot flags")
	}
	seen := map[string]bool{}
	spellings := map[string]string{}
	var total int64
	previous := ""
	for _, f := range m.Files {
		if e := ValidatePath(f.Path); e != nil {
			return e
		}
		if f.Path <= previous || f.Size < 0 || f.Size > MaxBlobBytes || f.Mode&^uint32(0777) != 0 || !strings.HasPrefix(f.ObjectID, "sha256:") || !ValidHash(strings.TrimPrefix(f.ObjectID, "sha256:")) {
			return fmt.Errorf("invalid manifest file %q", f.Path)
		}
		previous = f.Path
		total += f.Size
		if total > 2<<30 {
			return fmt.Errorf("manifest exceeds 2 GiB content limit")
		}
		for p := f.Path; p != "."; p = path.Dir(p) {
			k := strings.ToLower(p)
			if old, ok := spellings[k]; ok && old != p {
				return fmt.Errorf("case-insensitive path component collision: %q and %q", old, p)
			}
			spellings[k] = p
		}
		lower := strings.ToLower(f.Path)
		if seen[lower] {
			return fmt.Errorf("case-insensitive collision: %q", f.Path)
		}
		seen[lower] = true
	}
	for p := range seen {
		for d := path.Dir(p); d != "."; d = path.Dir(d) {
			if seen[d] {
				return fmt.Errorf("file/directory collision: %s", p)
			}
		}
	}
	return nil
}
func sameState(a, b Manifest) bool {
	return reflect.DeepEqual(a.Files, b.Files) && reflect.DeepEqual(a.Omissions, b.Omissions) && a.PotentiallyInconsistent == b.PotentiallyInconsistent
}
