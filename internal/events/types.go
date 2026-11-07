package events

type Record struct {
	Kind, Tool, Call  string
	Payload           []byte
	Upstream          string
	Failed, Completed bool
}
