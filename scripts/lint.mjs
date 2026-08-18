import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const roots = ['api', 'public', 'scripts', 'test'];
const failures = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (/\.(js|mjs|css|html|json)$/.test(entry.name)) {
      const source = await readFile(file, 'utf8');
      source.split('\n').forEach((line, index) => {
        if (/\s+$/.test(line)) failures.push(`${file}:${index + 1} trailing whitespace`);
        if (line.includes('\t')) failures.push(`${file}:${index + 1} tab character`);
      });
    }
  }
}

for (const root of roots) await walk(root);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Lint checks passed.');
}
