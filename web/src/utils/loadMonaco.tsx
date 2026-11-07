let editorModule: Promise<typeof import('../monaco')> | null = null;

export function loadMonaco() {
  editorModule ??= import('../monaco');
  return editorModule;
}
