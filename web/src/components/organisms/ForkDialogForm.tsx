import type { Checkpoint, ForkPlan } from '../../types';
import { ForkDialogRestoreCaptureReview } from './ForkDialogRestoreCaptureReview';

export function ForkDialogForm({
  model: viewModel,
}: {
  model: {
    create: () => Promise<void>;
    capture: Checkpoint | null;
    id: string;
    captureError: string;
    name: string;
    setName: import('react').Dispatch<import('react').SetStateAction<string>>;
    creating: boolean;
    plan: ForkPlan | null;
    allow: boolean;
    setAllow: import('react').Dispatch<import('react').SetStateAction<boolean>>;
    error: string;
    onClose: () => void;
  };
}) {
  const {
    create,
    capture,
    id,
    captureError,
    name,
    setName,
    creating,
    plan,
    allow,
    setAllow,
    error,
    onClose,
  } = viewModel;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void create();
      }}
    >
      <ForkDialogRestoreCaptureReview model={{ capture, id, captureError }} />
      <h3>2. Confirm the destination</h3>
      <label htmlFor="fork-name">New fork name</label>
      <input
        id="fork-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={64}
        disabled={creating}
        autoComplete="off"
        spellCheck={false}
      />
      {plan ? (
        <>
          <label>
            Destination
            <code className="fork-destination">{plan.worktree_path}</code>
          </label>
          <p className="muted">
            Branch: <code>{plan.branch_name}</code>
          </p>
          {plan.warnings.map((warning, i) => (
            <p className="warning-box" key={i}>
              {warning}
            </p>
          ))}
          {plan.partial && (
            <label className="partial-consent">
              <input
                type="checkbox"
                checked={allow}
                onChange={(e) => setAllow(e.target.checked)}
                disabled={creating}
              />
              I reviewed the omissions and accept a partial restore.
            </label>
          )}
        </>
      ) : (
        !error && <p className="loading-inline">Checking destination…</p>
      )}
      <p className="fork-description">
        The original working tree, index and HEAD stay unchanged. No scripts, installers or agent
        commands will run.
      </p>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <div className="fork-dialog-actions">
        <button type="button" onClick={onClose} disabled={creating}>
          Cancel
        </button>
        <button
          className="primary-button"
          type="submit"
          disabled={!plan || !capture || creating || plan.name !== name || (plan.partial && !allow)}
        >
          {creating ? 'Restoring and verifying…' : 'Create restored worktree'}
        </button>
      </div>
    </form>
  );
}
