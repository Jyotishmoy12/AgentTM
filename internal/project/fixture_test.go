package project

import (
	"os/exec"
	"testing"
)

func gitTest(t *testing.T, dir string, args ...string) []byte {
	t.Helper()
	b, e := exec.Command("git", append([]string{"-C", dir}, args...)...).CombinedOutput()
	if e != nil {
		t.Fatalf("git: %s %v", b, e)
	}
	return b
}
