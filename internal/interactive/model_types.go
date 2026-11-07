package interactive

type Model struct {
	Model           string   `json:"model"`
	DisplayName     string   `json:"displayName"`
	IsDefault       bool     `json:"isDefault"`
	Hidden          bool     `json:"hidden"`
	InputModalities []string `json:"inputModalities"`
}
