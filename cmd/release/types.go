package main

type releaseOptions struct {
	version    string
	output     string
	targets    string
	desktop    bool
	verifyOnly bool
	requireAll bool
}

type releaseDocuments struct {
	readme    []byte
	guide     []byte
	notices   []byte
	license   []byte
	ownership []byte
}

type releaseBuilder struct {
	options    releaseOptions
	root       string
	out        string
	temp       string
	commit     string
	date       string
	documents  releaseDocuments
	checksums  map[string]string
	windowsCLI []byte
}

type releaseTarget struct {
	os        string
	arch      string
	binary    string
	extension string
}
