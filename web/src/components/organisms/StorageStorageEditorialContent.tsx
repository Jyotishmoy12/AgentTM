import type { StorageUsage } from '../../desktop';
import type { Flow } from '../../types/StorageManager';
import { StorageIcon } from '../atoms/StorageIcon';
import { StorageStorageBackups } from './StorageStorageBackups';
import { StorageStorageLocal } from './StorageStorageLocal';

export function StorageStorageEditorialContent({
  model: viewModel,
}: {
  model: {
    bridge: import('../../desktop').FeatureBridge | null;
    measuring: boolean;
    busy: string;
    measure: () => Promise<void>;
    usage: StorageUsage | null;
    categories: { name: string; bytes: number; key: string }[];
    usageError: string;
    setOutcome: import('react').Dispatch<
      import('react').SetStateAction<{
        kind: Flow;
        message: string;
        path?: string;
      } | null>
    >;
    setFlow: import('react').Dispatch<import('react').SetStateAction<Flow | null>>;
    preview: () => Promise<void>;
    outcome: { kind: Flow; message: string; path?: string } | null;
  };
}) {
  const {
    bridge,
    measuring,
    busy,
    measure,
    usage,
    categories,
    usageError,
    setOutcome,
    setFlow,
    preview,
    outcome,
  } = viewModel;
  return (
    <div className="storage-editorial-content">
      <StorageStorageLocal
        model={{ bridge, measuring, busy, measure, usage, categories, usageError }}
      />
      <StorageStorageBackups model={{ bridge, busy, setOutcome, setFlow }} />
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
            Sizes are observed regular-file bytes under .agenttm, not allocated disk space. Restored
            worktrees are excluded; external backup archives are not counted. SQLite database, WAL,
            shared-memory, and journal files share one category; other categories are disjoint.
            Values can change during recording.
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
  );
}
