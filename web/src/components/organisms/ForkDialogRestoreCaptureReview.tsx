import type { Checkpoint } from '../../types';

export function ForkDialogRestoreCaptureReview({
  model: viewModel,
}: {
  model: { capture: Checkpoint | null; id: string; captureError: string };
}) {
  const { capture, id, captureError } = viewModel;
  return (
    <section className="restore-capture-review">
      <h3>1. Review the capture</h3>
      {capture ? (
        <>
          <p>
            {capture.file_count} captured files · {new Date(capture.created_at).toLocaleString()} ·{' '}
            <code>{id.slice(0, 8)}</code>
          </p>
          <p>
            {capture.partial
              ? 'Partial capture — omitted content will not be restored.'
              : 'Complete within the configured capture policy.'}{' '}
            Captures are workspace observations, not atomic snapshots.
          </p>
          {capture.potentially_inconsistent && <p>Files may have changed during the scan.</p>}
          {capture.omission_count > 0 && (
            <details open>
              <summary>{capture.omission_count} omitted paths</summary>
              <ul>
                {capture.omissions?.map((item, i) => (
                  <li key={i}>
                    <code>{item.path}</code> — {item.reason}
                  </li>
                ))}
              </ul>
              {capture.omissions_truncated && <p>Only the first 100 omissions are shown.</p>}
            </details>
          )}
        </>
      ) : (
        <p role={captureError ? 'alert' : 'status'}>
          {captureError || 'Loading captured content…'}
        </p>
      )}
    </section>
  );
}
