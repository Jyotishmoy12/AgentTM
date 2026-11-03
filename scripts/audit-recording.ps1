param(
    [Parameter(Mandatory=$true)][string]$Binary,
    [Parameter(Mandatory=$true)][string]$Model,
    [switch]$RealCodex,
    [string]$InspectExistingAudit
)
$ErrorActionPreference='Stop'
if (-not $RealCodex -and -not $InspectExistingAudit) { throw 'Pass -RealCodex to authorize a real model request in a disposable repository.' }
$exe=(Resolve-Path -LiteralPath $Binary).Path
$repo=Join-Path ([System.IO.Path]::GetTempPath()) ('agenttm-recording-audit-'+[guid]::NewGuid())
if ($InspectExistingAudit) {
    $repo=(Resolve-Path -LiteralPath $InspectExistingAudit).Path
    if ((Split-Path -Leaf $repo) -notmatch '^agenttm-recording-audit-[0-9a-f-]{36}$') { throw 'Only an existing disposable audit directory is accepted.' }
} else { New-Item -ItemType Directory -Path $repo | Out-Null }
function Checked([string[]]$Arguments) {
    & $exe @Arguments
    if ($LASTEXITCODE -ne 0) { throw "agenttm command failed: $($Arguments[0])" }
}
Push-Location $repo
try {
    if (-not $InspectExistingAudit) {
    git init
    git config user.name 'AgentTM audit'
    git config user.email 'audit@example.invalid'
    [IO.File]::WriteAllText((Join-Path $repo 'note.txt'),"original audit content`n")
    git add note.txt
    git commit -m 'Disposable audit baseline'
    if ($LASTEXITCODE -ne 0) { throw 'Disposable Git setup failed.' }
    [IO.File]::WriteAllText((Join-Path $repo '.env'),'AGENTTM_SYNTHETIC_SECRET=never-snapshot-this')
    Checked @('init')
    Checked @('codex','doctor')
    Checked @('run','codex','--model',$Model,'--sandbox','workspace-write','--snapshot-after-tool=true','--','Modify note.txt to contain the text changed by AgentTM launch audit followed by a newline. Then create audit.txt containing the text audit complete followed by a newline. Use two separate file editing operations, in order. Do not touch any other files. Do not read .env. Reply briefly when done.')
    }
    $logs=@(Get-ChildItem -LiteralPath .agenttm/logs -Filter '*.json')
    if ($logs.Count -ne 1) { throw 'Expected one recorded session.' }
    $session=$logs[0].BaseName
    $events=@(Checked @('events',$session,'--limit','1000') | ForEach-Object { $_ | ConvertFrom-Json })
    $operations=@(Checked @('operations',$session,'--limit','100') | ForEach-Object { $_ | ConvertFrom-Json })
    if ($operations.Count -eq 0 -or @($operations | Where-Object { $_.after_checkpoint_id }).Count -eq 0) { throw 'No operation completion checkpoints captured.' }
    $baseline=($events | Where-Object kind -eq 'agenttm.snapshot.baseline' | Select-Object -First 1).checkpoint_id
    $latest=($events | Where-Object checkpoint_id | Select-Object -Last 1).checkpoint_id
    $oldText=(Checked @('cat',$baseline,'note.txt') | Out-String).Trim()
    $newText=(Checked @('cat',$latest,'note.txt') | Out-String).Trim()
    if ($oldText -ne 'original audit content' -or $newText -ne 'changed by AgentTM launch audit') { throw 'Historical file contents are incorrect.' }
    $manifest=(Checked @('show',$latest) | Out-String | ConvertFrom-Json)
    if (@($manifest.files | Where-Object path -eq '.env').Count -ne 0) { throw 'Secret filename exclusion failed.' }
    $changedDiff=$false
    foreach($checkpoint in @($events | Where-Object checkpoint_id | Select-Object -ExpandProperty checkpoint_id -Unique)) { $diff=(Checked @('diff',$checkpoint) | Out-String); if($diff -match 'note.txt|audit.txt') { $changedDiff=$true } }
    if (-not $changedDiff) { throw 'Expected checkpoint differences missing.' }
    $beforeHead=(git rev-parse HEAD | Out-String).Trim()
    $beforeIndex=(Get-FileHash -LiteralPath .git/index -Algorithm SHA256).Hash
    $beforeFiles=@{}
    foreach($name in @('note.txt','audit.txt','.env')) { $beforeFiles[$name]=(Get-FileHash -LiteralPath $name -Algorithm SHA256).Hash }
    Checked @('fork',$baseline,'--name','audit-baseline','--allow-partial')
    if ((Get-Content -LiteralPath .agenttm/worktrees/audit-baseline/note.txt -Raw).Trim() -ne 'original audit content') { throw 'Restored baseline contents are incorrect.' }
    if ($beforeHead -ne (git rev-parse HEAD | Out-String).Trim() -or $beforeIndex -ne (Get-FileHash -LiteralPath .git/index -Algorithm SHA256).Hash) { throw 'Original HEAD or index changed during restore.' }
    foreach($name in $beforeFiles.Keys) { if ($beforeFiles[$name] -ne (Get-FileHash -LiteralPath $name -Algorithm SHA256).Hash) { throw "Original file changed: $name" } }
    Checked @('doctor')
    Write-Output "REAL RECORDING AUDIT PASS: session=$session operations=$($operations.Count) root=$repo"
} finally { Pop-Location }
