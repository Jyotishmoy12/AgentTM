import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const excluded = new Set(['node_modules', 'dist', 'test-results', 'playwright-report', 'coverage']);
const extensions = /\.(?:tsx?|css|[cm]?js|json)$/;
const projects = process.argv.slice(2);
assert(
  projects.every((name) => ['web', 'website'].includes(name)),
  'Unknown frontend',
);

async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await files(filename)));
    else if (extensions.test(entry.name) && !entry.name.endsWith('lock.json'))
      result.push(filename);
  }
  return result;
}

for (const project of projects.length ? projects : ['web', 'website']) {
  const directory = path.join(root, project);
  const maintained = await files(directory);
  for (const filename of maintained) {
    const source = await readFile(filename, 'utf8');
    const relative = path.relative(directory, filename).replaceAll('\\', '/');
    const count = source.trimEnd().split('\n').length;
    assert(count <= 200, `${project}/${relative} has ${count} lines; maximum is 200`);
    if (!relative.startsWith('src/')) continue;
    assert(!source.includes('C:/dev/'), `Machine-specific import in ${relative}`);
    if (!relative.startsWith('src/handlers/')) {
      assert(
        !/\bfetch\s*\(|window\.go\b|navigator\.clipboard/.test(source),
        `Platform I/O must live in handlers: ${relative}`,
      );
    }
    if (/src\/components\/(atoms|molecules)\//.test(relative)) {
      assert(
        !/from ['"][^'"]*(?:organisms|templates|pages)\//.test(source),
        `Atomic dependency points upward: ${relative}`,
      );
    }
  }
  for (const layer of ['atoms', 'molecules', 'organisms', 'templates']) {
    assert(
      (await files(path.join(directory, 'src/components', layer))).length,
      `${project} is missing its ${layer} components`,
    );
  }
  console.log(
    `${project}: ${maintained.length} files checked; architecture and 200-line limit passed`,
  );
}
