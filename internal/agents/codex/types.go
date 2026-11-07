package codex

type Adapter struct {
	Executable, Model string
	Sandbox           string
	MaxPayload        int
	OmitTask          string
}
