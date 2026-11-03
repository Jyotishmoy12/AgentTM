const button = document.getElementById('open');
const status = document.getElementById('status');

button.addEventListener('click', async () => {
  button.disabled = true;
  status.textContent = 'Choose a Git project in the folder picker…';
  try {
    const bridge = window.go?.main?.Desktop;
    if (!bridge?.ChooseProject) {
      throw new Error('The desktop bridge is not ready. Please try again.');
    }
    if (await bridge.ChooseProject()) {
      window.location.reload();
      return;
    }
    status.textContent = 'No project opened. Choose a folder when you are ready.';
  } catch (error) {
    status.textContent = String(error?.message || error);
  } finally {
    button.disabled = false;
  }
});
