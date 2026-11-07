import { useEffect, useState } from 'react';
import { storageSize } from '../../data/StorageManager';
import type { GCReport } from '../../desktop';
import { plural } from '../../history-presentation';
import { Modal } from '../molecules/Modal';

export function CleanupFlow({
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
