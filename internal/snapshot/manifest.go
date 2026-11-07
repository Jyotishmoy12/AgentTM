package snapshot

import (
	"fmt"
	"path"
	"reflect"
	"strings"
)

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
