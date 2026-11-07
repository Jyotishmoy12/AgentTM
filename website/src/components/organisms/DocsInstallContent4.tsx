import { commands, links } from '../../content';
import { Icon } from '../atoms/Icon';
import { CodeBlock } from '../molecules/CodeBlock';
import { DocsInstallContent } from './DocsInstallContent';
import { DocsInstallContent2 } from './DocsInstallContent2';
import { DocsInstallContent3 } from './DocsInstallContent3';

export function DocsInstallContent4({
  model,
}: {
  model: {
    title: 'Quick start' | 'Requirements' | 'Desktop' | 'CLI' | 'Safety notes';
    i: number;
    setActive: import('react').Dispatch<import('react').SetStateAction<number>>;
  };
}) {
  const { title, i, setActive } = model;
  return (
    <>
      <div className="docs-breadcrumb">
        Documentation <span>/</span> {title}
      </div>
      {i === 0 && (
        <>
          <h3>From your terminal to your timeline.</h3>
          <p>
            After installing the CLI and authenticating Codex, open a terminal in your Git project.
            Run each command separately.
          </p>
          <ol className="command-steps">
            {commands.map((step, index) => (
              <li key={step.command}>
                <span className="command-number">{index + 1}</span>
                <h4>{step.title}</h4>
                <p>{step.detail}</p>
                <CodeBlock command={step.command} />
              </li>
            ))}
          </ol>
          <p className="docs-footnote">
            The native Windows app has its own setup path.{' '}
            <button
              className="inline-button"
              type="button"
              onClick={() => {
                setActive(2);
                document.getElementById('doc-tab-2')?.focus();
              }}
            >
              Use desktop instead →
            </button>
          </p>
        </>
      )}
      {i === 1 && <DocsInstallContent />}
      {i === 2 && <DocsInstallContent2 />}
      {i === 3 && <DocsInstallContent3 />}
      {i === 4 && (
        <>
          <h3>Local history. Clear boundaries.</h3>
          <ul className="safety-list">
            <li>
              Only AgentTM-managed Codex sessions are captured. External runs are not automatically
              recorded.
            </li>
            <li>
              Checkpoints can be partial and are not atomic. Recorded activity does not establish
              exact causal line attribution.
            </li>
            <li>
              Snapshot file bytes are not content-redacted. Review exclusions and your data before
              exporting or sharing history.
            </li>
            <li>
              AgentTM history stays local. Codex communicates with its configured service; this is
              not offline inference.
            </li>
            <li>
              Restoration recovers eligible files into an isolated Git worktree. It does not
              reproduce AI reasoning or rewind a conversation.
            </li>
          </ul>
          <a className="text-link" href={links.checkpoints}>
            Checkpoint guarantees <Icon name="arrow" />
          </a>
        </>
      )}
    </>
  );
}
