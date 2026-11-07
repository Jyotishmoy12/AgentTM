package main

import (
	"flag"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func TestReleaseFlagContract(t *testing.T) {
	originalFlags, originalArgs := flag.CommandLine, os.Args
	t.Cleanup(func() { flag.CommandLine, os.Args = originalFlags, originalArgs })
	for _, custom := range []bool{false, true} {
		flag.CommandLine = flag.NewFlagSet("release", flag.ContinueOnError)
		os.Args = []string{"release"}
		want := releaseOptions{version: "0.1.0", output: "dist", targets: "windows/amd64,windows/arm64,linux/amd64,linux/arm64,darwin/amd64,darwin/arm64"}
		if custom {
			os.Args = append(os.Args, "--version", "1.2.3-rc.1", "--out", "release output", "--targets", "linux/arm64", "--desktop-windows", "--verify-only", "--require-all-targets")
			want = releaseOptions{version: "1.2.3-rc.1", output: "release output", targets: "linux/arm64", desktop: true, verifyOnly: true, requireAll: true}
		}
		if got := readReleaseOptions(); !reflect.DeepEqual(got, want) {
			t.Fatalf("flag contract changed: got %+v, want %+v", got, want)
		}
	}
}

func TestReleaseTargets(t *testing.T) {
	for _, platform := range []string{"windows", "linux", "darwin"} {
		for _, arch := range []string{"amd64", "arm64"} {
			got, err := parseReleaseTarget(platform + "/" + arch)
			if err != nil || got.os != platform || got.arch != arch {
				t.Fatalf("supported target rejected: %+v, %v", got, err)
			}
			binary, extension := "agenttm", ".tar.gz"
			if platform == "windows" {
				binary, extension = "agenttm.exe", ".zip"
			}
			if got.binary != binary || got.extension != extension {
				t.Fatalf("wrong target packaging: %+v", got)
			}
		}
	}
	for _, target := range []string{"", "linux", "linux/386", "freebsd/amd64", "linux/amd64/extra", "../amd64", " windows/amd64"} {
		if _, err := parseReleaseTarget(target); err == nil {
			t.Errorf("invalid target accepted: %q", target)
		}
	}
}

func TestInvalidReleaseVersionDoesNotCreateOutput(t *testing.T) {
	out := filepath.Join(t.TempDir(), "must-not-exist")
	for _, version := range []string{"", "v1.2.3", "1.2", "1.2.3/escape", "1.2.3;command"} {
		err := runRelease(releaseOptions{version: version, output: out})
		if err == nil || !strings.Contains(err.Error(), "invalid release version") {
			t.Fatalf("invalid version accepted: %q, %v", version, err)
		}
	}
	if _, err := os.Stat(out); !os.IsNotExist(err) {
		t.Fatalf("validation wrote output: %v", err)
	}
}

func TestReleaseSourceFilesStayWithinLineLimit(t *testing.T) {
	files, err := filepath.Glob("*.go")
	if err != nil {
		t.Fatal(err)
	}
	for _, file := range files {
		data, err := os.ReadFile(file)
		if err != nil {
			t.Fatal(err)
		}
		if lines := strings.Count(strings.TrimSuffix(string(data), "\n"), "\n") + 1; lines > 200 {
			t.Errorf("%s has %d lines; the release package limit is 200", file, lines)
		}
	}
}
