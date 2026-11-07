package events

import (
	"errors"
	"io"
	"strings"
	"testing"
	"testing/iotest"
)

func TestReadJSONL(t *testing.T) {
	input := "\n{\"type\":\"turn.started\"}\n" + strings.Repeat("x", 200) + "\nmalformed\n{\"type\":\"turn.completed\"}"
	var lines int
	var huge int
	e := ReadJSONL(strings.NewReader(input), 100, func(b []byte, oversized bool) error {
		lines++
		if oversized {
			huge++
		}
		return nil
	})
	if e != nil || lines != 4 || huge != 1 {
		t.Fatalf("%d %d %v", lines, huge, e)
	}
}

func TestJSONLDrainsLongLinesAndKeepsFinalLine(t *testing.T) {
	input := " \r\n" + strings.Repeat("private-data", 20000) + "\nfirst\r\n\nlast"
	var got []string
	oversized := 0
	err := ReadJSONL(strings.NewReader(input), 100, func(data []byte, large bool) error {
		if large {
			oversized++
			if len(data) != 0 {
				t.Fatal("oversized line retained source content")
			}
			return nil
		}
		got = append(got, string(data))
		return nil
	})
	if err != nil || oversized != 1 || strings.Join(got, ",") != "first,last" {
		t.Fatalf("JSONL framing changed: %v, %d, %v", got, oversized, err)
	}
}

func TestJSONLPropagatesSinkAndReaderErrors(t *testing.T) {
	sinkErr := errors.New("synthetic sink failure")
	calls := 0
	err := ReadJSONL(strings.NewReader("one\ntwo\n"), 100, func([]byte, bool) error { calls++; return sinkErr })
	if !errors.Is(err, sinkErr) || calls != 1 {
		t.Fatalf("sink failure did not stop reading: %d, %v", calls, err)
	}
	readErr := errors.New("synthetic read failure")
	input := io.MultiReader(strings.NewReader("one\nunfinished"), iotest.ErrReader(readErr))
	var got []string
	err = ReadJSONL(input, 100, func(data []byte, large bool) error { got = append(got, string(data)); return nil })
	if !errors.Is(err, readErr) || strings.Join(got, ",") != "one,unfinished" {
		t.Fatalf("reader failure lost buffered data: %v, %v", got, err)
	}
}

func TestJSONLSizeBoundaryIncludesLineDelimiter(t *testing.T) {
	for input, wantLarge := range map[string]bool{"abcd\n": false, "abcde\n": true, "abcde": false} {
		calls := 0
		err := ReadJSONL(strings.NewReader(input), 5, func(_ []byte, large bool) error {
			calls++
			if large != wantLarge {
				t.Errorf("line size handling changed for %q", input)
			}
			return nil
		})
		if err != nil || calls != 1 {
			t.Fatalf("line size boundary failed: %d, %v", calls, err)
		}
	}
}
