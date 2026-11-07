import { sourceDocs } from '../../data/DocsContent';
import { Command } from '../molecules/Command';
import { Note } from '../molecules/Note';

export function DocsContentContent() {
  return (
    <>
      <p className="doc-lead">
        Run commands from your Git project. Your installed version is the authority:
      </p>
      <Command code="agenttm help" />
      <div className="doc-table-scroll">
        <table>
          <caption>Common inspection and maintenance commands</caption>
          <thead>
            <tr>
              <th>Command</th>
              <th>Use it to</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['agenttm version', 'Confirm the running version and build.'],
              ['agenttm sessions', 'Find recorded session IDs and statuses.'],
              ['agenttm events SESSION_ID', 'Read recorded events in receipt order.'],
              [
                'agenttm operations SESSION_ID',
                'Inspect recorded operation coverage and observation links.',
              ],
              ['agenttm checkpoints SESSION_ID', 'List captured checkpoint IDs and partial flags.'],
              ['agenttm show CHECKPOINT_ID', 'Read the captured manifest and omissions.'],
              ['agenttm cat CHECKPOINT_ID PATH', 'Read a captured text file.'],
              ['agenttm diff CHECKPOINT_ID', 'Compare a capture with its parent.'],
              [
                'agenttm fork CHECKPOINT_ID --name review-copy',
                'Restore a checkpoint into an isolated Git worktree.',
              ],
              ['agenttm forks', 'List recorded restoration results.'],
              [
                'agenttm doctor',
                'Check supported project, history, object, and readiness diagnostics.',
              ],
              ['agenttm gc', 'Preview eligible unreferenced blobs without deleting them.'],
            ].map(([command, description]) => (
              <tr key={command}>
                <td>
                  <code>{command}</code>
                </td>
                <td>{description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Note>
        <code>SESSION_ID</code>, <code>CHECKPOINT_ID</code>, and <code>PATH</code> are placeholders
        in this reference table. Copy real IDs from <code>sessions</code> and{' '}
        <code>checkpoints</code>, and a captured path from <code>show</code>. These examples are not
        one block to paste.
      </Note>
      <p>
        Pagination, manual capture, explicit cleanup, and purge options are documented in the{' '}
        <a href={sourceDocs + 'cli.md'}>complete CLI reference</a>. Destructive actions require
        their own review; this page does not run commands for you.
      </p>
    </>
  );
}
