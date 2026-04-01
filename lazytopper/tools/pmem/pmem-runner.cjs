#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const EXTENSION_REPO_ROOT = 'C:\\Projects\\lazytopper\\tools\\project-memory-blackbox-ext';
const MAIN_REPO_ROOT = process.env.INIT_CWD || process.cwd();
const CRASH_DIR = process.env.PMEM_CRASH_DIR || 'C:\\Users\\Chetan\\OneDrive\\Desktop\\Lazytopper\\wayforward\\GPT Memory';
function exitWithMessage(message) {
  console.error(message);
  process.exit(1);
}

if (!fs.existsSync(EXTENSION_REPO_ROOT)) {
  exitWithMessage(`Project Memory Blackbox extension repo missing: ${EXTENSION_REPO_ROOT}`);
}

const command = process.argv[2];
if (!command) {
  exitWithMessage('Usage: pmem-runner.cjs <end-session|export-crashpack|mark-critical|compile-ext|npm-run-ext>');
}

function runNpm(args) {
  const result = spawnSync('npm', ['--prefix', EXTENSION_REPO_ROOT, ...args], {
    cwd: MAIN_REPO_ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  if (result.error) {
    console.error('Failed to spawn npm', result.error);
    process.exit(1);
  }
  process.exit(result.status === null ? 0 : result.status);
}

switch (command) {
  case 'end-session':
    runNpm(['run', 'pmem:end-session']);
    break;
  case 'open-session':
    runNpm(['run', 'pmem:open-session']);
    break;
  case 'export-crashpack':
    runNpm([
      'run',
      'pmem:export-crashpack',
      '--',
      '--repo',
      MAIN_REPO_ROOT,
      '--crashDir',
      CRASH_DIR,
      '--extensionRepo',
      EXTENSION_REPO_ROOT
    ]);
    break;
  case 'mark-critical':
    runNpm([
      'run',
      'pmem:mark-critical',
      '--',
      '--repo',
      MAIN_REPO_ROOT,
      '--crashDir',
      CRASH_DIR,
      '--extensionRepo',
      EXTENSION_REPO_ROOT
    ]);
    break;
  case 'compile-ext':
    runNpm(['run', 'compile']);
    break;
  case 'npm-run-ext':
    runNpm(['run']);
    break;
  default:
    exitWithMessage(`Unknown pmem-runner command: ${command}`);
}
