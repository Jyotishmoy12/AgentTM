import { storageSize } from '../../data/StorageManager';
import type { StorageUsage } from '../../desktop';
import { historyDate } from '../../history-presentation';
import { StorageIcon } from '../atoms/StorageIcon';

export function StorageStorageLocal({
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
  };
}) {
  const { bridge, measuring, busy, measure, usage, categories, usageError } = viewModel;
  return (
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
                categories.map((value) => value.name + ' ' + storageSize(value.bytes)).join(', ')
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
  );
}
