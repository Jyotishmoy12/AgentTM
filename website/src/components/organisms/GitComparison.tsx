import { gitComparison, links } from '../../content';
import { Icon } from '../atoms/Icon';

export function GitComparison() {
  return (
    <section
      className="container section git-comparison"
      id="compare"
      aria-labelledby="comparison-title"
    >
      <div className="comparison-heading">
        <div>
          <p className="eyebrow">TWO PARTS OF THE SAME WORKFLOW</p>
          <h2 id="comparison-title">
            Git keeps the commits.
            <br />
            <span>AgentTM records the run.</span>
          </h2>
        </div>
        <p>
          Keep your commits, branches, and code reviews. Add a local record of supported Codex
          activity and the workspace states captured along the way.
        </p>
      </div>
      <div
        className="comparison-table-scroll"
        role="region"
        aria-label="Git and AgentTM feature comparison"
        tabIndex={0}
      >
        <table>
          <caption className="sr-only">
            Built-in Git capabilities compared with the current AgentTM source build.
          </caption>
          <thead>
            <tr>
              <th scope="col">Your workflow</th>
              <th scope="col">
                <Icon name="branch" />
                Git
              </th>
              <th scope="col">
                <Icon name="timeline" />
                AgentTM
              </th>
            </tr>
          </thead>
          <tbody>
            {gitComparison.map((row) => (
              <tr key={row.feature}>
                <th scope="row">{row.feature}</th>
                <td>{row.git}</td>
                <td>
                  <Icon name="check" />
                  <span>{row.agenttm}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="comparison-notes">
        <p>
          AgentTM captures supported operations in managed recordings. Workspace scans can be
          partial and are not atomic snapshots. Continuing a conversation does not rewind it to a
          restored checkpoint; exact action-to-line attribution is not available.
        </p>
        <p>
          Current source-build capabilities shown; published releases may differ.{' '}
          <a href={links.repo + '/blob/main/docs/comparison-with-git.md'}>
            Full comparison <Icon name="arrow" />
          </a>{' '}
          <a href="https://git-scm.com/docs/git-worktree">
            Git worktree documentation <Icon name="arrow" />
          </a>
        </p>
      </div>
    </section>
  );
}
