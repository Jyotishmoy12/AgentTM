import { useEffect, useRef, useState } from 'react';
import { message } from '../../api';
import { renameSession } from '../../handlers/sessions';
import type { Session } from '../../types';
import { DialogClose } from '../atoms/DialogClose';

export function SessionNameDialog({
  session,
  token,
  onSaved,
  onClose,
}: {
  session: Session;
  token: string;
  onSaved: (id: string, title: string) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(session.title || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    nameInput.current?.focus();
    return () => node?.close();
  }, []);
  const tooLong = Array.from(title.trim()).length > 120;
  async function save() {
    if (busy || tooLong) return;
    setBusy(true);
    setError('');
    try {
      const result = await renameSession(session.id, title.trim(), token);
      onSaved(result.id, result.title);
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="session-name-dialog"
      aria-labelledby="session-name-title"
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <DialogClose label="Close session name dialog" onClick={onClose} disabled={busy} />
        <h2 id="session-name-title">Name this session</h2>
        <p>Give this recording a name you can recognize later.</p>
        <label htmlFor="session-name-input">Session name</label>
        <input
          ref={nameInput}
          id="session-name-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={240}
          autoFocus
          autoComplete="off"
          placeholder="For example, Fix authentication redirects"
          disabled={busy}
        />
        <small>
          Stored locally in project history. This does not enable prompt capture. Leave empty to
          restore the automatic heading.
        </small>
        {tooLong && <p role="alert">Use at most 120 characters.</p>}
        {error && (
          <p role="alert" className="error-box">
            {error}
          </p>
        )}
        <div className="session-name-actions">
          <button type="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" disabled={busy || tooLong || !token}>
            {busy ? 'Saving…' : 'Save name'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
