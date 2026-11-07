package snapshot

import (
	"bytes"
	"fmt"
	"strings"
)

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
