const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const targets = [
  'docs/session/2026-01-21_CODEX_REPORT_BACK_FINAL.md',
  'docs/session/2026-01-21_CODEX_REPORT_BACK_v2.md',
  'src/pages/PracticePage.tsx',
  'src/pages/TopicHub.tsx',
];

const replacements = {
  '\u0393\u00c7\u00aa': '...',
  '\u0393\u00c7\u00d6': "'",
  '\u0393\u00c7\u00f3': '-',
  '\u0393\u00c7\u00f4': '-',
  '\u0393\u00c7\u00f6': '-',
  '\u00e2\u0153\u2022': '-',
  '\u00e2\u20ac\u201c': '-',
  '\u00e2\u20ac\u201d': '-',
  '\u00e2\u20ac\u0153': '"',
  '\u00e2\u20ac\u009d': '"',
  '\u00e2\u20ac\u2122': "'",
  '\u00e2\u20ac\u00a6': '...',
  '\u00c2\u0020': ' ',
};

const summary = [];

const escapeSig = (value) =>
  value
    .split('')
    .map((ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`)
    .join('');

for (const rel of targets) {
  const abs = path.join(repoRoot, rel);
  if (!fs.existsSync(abs)) {
    continue;
  }
  let content = fs.readFileSync(abs, 'utf8');
  const counts = {};
  for (const [sig, replacement] of Object.entries(replacements)) {
    let index = content.indexOf(sig);
    while (index !== -1) {
      content = content.slice(0, index) + replacement + content.slice(index + sig.length);
      counts[sig] = (counts[sig] || 0) + 1;
      index = content.indexOf(sig, index + replacement.length);
    }
  }
  if (Object.keys(counts).length > 0) {
    fs.writeFileSync(abs, content, 'utf8');
  }
  summary.push({ file: rel, counts });
}

for (const item of summary) {
  if (Object.keys(item.counts).length === 0) {
    continue;
  }
  console.log(`Updated ${item.file}:`);
  for (const [sig, count] of Object.entries(item.counts)) {
    console.log(`  ${escapeSig(sig)} => ${count}`);
  }
}
