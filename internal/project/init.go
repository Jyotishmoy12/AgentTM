package project

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"

	"agenttm/internal/config"
)

func Init(root string) error {
	base := filepath.Join(root, ".agenttm")
	if e := SafePath(base); e != nil {
		return e
	}
	for _, p := range []string{"data", "objects", "logs"} {
		target := filepath.Join(base, p)
		if e := SafePath(target); e != nil {
			return e
		}
		if e := os.MkdirAll(target, 0700); e != nil {
			return e
		}
	}
	cp := filepath.Join(base, "config.json")
	if e := SafePath(cp); e != nil {
		return e
	}
	b, _ := json.MarshalIndent(config.Default(), "", "  ")
	f, e := os.OpenFile(cp, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
	if e == nil {
		_, e = f.Write(append(b, '\n'))
		ce := f.Close()
		if e == nil {
			e = ce
		}
	} else if os.IsExist(e) {
		_, e = config.Load(cp)
	}
	if e != nil {
		return e
	}
	exclude, e := Git(root, "rev-parse", "--git-path", "info/exclude")
	if e != nil {
		return e
	}
	if !filepath.IsAbs(exclude) {
		exclude = filepath.Join(root, exclude)
	}
	if e = SafePath(exclude); e != nil {
		return e
	}
	if e = os.MkdirAll(filepath.Dir(exclude), 0700); e != nil {
		return e
	}
	old, e := os.ReadFile(exclude)
	if e != nil && !os.IsNotExist(e) {
		return e
	}
	for _, line := range strings.Split(string(old), "\n") {
		if strings.TrimSpace(line) == "/.agenttm/" {
			return nil
		}
	}
	f, e = os.OpenFile(exclude, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0600)
	if e != nil {
		return e
	}
	_, e = f.WriteString("\n# AgentTM local recording data\n/.agenttm/\n")
	ce := f.Close()
	if e != nil {
		return e
	}
	return ce
}
