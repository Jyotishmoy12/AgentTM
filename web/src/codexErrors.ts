// Unwrap App Server errors that contain an API error JSON inside `message`.
// Raw error payloads remain in recorded history; the chat displays useful text.
export function codexError(raw: string): { title: string; detail: string; action: string } {
  let detail = raw;
  for (let depth = 0; depth < 6; depth++) {
    const start = detail.indexOf('{');
    const candidate = start >= 0 ? detail.slice(start) : detail;
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (!parsed || typeof parsed !== 'object') break;
      const record = parsed as Record<string, unknown>;
      const nested =
        record.error && typeof record.error === 'object'
          ? (record.error as Record<string, unknown>)
          : record;
      if (typeof nested.message !== 'string' || nested.message === detail) break;
      detail = nested.message;
    } catch {
      break;
    }
  }
  if (
    /model_not_found|model.*(not supported|not found|do not have access|does not exist)/i.test(
      raw + ' ' + detail,
    )
  ) {
    return {
      title: 'Choose a different model',
      detail,
      action:
        'Select a model from the picker, then send your message again. Your Codex configuration has not been changed.',
    };
  }
  return {
    title: 'Codex could not finish this turn',
    detail,
    action: 'Check the message above, then try again.',
  };
}
