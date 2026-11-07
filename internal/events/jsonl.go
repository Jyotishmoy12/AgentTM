package events

import (
	"bufio"
	"bytes"
	"io"
)

func ReadJSONL(src io.Reader, max int, sink func([]byte, bool) error) error {
	reader := bufio.NewReaderSize(src, 64*1024)
	var line []byte
	oversized := false
	for {
		part, e := reader.ReadSlice('\n')
		if !oversized {
			if len(line)+len(part) > max {
				line = nil
				oversized = true
			} else {
				line = append(line, part...)
			}
		}
		if e == bufio.ErrBufferFull {
			continue
		}
		if len(line) > 0 || oversized {
			if oversized || len(bytes.TrimSpace(line)) > 0 {
				if err := sink(bytes.TrimSpace(line), oversized); err != nil {
					return err
				}
			}
		}
		line = nil
		oversized = false
		if e == io.EOF {
			return nil
		}
		if e != nil {
			return e
		}
	}
}
