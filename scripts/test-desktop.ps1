param(
    [Parameter(Mandatory=$true)][string]$Archive,
    [Parameter(Mandatory=$true)][string]$Version
)
$ErrorActionPreference='Stop'
$archivePath=(Resolve-Path -LiteralPath $Archive).Path
$taskRoot=Join-Path ([IO.Path]::GetTempPath()) ('agenttm-desktop-smoke-'+[guid]::NewGuid())
$appDir=Join-Path $taskRoot 'application'
$repo=Join-Path $taskRoot 'repository'
New-Item -ItemType Directory -Path $repo -Force | Out-Null
Expand-Archive -LiteralPath $archivePath -DestinationPath $appDir
$desktop=Join-Path $appDir 'AgentTM.exe'
$helper=Join-Path $appDir 'agenttm-cli.exe'
$bytes=[IO.File]::ReadAllBytes($desktop)
$pe=[BitConverter]::ToInt32($bytes,0x3c)
if ([BitConverter]::ToUInt16($bytes,$pe+24+68) -ne 2) { throw 'Desktop is not a Windows GUI executable; a console window may appear.' }
$reported=& $helper version
if ($LASTEXITCODE -ne 0 -or -not $reported.StartsWith("agenttm $Version (")) { throw 'Wrong bundled CLI version.' }
git init $repo
Push-Location $repo
try { & $helper init; if($LASTEXITCODE -ne 0){throw 'Desktop repository initialization failed.'} } finally { Pop-Location }
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class AgentTMWindowCheck {
    public delegate bool Callback(IntPtr handle, IntPtr value);
    [DllImport("user32.dll")] static extern bool EnumWindows(Callback callback, IntPtr value);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr handle, out uint process);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr handle, StringBuilder text, int count);
    public static bool Exists(int process) {
        bool found=false;
        EnumWindows((handle,value)=> { uint owner; GetWindowThreadProcessId(handle,out owner);
            if(owner==process) { var text=new StringBuilder(512); GetWindowText(handle,text,512); if(text.ToString()=="AgentTM") found=true; }
            return true;
        },IntPtr.Zero);
        return found;
    }
}
'@
$child=Start-Process -FilePath $desktop -WorkingDirectory $repo -WindowStyle Hidden -PassThru
try {
    $deadline=(Get-Date).AddSeconds(20)
    do {
        Start-Sleep -Milliseconds 200
        $child.Refresh()
        if($child.HasExited){throw "Desktop exited during startup: $($child.ExitCode)"}
    } while(-not [AgentTMWindowCheck]::Exists($child.Id) -and (Get-Date) -lt $deadline)
    if(-not [AgentTMWindowCheck]::Exists($child.Id)){throw 'Desktop did not create its native window. Verify WebView2 and desktop-session availability.'}
    Write-Output "Native desktop extraction, GUI subsystem, bundled CLI version, initialized-project startup: PASS ($taskRoot)"
} finally {
    if(-not $child.HasExited){Stop-Process -Id $child.Id; $child.WaitForExit()}
}
