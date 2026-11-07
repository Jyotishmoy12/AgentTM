import { resolve } from 'node:path';
import { checkDocumentation } from './lib/docs.mjs';

const root = resolve(import.meta.dirname, '..');
const { files, problems } = checkDocumentation(root);

if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `Documentation links and repository references: PASS (${files.length} Markdown files)`,
  );
}
