export function language(path: string): string {
  const extension = path.split('.').at(-1)?.toLowerCase();
  return (
    (
      {
        go: 'go',
        ts: 'typescript',
        tsx: 'typescript',
        js: 'javascript',
        jsx: 'javascript',
        json: 'json',
        md: 'markdown',
        py: 'python',
        rs: 'rust',
        cpp: 'cpp',
        h: 'cpp',
        css: 'css',
        html: 'html',
        sql: 'sql',
        sh: 'shell',
        yml: 'yaml',
        yaml: 'yaml',
      } as Record<string, string>
    )[extension ?? ''] ?? 'plaintext'
  );
}
