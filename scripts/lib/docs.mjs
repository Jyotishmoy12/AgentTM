import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';

const excluded = new Set([
  '.git',
  '.test-work',
  '.agenttm',
  'node_modules',
  'bin',
  'dist',
  'test-results',
  'ui',
]);

function prose(text) {
  return text.replace(/(?:```|~~~)[\s\S]*?(?:```|~~~)/g, '');
}

function markdownFiles(directory, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) markdownFiles(path, files);
    else if (extname(path) === '.md') files.push(path);
  }
  return files;
}

function headingIDs(file) {
  const ids = new Set();
  const seen = new Map();
  for (const heading of prose(readFileSync(file, 'utf8')).matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm)) {
    const base = heading[1]
      .toLowerCase()
      .replace(/<[^>]*>/g, '')
      .replace(/[^\p{L}\p{N}_ -]/gu, '')
      .replace(/ /g, '-');
    const count = seen.get(base) ?? 0;
    ids.add(count ? `${base}-${count}` : base);
    seen.set(base, count + 1);
  }
  return ids;
}

function checkLinks(file, text, problems) {
  for (const match of prose(text).matchAll(/!?\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1].replace(/^<|>$/g, '');
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    const path = decodeURIComponent(target.split('#')[0]);
    const resolved = path ? resolve(dirname(file), path) : file;
    if (!existsSync(resolved)) {
      problems.push(`${file}: missing ${target}`);
    } else if (target.includes('#') && extname(resolved) === '.md') {
      const anchor = decodeURIComponent(target.slice(target.indexOf('#') + 1));
      if (anchor && !headingIDs(resolved).has(anchor)) {
        problems.push(`${file}: missing heading ${target}`);
      }
    }
  }
}

export function checkDocumentation(root) {
  const files = markdownFiles(root);
  const problems = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    if (text.includes('AgentTM' + '-demo')) {
      problems.push(`${file}: outdated repository reference`);
    }
    checkLinks(file, text, problems);
  }
  return { files, problems };
}
