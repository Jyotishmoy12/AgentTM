import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const files = [];
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (['.git', '.test-work', '.agenttm', 'node_modules', 'bin', 'dist', 'test-results', 'ui'].includes(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (extname(path) === '.md') files.push(path);
  }
}
walk(root);
const problems = [];
function headingIDs(file) {
  const ids = new Set();
  const seen = new Map();
  const text = readFileSync(file, 'utf8').replace(/(?:```|~~~)[\s\S]*?(?:```|~~~)/g, '');
  for (const heading of text.matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm)) {
    const base = heading[1].toLowerCase().replace(/<[^>]*>/g, '').replace(/[^\p{L}\p{N}_ -]/gu, '').replace(/ /g, '-');
    const count = seen.get(base) ?? 0;
    ids.add(count ? `${base}-${count}` : base); seen.set(base, count + 1);
  }
  return ids;
}
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  if (text.includes('AgentTM' + '-demo')) problems.push(`${file}: outdated repository reference`);
  // Ignore fenced examples; validate inline links/images in actual documentation.
  const prose = text.replace(/(?:```|~~~)[\s\S]*?(?:```|~~~)/g, '');
  for (const match of prose.matchAll(/!?\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1].replace(/^<|>$/g, '');
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    const path = decodeURIComponent(target.split('#')[0]);
    const resolved = path ? resolve(dirname(file), path) : file;
    if (!existsSync(resolved)) problems.push(`${file}: missing ${target}`);
    else if (target.includes('#') && extname(resolved) === '.md') {
      const anchor = decodeURIComponent(target.slice(target.indexOf('#') + 1));
      if (anchor && !headingIDs(resolved).has(anchor)) problems.push(`${file}: missing heading ${target}`);
    }
  }
}
if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; }
else console.log(`Documentation links and repository references: PASS (${files.length} Markdown files)`);
