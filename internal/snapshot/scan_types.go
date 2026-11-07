package snapshot

import (
	"bytes"
)

type limitedBuffer struct {
	bytes.Buffer
	max int
}
