import type { IconName } from '../../types/App';
import { Icon } from '../atoms/Icon';

export function ProblemSection() {
  return (
    <section className="container problem section" aria-labelledby="problem-title">
      <div className="problem-intro">
        <div>
          <p className="eyebrow">THE DIFF IS ONLY PART OF THE STORY</p>
          <h2 id="problem-title">
            The code changed.
            <br />
            <span>What happened in between?</span>
          </h2>
        </div>
        <p>
          A final diff shows where you landed. AgentTM gives you local execution history and
          workspace observations to investigate the path—and recover captured files when you need
          to.
        </p>
      </div>
      <div className="benefit-row">
        {[
          [
            'timeline',
            'See the sequence',
            'Follow supported events and commands from AgentTM-managed Codex sessions.',
          ],
          [
            'code',
            'Inspect the changes',
            'Browse historical files and compare the states observed near agent activity.',
          ],
          [
            'branch',
            'Keep your workspace',
            'Restore into a separate Git worktree while your original project stays in place.',
          ],
        ].map(([icon, title, text], i) => (
          <article key={title}>
            <div className="benefit-top">
              <Icon name={icon as IconName} />
              <span>0{i + 1}</span>
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
