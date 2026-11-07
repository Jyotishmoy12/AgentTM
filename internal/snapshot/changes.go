package snapshot

import (
	"bytes"
	"sort"
	"unicode/utf8"
)

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
