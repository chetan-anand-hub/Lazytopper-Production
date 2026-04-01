const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const allowedExt = new Set(['.ts', '.tsx', '.js', '.cjs', '.mjs', '.json', '.md', '.txt', '.css', '.html', '.yml', '.yaml', '.ps1', '.sh']);
const excludedDirs = new Set(['node_modules', 'dist', 'build', '.next', '.git', 'coverage', '.cache', '.vite', '.turbo', 'out', '.vercel']);
const mojibakeRegex = /(?:\uFFFD|\u0393\u00C7|[\u00C2\u00C3\u00CE\u00CF\u00E2\u00F0][\u0080-\u00BF\u00C0-\u00FF\u2013-\u201F\u2020-\u2022\u2030\u2039\u203A\u20AC\u2122\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u02C6\u02DC])/u;
const repoRoot = path.resolve(__dirname, '..');

const tracked = execSync('git ls-files', { cwd: repoRoot, encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean);

const hits = [];

for (const rel of tracked) {
  const parts = rel.split(/[/\\]/);
  if (parts.some((part) => excludedDirs.has(part))) {
    continue;
  }
  const ext = path.extname(rel).toLowerCase();
  if (!allowedExt.has(ext)) {
    continue;
  }
  const abs = path.join(repoRoot, rel);
  let content;
  try {
    content = fs.readFileSync(abs, 'utf8');
  } catch (err) {
    continue;
  }
  const lines = content.split(/\r?\n/);
  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    const match = line.match(mojibakeRegex);
    if (match) {
      hits.push({ file: rel, line: idx + 1, sig: match[0], snippet: line.trim() });
    }
    if (hits.length >= 50) break;
  }
  if (hits.length >= 50) break;
}

if (hits.length > 0) {
  for (const hit of hits) {
    console.log(hit.file + ':' + hit.line + ':' + hit.sig + ':' + hit.snippet);
  }
  process.exitCode = 1;
} else {
  process.exitCode = 0;
}
