package snapshot

type Report struct {
	Checkpoints int      `json:"checkpoints"`
	Objects     int      `json:"objects"`
	Problems    []string `json:"problems"`
	Warnings    []string `json:"warnings"`
}
