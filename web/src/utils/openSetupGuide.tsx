export function openSetupGuide(step = 0) {
  window.dispatchEvent(new CustomEvent('agenttm:setup-guide', { detail: step }));
}
