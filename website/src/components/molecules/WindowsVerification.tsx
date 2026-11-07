import { Command } from './Command';
import { Note } from './Note';

export function WindowsVerification({ desktop }: { desktop: boolean }) {
  return (
    <>
      <p>
        Open PowerShell{' '}
        <strong>inside the folder containing your downloaded ZIP and SHA256SUMS</strong>: in File
        Explorer, click the address bar, type <code>powershell</code>, then press Enter. Keep this
        same terminal open through extraction or installation.
      </p>
      <p>Run each command below separately. Stop if a command reports an error.</p>
      <Command
        code="Get-ChildItem -File | Select-Object Name"
        after="You see one matching ZIP and SHA256SUMS. CLI users also need install.ps1."
      />
      <Command
        code={
          desktop
            ? "$archives = @(Get-ChildItem -File -Filter 'agenttm-desktop_*_windows_amd64.zip')"
            : "$archives = @(Get-ChildItem -File -Filter 'agenttm_*_windows_*.zip')"
        }
      />
      <Command
        code="if ($archives.Count -ne 1) { throw 'Keep exactly one matching AgentTM ZIP in this folder.' }"
        after="No output means exactly one matching ZIP was found."
      />
      <Command code="$archive = $archives[0]" />
      <Command
        code="(Get-FileHash -LiteralPath $archive.FullName -Algorithm SHA256).Hash"
        after="PowerShell prints a complete 64-character hash."
      />
      <Command
        code="Get-Content -LiteralPath .\SHA256SUMS | Select-String -SimpleMatch $archive.Name"
        after="The manifest prints the expected hash and this exact ZIP filename."
      />
      <Note caution>
        Compare the two complete hashes; letter case does not matter. If they differ, the entry is
        missing, or the filename is wrong, stop. Download both files again from the same release. Do
        not continue to extraction or installation.
      </Note>
    </>
  );
}
