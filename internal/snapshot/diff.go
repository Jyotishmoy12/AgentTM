package snapshot

import (
	"bytes"
	"fmt"
	"sort"
	"strings"
	"unicode/utf8"
)

type Change struct {
	Path      string `json:"path"`
	Kind      string `json:"kind"`
	Binary    bool   `json:"binary"`
	OldMode   uint32 `json:"old_mode,omitempty"`
	NewMode   uint32 `json:"new_mode,omitempty"`
	Patch     string `json:"patch,omitempty"`
	Truncated bool   `json:"truncated,omitempty"`
}

func fileMap(m Manifest) map[string]File {
	out := map[string]File{}
	for _, f := range m.Files {
		out[f.Path] = f
	}
	return out
}
func ChangedPaths(a, b Manifest) []string {
	old, new := fileMap(a), fileMap(b)
	set := map[string]bool{}
	for p, f := range old {
		if g, ok := new[p]; !ok || f != g {
			set[p] = true
		}
	}
	for p, f := range new {
		if g, ok := old[p]; !ok || f != g {
			set[p] = true
		}
	}
	out := make([]string, 0, len(set))
	for p := range set {
		out = append(out, p)
	}
	sort.Strings(out)
	return out
}
func Text(b []byte) bool { return utf8.Valid(b) && !bytes.ContainsRune(b, 0) }
func (e *Engine) Diff(id string) ([]Change, error) {
	changes, _, err := e.DiffPage(id, 0, MaxFiles*2)
	return changes, err
}

// DiffPage bounds blob reads and patch generation to the requested changes.
func (e *Engine) DiffPage(id string, offset, limit int) ([]Change, int, error) {
	if offset < 0 || limit < 1 || limit > MaxFiles*2 {
		return nil, 0, fmt.Errorf("invalid diff page")
	}
	m, err := e.Load(id)
	if err != nil {
		return nil, 0, err
	}
	parent := Manifest{}
	if m.ParentID != "" {
		parent, err = e.Load(m.ParentID)
		if err != nil {
			return nil, 0, err
		}
		if parent.SessionID != m.SessionID {
			return nil, 0, fmt.Errorf("parent checkpoint belongs to another session")
		}
	}
	old, new := fileMap(parent), fileMap(m)
	out := []Change{}
	remaining := 1 << 20
	paths := ChangedPaths(parent, m)
	total := len(paths)
	if offset > total {
		offset = total
	}
	end := min(offset+limit, total)
	for _, p := range paths[offset:end] {
		a, aok := old[p]
		b, bok := new[p]
		v := Change{Path: p, Kind: "modified", OldMode: a.Mode, NewMode: b.Mode}
		if !aok {
			v.Kind = "added"
		}
		if !bok {
			v.Kind = "removed"
		}
		var ab, bb []byte
		if aok {
			ab, err = e.ReadObject(a)
			if err != nil {
				return nil, 0, err
			}
		}
		if bok {
			bb, err = e.ReadObject(b)
			if err != nil {
				return nil, 0, err
			}
		}
		v.Binary = !Text(ab) || !Text(bb)
		if !v.Binary && !bytes.Equal(ab, bb) {
			// A bounded, valid unified patch replacing the whole file. Avoid quadratic
			// LCS work on adversarial/generated files; fine-grained hunks are UI work.
			needed := len(ab) + len(bb) + bytes.Count(ab, []byte{'\n'}) + bytes.Count(bb, []byte{'\n'}) + len(p)*2 + 256
			if needed > remaining || needed > 128<<10 {
				v.Truncated = true
			} else {
				v.Patch = wholePatch(p, ab, bb, aok, bok)
				remaining -= len(v.Patch)
			}
		}
		out = append(out, v)
	}
	return out, total, nil
}
func wholePatch(p string, a, b []byte, aok, bok bool) string {
	nameA, nameB := "a/"+p, "b/"+p
	if !aok {
		nameA = "/dev/null"
	}
	if !bok {
		nameB = "/dev/null"
	}
	lines := func(b []byte) []string {
		if len(b) == 0 {
			return nil
		}
		v := strings.Split(string(b), "\n")
		if v[len(v)-1] == "" {
			v = v[:len(v)-1]
		}
		return v
	}
	al, bl := lines(a), lines(b)
	as, bs := 1, 1
	if len(al) == 0 {
		as = 0
	}
	if len(bl) == 0 {
		bs = 0
	}
	var out strings.Builder
	fmt.Fprintf(&out, "--- %s\n+++ %s\n@@ -%d,%d +%d,%d @@\n", nameA, nameB, as, len(al), bs, len(bl))
	for i, s := range al {
		out.WriteString("-" + s + "\n")
		if i == len(al)-1 && !bytes.HasSuffix(a, []byte{'\n'}) {
			out.WriteString("\\ No newline at end of file\n")
		}
	}
	for i, s := range bl {
		out.WriteString("+" + s + "\n")
		if i == len(bl)-1 && !bytes.HasSuffix(b, []byte{'\n'}) {
			out.WriteString("\\ No newline at end of file\n")
		}
	}
	return out.String()
}
