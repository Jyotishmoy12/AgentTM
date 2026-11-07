import type * as React from 'react';
import { useEffect, useRef } from 'react';
import { DialogClose } from '../atoms/DialogClose';

export function Modal({
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
