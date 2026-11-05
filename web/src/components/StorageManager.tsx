import { DialogClose } from './DialogClose';
import { useCallback, useEffect, useRef, useState } from 'react';
import { message } from '../api';
import { desktopFeatures, type GCReport, type StorageUsage } from '../desktop';
import { historyDate, plural } from '../history-presentation';

export const storageSize = (bytes: number) =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1048576
      ? `${(bytes / 1024).toFixed(1)} KiB`
      : bytes < 1073741824
        ? `${(bytes / 1048576).toFixed(2)} MiB`
        : `${(bytes / 1073741824).toFixed(2)} GiB`;
type Flow = 'backup' | 'restore' | 'cleanup';
function StorageIcon({ kind }: { kind: Flow | 'storage' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === 'storage' ? (
        <>
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0" />
        </>
      ) : kind === 'backup' ? (
        <>
          <path d="M12 3v12m-4-4 4 4 4-4M4 15v6h16v-6" />
          <path d="M5 6V3h3" />
        </>
      ) : kind === 'restore' ? (
        <>
          <path d="M12 16V4m-4 4 4-4 4 4M4 15v6h16v-6" />
        </>
      ) : (
        <>
          <path d="m14 4 6 6M3 21l3-9 9-9 6 6-9 9-9 3ZM6 12l6 6M13 17l3 3M17 13l4 3" />
        </>
      )}
    </svg>
  );
}
function Modal({
  title,
  kicker,
  busy,
  children,
  onClose,
}: {
  title: string;
  kicker: string;
  busy: boolean;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const node = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = node.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={node}
      className="storage-flow"
      aria-labelledby="storage-flow-title"
      aria-busy={busy}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header>
        <span className="editorial-kicker">{kicker}</span>
        <h2 id="storage-flow-title">{title}</h2>
        <DialogClose label="Close storage dialog" disabled={busy} onClick={onClose} />
      </header>
      {children}
    </dialog>
  );
}
function SecretFlow({
  kind,
  busy,
  run,
  close,
}: {
  kind: 'backup' | 'restore';
  busy: boolean;
  run: (kind: 'backup' | 'restore', secret: string) => Promise<void>;
  close: () => void;
}) {
  const [password, setPassword] = useState(''),
    [confirmation, setConfirmation] = useState(''),
    [error, setError] = useState('');
  const backup = kind === 'backup';
  const mismatch = backup && !!confirmation && password !== confirmation;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !password || (backup && (password.length < 12 || password !== confirmation)))
      return;
    const secret = password;
    setPassword('');
    setConfirmation('');
    setError('');
    try {
      await run(kind, secret);
    } catch (e) {
      setError(message(e));
    }
  }
  return (
    <Modal
      title={backup ? 'Create encrypted backup' : 'Restore encrypted history'}
      kicker={backup ? 'PROTECT YOUR HISTORY' : 'RESTORE INTO A CLEAN REPOSITORY'}
      busy={busy}
      onClose={close}
    >
      <form onSubmit={submit}>
        <div className="storage-flow-body">
          <p className="storage-flow-lead">
            {backup
              ? 'Protect this project’s recorded history with a passphrase.'
              : 'Bring saved AgentTM history into a Git repository with no existing .agenttm folder.'}
          </p>
          {!backup && (
            <ol className="restore-backup-steps">
              <li>Enter the archive’s passphrase below.</li>
              <li>Choose the encrypted archive and target Git repository in the native dialogs.</li>
              <li>
                Review the target and confirm. AgentTM authenticates and validates the archive
                before publishing history.
              </li>
            </ol>
          )}
          <label htmlFor="storage-secret">
            {backup ? 'Backup passphrase' : 'Restore passphrase'}
          </label>
          <input
            id="storage-secret"
            autoFocus
            aria-label={backup ? 'Backup passphrase' : 'Restore passphrase'}
            type="password"
            autoComplete={backup ? 'new-password' : 'off'}
            maxLength={1024}
            value={password}
            disabled={busy}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
          />
          {backup && (
            <>
              <p className="storage-field-hint">
                At least 12 characters. Keep it separately; AgentTM cannot recover it.
              </p>
              <label htmlFor="storage-confirm">Confirm passphrase</label>
              <input
                id="storage-confirm"
                aria-label="Confirm backup passphrase"
                type="password"
                autoComplete="new-password"
                maxLength={1024}
                value={confirmation}
                disabled={busy}
                onChange={(e) => setConfirmation(e.target.value)}
              />
              {mismatch && <p className="storage-field-error">Passphrases do not match.</p>}
            </>
          )}
          <div className="storage-action-safety">
            {backup ? (
              <>
                <strong>History archive, not a project backup.</strong>
                <p>
                  Includes SQLite history, configuration, manifests, logs, and blobs. Excludes Git
                  commits, live project files, restored worktrees, and Codex login credentials.
                </p>
              </>
            ) : (
              <>
                <strong>Existing history will not be overwritten.</strong>
                <p>
                  The target must not contain any .agenttm history directory. This restores recorded
                  history, not project files or Git commits, and does not rewind a Codex
                  conversation.
                </p>
              </>
            )}
          </div>
          {error && (
            <div className="storage-flow-error" role="alert">
              {error}
              <p>Passphrase fields were cleared. Review the error before trying again.</p>
            </div>
          )}
          {busy && (
            <p className="storage-progress" role="status">
              {backup
                ? 'Choose a save location in the native dialog. AgentTM then encrypts the history archive.'
                : 'Choose the archive and clean Git target, then confirm in the native dialog. Validation and restoration may take a moment.'}
            </p>
          )}
        </div>
        <footer>
          <button type="button" disabled={busy} onClick={close}>
            Cancel
          </button>
          <button
            className="primary-button"
            type="submit"
            disabled={
              busy || !password || (backup && (password.length < 12 || password !== confirmation))
            }
          >
            {busy
              ? backup
                ? 'Creating backup…'
                : 'Validating / restoring…'
              : backup
                ? 'Create encrypted backup'
                : 'Choose archive & target'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
function CleanupFlow({
  report,
  busy,
  error,
  attempted,
  preview,
  apply,
  close,
}: {
  report: GCReport | null;
  busy: string;
  error: string;
  attempted: boolean;
  preview: () => void;
  apply: () => void;
  close: () => void;
}) {
  const [consent, setConsent] = useState(false);
  useEffect(() => setConsent(false), [report]);
  return (
    <Modal
      title="Review storage cleanup"
      kicker="ONLY ELIGIBLE UNREFERENCED BLOBS"
      busy={!!busy}
      onClose={close}
    >
      <div className="storage-flow-body">
        {busy === 'preview' ? (
          <p className="storage-progress" role="status">
            Checking retained checkpoints, references, age limits, and maintenance locks…
          </p>
        ) : report ? (
          <>
            <div className="cleanup-amount">
              <strong>{storageSize(report.bytes)}</strong>
              <span>
                {report.candidates} eligible {plural(report.candidates, 'blob')}
              </span>
            </div>
            <dl className="cleanup-counts">
              <div>
                <dt>Stored blobs</dt>
                <dd>{report.objects}</dd>
              </div>
              <div>
                <dt>Referenced blobs</dt>
                <dd>{report.referenced}</dd>
              </div>
            </dl>
            {report.candidates > 0 ? (
              <>
                <div className="storage-action-safety">
                  <strong>Deletion is permanent.</strong>
                  <p>
                    Only these previewed, unreferenced blobs aged at least 24 hours are eligible.
                    Retained history, manifests, and the SQLite database are not selected for
                    deletion.
                  </p>
                </div>
                <label className="cleanup-consent">
                  <input
                    type="checkbox"
                    checked={consent}
                    disabled={!!busy}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  I understand this permanently deletes the previewed unreferenced blobs.
                </label>
              </>
            ) : (
              <div className="storage-zero">
                <strong>Nothing is eligible for cleanup.</strong>
                <p>No unreferenced blobs meet the 24-hour age requirement.</p>
              </div>
            )}
          </>
        ) : null}
        {error && (
          <div className="storage-flow-error" role="alert">
            {error}
            {attempted && (
              <p>
                Deletion may have partially completed before the error. Preview again before
                retrying.
              </p>
            )}
          </div>
        )}
        <p className="storage-field-hint">
          Recording, snapshot, or maintenance locks block cleanup. Corrupt or unindexed manifests
          stop it; AgentTM does not guess which data can be discarded.
        </p>
        {busy === 'apply' && (
          <p className="storage-progress" role="status">
            Rechecking references and the preview token, then removing eligible blobs…
          </p>
        )}
      </div>
      <footer>
        <button disabled={!!busy} onClick={close}>
          {report?.candidates ? 'Cancel' : 'Done'}
        </button>
        {!report && !busy && <button onClick={preview}>Preview again</button>}
        {!!report?.candidates && (
          <button
            className="storage-delete"
            disabled={!!busy || !consent || !report.token}
            onClick={apply}
          >
            {busy === 'apply' ? 'Cleaning up…' : 'Delete previewed blobs'}
          </button>
        )}
      </footer>
    </Modal>
  );
}

export function StoragePage() {
  const bridge = desktopFeatures();
  const [flow, setFlow] = useState<Flow | null>(null),
    [busy, setBusy] = useState('');
  const [usage, setUsage] = useState<StorageUsage | null>(null),
    [measuring, setMeasuring] = useState(false),
    [usageError, setUsageError] = useState('');
  const [report, setReport] = useState<GCReport | null>(null),
    [cleanupError, setCleanupError] = useState(''),
    [attempted, setAttempted] = useState(false);
  const [outcome, setOutcome] = useState<{
    kind: Flow;
    message: string;
    path?: string;
  } | null>(null);
  const active = useRef(true),
    measureRun = useRef(0);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      measureRun.current++;
    };
  }, []);
  const measure = useCallback(async () => {
    if (!bridge?.StorageUsage) return;
    const run = ++measureRun.current;
    setMeasuring(true);
    setUsageError('');
    try {
      const value = await bridge.StorageUsage();
      const parts = [value.blobs, value.database, value.manifests, value.logs, value.other];
      if (
        !Number.isFinite(Date.parse(value.measured_at)) ||
        parts.some((part) => !Number.isFinite(part) || part < 0) ||
        parts.reduce((a, b) => a + b, 0) !== value.total
      )
        throw new Error('Storage measurement was incomplete. Refresh to try again.');
      if (active.current && run === measureRun.current) setUsage(value);
    } catch (e) {
      if (active.current && run === measureRun.current) {
        setUsage(null);
        setUsageError(message(e));
      }
    } finally {
      if (active.current && run === measureRun.current) setMeasuring(false);
    }
  }, [bridge]);
  useEffect(() => {
    void measure();
  }, [measure]);
  function close() {
    if (busy) return;
    setFlow(null);
    setReport(null);
    setCleanupError('');
  }
  async function run(kind: 'backup' | 'restore', password: string) {
    if (!bridge || busy) return;
    setBusy(kind);
    setOutcome(null);
    try {
      const path = await (kind === 'backup'
        ? bridge.CreateBackup(password)
        : bridge.RestoreHistory(password));
      if (active.current) {
        setOutcome({
          kind,
          message: path
            ? kind === 'backup'
              ? 'Encrypted backup saved.'
              : 'History restored into the selected repository.'
            : kind === 'backup'
              ? 'Backup cancelled.'
              : 'Restore cancelled.',
          path: path || undefined,
        });
        setFlow(null);
        if (path) void measure();
      }
    } finally {
      if (active.current) setBusy('');
    }
  }
  async function preview() {
    if (!bridge || busy) return;
    setFlow('cleanup');
    setReport(null);
    setAttempted(false);
    setCleanupError('');
    setOutcome(null);
    setBusy('preview');
    try {
      const result = await bridge.GarbageCollect(false, '');
      if (active.current) setReport(result);
    } catch (e) {
      if (active.current) setCleanupError(message(e));
    } finally {
      if (active.current) setBusy('');
    }
  }
  async function apply() {
    if (!bridge || busy || !report?.candidates || !report.token) return;
    setBusy('apply');
    setCleanupError('');
    try {
      const result = await bridge.GarbageCollect(true, report.token);
      if (active.current) {
        setOutcome({
          kind: 'cleanup',
          message: `Removed ${result.removed} ${plural(result.removed, 'unreferenced blob')} (${storageSize(result.bytes)} of logical file data).`,
        });
        setFlow(null);
        setReport(null);
        void measure();
      }
    } catch (e) {
      if (active.current) {
        setAttempted(true);
        setCleanupError(message(e));
        setReport(null);
      }
    } finally {
      if (active.current) setBusy('');
    }
  }
  const categories = usage
    ? [
        { name: 'Blob storage', bytes: usage.blobs, key: 'blobs' },
        { name: 'SQLite & journals', bytes: usage.database, key: 'database' },
        {
          name: 'Checkpoint manifests',
          bytes: usage.manifests,
          key: 'manifests',
        },
        { name: 'Recorded logs', bytes: usage.logs, key: 'logs' },
        { name: 'Configuration & other', bytes: usage.other, key: 'other' },
      ]
    : [];
  return (
    <section className="storage-manager" aria-label="Storage and backups manager">
      <header className="storage-editorial-heading">
        <span className="editorial-kicker">HISTORY ON THIS DEVICE</span>
        <h1>Storage & backups</h1>
        <p>Keep your recorded history protected, portable, and tidy.</p>
      </header>
      <div className="storage-editorial-content">
        <section className="storage-local">
          <div className="storage-section-heading">
            <h2>
              <StorageIcon kind="storage" />
              Local history
            </h2>
            {bridge?.StorageUsage && (
              <button disabled={measuring || !!busy} onClick={measure}>
                {measuring ? 'Measuring…' : 'Refresh sizes'}
              </button>
            )}
          </div>
          {usage ? (
            <>
              <div className="storage-total">
                <strong>{storageSize(usage.total)}</strong>
                <span>Total local history · logical file sizes</span>
              </div>
              {usage.total > 0 ? (
                <div
                  className="storage-breakdown"
                  role="img"
                  aria-label={
                    'History storage breakdown: ' +
                    categories
                      .map((value) => value.name + ' ' + storageSize(value.bytes))
                      .join(', ')
                  }
                >
                  {categories
                    .filter((value) => value.bytes > 0)
                    .map((value) => (
                      <span
                        className={'storage-segment ' + value.key}
                        key={value.key}
                        style={{
                          width: (value.bytes / usage.total) * 100 + '%',
                        }}
                      />
                    ))}
                </div>
              ) : (
                <p className="storage-muted">No history file bytes measured.</p>
              )}
              <ul className="storage-legend">
                {categories.map((value) => (
                  <li key={value.key}>
                    <i className={value.key} aria-hidden="true" />
                    <span>{value.name}</span>
                    <strong>{storageSize(value.bytes)}</strong>
                  </li>
                ))}
              </ul>
              <p className="storage-measured">
                Worktrees excluded · Measured {historyDate(usage.measured_at)}
              </p>
            </>
          ) : measuring ? (
            <p className="storage-muted" role="status">
              Measuring history files…
            </p>
          ) : (
            <p className="storage-muted">
              {usageError ||
                'Storage sizes are unavailable here. Open the updated Windows desktop app for a measured breakdown.'}
            </p>
          )}
        </section>
        <section className="storage-backups">
          <div className="storage-section-heading">
            <h2>Encrypted backups</h2>
            <span>Passphrase protected</span>
          </div>
          <div className="storage-workflow-row">
            <StorageIcon kind="backup" />
            <div>
              <h3>Create a backup</h3>
              <p>Save encrypted recorded history to an .age archive.</p>
            </div>
            <button
              disabled={!bridge || !!busy}
              onClick={() => {
                setOutcome(null);
                setFlow('backup');
              }}
            >
              Create backup <span aria-hidden="true">↗</span>
            </button>
          </div>
          <div className="storage-workflow-row">
            <StorageIcon kind="restore" />
            <div>
              <h3>Restore a backup</h3>
              <p>Validate and import history into a clean Git repository.</p>
            </div>
            <button
              disabled={!bridge || !!busy}
              onClick={() => {
                setOutcome(null);
                setFlow('restore');
              }}
            >
              Restore backup <span aria-hidden="true">↗</span>
            </button>
          </div>
        </section>
        <section className="storage-cleanup">
          <div className="storage-section-heading">
            <h2>Storage Cleanup</h2>
            <span>Preview before deleting</span>
          </div>
          <div className="storage-workflow-row">
            <StorageIcon kind="cleanup" />
            <div>
              <h3>Review eligible blobs</h3>
              <p>Remove only unreferenced blobs that pass all retention checks.</p>
            </div>
            <button disabled={!bridge || !!busy} onClick={preview}>
              Preview Cleanup <span aria-hidden="true">↗</span>
            </button>
          </div>
        </section>
        {!bridge && (
          <p className="storage-desktop-note">
            Backup, restore, and cleanup use the Windows desktop app. You can preview cleanup from a
            terminal with <code>agenttm gc</code>.
          </p>
        )}
        {outcome && (
          <div className="storage-outcome" role="status">
            <strong>{outcome.message}</strong>
            {outcome.path && (
              <>
                <code>{outcome.path}</code>
                <p>
                  {outcome.kind === 'backup'
                    ? 'Keep the passphrase separately; AgentTM cannot recover it.'
                    : 'Open AgentTM from that repository to inspect the restored history.'}
                </p>
              </>
            )}
          </div>
        )}
        <details className="storage-advanced">
          <summary>How it works</summary>
          <div>
            <h3>Local storage</h3>
            <p>
              Sizes are observed regular-file bytes under .agenttm, not allocated disk space.
              Restored worktrees are excluded; external backup archives are not counted. SQLite
              database, WAL, shared-memory, and journal files share one category; other categories
              are disjoint. Values can change during recording.
            </p>
            <h3>Encrypted archives</h3>
            <p>
              Backups use the existing age passphrase format and include configuration, SQLite
              history, checkpoint manifests, logs, and content-addressed blobs. Keep a separate Git
              repository backup. Git commits, live project files, restored worktrees, and Codex
              credentials or local thread history are not included.
            </p>
            <h3>Restore validation</h3>
            <p>
              Native pickers select the archive and clean Git target, followed by a confirmation.
              Decryption uses temporary staging. Archive authentication, structure, database
              integrity, manifests, and referenced objects are checked before history is published.
              Staging is removed after completion or failure.
            </p>
            <h3>Conservative cleanup</h3>
            <p>
              The preview does not delete files. Applying it rechecks references and the exact
              candidate token under maintenance locks. Only unreferenced blobs at least 24 hours old
              qualify. Active recordings, locks, corrupt objects, and corrupt or unindexed manifests
              can block cleanup.
            </p>
          </div>
        </details>
      </div>
      {(flow === 'backup' || flow === 'restore') && (
        <SecretFlow key={flow} kind={flow} busy={!!busy} run={run} close={close} />
      )}
      {flow === 'cleanup' && (
        <CleanupFlow
          report={report}
          busy={busy}
          error={cleanupError}
          attempted={attempted}
          preview={preview}
          apply={apply}
          close={close}
        />
      )}
    </section>
  );
}
