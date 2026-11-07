import { useEffect, useState } from 'react';
import { message } from '../api';
import { completionKey, steps } from '../data/Onboarding';
import { desktopBridge } from '../handlers/native';
import type { Setup } from '../types/Onboarding';

export function useOnboardingState() {
  const bridge = desktopBridge();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [checkedAt, setCheckedAt] = useState('');
  useEffect(() => {
    const show = (event: Event) => {
      const value = (event as CustomEvent).detail;
      setStep(Number.isInteger(value) && value >= 0 && value < steps.length ? value : 0);
      setOpen(true);
      void check();
    };
    window.addEventListener('agenttm:setup-guide', show);
    return () => window.removeEventListener('agenttm:setup-guide', show);
  }, []);
  async function check() {
    if (!bridge) return;
    setBusy(true);
    setError('');
    try {
      const result = await bridge.CheckSetup();
      setSetup(result);
      setCheckedAt(new Date().toLocaleTimeString());
      return result;
    } catch (e) {
      setSetup(null);
      setError('Could not check your setup: ' + message(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!bridge) return;
    let disposed = false;
    check().then((result) => {
      if (disposed) return;
      let completed = false;
      try {
        completed = localStorage.getItem(completionKey) === 'done';
      } catch {}
      if (!completed || result?.state !== 'ready') setOpen(true);
    });
    return () => {
      disposed = true;
    };
  }, [bridge]);
  return {
    bridge,
    open,
    setOpen,
    step,
    setStep,
    setup,
    busy,
    error,
    setError,
    copied,
    setCopied,
    checkedAt,
    check,
  };
}
