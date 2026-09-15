import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const roots = ['src', 'examples', 'test', 'benchmarks'];
const files = [];

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await collect(path);
    } else if (path.endsWith('.js') || path.endsWith('.mjs')) {
      files.push(path);
    }
  }
}

for (const root of roots) {
  await collect(root);
}

for (const file of files) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--check', file], { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Syntax check failed for ${file}`));
    });
  });
}
