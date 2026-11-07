package desktop

import (
	_ "embed"
)

//go:embed welcome.html
var welcomeHTML string

//go:embed launcher.js
var welcomeJS string

//go:embed welcome.css
var welcomeCSS string

//go:embed welcome-layout.css
var welcomeLayoutCSS string
