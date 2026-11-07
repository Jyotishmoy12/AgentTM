import type { DesktopBridge } from '../../types/Onboarding';

export function OnboardingContent2({
  model: viewModel,
}: {
  model: {
    command: (text: string) => import('react/jsx-runtime').JSX.Element;
    bridge: DesktopBridge | undefined;
    setError: import('react').Dispatch<import('react').SetStateAction<string>>;
  };
}) {
  const { command, bridge, setError } = viewModel;
  return (
    <>
      <p>
        AgentTM needs the standalone Codex CLI. Having the editor extension alone does not guarantee
        that the desktop app can find it.
      </p>
      <h2>Install from PowerShell</h2>
      <p>If Node.js and npm are installed, run:</p>
      {command('npm.cmd install -g @openai/codex')}
      <p>
        If npm is missing, install Node.js with npm first, or follow the official Codex installation
        guide.
      </p>
      <button
        onClick={() =>
          bridge
            ? bridge
                .OpenCodexDocs()
                .catch(() =>
                  setError('Could not open documentation. Visit developers.openai.com/codex/cli.'),
                )
            : window.open(
                'https://developers.openai.com/codex/cli',
                '_blank',
                'noopener,noreferrer',
              )
        }
      >
        Open official Codex guide ↗
      </button>
      <h2>Confirm the command works</h2>
      {command('codex --version')}
      <p>
        If Windows says “not recognized”, Codex is not on PATH. Reopen PowerShell after installing.
        Fully close and relaunch AgentTM from that new terminal so it inherits the updated PATH.
      </p>
      <p>
        If Codex is found but the compatibility check fails, update it using the install command
        above and check again.
      </p>
    </>
  );
}
