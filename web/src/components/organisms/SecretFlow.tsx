import type * as React from 'react';
import { useState } from 'react';
import { message } from '../../api';
import { Modal } from '../molecules/Modal';

export function SecretFlow({
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
