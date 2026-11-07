export function OnboardingContent({
  model: viewModel,
}: {
  model: {
    command: (text: string) => import('react/jsx-runtime').JSX.Element;
  };
}) {
  const { command } = viewModel;
  return (
    <>
      <p>Recorded activity and captured workspace states are related, distinct kinds of history.</p>
      <dl className="guide-terms">
        <dt>Session</dt>
        <dd>
          One AgentTM-managed CLI run or recorded desktop chat turn. Its events describe received
          activity.
        </dd>
        <dt>Event</dt>
        <dd>
          A prompt, message, command notification, lifecycle update, or capture notification. It may
          have no linked checkpoint.
        </dd>
        <dt>Checkpoint</dt>
        <dd>
          A captured set of eligible project files. It is a workspace observation, not a Git commit
          or an atomic snapshot.
        </dd>
        <dt>Changes</dt>
        <dd>
          A comparison with the checkpoint’s recorded parent. Baselines compare with an empty tree.
        </dd>
      </dl>
      <h2>Explore a recording</h2>
      <ol>
        <li>Open History and choose the session.</li>
        <li>Use event icons, filters, and checkpoint milestones to find the moment you need.</li>
        <li>Choose Inspect checkpoint to open its read-only files or comparisons.</li>
        <li>Open Details for technical metadata; expand omissions on partial captures.</li>
      </ol>
      <h2>Check stored history</h2>
      {command('agenttm doctor')}
      <p>
        Read the output carefully: storage integrity and Codex readiness are separate diagnostics.
      </p>
    </>
  );
}
