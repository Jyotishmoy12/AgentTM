param(
    [Parameter(Mandatory=$true)][string]$Archive,
    [string]$ChecksumFile,
    [string]$InstallDir = (Join-Path $env:LOCALAPPDATA 'AgentTM\bin'),
    [switch]$AddToPath,
    [switch]$Force
)
$ErrorActionPreference = 'Stop'
$archivePath = (Resolve-Path -LiteralPath $Archive).Path
if (-not $archivePath.EndsWith('.zip')) { throw 'Use the Windows .zip release archive.' }
if (-not $ChecksumFile) { $ChecksumFile = Join-Path (Split-Path -Parent $archivePath) 'SHA256SUMS' }
$archiveName = Split-Path -Leaf $archivePath
$expected = $null
foreach ($line in (Get-Content -LiteralPath $ChecksumFile)) {
    if ($line -match '^([a-f0-9]{64})  (.+)$' -and $Matches[2] -ceq $archiveName) { $expected = $Matches[1] }
}
if (-not $expected) { throw 'Archive is not listed in SHA256SUMS.' }
if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) { throw 'Archive checksum mismatch.' }
$installPath = [System.IO.Path]::GetFullPath($InstallDir)
New-Item -ItemType Directory -Force -Path $installPath | Out-Null
$destination = Join-Path $installPath 'agenttm.exe'
if ((Test-Path -LiteralPath $destination) -and -not $Force) { throw 'agenttm.exe already exists. Use -Force for an explicit upgrade.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
$staged = Join-Path $installPath ('.agenttm-install-' + [guid]::NewGuid() + '.tmp')
try {
    $entries = @($zip.Entries | Where-Object { $_.FullName -ceq 'agenttm.exe' })
    if ($entries.Count -ne 1 -or $entries[0].Length -gt 104857600) { throw 'Archive must contain one bounded agenttm.exe at its root.' }
    # Extract only this literal entry; never expand arbitrary archive paths.
    # Extract fully before replacing an older executable.
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entries[0], $staged, $false)
    if (Test-Path -LiteralPath $destination) {
        if (-not $Force) { throw 'agenttm.exe already exists. Use -Force for an explicit upgrade.' }
        # PowerShell 5 converts $null to an empty string for this overload.
        [System.IO.File]::Replace($staged, $destination, [System.Management.Automation.Language.NullString]::Value)
    } else {
        [System.IO.File]::Move($staged, $destination)
    }
} finally {
    $zip.Dispose()
    if (Test-Path -LiteralPath $staged) { Remove-Item -LiteralPath $staged }
}
if ($AddToPath) {
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if (@($userPath -split ';') -notcontains $installPath) { [Environment]::SetEnvironmentVariable('Path', "$installPath;$userPath", 'User') }
    $env:Path = "$installPath;$env:Path"
}
Write-Output "Installed: $destination"
Write-Output 'Run agenttm version (or invoke the full installed path).'
