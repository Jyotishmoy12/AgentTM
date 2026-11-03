param(
    [Parameter(Mandatory=$true)][string]$AssetDir,
    [Parameter(Mandatory=$true)][string]$Version,
    [string]$Installer,
    [switch]$TestUserPath
)
$ErrorActionPreference = 'Stop'
if (-not $Installer) { $Installer = Join-Path $PSScriptRoot 'install.ps1' }
$assets = (Resolve-Path -LiteralPath $AssetDir).Path
$installerPath = (Resolve-Path -LiteralPath $Installer).Path
$gitPath = (Get-Command git.exe -ErrorAction Stop).Source
$taskRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('agenttm-install-test-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $taskRoot | Out-Null
$testProfile = Join-Path $taskRoot 'clean profile'
$installDir = Join-Path $testProfile 'AgentTM/bin'
$archive = Join-Path $assets "agenttm_${Version}_windows_amd64.zip"
$originalPath = $env:PATH
$originalUserPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$originalLocalAppData = $env:LOCALAPPDATA
try {
    # The packaged executable must run without Go, Node, or Codex on PATH.
    $env:PATH = "$(Split-Path -Parent $gitPath);$env:SystemRoot\System32;$env:SystemRoot"
    $env:LOCALAPPDATA = $testProfile
    & $installerPath -Archive $archive -AddToPath:$TestUserPath
    $binary = Join-Path $installDir 'agenttm.exe'
    if (-not (Test-Path -LiteralPath $binary)) { throw 'Installer did not create agenttm.exe.' }
    if ($TestUserPath) {
        if ((Get-Command agenttm.exe).Source -ne $binary) { throw 'Current-process PATH was not updated.' }
        if (@([Environment]::GetEnvironmentVariable('Path','User') -split ';') -notcontains $installDir) { throw 'User PATH was not updated.' }
    }
    $reported = & $binary version
    if ($LASTEXITCODE -ne 0 -or -not $reported.StartsWith("agenttm $Version (")) { throw "Wrong packaged version: $reported" }
    Write-Output $reported
    $hashBefore = (Get-FileHash -LiteralPath $binary -Algorithm SHA256).Hash
    $refused = $false
    try { & $installerPath -Archive $archive -InstallDir $installDir } catch { $refused = $true }
    if (-not $refused -or (Get-FileHash -LiteralPath $binary -Algorithm SHA256).Hash -ne $hashBefore) { throw 'Existing installation was not preserved.' }
    # Simulate an older installation, then exercise explicit replacement.
    [System.IO.File]::WriteAllText($binary, 'older installation placeholder')
    & $installerPath -Archive $archive -InstallDir $installDir -Force
    if ((Get-FileHash -LiteralPath $binary -Algorithm SHA256).Hash -ne $hashBefore) { throw 'Explicit upgrade did not restore the release binary.' }
    $locked = [IO.File]::Open($binary,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::None)
    $refused = $false
    try { & $installerPath -Archive $archive -InstallDir $installDir -Force } catch { $refused = $true } finally { $locked.Dispose() }
    if (-not $refused -or (Get-FileHash -LiteralPath $binary -Algorithm SHA256).Hash -ne $hashBefore) { throw 'Locked executable was not preserved.' }
    $badDir = Join-Path $taskRoot 'bad checksum'
    New-Item -ItemType Directory -Path $badDir | Out-Null
    $badArchive = Join-Path $badDir (Split-Path -Leaf $archive)
    Copy-Item -LiteralPath $archive -Destination $badArchive
    Copy-Item -LiteralPath (Join-Path $assets 'SHA256SUMS') -Destination $badDir
    $bytes = [System.IO.File]::ReadAllBytes($badArchive); $bytes[0] = $bytes[0] -bxor 1
    [System.IO.File]::WriteAllBytes($badArchive,$bytes)
    $refused = $false
    try { & $installerPath -Archive $badArchive -InstallDir (Join-Path $taskRoot 'must not install') } catch { $refused = $true }
    if (-not $refused -or (Test-Path -LiteralPath (Join-Path $taskRoot 'must not install/agenttm.exe'))) { throw 'Checksum failure did not prevent installation.' }
    $repo = Join-Path $taskRoot 'disposable repository'
    New-Item -ItemType Directory -Path $repo | Out-Null
    & $gitPath init $repo
    if ($LASTEXITCODE -ne 0) { throw 'git init failed.' }
    Push-Location $repo
    try {
        & $binary init
        if ($LASTEXITCODE -ne 0) { throw 'Packaged init failed.' }
        $ErrorActionPreference = 'Continue'
        $diagnostic = (& $binary doctor 2>&1 | Out-String)
        $doctorCode = $LASTEXITCODE
        $ErrorActionPreference = 'Stop'
        # Doctor must detect the intentionally missing Codex, after storage checks.
        if ($doctorCode -eq 0 -or $diagnostic -notmatch 'SQLite integrity: OK' -or $diagnostic -notmatch 'Codex unavailable') { throw "Unexpected clean-PATH doctor result: $diagnostic" }
        Write-Output 'doctor: storage integrity passed; missing Codex correctly reported.'
    } finally { Pop-Location }
    Write-Output "Windows install, version, upgrade refusal/replacement, checksum rejection: PASS ($taskRoot)"
} finally {
    $env:PATH = $originalPath
    $env:LOCALAPPDATA = $originalLocalAppData
    if ($TestUserPath) { [Environment]::SetEnvironmentVariable('Path',$originalUserPath,'User') }
}
