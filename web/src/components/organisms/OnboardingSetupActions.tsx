import { completionKey } from '../../data/Onboarding';
import type { DesktopBridge } from '../../types/Onboarding';

export function OnboardingSetupActions({
  model: viewModel,
}: {
  model: {
    setOpen: import('react').Dispatch<import('react').SetStateAction<boolean>>;
    step: number;
    setStep: import('react').Dispatch<import('react').SetStateAction<number>>;
    bridge: DesktopBridge | undefined;
    ready: boolean;
    busy: boolean;
  };
}) {
  const { setOpen, step, setStep, bridge, ready, busy } = viewModel;
  return (
    <footer className="setup-actions">
      <button onClick={() => setOpen(false)}>Explore history for now</button>
      <div>
        <button disabled={step === 0} onClick={() => setStep((n) => n - 1)}>
          Back
        </button>
        {step < 4 ? (
          <button className="primary-button" onClick={() => setStep((n) => n + 1)}>
            Continue
          </button>
        ) : (
          <button
            className="primary-button"
            disabled={!!bridge && (!ready || busy)}
            onClick={() => {
              try {
                localStorage.setItem(completionKey, 'done');
              } catch {}
              setOpen(false);
            }}
          >
            Finish setup
          </button>
        )}
      </div>
      {step === 4 && !!bridge && !ready && (
        <small>Check Codex readiness in step 4 before finishing, or explore history now.</small>
      )}
    </footer>
  );
}
