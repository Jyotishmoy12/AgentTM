import { readFile, writeFile } from 'node:fs/promises';

const files = [
  ['React', 'react/LICENSE'], ['React DOM', 'react-dom/LICENSE'],
  ['Monaco Editor', 'monaco-editor/LICENSE'], ['Monaco Third Party Notices', 'monaco-editor/ThirdPartyNotices.txt'],
  ['DOMPurify', 'dompurify/LICENSE'], ['Marked', 'marked/LICENSE.md'],
];
const notices = [];
for (const [name, path] of files) {
  notices.push(`${name}\n${'='.repeat(name.length)}\n${await readFile(`node_modules/${path}`, 'utf8')}`);
}
notices.push(await readFile('../docs/crypto-notices.txt', 'utf8'));
await writeFile('../internal/server/ui/third-party-notices.txt', notices.join('\n\n').trimEnd() + '\n');
