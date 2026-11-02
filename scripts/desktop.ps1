param([switch]$BuildOnly)
$ErrorActionPreference = 'Stop'
$repoPath = Split-Path -Parent $PSScriptRoot
Push-Location $repoPath
try {
    New-Item -ItemType Directory -Force -Path (Join-Path $repoPath 'bin') | Out-Null
    go build -tags production -o bin/agenttm-desktop.exe ./cmd/agenttm-desktop
    if ($LASTEXITCODE -ne 0) { throw 'Desktop build failed.' }
    if (-not $BuildOnly) {
        & (Join-Path $repoPath 'bin/agenttm-desktop.exe')
        if ($LASTEXITCODE -ne 0) { throw 'Desktop app exited with an error.' }
    }
} finally {
    Pop-Location
}
