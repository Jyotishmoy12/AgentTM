package snapshot

import (
	"bytes"
	"fmt"
)

func (e *Engine) Diff(id string) ([]Change, error) {
	changes, _, err := e.DiffPage(id, 0, MaxFiles*2)
	return changes, err
}

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
