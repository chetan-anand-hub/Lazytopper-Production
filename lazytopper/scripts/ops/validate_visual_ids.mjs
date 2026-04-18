/**
 * validate_visual_ids.mjs — CI guard for diagram-heavy pack files.
 *
 * Asserts: every B/C/D/E question in the 42 targeted pack files that carries
 * a `visualExplainerId` points to a registered entry in visualConceptRegistry.ts.
 *
 * NOTE: Not every B-E question is required to have a visualExplainerId.
 * Task #336 intentionally removed IDs from pure calculation questions.
 * This guard only catches INVALID IDs (present but not in the registry).
 *
 * Usage:  node lazytopper/scripts/ops/validate_visual_ids.mjs
 * Exit 0 = all OK, Exit 1 = invalid IDs found.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LAZYTOPPER = join(__dirname, '..', '..');
const BANK_DIR   = join(LAZYTOPPER, 'src', 'data', 'questionBanks', 'class10');

const TARGETED_PACKS = [
  // Original 34 packs (Task #334)
  'maths/triangles.pack2.ts','maths/triangles.pack3.ts',
  'maths/circles.pack1.ts','maths/circles.pack2.ts',
  'maths/trigonometry.pack2.ts','maths/trigonometry.pack3.ts',
  'maths/coordinateGeometry.pack1.ts','maths/coordinateGeometry.pack2.ts',
  'maths/areasRelatedToCircles.pack1.ts','maths/areasRelatedToCircles.pack2.ts',
  'science/light.pack1.ts','science/light.pack2.ts',
  'science/humanEyeAndColourfulWorld.pack1.ts','science/humanEyeAndColourfulWorld.pack2.ts',
  'science/lifeProcesses.pack1.ts','science/lifeProcesses.pack2.ts',
  'science/controlAndCoordination.pack1.ts','science/controlAndCoordination.pack2.ts',
  'science/reproduction.pack1.ts','science/reproduction.pack2.ts',
  'science/heredity.pack1.ts','science/heredity.pack2.ts',
  'science/electricity.pack1.ts','science/electricity.pack2.ts',
  'science/magneticEffects.pack1.ts','science/magneticEffects.pack2.ts',
  'science/chemicalReactions.pack1.ts','science/chemicalReactions.pack2.ts',
  'science/acidsBasesSalts.pack1.ts','science/acidsBasesSalts.pack2.ts',
  'science/metalsNonMetals.pack1.ts','science/metalsNonMetals.pack2.ts',
  'science/carbonCompounds.pack1.ts','science/carbonCompounds.pack2.ts',
  // 8 new packs added in Task #335
  'maths/surfaceAreasVolumes.pack1.ts','maths/surfaceAreasVolumes.pack2.ts',
  'maths/statistics.pack1.ts','maths/statistics.pack2.ts',
  'maths/polynomials.pack1.ts','maths/polynomials.pack2.ts',
  'maths/probability.pack1.ts','maths/probability.pack2.ts',
  // 8 new packs added in Task #342
  'maths/arithmeticProgression.pack1.ts','maths/arithmeticProgression.pack2.ts',
  'maths/quadraticEquations.pack1.ts','maths/quadraticEquations.pack2.ts',
  'maths/realNumbers.pack1.ts','maths/realNumbers.pack2.ts',
  'maths/pairOfLinearEquations.pack1.ts','maths/pairOfLinearEquations.pack2.ts',
];

/** Mirrors the makeId() function in visualConceptRegistry.ts */
function makeId(subject, chapter, concept) {
  return `${subject}-${chapter}-${concept}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Parse all c("subject","chapter","concept",...) calls from the registry
 * and compute the corresponding IDs using the same makeId() logic.
 */
function extractRegistryIds() {
  const src = readFileSync(
    join(LAZYTOPPER, 'src', 'data', 'visualConceptRegistry.ts'),
    'utf-8'
  );
  const ids = new Set();
  // Match c("subject", "chapter", "concept", ...) — allow single or double quotes
  const cCallRe = /\bc\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/g;
  let m;
  while ((m = cCallRe.exec(src)) !== null) {
    const [, subject, chapter, concept] = m;
    ids.add(makeId(subject, chapter, concept));
  }
  return ids;
}

/**
 * Split source into per-question chunks by finding every occurrence of an
 * id field pattern and slicing between consecutive occurrences.
 * This avoids cross-question regex bleed-through when arrays are present.
 */
function findBEQuestions(src) {
  const questions = [];
  const idRe = /(?:"id"|id):\s*"([A-Z][^"]+)"/g;
  const positions = [];
  let m;
  while ((m = idRe.exec(src)) !== null) {
    positions.push({ id: m[1], start: m.index });
  }
  for (let i = 0; i < positions.length; i++) {
    const { id, start } = positions[i];
    const end = i + 1 < positions.length ? positions[i + 1].start : src.length;
    const chunk = src.slice(start, end);
    const sectionMatch = chunk.match(/(?:"section"|section):\s*"([B-E])"/);
    if (!sectionMatch) continue;
    const vidMatch = chunk.match(/(?:"visualExplainerId"|visualExplainerId):\s*"([^"]+)"/);
    questions.push({ id, vid: vidMatch ? vidMatch[1] : null });
  }
  return questions;
}

const registryIds = extractRegistryIds();
console.log(`Registry: ${registryIds.size} valid visual IDs loaded.\n`);

let totalChecked = 0;
let totalWithId = 0;
let failures = 0;
const report = [];

for (const rel of TARGETED_PACKS) {
  const src = readFileSync(join(BANK_DIR, rel), 'utf-8');
  const questions = findBEQuestions(src);
  let packFail = 0;
  for (const { id, vid } of questions) {
    totalChecked++;
    if (!vid) continue; // No ID is fine — Task #336 intentionally removed IDs from calculation-only questions
    totalWithId++;
    if (!registryIds.has(vid)) {
      report.push(`  INVALID visualExplainerId "${vid}": [${rel}] ${id}`);
      packFail++;
      failures++;
    }
  }
  const status = packFail === 0 ? '✅' : `❌ (${packFail} issues)`;
  console.log(`${status}  ${rel} (${questions.length} B-E questions, ${questions.filter(q => q.vid).length} with ID)`);
}

console.log('\n──────────────────────────────────────────────────────────');
console.log(`Checked ${totalChecked} B-E questions across ${TARGETED_PACKS.length} packs.`);
console.log(`${totalWithId} questions carry a visualExplainerId (${totalChecked - totalWithId} intentionally without).`);

if (failures === 0) {
  console.log('✅  All present visualExplainerIds are valid.');
  process.exit(0);
} else {
  console.log(`❌  ${failures} INVALID IDs found:\n${report.join('\n')}`);
  process.exit(1);
}
