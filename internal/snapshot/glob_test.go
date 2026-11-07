package snapshot

import (
	"testing"
)

func TestGlob(t *testing.T) {
	for _, v := range [][2]string{{"**/*.pem", "a.pem"}, {"**/*.pem", "a/b.pem"}, {"node_modules/**", "node_modules/a/b.js"}, {"custom/**", "custom"}, {".env.*", "a/.env.local"}, {"a/**/b", "a/b"}} {
		if !glob(v[0], v[1]) {
			t.Errorf("%v", v)
		}
	}
	if glob("a/*", "a/b/c") {
		t.Fatal("single wildcard crossed directory boundary")
	}
}
