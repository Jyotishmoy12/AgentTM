package maintenance

type checkpoint struct{ id, session string }

type candidate struct {
	path     string
	size     int64
	modified int64
}
