import { useState } from 'react';
import { message } from '../api';
import { desktopFeatures, type GCReport } from '../desktop';

const size = (bytes: number) => `${(bytes / 1048576).toFixed(2)} MiB`;
export function StoragePage() {
  const bridge = desktopFeatures();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [report, setReport] = useState<GCReport | null>(null);
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  async function backup(restore: boolean) {
    if (!bridge || busy) return;
    setBusy(restore ? 'restore' : 'backup'); setError(''); setResult('');
    try { const path = await (restore ? bridge.RestoreHistory(password) : bridge.CreateBackup(password)); if (path) setResult(restore ? `History restored into ${path}. Open AgentTM from that repository to inspect it.` : `Encrypted backup saved to ${path}. Keep the passphrase separately; AgentTM cannot recover it.`); }
    catch (e) { setError(message(e)); }
    finally { setPassword(''); setConfirmation(''); setBusy(''); }
  }
  async function gc(apply: boolean) {
    if (!bridge || busy || apply && (!report || !consent)) return;
    setBusy('gc'); setError(''); setResult('');
    try { const next = await bridge.GarbageCollect(apply, report?.token ?? ''); setReport(next); setConsent(false); if (apply) setResult(`Removed ${next.removed} unreferenced blobs (${size(next.bytes)}).`); }
    catch (e) { setError(message(e)); setReport(null); }
    finally { setBusy(''); }
  }
  return <div className="page-scroll storage-page">{!bridge && <div className="setup-callout">Encrypted backup and restore use native file pickers in the desktop app. In a terminal, run <code>agenttm gc</code> to preview blob cleanup.</div>}
    <section className="help-card"><h2>Encrypted history backups</h2><p>Save your SQLite history, configuration, manifests, logs, and blobs as a passphrase-protected age file. Backups do not include Git commits, live project files, restored worktrees, or Codex login credentials.</p><p>Keep a separate clone or backup of your Git repository. Codex conversation resumption also needs Codex's own local thread history on the machine.</p><div className="backup-fields"><label>Backup passphrase<input aria-label="Backup passphrase" type="password" autoComplete="new-password" maxLength={1024} value={password} onChange={e => setPassword(e.target.value)} disabled={!!busy || !bridge}/></label><label>Confirm passphrase for a new backup<input aria-label="Confirm backup passphrase" type="password" autoComplete="new-password" maxLength={1024} value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={!!busy || !bridge}/></label></div><p>Use at least 12 characters for a new backup. Your passphrase is cleared after the operation and is never saved by AgentTM.</p><div className="storage-actions"><button className="primary-button" disabled={!bridge || !!busy || password.length < 12 || password !== confirmation} onClick={() => backup(false)}>{busy === 'backup' ? 'Encrypting…' : 'Create encrypted backup'}</button><button disabled={!bridge || !!busy || !password} onClick={() => backup(true)}>{busy === 'restore' ? 'Restoring…' : 'Restore a backup'}</button></div><p>Restoring asks you to select the archive and a Git repository with no existing <code>.agenttm</code> folder. Existing history is never overwritten. Decryption uses a temporary staging folder; it is removed after validation or failure.</p></section>
    <section className="help-card"><h2>Blob garbage collection</h2><p>File contents are shared across checkpoints. Cleanup removes only blobs no retained checkpoint references, and only when they are at least 24 hours old. Purging a session may make some of its blobs eligible.</p><p>Recording, snapshot, or maintenance locks block cleanup. Corrupt or unindexed manifests stop it so files needed by history are not guessed away.</p><button disabled={!bridge || !!busy} onClick={() => gc(false)}>Preview unused blobs</button>{report && <div className="gc-preview"><dl><dt>Stored blobs</dt><dd>{report.objects}</dd><dt>Referenced blobs</dt><dd>{report.referenced}</dd><dt>Eligible for deletion</dt><dd>{report.candidates} · {size(report.bytes)}</dd></dl>{report.removed === 0 && report.candidates > 0 && <><label><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={!!busy}/>I understand this permanently deletes these unreferenced blobs.</label><button disabled={!consent || !!busy} onClick={() => gc(true)}>Delete previewed blobs</button></>}{!report.candidates && <p>No unreferenced blobs are old enough to delete.</p>}</div>}</section>
    {error && <div className="error-box" role="alert">{error}</div>}{result && <div className="setup-callout setup-ready" role="status">{result}</div>}
  </div>;
}
