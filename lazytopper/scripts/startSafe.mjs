import fs from 'node:fs';
import { execSync } from 'node:child_process';

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

function tryRun(cmd) {
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (error) {
    console.warn(`[start:safe] WARN ${cmd} failed`);
  }
}

const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
if (status) {
  console.error('[start:safe] ERROR: Working tree not clean. Commit/stash first.');
  process.exit(2);
}

run('npm run blackbox:full');
run('npx tsc --noEmit');
run('npm run build');
tryRun('npm test');

console.log('[start:safe] OK');