import { links } from '../../content';
import { Icon } from '../atoms/Icon';

export function HowItWorks() {
  return (
    <section
      className="container section how-section"
      id="how-it-works"
      aria-labelledby="how-title"
    >
      <div className="section-heading">
        <p className="eyebrow">A SMALL ADDITION TO YOUR WORKFLOW</p>
        <h2 id="how-title">Record. Inspect. Restore.</h2>
        <p>Keep using Git. Add the context around your agent’s work.</p>
      </div>
      <ol className="steps">
        {[
          [
            'Start a managed run',
            'Launch Codex through AgentTM, or use chat in the Windows desktop app.',
          ],
          [
            'Follow the activity',
            'Explore supported events and the workspace states observed near them.',
          ],
          ['Compare checkpoints', 'Inspect historical files and diffs between captured states.'],
          ['Restore separately', 'Create an isolated Git worktree from an eligible checkpoint.'],
        ].map(([title, text], i) => (
          <li key={title}>
            <span className="step-number">0{i + 1}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </li>
        ))}
      </ol>
      <div className="safety-note">
        <Icon name="shield" />
        <p>
          Checkpoints are supported operation-boundary observations, not atomic snapshots. Restoring
          files does not rewind a Codex conversation.{' '}
          <a href={links.checkpoints}>
            Read the guarantees <span aria-hidden="true">↗</span>
          </a>
        </p>
      </div>
    </section>
  );
}
