import { useEffect, useRef, useState } from 'react';
import { message } from '../../api';
import { getCheckpoint } from '../../handlers/checkpoints';
import { copyText, desktopBridge } from '../../handlers/native';
import { previewCheckpointRestore, restoreCheckpoint } from '../../handlers/restores';
import type { Checkpoint, ForkPlan, ForkResult } from '../../types';
import { DialogClose } from '../atoms/DialogClose';
import { ForkDialogForm } from './ForkDialogForm';

export function ForkDialog({
  id,
  token,
  onClose,
  onViewRestores,
}: {
  id: string;
  token: string;
  onClose: () => void;
  onViewRestores?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(
    `checkpoint-${id.slice(0, 8)}-${crypto.randomUUID().slice(0, 6)}`,
  );
  const [plan, setPlan] = useState<ForkPlan | null>(null);
  const [allow, setAllow] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<ForkResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [capture, setCapture] = useState<Checkpoint | null>(null);
  const [captureError, setCaptureError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    getCheckpoint(id, controller.signal)
      .then(setCapture)
      .catch((e) => {
        if (!controller.signal.aborted) setCaptureError(message(e));
      });
    return () => controller.abort();
  }, [id]);
  async function copyPath() {
    if (!result) return;
    try {
      if (desktopBridge()) await desktopBridge()!.CopyText(result.worktree_path);
      else await copyText(result.worktree_path);
      setCopied(true);
    } catch (error) {
      setError(message(error));
    }
  }
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setPlan(null);
    setError('');
    setAllow(false);
    const timer = setTimeout(() => {
      previewCheckpointRestore(id, name, controller.signal)
        .then(setPlan)
        .catch((e) => {
          if (!controller.signal.aborted) setError(message(e));
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [id, name]);
  async function create() {
    if (!plan || !capture || plan.name !== name || creating || (plan.partial && !allow)) return;
    setCreating(true);
    setError('');
    try {
      setResult(await restoreCheckpoint(id, name, allow, token));
    } catch (e) {
      setError(message(e));
    } finally {
      setCreating(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="fork-dialog"
      aria-labelledby="fork-title"
      onCancel={(e) => {
        if (creating) e.preventDefault();
        else onClose();
      }}
      onClose={() => {
        if (!dialog.current?.open) onClose();
      }}
    >
      <div className="fork-dialog-header">
        <DialogClose label="Close restore dialog" onClick={onClose} disabled={creating} />
        <span className="eyebrow">ISOLATED GIT WORKTREE</span>
        <h2 id="fork-title">{result ? 'Checkpoint restored' : 'Restore checkpoint'}</h2>
        <p>
          {result
            ? 'All captured file hashes were verified.'
            : 'Review the destination and capture limitations before creating a separate workspace.'}
        </p>
      </div>
      {result ? (
        <>
          <p className="fork-success">Ready · {result.checkpoint_id.slice(0, 8)}</p>
          <label>
            Worktree path
            <code className="fork-destination">{result.worktree_path}</code>
          </label>
          <p className="muted">
            Branch: <code>{result.branch_name}</code>
          </p>
          <p className="fork-description">
            Open this directory in your editor. The files may be dirty relative to its Git HEAD. No
            restored code was executed. This does not rewind the Codex conversation.
          </p>
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          <div className="fork-dialog-actions">
            <button onClick={copyPath}>{copied ? 'Path copied' : 'Copy worktree path'}</button>
            {onViewRestores && <button onClick={onViewRestores}>View restored workspaces</button>}
            <button onClick={onClose}>Done</button>
          </div>
        </>
      ) : (
        <ForkDialogForm
          model={{
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
          }}
        />
      )}
    </dialog>
  );
}
