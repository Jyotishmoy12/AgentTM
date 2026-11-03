package main

import (
	"archive/tar"
	"archive/zip"
	"bufio"
	"compress/gzip"
	"crypto/sha256"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

func verifyRelease(directory, version string) error {
	manifest, err := os.Open(filepath.Join(directory, "SHA256SUMS"))
	if err != nil {
		return err
	}
	defer manifest.Close()
	scan := bufio.NewScanner(manifest)
	seen := map[string]bool{}
	pattern := regexp.MustCompile(`^([a-f0-9]{64})  (.+)$`)
	for scan.Scan() {
		fields := pattern.FindStringSubmatch(scan.Text())
		if fields == nil {
			return fmt.Errorf("invalid checksum manifest line")
		}
		name := fields[2]
		if filepath.Base(name) != name || strings.ContainsAny(name, "\\/") || seen[name] {
			return fmt.Errorf("unsafe or duplicate archive name %q", name)
		}
		seen[name] = true
		desktop := name == "agenttm-desktop_"+version+"_windows_amd64.zip"
		cliPattern := regexp.MustCompile(`^agenttm_` + regexp.QuoteMeta(version) + `_(windows_(amd64|arm64)\.zip|(linux|darwin)_(amd64|arm64)\.tar\.gz)$`)
		if !desktop && !cliPattern.MatchString(name) {
			return fmt.Errorf("unexpected release asset %q", name)
		}
		p := filepath.Join(directory, name)
		f, err := os.Open(p)
		if err != nil {
			return err
		}
		hash := sha256.New()
		_, err = io.Copy(hash, f)
		f.Close()
		if err != nil {
			return err
		}
		if fmt.Sprintf("%x", hash.Sum(nil)) != fields[1] {
			return fmt.Errorf("checksum mismatch: %s", name)
		}
		if err = verifyArchive(p, desktop); err != nil {
			return fmt.Errorf("%s: %w", name, err)
		}
		fmt.Println("Verified checksum and contents:", name)
	}
	if err = scan.Err(); err != nil {
		return err
	}
	if len(seen) == 0 {
		return fmt.Errorf("empty checksum manifest")
	}
	// An archive accidentally omitted from SHA256SUMS must not be publishable.
	entries, err := os.ReadDir(directory)
	if err != nil {
		return err
	}
	for _, entry := range entries {
		if strings.HasSuffix(entry.Name(), ".zip") || strings.HasSuffix(entry.Name(), ".tar.gz") {
			if !seen[entry.Name()] {
				return fmt.Errorf("archive missing checksum: %s", entry.Name())
			}
		}
	}
	return nil
}

func verifyExpectedTargets(directory, version string, desktop bool) error {
	for _, platform := range []string{"windows_amd64.zip", "windows_arm64.zip", "linux_amd64.tar.gz", "linux_arm64.tar.gz", "darwin_amd64.tar.gz", "darwin_arm64.tar.gz"} {
		if _, err := os.Stat(filepath.Join(directory, "agenttm_"+version+"_"+platform)); err != nil {
			return fmt.Errorf("missing required platform %s: %w", platform, err)
		}
	}
	if desktop {
		if _, err := os.Stat(filepath.Join(directory, "agenttm-desktop_"+version+"_windows_amd64.zip")); err != nil {
			return fmt.Errorf("missing desktop archive: %w", err)
		}
	}
	return nil
}

func verifyArchive(path string, desktop bool) error {
	binary := "agenttm"
	if strings.HasSuffix(path, ".zip") {
		binary = "agenttm.exe"
	}
	if desktop {
		binary = "AgentTM.exe"
	}
	expected := map[string]bool{binary: false, "README.md": false, "RESTORE.md": false, "THIRD_PARTY_NOTICES.txt": false}
	if desktop {
		expected["agenttm-cli.exe"] = false
	}
	check := func(name string, size int64, mode os.FileMode) error {
		done, ok := expected[name]
		if !ok || done || size < 1 || size > 100<<20 || !mode.IsRegular() {
			return fmt.Errorf("unexpected, duplicated, empty, or unsafe entry: %s", name)
		}
		if name == binary && !strings.HasSuffix(path, ".zip") && mode.Perm() != 0755 {
			return fmt.Errorf("executable mode is not 0755")
		}
		expected[name] = true
		return nil
	}
	if strings.HasSuffix(path, ".zip") {
		archive, err := zip.OpenReader(path)
		if err != nil {
			return err
		}
		defer archive.Close()
		for _, entry := range archive.File {
			if err = check(entry.Name, int64(entry.UncompressedSize64), entry.Mode()); err != nil {
				return err
			}
			reader, err := entry.Open()
			if err != nil {
				return err
			}
			_, err = io.Copy(io.Discard, reader)
			reader.Close()
			if err != nil {
				return err
			}
		}
	} else {
		f, err := os.Open(path)
		if err != nil {
			return err
		}
		defer f.Close()
		gz, err := gzip.NewReader(f)
		if err != nil {
			return err
		}
		defer gz.Close()
		tr := tar.NewReader(gz)
		for {
			header, err := tr.Next()
			if err == io.EOF {
				break
			}
			if err != nil {
				return err
			}
			if header.Typeflag != tar.TypeReg {
				return fmt.Errorf("nonregular archive entry")
			}
			if err = check(header.Name, header.Size, header.FileInfo().Mode()); err != nil {
				return err
			}
			if _, err = io.Copy(io.Discard, tr); err != nil {
				return err
			}
		}
		if _, err = io.Copy(io.Discard, gz); err != nil {
			return err
		}
	}
	for name, present := range expected {
		if !present {
			return fmt.Errorf("missing expected entry %s", name)
		}
	}
	return nil
}
