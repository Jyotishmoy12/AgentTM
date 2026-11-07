package snapshot

import (
	"path"
	"strings"
)

func glob(pattern, p string) bool {
	var match func([]string, []string) bool
	type key struct{ a, b int }
	memo := map[key]bool{}
	done := map[key]bool{}
	match = func(a, b []string) bool {
		k := key{len(a), len(b)}
		if done[k] {
			return memo[k]
		}
		done[k] = true
		result := false
		if len(a) == 0 {
			result = len(b) == 0
		} else if a[0] == "**" {
			result = match(a[1:], b) || len(b) > 0 && match(a, b[1:])
		} else if len(b) > 0 {
			ok, _ := path.Match(a[0], b[0])
			result = ok && match(a[1:], b[1:])
		}
		memo[k] = result
		return result
	}
	if !strings.Contains(pattern, "/") {
		for _, part := range strings.Split(p, "/") {
			ok, _ := path.Match(pattern, part)
			if ok {
				return true
			}
		}
		return false
	}
	return match(strings.Split(pattern, "/"), strings.Split(p, "/"))
}

func (e *Engine) excluded(p string) string {
	parts := strings.Split(strings.ToLower(p), "/")
	dirs := map[string]bool{"node_modules": true, "vendor": true, "dist": true, "build": true, "target": true, ".cache": true, "__pycache__": true, ".venv": true, "venv": true, "coverage": true, ".next": true, "bin": true, "obj": true}
	for _, part := range parts {
		if dirs[part] {
			return "dependency/build/cache exclusion"
		}
		if part == ".aws" || part == ".ssh" {
			return "secret exclusion"
		}
	}
	name := parts[len(parts)-1]
	if strings.HasPrefix(name, ".env") || name == "id_rsa" || name == "id_ed25519" || name == "id_dsa" || name == "credentials" || name == "credentials.json" || name == ".npmrc" || name == ".netrc" || name == ".pypirc" || name == ".git-credentials" {
		return "secret exclusion"
	}
	for _, suffix := range []string{".pem", ".key", ".p12", ".pfx"} {
		if strings.HasSuffix(name, suffix) {
			return "secret exclusion"
		}
	}
	for _, pattern := range e.Config.Exclude {
		if glob(pattern, p) {
			return "configured exclusion"
		}
	}
	return ""
}

func internalPath(p string) bool {
	for _, v := range strings.Split(strings.ToLower(p), "/") {
		if v == ".git" || v == ".agenttm" {
			return true
		}
	}
	return false
}
