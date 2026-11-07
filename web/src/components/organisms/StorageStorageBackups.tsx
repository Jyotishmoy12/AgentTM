import type { Flow } from '../../types/StorageManager';
import { StorageIcon } from '../atoms/StorageIcon';

export function StorageStorageBackups({
  model: viewModel,
}: {
  model: {
    bridge: import('../../desktop').FeatureBridge | null;
    busy: string;
    setOutcome: import('react').Dispatch<
      import('react').SetStateAction<{
        kind: Flow;
        message: string;
        path?: string;
      } | null>
    >;
    setFlow: import('react').Dispatch<import('react').SetStateAction<Flow | null>>;
  };
}) {
  const { bridge, busy, setOutcome, setFlow } = viewModel;
  return (
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
  );
}
