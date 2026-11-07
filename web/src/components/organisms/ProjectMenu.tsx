import { useEffect, useRef, useState } from 'react';
import { message } from '../../api';
import { copyText, desktopBridge } from '../../handlers/native';
import type { ProjectBridge } from '../../types/ProjectMenu';
import { DialogClose } from '../atoms/DialogClose';
import { ProjectIcon } from '../atoms/ProjectIcon';
import { ProjectMenuProjectCurrent } from './ProjectMenuProjectCurrent';

export function ProjectMenu({ project, compact = false }: { project: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState('');
  const [pathError, setPathError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<'' | 'copy' | 'choose'>('');
  const [retry, setRetry] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const pending = useRef(false);
  const bridge = desktopBridge() as ProjectBridge | undefined;
  useEffect(() => {
    if (!open) return;
    const node = dialog.current;
    node?.showModal();
    return () => {
      node?.close();
      requestAnimationFrame(() => opener.current?.focus({ preventScroll: true }));
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setPath('');
    setPathError('');
    if (!bridge?.ProjectPath && !bridge?.CheckSetup) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void Promise.resolve()
      .then(async () => {
        const value = bridge.ProjectPath
          ? await bridge.ProjectPath()
          : (await bridge.CheckSetup!()).path;
        if (!value?.trim())
          throw new Error('The current project path could not be read. Try again.');
        if (active) setPath(value);
      })
      .catch((reason) => {
        if (active) setPathError(message(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, retry]);
  function show() {
    setNotice('');
    setError('');
    setOpen(true);
  }
  function close() {
    if (!pending.current) setOpen(false);
  }
  async function choose() {
    if (!bridge?.OpenProjectWindow || pending.current) return;
    pending.current = true;
    setAction('choose');
    setError('');
    setNotice('');
    try {
      const launched = await bridge.OpenProjectWindow();
      setNotice(
        launched
          ? 'A new AgentTM window was requested. Complete any initialization prompt there.'
          : 'No project selected. Your current workspace is unchanged.',
      );
    } catch (reason) {
      setError(message(reason));
    } finally {
      pending.current = false;
      setAction('');
    }
  }
  async function copy() {
    if (!path || pending.current) return;
    pending.current = true;
    setAction('copy');
    setError('');
    setNotice('');
    try {
      if (bridge?.CopyText) await bridge.CopyText(path);
      else await copyText(path);
      setNotice('Project path copied.');
    } catch (reason) {
      setError(message(reason));
    } finally {
      pending.current = false;
      setAction('');
    }
  }
  return (
    <>
      <button
        ref={opener}
        className="sidebar-project project-selector"
        onClick={show}
        aria-label="Project selector"
        title={compact ? undefined : `${project} - project options`}
        data-sidebar-tooltip={`${project} · Project options`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="project-avatar" aria-hidden="true">
          {project.slice(0, 1).toUpperCase()}
        </span>
        <span>
          <span className="eyebrow">PROJECT</span>
          <strong>{project}</strong>
        </span>
        <span className="project-chevron">
          <ProjectIcon kind="chevron" />
        </span>
      </button>
      <dialog
        ref={dialog}
        className="project-dialog editorial-project-dialog"
        aria-labelledby="project-title"
        aria-describedby="project-dialog-description"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => {
          if (!pending.current) setOpen(false);
        }}
      >
        <header className="project-dialog-heading">
          <div>
            <span className="eyebrow">PROJECT</span>
            <h2 id="project-title">Your workspace</h2>
          </div>
          <DialogClose label="Close project selector" onClick={close} disabled={!!action} />
        </header>
        <ProjectMenuProjectCurrent
          model={{ project, loading, path, copy, action, pathError, setRetry }}
        />
        <section className="project-switch-info">
          <h3>Open another project</h3>
          <p>
            {bridge?.OpenProjectWindow
              ? 'Choose a Git folder to open in a separate window. This workspace and any active recording stay here.'
              : "Run the following command from another Git project's terminal to open its browser dashboard."}
          </p>
          {!bridge?.OpenProjectWindow && (
            <code className="project-browser-command">agenttm ui</code>
          )}
          {bridge?.OpenProjectWindow && (
            <button className="primary-button project-choose" disabled={!!action} onClick={choose}>
              <ProjectIcon kind="open" />
              {action === 'choose' ? 'Choosing project...' : 'Choose a Git project...'}
            </button>
          )}
        </section>
        {notice && (
          <p className="project-feedback" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="project-action-error" role="alert">
            {error}
          </p>
        )}
        <footer className="project-dialog-footer">
          Opening another project does not move your current recording or history.
        </footer>
      </dialog>
    </>
  );
}
