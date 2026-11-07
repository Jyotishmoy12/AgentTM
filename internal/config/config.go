package config

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
)

func Load(path string) (Config, error) {
	c := Default()
	b, e := os.ReadFile(path)
	if e != nil {
		return c, e
	}
	if bytes.Equal(bytes.TrimSpace(b), []byte("null")) {
		return c, fmt.Errorf("config must be a JSON object")
	}
	d := json.NewDecoder(bytes.NewReader(b))
	d.DisallowUnknownFields()
	if e = d.Decode(&c); e != nil {
		return c, fmt.Errorf("invalid config: %w", e)
	}
	var extra any
	if d.Decode(&extra) != io.EOF {
		return c, fmt.Errorf("config must contain one JSON object")
	}
	if err := validate(c); err != nil {
		return c, err
	}
	return c, nil
}
