// Release builds use local source and pinned dependencies. This tool
// never publishes assets or modifies Git refs.
package main

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strings"
	"time"

	"agenttm/internal/project"
)

func main() {
	if err := release(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
func release() error {
	version := flag.String("version", "0.1.0", "release semantic version")
	output := flag.String("out", "dist", "new archive output directory")
	targets := flag.String("targets", "windows/amd64,windows/arm64,linux/amd64,linux/arm64,darwin/amd64,darwin/arm64", "comma-separated GOOS/GOARCH targets")
	desktop := flag.Bool("desktop-windows", false, "also package the native Windows amd64 desktop preview (Windows amd64 host required)")
	verifyOnly := flag.Bool("verify-only", false, "verify existing archive checksums, contents, and executable modes without building")
	requireAll := flag.Bool("require-all-targets", false, "verification also requires all six CLI platform archives")
	flag.Parse()
	if !regexp.MustCompile(`^[0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9.-]+)?$`).MatchString(*version) {
		return fmt.Errorf("invalid release version")
	}
	root, err := os.Getwd()
	if err != nil {
		return err
	}
	out, err := filepath.Abs(*output)
	if err != nil {
		return err
	}
	if err = project.SafePath(out); err != nil {
		return err
	}
	if *verifyOnly {
		if err = verifyRelease(out, *version); err != nil {
			return err
		}
		if *requireAll {
			return verifyExpectedTargets(out, *version, *desktop)
		}
		return nil
	}
	if *desktop && (runtime.GOOS != "windows" || runtime.GOARCH != "amd64" || !strings.Contains(","+*targets+",", ",windows/amd64,")) {
		return fmt.Errorf("--desktop-windows requires a Windows amd64 host and windows/amd64 in --targets")
	}
	if err = os.MkdirAll(out, 0700); err != nil {
		return err
	}
	temp, err := os.MkdirTemp(out, ".build-")
	if err != nil {
		return err
	}
	// Rooted deletion is restricted to this generated child directory.
	defer func() {
		if store, e := os.OpenRoot(out); e == nil {
			_ = store.RemoveAll(filepath.Base(temp))
			store.Close()
		}
	}()
	commit, _ := project.Git(root, "rev-parse", "--short", "HEAD")
	if commit == "" {
		commit = "development"
	}
	if status, e := project.Git(root, "-c", "core.fsmonitor=false", "status", "--porcelain", "--untracked-files=normal"); e == nil && status != "" {
		commit += "-dirty"
	}
	date := time.Now().UTC().Format(time.RFC3339)
	notices, err := os.ReadFile(filepath.Join(root, "internal", "server", "ui", "third-party-notices.txt"))
	if err != nil {
		return fmt.Errorf("build the frontend first: %w", err)
	}
	readme := releaseReadme(*version, false)
	guide, err := os.ReadFile(filepath.Join(root, "docs", "fork-and-recovery.md"))
	if err != nil {
		return err
	}
	checksums := map[string]string{}
	var windowsCLI []byte
	for _, target := range strings.Split(*targets, ",") {
		parts := strings.Split(target, "/")
		if len(parts) != 2 || parts[0] != "windows" && parts[0] != "linux" && parts[0] != "darwin" || parts[1] != "amd64" && parts[1] != "arm64" {
			return fmt.Errorf("unsupported release target %q", target)
		}
		binary := "agenttm"
		if parts[0] == "windows" {
			binary += ".exe"
		}
		targetDir := filepath.Join(temp, parts[0]+"-"+parts[1])
		if err = os.Mkdir(targetDir, 0700); err != nil {
			return err
		}
		fmt.Println("Building", target)
		cmd := exec.Command("go", "build", "-trimpath", "-ldflags", "-s -w -X agenttm/internal/cli.Version="+*version+" -X agenttm/internal/cli.Commit="+commit+" -X agenttm/internal/cli.BuildDate="+date, "-o", filepath.Join(targetDir, binary), "./cmd/agenttm")
		cmd.Dir = root
		cmd.Env = append(os.Environ(), "GOOS="+parts[0], "GOARCH="+parts[1], "CGO_ENABLED=0")
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if err = cmd.Run(); err != nil {
			return err
		}
		executable, err := os.ReadFile(filepath.Join(targetDir, binary))
		if err != nil {
			return err
		}
		if target == "windows/amd64" {
			windowsCLI = executable
		}
		files := map[string][]byte{binary: executable, "README.md": readme, "RESTORE.md": guide, "THIRD_PARTY_NOTICES.txt": notices}
		extension := ".tar.gz"
		if parts[0] == "windows" {
			extension = ".zip"
		}
		name := "agenttm_" + *version + "_" + parts[0] + "_" + parts[1] + extension
		p := filepath.Join(out, name)
		if err = archive(p, binary, files); err != nil {
			return err
		}
		b, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		sum := sha256.Sum256(b)
		checksums[name] = hex.EncodeToString(sum[:])
	}
	if *desktop {
		binaryPath := filepath.Join(temp, "AgentTM.exe")
		cmd := exec.Command("go", "build", "-trimpath", "-tags", "production", "-ldflags", "-H windowsgui -s -w -X agenttm/internal/cli.Version="+*version+" -X agenttm/internal/cli.Commit="+commit+" -X agenttm/internal/cli.BuildDate="+date, "-o", binaryPath, "./cmd/agenttm-desktop")
		cmd.Dir = root
		cmd.Env = append(os.Environ(), "CGO_ENABLED=0")
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if err = cmd.Run(); err != nil {
			return err
		}
		binary, err := os.ReadFile(binaryPath)
		if err != nil {
			return err
		}
		name := "agenttm-desktop_" + *version + "_windows_amd64.zip"
		if err = archive(filepath.Join(out, name), "AgentTM.exe", map[string][]byte{"AgentTM.exe": binary, "agenttm-cli.exe": windowsCLI, "README.md": releaseReadme(*version, true), "RESTORE.md": guide, "THIRD_PARTY_NOTICES.txt": notices}); err != nil {
			return err
		}
		b, err := os.ReadFile(filepath.Join(out, name))
		if err != nil {
			return err
		}
		sum := sha256.Sum256(b)
		checksums[name] = hex.EncodeToString(sum[:])
	}
	names := make([]string, 0, len(checksums))
	for name := range checksums {
		names = append(names, name)
	}
	sort.Strings(names)
	var manifest strings.Builder
	for _, name := range names {
		fmt.Fprintf(&manifest, "%s  %s\n", checksums[name], name)
	}
	checksum, err := os.OpenFile(filepath.Join(out, "SHA256SUMS"), os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return fmt.Errorf("checksum output already exists or cannot be created; choose a new --out directory: %w", err)
	}
	_, err = io.WriteString(checksum, manifest.String())
	closeErr := checksum.Close()
	if err != nil {
		return err
	}
	if closeErr != nil {
		return closeErr
	}
	fmt.Println("Archives and SHA256SUMS:", out)
	return verifyRelease(out, *version)
}
func archive(p, binary string, files map[string][]byte) (err error) {
	f, err := os.OpenFile(p, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		return fmt.Errorf("refusing to replace release archive: %w", err)
	}
	defer func() {
		if e := f.Close(); err == nil {
			err = e
		}
	}()
	names := make([]string, 0, len(files))
	for name := range files {
		names = append(names, name)
	}
	sort.Strings(names)
	if strings.HasSuffix(p, ".zip") {
		writer := zip.NewWriter(f)
		for _, name := range names {
			header := &zip.FileHeader{Name: name, Method: zip.Deflate}
			mode := os.FileMode(0644)
			if name == binary {
				mode = 0755
			}
			header.SetMode(mode)
			entry, e := writer.CreateHeader(header)
			if e != nil {
				writer.Close()
				return e
			}
			if _, e = entry.Write(files[name]); e != nil {
				writer.Close()
				return e
			}
		}
		return writer.Close()
	}
	compressed := gzip.NewWriter(f)
	writer := tar.NewWriter(compressed)
	for _, name := range names {
		mode := int64(0644)
		if name == binary {
			mode = 0755
		}
		b := files[name]
		if err = writer.WriteHeader(&tar.Header{Name: name, Mode: mode, Size: int64(len(b)), Typeflag: tar.TypeReg}); err != nil {
			writer.Close()
			compressed.Close()
			return err
		}
		if _, err = writer.Write(b); err != nil {
			writer.Close()
			compressed.Close()
			return err
		}
	}
	if err = writer.Close(); err != nil {
		compressed.Close()
		return err
	}
	return compressed.Close()
}
