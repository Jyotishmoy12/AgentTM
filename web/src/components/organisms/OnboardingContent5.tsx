export function OnboardingContent5({
  model: viewModel,
}: {
  model: {
    command: (text: string) => import('react/jsx-runtime').JSX.Element;
  };
}) {
  const { command } = viewModel;
  return (
    <>
      <p>
        In the desktop app, start a new Chat with Codex in Read only mode for a small first task.
        For terminal recording, use the installed agenttm CLI in the same Git project:
      </p>
      {command('agenttm run codex -- "Reply with a greeting."')}
      <p>
        Use your configured Codex model. If model access fails, choose a model available to your
        account with <code>--model MODEL</code>.
      </p>
      <h2>Inspect your recording</h2>
      <ol>
        <li>Wait for the terminal to print the completed session.</li>
        <li>Return here and click “Refresh history”.</li>
        <li>Select the session to inspect its timeline.</li>
        <li>Select a checkpoint to browse files or compare changes.</li>
        <li>
          Use “Restore checkpoint” to restore into a separate workspace after reviewing the
          destination.
        </li>
      </ol>
      <div className="setup-callout">
        Only AgentTM-managed CLI runs and desktop chats are recorded. Checkpoints are workspace
        observations; other programs can also change files between observations.
      </div>
      <p>You can reopen this guide anytime using “Setup guide”.</p>
    </>
  );
}
