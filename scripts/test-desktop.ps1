param(
    [Parameter(Mandatory=$true)][string]$Archive,
    [Parameter(Mandatory=$true)][string]$Version,
    [switch]$ExpectWelcome
)
$ErrorActionPreference = 'Stop'

function Assert-BundledDesktop([string]$Desktop, [string]$Helper, [string]$ExpectedVersion) {
    $bytes = [IO.File]::ReadAllBytes($Desktop)
    $pe = [BitConverter]::ToInt32($bytes, 0x3c)
    if ([BitConverter]::ToUInt16($bytes, $pe + 24 + 68) -ne 2) {
        throw 'Desktop is not a Windows GUI executable; a console window may appear.'
    }
    $reported = & $Helper version
    if ($LASTEXITCODE -ne 0 -or -not $reported.StartsWith("agenttm $ExpectedVersion (")) {
        throw 'Wrong bundled CLI version.'
    }
}

function Wait-NativeWindow([System.Diagnostics.Process]$Child) {
    $deadline = (Get-Date).AddSeconds(20)
    do {
        Start-Sleep -Milliseconds 200
        $Child.Refresh()
        if ($Child.HasExited) { throw "Desktop exited during startup: $($Child.ExitCode)" }
    } while (-not [AgentTMWindowCheck]::Exists($Child.Id) -and (Get-Date) -lt $deadline)
    if (-not [AgentTMWindowCheck]::Exists($Child.Id)) {
        throw 'Desktop did not create its native window. Verify WebView2 and desktop-session availability.'
    }
}

$archivePath = (Resolve-Path -LiteralPath $Archive).Path
$taskRoot = Join-Path ([IO.Path]::GetTempPath()) ('agenttm-desktop-smoke-' + [guid]::NewGuid())
$appDir = Join-Path $taskRoot 'application'
$repo = Join-Path $taskRoot 'repository'
New-Item -ItemType Directory -Path $repo -Force | Out-Null
Expand-Archive -LiteralPath $archivePath -DestinationPath $appDir
$desktop = Join-Path $appDir 'AgentTM.exe'
$helper = Join-Path $appDir 'agenttm-cli.exe'
Assert-BundledDesktop $desktop $helper $Version
git init $repo
if ($LASTEXITCODE -ne 0) { throw 'Desktop repository Git initialization failed.' }
Push-Location $repo
try {
    & $helper init
    if ($LASTEXITCODE -ne 0) { throw 'Desktop repository initialization failed.' }
} finally {
    Pop-Location
}
if (-not ('AgentTMWindowCheck' -as [type])) {
    Add-Type -Path (Join-Path $PSScriptRoot 'lib/WindowCheck.cs')
}
$launchDirectory = $repo
if ($ExpectWelcome) { $launchDirectory = $appDir }
$child = Start-Process -FilePath $desktop -WorkingDirectory $launchDirectory -WindowStyle Hidden -PassThru
try {
    Wait-NativeWindow $child
    $scenario = 'initialized-project startup'
    if ($ExpectWelcome) { $scenario = 'startup outside a Git project (welcome window smoke only)' }
    Write-Output "Native desktop extraction, GUI subsystem, bundled CLI version, $($scenario): PASS ($taskRoot)"
} finally {
    if (-not $child.HasExited) {
        Stop-Process -Id $child.Id
        $child.WaitForExit()
    }
    $child.Dispose()
}
