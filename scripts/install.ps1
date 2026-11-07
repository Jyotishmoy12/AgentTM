param(
    [Parameter(Mandatory=$true)][string]$Archive,
    [string]$ChecksumFile,
    [string]$InstallDir = (Join-Path $env:LOCALAPPDATA 'AgentTM\bin'),
    [switch]$AddToPath,
    [switch]$Force
)
$ErrorActionPreference = 'Stop'

function Get-VerifiedArchive([string]$File, [string]$Checksums) {
    $archivePath = (Resolve-Path -LiteralPath $File).Path
    if (-not $archivePath.EndsWith('.zip')) {
        throw 'Use the Windows .zip release archive.'
    }
    if (-not $Checksums) {
        $Checksums = Join-Path (Split-Path -Parent $archivePath) 'SHA256SUMS'
    }
    $archiveName = Split-Path -Leaf $archivePath
    $expected = $null
    foreach ($line in (Get-Content -LiteralPath $Checksums)) {
        if ($line -match '^([a-f0-9]{64})  (.+)$' -and $Matches[2] -ceq $archiveName) {
            $expected = $Matches[1]
        }
    }
    if (-not $expected) { throw 'Archive is not listed in SHA256SUMS.' }
    $actual = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $expected) { throw 'Archive checksum mismatch.' }
    return $archivePath
}

function Install-VerifiedArchive([string]$File, [string]$Directory, [bool]$Replace) {
    New-Item -ItemType Directory -Force -Path $Directory | Out-Null
    $destination = Join-Path $Directory 'agenttm.exe'
    if ((Test-Path -LiteralPath $destination) -and -not $Replace) {
        throw 'agenttm.exe already exists. Use -Force for an explicit upgrade.'
    }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($File)
    $staged = Join-Path $Directory ('.agenttm-install-' + [guid]::NewGuid() + '.tmp')
    try {
        $entries = @($zip.Entries | Where-Object { $_.FullName -ceq 'agenttm.exe' })
        if ($entries.Count -ne 1 -or $entries[0].Length -gt 104857600) {
            throw 'Archive must contain one bounded agenttm.exe at its root.'
        }
        [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entries[0], $staged, $false)
        if (Test-Path -LiteralPath $destination) {
            if (-not $Replace) {
                throw 'agenttm.exe already exists. Use -Force for an explicit upgrade.'
            }
            [System.IO.File]::Replace(
                $staged, $destination, [System.Management.Automation.Language.NullString]::Value
            )
        } else {
            [System.IO.File]::Move($staged, $destination)
        }
    } finally {
        $zip.Dispose()
        if (Test-Path -LiteralPath $staged) { Remove-Item -LiteralPath $staged }
    }
    return $destination
}

function Add-InstallDirectoryToPath([string]$Directory) {
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if (@($userPath -split ';') -notcontains $Directory) {
        [Environment]::SetEnvironmentVariable('Path', "$Directory;$userPath", 'User')
    }
    $env:Path = "$Directory;$env:Path"
}

$archivePath = Get-VerifiedArchive $Archive $ChecksumFile
$installPath = [System.IO.Path]::GetFullPath($InstallDir)
$destination = Install-VerifiedArchive $archivePath $installPath $Force.IsPresent
if ($AddToPath) { Add-InstallDirectoryToPath $installPath }
Write-Output "Installed: $destination"
Write-Output 'Run agenttm version (or invoke the full installed path).'
