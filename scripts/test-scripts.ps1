$ErrorActionPreference = 'Stop'
foreach ($file in (Get-ChildItem -LiteralPath $PSScriptRoot -Recurse -Filter '*.ps1')) {
    $parseErrors = $null
    $tokens = $null
    [void][System.Management.Automation.Language.Parser]::ParseFile($file.FullName, [ref]$tokens, [ref]$parseErrors)
    if ($parseErrors.Count -ne 0) { throw "PowerShell syntax error in $($file.FullName): $parseErrors" }
}

$contracts = @{
    'install.ps1' = 'Archive,ChecksumFile,InstallDir,AddToPath,Force'
    'test-install.ps1' = 'AssetDir,Version,Installer,TestUserPath'
    'test-desktop.ps1' = 'Archive,Version,ExpectWelcome'
    'desktop.ps1' = 'BuildOnly'
    'audit-recording.ps1' = 'Binary,Model,RealCodex,InspectExistingAudit'
}
foreach ($name in $contracts.Keys) {
    $path = Join-Path $PSScriptRoot $name
    $parseErrors = $null
    $tokens = $null
    $ast = [System.Management.Automation.Language.Parser]::ParseFile($path, [ref]$tokens, [ref]$parseErrors)
    $parameters = @($ast.ParamBlock.Parameters | ForEach-Object { $_.Name.VariablePath.UserPath })
    if (($parameters -join ',') -ne $contracts[$name]) { throw "Script parameters changed: $name" }
}

function Assert-Refused([scriptblock]$Action, [string]$Message) {
    try { & $Action | Out-Null } catch {
        if ($_.Exception.Message -notmatch $Message) { throw }
        return
    }
    throw "Installer did not refuse: $Message"
}

function New-TestArchive([string]$Name, [string[]]$Entries) {
    $path = Join-Path $taskRoot $Name
    $zip = [IO.Compression.ZipFile]::Open($path, [IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($entryName in $Entries) {
            $stream = $zip.CreateEntry($entryName).Open()
            try {
                $bytes = [Text.Encoding]::UTF8.GetBytes('installer fixture')
                $stream.Write($bytes, 0, $bytes.Length)
            } finally { $stream.Dispose() }
        }
    } finally { $zip.Dispose() }
    $hash = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
    Add-Content -LiteralPath (Join-Path $taskRoot 'SHA256SUMS') -Encoding ASCII -Value "$hash  $Name"
    return $path
}

$taskRoot = Join-Path ([IO.Path]::GetTempPath()) ('agenttm-script-test-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $taskRoot | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$standalone = Join-Path $taskRoot 'standalone'
New-Item -ItemType Directory -Path $standalone | Out-Null
$installer = Join-Path $standalone 'install.ps1'
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'install.ps1') -Destination $installer
$archive = New-TestArchive 'valid.zip' @('agenttm.exe', '../must-not-escape.txt')
$directory = Join-Path $taskRoot 'installed with spaces'
& $installer -Archive $archive -InstallDir $directory | Out-Null
$binary = Join-Path $directory 'agenttm.exe'
if ([IO.File]::ReadAllText($binary) -ne 'installer fixture') { throw 'Incorrect installed content.' }
if (Test-Path -LiteralPath (Join-Path $taskRoot 'must-not-escape.txt')) { throw 'Unexpected archive entry extracted.' }
Assert-Refused { & $installer -Archive $archive -InstallDir $directory } 'already exists'
[IO.File]::WriteAllText($binary, 'older installation')
& $installer -Archive $archive -InstallDir $directory -Force | Out-Null
if ([IO.File]::ReadAllText($binary) -ne 'installer fixture') { throw 'Explicit upgrade failed.' }
$locked = [IO.File]::Open($binary, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::None)
try {
    Assert-Refused { & $installer -Archive $archive -InstallDir $directory -Force } 'used by another process'
} finally { $locked.Dispose() }
if ([IO.File]::ReadAllText($binary) -ne 'installer fixture') { throw 'Locked installation changed.' }
if (@(Get-ChildItem -LiteralPath $directory -Filter '.agenttm-install-*').Count -ne 0) { throw 'Staging file retained.' }
foreach ($entries in @(@('nested/agenttm.exe'), @('agenttm.exe', 'agenttm.exe'))) {
    $invalid = New-TestArchive ([guid]::NewGuid().ToString() + '.zip') $entries
    Assert-Refused { & $installer -Archive $invalid -InstallDir (Join-Path $taskRoot 'invalid') } 'one bounded agenttm.exe'
}
$bytes = [IO.File]::ReadAllBytes($archive)
$bytes[0] = $bytes[0] -bxor 1
[IO.File]::WriteAllBytes($archive, $bytes)
Assert-Refused { & $installer -Archive $archive -InstallDir (Join-Path $taskRoot 'rejected') } 'checksum mismatch'
if (Test-Path -LiteralPath (Join-Path $taskRoot 'rejected/agenttm.exe')) { throw 'Tampered archive installed.' }
Assert-Refused {
    & (Join-Path $PSScriptRoot 'audit-recording.ps1') -Binary 'not-used' -Model 'not-used'
} 'Pass -RealCodex'
Write-Output "PowerShell syntax, standalone installer, checksum, upgrade, locked-file and archive-entry checks: PASS ($taskRoot)"
