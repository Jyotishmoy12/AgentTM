import { useSceneVisibility } from '../../hooks/useSceneVisibility';

export function FeatureDiagram({ kind }: { kind: number }) {
  const { host, visible } = useSceneVisibility();
  return (
    <div
      ref={host}
      className={`feature-diagram diagram-${kind}`}
      data-active={visible}
      aria-hidden="true"
    >
      <span className="diagram-grid" />
      {kind === 0 && (
        <div className="local-diagram">
          <div className="mini-window">
            <span className="mini-title">
              YOUR WORKSPACE <i />
            </span>
            <span className="mini-file">
              .agenttm/ <em>local</em>
            </span>
            <span className="mini-file indent">data/events.db</span>
            <span className="mini-file indent">manifests/</span>
            <span className="mini-file indent">objects/</span>
          </div>
          <span className="orbit-lock">⌂</span>
        </div>
      )}
      {kind === 1 && (
        <div className="dedup-diagram">
          <div className="hash-sources">
            <span>checkpoint A</span>
            <span>checkpoint B</span>
            <span>checkpoint C</span>
          </div>
          <svg viewBox="0 0 110 100">
            <path d="M0 15C75 15 20 50 105 50M0 50H105M0 85C75 85 20 50 105 50" />
            <path className="data-packet" d="M0 15C75 15 20 50 105 50" />
          </svg>
          <span className="hash-object">
            SHA-256<small>shared file bytes</small>
          </span>
        </div>
      )}
      {kind === 2 && (
        <div className="conversation-diagram">
          <span className="mini-bubble">Explain this project.</span>
          <span className="mini-bubble answer">
            <i />
            <i />
            <i />
          </span>
          <span className="continue-thread">
            <span /> Continue conversation <b>↵</b>
          </span>
        </div>
      )}
      {kind === 3 && (
        <div className="backup-diagram">
          <span className="backup-file">
            history.age<small>Encrypted backup</small>
          </span>
          <div className="password-dots">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <span className="encrypted-chip">↳ &nbsp; Passphrase protected</span>
        </div>
      )}
      {kind === 4 && (
        <div className="integrity-diagram">
          <div className="mini-terminal">
            <span className="mini-title">DIAGNOSTIC EXAMPLE</span>
            <span>
              <b>$</b> agenttm doctor
            </span>
            <span className="check-line">✓ SQLite integrity</span>
            <span className="check-line second">✓ Snapshot objects</span>
          </div>
        </div>
      )}
      {kind === 5 && (
        <div className="storage-diagram">
          <div className="object-cells">
            {Array.from({ length: 24 }, (_, i) => (
              <i key={i} className={i > 17 ? 'unreferenced' : ''} />
            ))}
          </div>
          <span className="storage-legend">
            <i /> Referenced <i className="unreferenced" /> Unreferenced
          </span>
        </div>
      )}
      <span className="diagram-caption">SCHEMATIC · NOT LIVE DATA</span>
    </div>
  );
}
