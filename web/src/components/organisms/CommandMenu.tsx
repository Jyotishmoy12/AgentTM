import { useEffect, useRef, useState } from 'react';
import type { AppCommand } from '../../types/CommandMenu';
import { NavIcon } from '../atoms/NavIcon';

export function CommandMenu({
  open,
  close,
  commands,
}: {
  open: boolean;
  close: () => void;
  commands: AppCommand[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const matches = commands.filter((command) =>
    `${command.title} ${command.detail}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const selected = Math.min(index, Math.max(matches.length - 1, 0));

  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      input.current?.focus();
    } else dialog.current?.close();
  }, [open]);

  useEffect(() => {
    if (open)
      document.getElementById(`command-result-${selected}`)?.scrollIntoView({ block: 'nearest' });
  }, [selected, open, query]);

  function dismiss() {
    setQuery('');
    setIndex(0);
    close();
  }
  function execute(command: AppCommand) {
    dismiss();
    command.run();
  }

  return (
    <dialog
      className="command-dialog"
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
      aria-labelledby="command-title"
    >
      <h2 id="command-title" className="sr-only">
        Search commands and sessions
      </h2>
      <div className="command-search">
        <NavIcon name="search" />
        <input
          ref={input}
          role="combobox"
          aria-label="Search commands and sessions"
          aria-expanded="true"
          aria-autocomplete="list"
          aria-controls="command-results"
          aria-activedescendant={matches.length ? `command-result-${selected}` : undefined}
          placeholder="Where would you like to go?"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              if (matches.length)
                setIndex(
                  (selected + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) %
                    matches.length,
                );
            }
            if (event.key === 'Enter' && matches[selected]) {
              event.preventDefault();
              execute(matches[selected]);
            }
          }}
        />
        <button
          type="button"
          className="command-close"
          onClick={dismiss}
          aria-label="Close command menu"
        >
          <kbd>Esc</kbd>
        </button>
      </div>
      <div className="command-group-label">{query ? 'RESULTS' : 'GO TO & QUICK ACTIONS'}</div>
      <div className="command-results" id="command-results" role="listbox" aria-label="Commands">
        {matches.map((command, i) => (
          <div
            id={`command-result-${i}`}
            key={command.id}
            role="option"
            aria-selected={selected === i}
            className="command-result"
            onPointerMove={() => setIndex(i)}
            onClick={() => execute(command)}
          >
            <span className="command-icon">
              <NavIcon name={command.icon} />
            </span>
            <span>
              <strong>{command.title}</strong>
              <small>{command.detail}</small>
            </span>
            <span className="command-enter" aria-hidden="true">
              ↵
            </span>
          </div>
        ))}
      </div>
      {!matches.length && (
        <p className="command-no-results" role="status">
          No matching commands or loaded sessions.
        </p>
      )}
      <div className="command-footer">
        <span>
          AgentTM <span className="muted">/ Command menu</span>
        </span>
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd> navigate <kbd>↵</kbd> open
        </span>
      </div>
    </dialog>
  );
}
