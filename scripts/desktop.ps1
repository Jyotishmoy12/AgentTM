param([switch]$BuildOnly)
$ErrorActionPreference = 'Stop'
$repoPath = Split-Path -Parent $PSScriptRoot
Push-Location $repoPath
try {
    # Windows filenames are case insensitive: keep AgentTM.exe separate from
    # the existing CLI binary bin/agenttm.exe.
    New-Item -ItemType Directory -Force -Path (Join-Path $repoPath 'bin/desktop') | Out-Null
    go build -tags production -o bin/desktop/AgentTM.exe ./cmd/agenttm-desktop
    if ($LASTEXITCODE -ne 0) { throw 'Desktop build failed.' }
    if (-not $BuildOnly) {
        & (Join-Path $repoPath 'bin/desktop/AgentTM.exe')
        if ($LASTEXITCODE -ne 0) { throw 'Desktop app exited with an error.' }
    }
} finally {
    Pop-Location
}
