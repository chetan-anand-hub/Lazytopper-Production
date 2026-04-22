'use strict';

/**
 * annotateMarkSteps.cjs
 *
 * Adds CBSE mark annotations to every solutionStep in the question bank.
 *
 * Strict per-mark-band rules (per CBSE marking scheme convention):
 *   2-mark : exactly 2 steps → [1],[1]  OR  exactly 3 steps → [½],[½],[1]
 *   3-mark : exactly 3 steps, each [1]  (sum = 3)
 *   4-mark : exactly 3 steps → [2],[1],[1]  OR  exactly 4 steps → [1],[1],[1],[1]
 *   5-mark : exactly 4 steps → [2],[1],[1],[1]  OR exactly 5 steps → [1]×5
 *
 * Questions with step counts outside these bands are routed to Gemini,
 * which must return the correct number of fully-annotated steps.
 *
 * Usage:
 *   node server/scripts/annotateMarkSteps.cjs
 *   DRY_RUN=1 node server/scripts/annotateMarkSteps.cjs
 *   ONLY_FILE=predictedQuestions node server/scripts/annotateMarkSteps.cjs
 *   SKIP_AI=1 node server/scripts/annotateMarkSteps.cjs
 */

const fs   = require('fs');
const path = require('path');

const DRY_RUN   = process.env.DRY_RUN   === '1';
const SKIP_AI   = process.env.SKIP_AI   === '1';
const ONLY_FILE = process.env.ONLY_FILE || '';

const PACK_BASE = path.resolve(__dirname, '../../src/data/questionBanks/class10');
const DATA_BASE = path.resolve(__dirname, '../../src/data');

// ────────────────────────────────────────────────────────────────────────────
// File list
// ────────────────────────────────────────────────────────────────────────────
function makeSpec(filePath, questionField, closingPattern) {
  return { filePath, questionField: questionField || 'questionText', closingPattern: closingPattern || '\n  },' };
}

function buildFileList() {
  const list = [
    makeSpec(path.join(DATA_BASE, 'predictedQuestions.ts'),        'questionText', '\n  },'),
    makeSpec(path.join(DATA_BASE, 'predictedQuestionsScience.ts'), 'questionText', '\n  },'),
    makeSpec(path.join(DATA_BASE, 'highlyProbableQuestions.ts'),   'question',     '\n      },'),
  ];

  ['maths', 'science'].forEach(subdir => {
    const dir = path.join(PACK_BASE, subdir);
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).filter(f => f.endsWith('.ts')).sort().forEach(f => {
      list.push(makeSpec(path.join(dir, f), 'questionText', '\n  },'));
    });
  });
  return list;
}

// ────────────────────────────────────────────────────────────────────────────
// Mark distribution — strict CBSE bands only
// ────────────────────────────────────────────────────────────────────────────

/**
 * Target step count for each mark band when the current count is out of range.
 * Fat questions are consolidated to this count; thin questions need AI.
 */
const TARGET_STEPS = { 2: 3, 3: 3, 4: 4, 5: 5 };

/**
 * Returns an array of mark values for the target step count, given marks.
 * Returns null only for thin questions (stepCount < minimum).
 */
function getMarkValues(marks, stepCount) {
  if (marks === 2) {
    if (stepCount === 2) return [1, 1];
    if (stepCount === 3) return [0.5, 0.5, 1];
    return null; // thin — needs AI
  }
  if (marks === 3) {
    if (stepCount === 3) return [1, 1, 1];
    return null; // thin — needs AI
  }
  if (marks === 4) {
    if (stepCount === 3) return [2, 1, 1];
    if (stepCount === 4) return [1, 1, 1, 1];
    return null; // thin
  }
  if (marks === 5) {
    if (stepCount === 4) return [2, 1, 1, 1];
    if (stepCount === 5) return [1, 1, 1, 1, 1];
    return null; // thin
  }
  // Other mark bands: generic halves
  const total = marks * 2;
  const effective = Math.min(stepCount, total);
  if (effective !== stepCount) return null;
  const base = Math.floor(total / effective);
  const surplus = total % effective;
  return Array.from({ length: stepCount }, (_, i) =>
    (base + (i < surplus ? 1 : 0)) / 2
  );
}

/**
 * Whether step count is too large for the mark band (fat question).
 */
function isFat(marks, stepCount) {
  const minForBand = { 2: 2, 3: 3, 4: 3, 5: 4 };
  const maxForBand = { 2: 3, 3: 3, 4: 4, 5: 5 };
  return stepCount > (maxForBand[marks] || marks);
}

/**
 * Whether step count is too small for the mark band (thin question — needs AI).
 */
function isThin(marks, stepCount) {
  const minForBand = { 2: 2, 3: 3, 4: 3, 5: 4 };
  return stepCount < (minForBand[marks] || marks);
}

/**
 * Consolidate fat step arrays to targetCount by distributing steps into groups.
 * Returns array of merged step content strings.
 */
function consolidateSteps(stepContents, targetCount) {
  if (stepContents.length <= targetCount) return stepContents;

  const n = stepContents.length;
  const result = [];
  const baseSize = Math.floor(n / targetCount);
  const extra = n % targetCount;

  let idx = 0;
  for (let g = 0; g < targetCount; g++) {
    const size = baseSize + (g < extra ? 1 : 0);
    const group = stepContents.slice(idx, idx + size);
    // Join multi-step groups with separator; trim trailing punctuation before joining
    result.push(group.map(s => s.replace(/[;,]\s*$/, '')).join('; '));
    idx += size;
  }
  return result;
}

function formatMark(m) {
  if (m === 0.5) return '[½]';
  if (m === 1)   return '[1]';
  if (m === 1.5) return '[1½]';
  if (m === 2)   return '[2]';
  if (m === 2.5) return '[2½]';
  if (m === 3)   return '[3]';
  return `[${m}]`;
}

// ────────────────────────────────────────────────────────────────────────────
// Strip existing annotations (for re-processing)
// ────────────────────────────────────────────────────────────────────────────
/**
 * Remove trailing mark annotations from solutionStep strings in file text.
 * Matches patterns like: ` [1]"`, ` [½]"`, ` [1½]"`, ` [2]"`, ` [0]"` etc.
 */
function stripAllAnnotations(text) {
  return text.replace(/ \[(?:0|½|1½?|2½?|3½?|4½?|\d+(?:\.\d+)?)\](?=")/g, '');
}

// ────────────────────────────────────────────────────────────────────────────
// String escaping
// ────────────────────────────────────────────────────────────────────────────
function escapeStr(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g,  '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// ────────────────────────────────────────────────────────────────────────────
// Parse a question block — returns step positions relative to `block`
// ────────────────────────────────────────────────────────────────────────────
function parseBlock(block) {
  const marksM = block.match(/\bmarks\s*:\s*(\d+)/);
  if (!marksM) return null;
  const marks = Number(marksM[1]);
  if (marks === 1) return null; // skip MCQ

  const stepsKeyPos = block.indexOf('solutionSteps:');
  if (stepsKeyPos === -1) return null;

  const arrStart = block.indexOf('[', stepsKeyPos);
  if (arrStart === -1) return null;

  let depth = 0, arrEnd = -1;
  for (let i = arrStart; i < block.length; i++) {
    if (block[i] === '[') depth++;
    else if (block[i] === ']') { depth--; if (depth === 0) { arrEnd = i; break; } }
  }
  if (arrEnd === -1) return null;

  const arrContent = block.slice(arrStart + 1, arrEnd);

  const steps = [];
  const stepRe = /"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = stepRe.exec(arrContent)) !== null) {
    steps.push({
      content:    m[1],
      openQuote:  arrStart + 1 + m.index,
      closeQuote: arrStart + 1 + m.index + m[0].length - 1,
    });
  }

  if (steps.length === 0) return null;

  // Check if already annotated — at least one step ending with a bracket
  const annotRe = /\[(?:0|½|1½?|2½?|3½?|\d+(?:\.\d+)?)\]\s*$/;
  const annotatedSteps = steps.filter(s => annotRe.test(s.content));
  if (annotatedSteps.length === steps.length) {
    return { marks, alreadyAnnotated: true, steps, arrStart, arrEnd };
  }

  return { marks, alreadyAnnotated: false, steps, arrStart, arrEnd };
}

// ────────────────────────────────────────────────────────────────────────────
// Annotate one file's text (mechanical pass only)
// ────────────────────────────────────────────────────────────────────────────
/**
 * Returns { newText, annotatedCount, aiIds }
 *   annotatedCount : questions mechanically annotated this pass
 *   aiIds          : questions whose step count is outside the valid band
 */
function annotateFileText(text) {
  // Strip any existing annotations first so we start clean
  let result = stripAllAnnotations(text);
  let annotatedCount = 0;
  const aiIds = [];

  const idRe = /\bid:\s*["']([\w-]+)["']/g;

  // Re-compute positions against stripped result
  const strippedMatches = [...result.matchAll(idRe)];

  for (let i = strippedMatches.length - 1; i >= 0; i--) {
    const m          = strippedMatches[i];
    const qId        = m[1];
    const blockStart = m.index;
    const blockEnd   = i + 1 < strippedMatches.length ? strippedMatches[i + 1].index : result.length;

    const block  = result.slice(blockStart, blockEnd);
    const parsed = parseBlock(block);
    if (!parsed) continue;
    if (parsed.alreadyAnnotated) continue;

    const { marks, steps } = parsed;

    if (isThin(marks, steps.length)) {
      // Too few steps — route to AI
      aiIds.push({ id: qId, marks, stepCount: steps.length });
      continue;
    }

    // Determine final step contents (consolidate if fat)
    const rawContents = steps.map(s => s.content);
    let finalContents = rawContents;
    if (isFat(marks, steps.length)) {
      const target = TARGET_STEPS[marks] || marks;
      finalContents = consolidateSteps(rawContents, target);
    }

    const markValues = getMarkValues(marks, finalContents.length);
    if (markValues === null) {
      // Shouldn't happen after consolidation, but safety fallback
      aiIds.push({ id: qId, marks, stepCount: steps.length });
      continue;
    }

    // Rebuild the solutionSteps array in the block
    // Detect indentation from existing steps
    const stepsKeyPos = block.indexOf('solutionSteps:');
    const arrStart    = block.indexOf('[', stepsKeyPos);
    let depth = 0, arrEnd = -1;
    for (let k = arrStart; k < block.length; k++) {
      if (block[k] === '[') depth++;
      else if (block[k] === ']') { depth--; if (depth === 0) { arrEnd = k; break; } }
    }

    const arrContentSnip = block.slice(arrStart + 1, arrEnd);
    const indentM   = arrContentSnip.match(/\n(\s+)"/);
    const stepIndent = indentM ? indentM[1] : '      ';
    const closing   = stepIndent.replace(/  $/, '');

    const newArrContent =
      '\n' +
      finalContents.map((s, j) => `${stepIndent}"${escapeStr(s)} ${formatMark(markValues[j])}",`).join('\n') +
      '\n' + closing;

    const newBlock =
      block.slice(0, arrStart + 1) + newArrContent + block.slice(arrEnd);

    result = result.slice(0, blockStart) + newBlock + result.slice(blockEnd);
    annotatedCount++;
  }

  return { newText: result, annotatedCount, aiIds };
}

// ────────────────────────────────────────────────────────────────────────────
// AI fix for questions with wrong step counts
// ────────────────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fixWithAI(aiIds, fileText, fileSpec, gemini) {
  if (aiIds.length === 0) return { newText: fileText, fixedCount: 0 };

  const GEMINI_MODEL = process.env.FILL_MODEL || 'gemini-2.5-flash';
  const BATCH_SIZE = 6;
  let result = fileText;
  let fixedCount = 0;

  console.log(`  → ${aiIds.length} questions need AI step-count fix`);

  const stepGuide = {
    2: '2 or 3 steps. 2-step: each [1]. 3-step: [½],[½],[1] (sum=2)',
    3: 'exactly 3 steps, each [1] (sum=3)',
    4: '3 or 4 steps. 3-step: [2],[1],[1]. 4-step: each [1] (sum=4)',
    5: '4 or 5 steps. 4-step: [2],[1],[1],[1]. 5-step: each [1] (sum=5)',
  };

  function getQuestionContext(id) {
    const idRe = new RegExp(`\\bid:\\s*["']${id.replace(/-/g, '[-]')}["']`);
    const idMatch = result.match(idRe);
    if (!idMatch) return null;
    const start = idMatch.index;
    const nextId = result.slice(start + 1).match(/\bid:\s*["'][\w-]+["']/);
    const end = nextId ? start + 1 + nextId.index : result.length;
    const block = result.slice(start, end);

    const marksM    = block.match(/\bmarks\s*:\s*(\d+)/);
    const topicM    = block.match(/\b(?:topicKey|topic)\s*:\s*["']([\w\s&]+)["']/);
    const subtopicM = block.match(/\bsubtopic\s*:\s*["']([\s\S]*?)["']/);
    const answerM   = block.match(/\b(?:finalAnswer|answer)\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const kindM     = block.match(/\b(?:kind|type)\s*:\s*["']([\w-]+)["']/);

    const qField = fileSpec.questionField;
    const qtRe   = new RegExp(`\\b${qField}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's');
    const qtM    = block.match(qtRe);
    const questionText = qtM ? qtM[1].replace(/\\n/g, '\n').slice(0, 500) : '';

    // Extract existing steps for context
    const stepsKeyPos = block.indexOf('solutionSteps:');
    let existingSteps = [];
    if (stepsKeyPos !== -1) {
      const arrStart = block.indexOf('[', stepsKeyPos);
      if (arrStart !== -1) {
        let depth = 0, arrEnd = -1;
        for (let i = arrStart; i < block.length; i++) {
          if (block[i] === '[') depth++;
          else if (block[i] === ']') { depth--; if (depth === 0) { arrEnd = i; break; } }
        }
        if (arrEnd !== -1) {
          const arrContent = block.slice(arrStart + 1, arrEnd);
          const stepRe = /"((?:[^"\\]|\\.)*)"/g;
          let m;
          while ((m = stepRe.exec(arrContent)) !== null) existingSteps.push(m[1]);
        }
      }
    }

    const marks = marksM ? Number(marksM[1]) : 2;
    return {
      id,
      marks,
      kind: kindM?.[1] || 'Short',
      topic: [topicM?.[1], subtopicM?.[1]].filter(Boolean).join(' — '),
      questionText: questionText.slice(0, 400),
      answer: (answerM?.[1] || '').slice(0, 300),
      existingSteps: existingSteps.slice(0, 10),
      requiredSteps: stepGuide[marks] || `${marks} steps summing to ${marks}`,
    };
  }

  function repairJsonStrings(s) {
    let out = '', inString = false, escaped = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (escaped) {
        if (!'"\\/bfnrtu'.includes(c)) out += '\\';
        out += c; escaped = false;
      } else if (c === '\\') { out += c; escaped = true; }
      else if (c === '"') { out += c; inString = !inString; }
      else if (inString && c === '\n') out += '\\n';
      else if (inString && c === '\r') { /* skip */ }
      else out += c;
    }
    return out;
  }

  async function callGemini(batch) {
    const items = batch.map((q, idx) => ({
      n: idx + 1,
      id: q.id,
      marks: q.marks,
      topic: q.topic,
      questionText: q.questionText,
      answer: q.answer,
      existingSteps: q.existingSteps,
      requiredSteps: q.requiredSteps,
    }));

    const prompt =
`You are a CBSE Class 10 marking-scheme expert.

For each question, rewrite solutionSteps so that:
- The step count and mark annotations match "requiredSteps" EXACTLY.
- Allowed mark annotations: [½], [1], [2] only — NO [0], NO [1½], NO [2½].
- The marks inside [...] sum exactly to the question's marks value.
- Each step must end with a mark annotation like [1] or [½] or [2].
- Keep each step under 120 characters of plain text (no LaTeX, no markdown).
- Use the existing steps as working content — condense or split them if needed.
- Return ONLY valid JSON: [{ "id": "...", "solutionSteps": ["step [mark]", ...] }]

Questions:
${JSON.stringify(items, null, 2)}

JSON output:`;

    const res = await gemini.callGemini(
      GEMINI_MODEL,
      [{ role: 'user', parts: [{ text: prompt }] }],
      { temperature: 0.25, maxOutputTokens: 8192 },
    );

    const raw = res.text || '';
    function tryParse(s) {
      let c = s.replace(/^[\s\S]*?```(?:json)?\s*/m, '').replace(/\s*```[\s\S]*$/m, '').trim();
      if (!c.startsWith('[') && !c.startsWith('{')) c = s;
      return JSON.parse(repairJsonStrings(c));
    }

    let parsed;
    try { parsed = tryParse(raw); }
    catch {
      const arrM = raw.match(/\[[\s\S]*\]/);
      if (!arrM) throw new Error(`No JSON array: ${raw.slice(0, 200)}`);
      parsed = tryParse(arrM[0]);
    }
    if (!Array.isArray(parsed)) throw new Error(`Expected array, got ${typeof parsed}`);
    return parsed;
  }

  function replaceSolutionSteps(text, id, newSteps) {
    const idRe = new RegExp(`\\bid:\\s*["']${id.replace(/-/g, '[-]')}["']`);
    const idMatch = text.match(idRe);
    if (!idMatch) { console.warn(`  [AI] id not found: ${id}`); return text; }

    const start = idMatch.index;
    const nextIdM = text.slice(start + 1).match(/\bid:\s*["'][\w-]+["']/);
    const end = nextIdM ? start + 1 + nextIdM.index : text.length;
    const block = text.slice(start, end);

    const stepsKeyPos = block.indexOf('solutionSteps:');
    if (stepsKeyPos === -1) return text;
    const arrStart = block.indexOf('[', stepsKeyPos);
    if (arrStart === -1) return text;
    let depth = 0, arrEnd = -1;
    for (let i = arrStart; i < block.length; i++) {
      if (block[i] === '[') depth++;
      else if (block[i] === ']') { depth--; if (depth === 0) { arrEnd = i; break; } }
    }
    if (arrEnd === -1) return text;

    const arrContentSnip = block.slice(arrStart + 1, arrEnd);
    const indentM = arrContentSnip.match(/\n(\s+)"/);
    const stepIndent = indentM ? indentM[1] : '      ';

    const newArrContent = '\n' + newSteps.map(s => `${stepIndent}"${escapeStr(s)}",`).join('\n') + '\n' + stepIndent.replace(/  $/, '');
    const newBlock = block.slice(0, arrStart + 1) + newArrContent + block.slice(arrEnd);

    return text.slice(0, start) + newBlock + text.slice(end);
  }

  for (let i = 0; i < aiIds.length; i += BATCH_SIZE) {
    const batch = aiIds.slice(i, i + BATCH_SIZE);
    const contexts = batch.map(t => getQuestionContext(t.id)).filter(Boolean);
    if (contexts.length === 0) continue;

    process.stdout.write(`  [AI fix] batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(aiIds.length / BATCH_SIZE)}: [${contexts.map(c => c.id).join(', ')}] ... `);

    let batchResults = null;
    for (let attempt = 0; attempt < 3 && !batchResults; attempt++) {
      try {
        batchResults = await callGemini(contexts);
      } catch (err) {
        process.stdout.write(`\n    attempt ${attempt + 1} failed: ${err.message.slice(0, 100)}\n    `);
        if (attempt < 2) await sleep(1500);
      }
    }

    if (!batchResults) {
      console.log('FAILED (skipping batch)');
      continue;
    }

    let batchOk = 0;
    for (const r of batchResults) {
      if (!r.id || !Array.isArray(r.solutionSteps) || r.solutionSteps.length === 0) continue;
      result = replaceSolutionSteps(result, r.id, r.solutionSteps);
      fixedCount++;
      batchOk++;
    }
    console.log(`OK (${batchOk}/${contexts.length} fixed)`);

    if (i + BATCH_SIZE < aiIds.length) await sleep(1000);
  }

  return { newText: result, fixedCount };
}

// ────────────────────────────────────────────────────────────────────────────
// Process one file
// ────────────────────────────────────────────────────────────────────────────
async function processFile(fileSpec, gemini) {
  const { filePath } = fileSpec;
  const fileName = path.basename(filePath);

  if (!fs.existsSync(filePath)) {
    console.log(`\nSKIP (file not found): ${fileName}`);
    return;
  }

  console.log(`\n── ${fileName}`);
  const original = fs.readFileSync(filePath, 'utf8');

  // Phase 1: strip existing annotations + mechanical re-annotation
  const { newText: afterAnnotation, annotatedCount, aiIds } = annotateFileText(original);
  console.log(`   Mechanical: ${annotatedCount}  |  Need AI: ${aiIds.length}`);

  let finalText = afterAnnotation;

  // Phase 2: AI fix for wrong-step-count questions
  if (aiIds.length > 0 && !SKIP_AI && gemini) {
    const { newText: afterAI, fixedCount } =
      await fixWithAI(aiIds, finalText, fileSpec, gemini);
    console.log(`   AI fixed: ${fixedCount}/${aiIds.length}`);

    // Re-run mechanical annotation on AI output
    const { newText: reannotated, annotatedCount: reCount, aiIds: remaining } =
      annotateFileText(afterAI);
    if (reCount > 0) console.log(`   Re-annotated after AI: ${reCount}`);
    if (remaining.length > 0) console.warn(`   Still needs AI: ${remaining.length} (step count still wrong after AI)`);
    finalText = reannotated;
  } else if (aiIds.length > 0 && SKIP_AI) {
    console.log(`   Skipping AI (SKIP_AI=1). ${aiIds.length} questions left unannotated.`);
  }

  if (DRY_RUN) {
    console.log(`   [DRY RUN] Would write ${filePath}`);
    return;
  }

  if (finalText === original) {
    console.log('   No changes needed.');
    return;
  }

  fs.writeFileSync(filePath, finalText, 'utf8');
  console.log(`   ✓ Written.`);
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  annotateMarkSteps — CBSE mark annotation        ║');
  console.log(`║  DRY_RUN=${DRY_RUN ? 'YES' : 'NO '}  SKIP_AI=${SKIP_AI ? 'YES' : 'NO '}                    ║`);
  console.log('╚══════════════════════════════════════════════════╝');

  let gemini = null;
  if (!SKIP_AI) {
    try {
      const { resolveConfig }      = require('../services/serverConfig.cjs');
      const { createGeminiClient } = require('../services/geminiClient.cjs');
      const config = resolveConfig();
      if (!config.STUB_MODE) {
        gemini = createGeminiClient(config);
        console.log('Gemini: available');
      } else {
        console.log('Gemini: not available (STUB_MODE)');
      }
    } catch (e) {
      console.log('Gemini: failed to initialize —', e.message);
    }
  }

  const allFiles = buildFileList();
  const activeFiles = ONLY_FILE
    ? allFiles.filter(f => path.basename(f.filePath).includes(ONLY_FILE))
    : allFiles;

  console.log(`\nFiles to process: ${activeFiles.length}`);

  for (const spec of activeFiles) {
    await processFile(spec, gemini);
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log('Done. Run `tsc --noEmit` to verify TypeScript is clean.');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
