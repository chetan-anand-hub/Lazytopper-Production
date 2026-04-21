'use strict';

/**
 * fillPredictedQuestionSolutions.cjs
 *
 * Fills missing `solutionSteps` (and `finalAnswer` where absent) in:
 *  - the original three predicted-question TS files
 *  - all maths and science pack files under questionBanks/class10/
 *  - highlyProbableQuestions.ts (HPQ — uses `question:` field, not `questionText:`)
 *
 * Usage:
 *   node server/scripts/fillPredictedQuestionSolutions.cjs
 *   DRY_RUN=1 node server/scripts/fillPredictedQuestionSolutions.cjs
 *   FILL_ONLY_FILE=realNumbers.pack1 node server/scripts/fillPredictedQuestionSolutions.cjs
 *
 * Idempotent: questions that already have solutionSteps are skipped.
 * Safe to re-run after partial completion.
 */

const fs   = require('fs');
const path = require('path');
const { createGeminiClient } = require('../services/geminiClient.cjs');
const { resolveConfig }      = require('../services/serverConfig.cjs');

const DRY_RUN           = process.env.DRY_RUN === '1';
const BATCH_SIZE        = 10;
const DELAY_BETWEEN_MS  = 1200;
const GEMINI_MODEL      = process.env.FILL_MODEL || 'gemini-2.5-flash';
const MAX_ATTEMPTS      = 4;

// ---------------------------------------------------------------------------
// Build the full file list dynamically so new pack files are picked up auto.
// ---------------------------------------------------------------------------
const PACK_BASE = path.resolve(__dirname, '../../src/data/questionBanks/class10');

function buildPackFileSpecs(subdir, subject) {
  const dir = path.join(PACK_BASE, subdir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.ts'))
    .sort()
    .map(f => ({
      relativePath:   `../../src/data/questionBanks/class10/${subdir}/${f}`,
      subject,
      closingPattern: '\n  },',
      questionField:  'questionText',
    }));
}

const FILES = [
  {
    relativePath:   '../../src/data/predictedQuestions.ts',
    subject:        'Mathematics',
    closingPattern: '\n  },',
    questionField:  'questionText',
  },
  {
    relativePath:   '../../src/data/predictedQuestionsScience.ts',
    subject:        'Science',
    closingPattern: '\n  },',
    questionField:  'questionText',
  },
  {
    relativePath:   '../../src/data/predictedScienceQuestions.ts',
    subject:        'Science',
    closingPattern: '\n      },',
    questionField:  'questionText',
  },
  ...buildPackFileSpecs('maths', 'Mathematics'),
  ...buildPackFileSpecs('science', 'Science'),
  {
    relativePath:   '../../src/data/highlyProbableQuestions.ts',
    subject:        'Mathematics',
    closingPattern: '\n      },',
    questionField:  'question',
  },
];

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Escape a string for embedding inside a TypeScript/JS double-quoted string.
 * Handles backslashes, double-quotes, and literal newline/carriage-return/tab
 * characters so AI-generated text with literal whitespace never breaks syntax.
 */
function escapeStr(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g,  '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// ---------------------------------------------------------------------------
// Parse question metadata from raw TypeScript source text.
// Uses id-boundary scanning — no eval, no tsc.
// questionField: 'questionText' (pack files / predicted files) or 'question' (HPQ)
// ---------------------------------------------------------------------------
function extractQuestions(fileText, questionField = 'questionText') {
  const questions = [];
  const idRegex   = /\bid:\s*["']([\w-]+)["']/g;
  const allMatches = [...fileText.matchAll(idRegex)];

  for (let i = 0; i < allMatches.length; i++) {
    const m     = allMatches[i];
    const id    = m[1];
    const start = m.index;
    const end   = (i + 1 < allMatches.length) ? allMatches[i + 1].index : fileText.length;
    const body  = fileText.slice(start, end);

    const hasSolutionSteps = /\bsolutionSteps\s*:/.test(body);
    const hasFinalAnswer   = /\bfinalAnswer\s*:/.test(body);

    const marksM    = body.match(/\bmarks\s*:\s*(\d+)/);
    const kindM     = body.match(/\b(?:kind|type|format)\s*:\s*["']([\w-]+)["']/);
    const topicM    = body.match(/\b(?:topicKey|topic)\s*:\s*["']([\w\s]+)["']/);
    const subtopicM = body.match(/\bsubtopic\s*:\s*["']([\s\S]*?)["']/);

    // Extract the question text using the correct field name
    let questionText = '';
    const qfEsc = questionField.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const qtMulti    = body.match(new RegExp(`\\b${qfEsc}\\s*:\\s*\\n\\s+"([\\s\\S]*?)",\\s*\\n`));
    const qtInline   = body.match(new RegExp(`\\b${qfEsc}\\s*:\\s*"([\\s\\S]*?)",\\s*\\n`));
    const qtSingleLine = body.match(new RegExp(`\\b${qfEsc}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
    const qtTemplate = body.match(new RegExp(`\\b${qfEsc}\\s*:\\s*\`([\\s\\S]*?)\`,`));
    if (qtMulti)          questionText = qtMulti[1].replace(/\\n/g, '\n');
    else if (qtInline)    questionText = qtInline[1].replace(/\\n/g, '\n');
    else if (qtSingleLine) questionText = qtSingleLine[1].replace(/\\n/g, '\n');
    else if (qtTemplate)  questionText = qtTemplate[1].trim();

    // answer field
    let answer = '';
    const ansMulti    = body.match(/\banswer\s*:\s*\n\s+"([\s\S]*?)",\s*\n/);
    const ansInline   = body.match(/\banswer\s*:\s*"([\s\S]*?)",\s*\n/);
    const ansSingleLine = body.match(/\banswer\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const ansTemplate = body.match(/\banswer\s*:\s*`([\s\S]*?)`,/);
    if (ansMulti)         answer = ansMulti[1].replace(/\\n/g, '\n');
    else if (ansInline)   answer = ansInline[1].replace(/\\n/g, '\n');
    else if (ansSingleLine) answer = ansSingleLine[1].replace(/\\n/g, '\n');
    else if (ansTemplate) answer = ansTemplate[1].trim();

    questions.push({
      id, hasSolutionSteps, hasFinalAnswer,
      needsFill: !hasSolutionSteps || !hasFinalAnswer,
      marks:    marksM    ? Number(marksM[1]) : 2,
      kind:     kindM     ? kindM[1]          : 'Short',
      topicKey: topicM    ? topicM[1]         : '',
      subtopic: subtopicM ? subtopicM[1]      : '',
      questionText: questionText.slice(0, 400),
      answer:        answer.slice(0, 300),
    });
  }

  return questions;
}

// ---------------------------------------------------------------------------
// Apply patches to file text in a single pass.
// closingPattern: e.g. '\n  },' or '\n      },'
// Handles both multi-line objects (standard) and inline single-line objects.
// ---------------------------------------------------------------------------
function applyPatches(fileText, patches, closingPattern) {
  let result     = fileText;
  let patchCount = 0;

  const indentMatch   = closingPattern.match(/\n(\s*)/);
  const closingIndent = indentMatch ? indentMatch[1] : '  ';
  const fieldIndent   = closingIndent + '  ';
  const stepIndent    = closingIndent + '    ';

  for (const patch of patches) {
    const idStr = `id: "${patch.id}"`;
    const idStrJson = `"id": "${patch.id}"`;

    // Find the occurrence missing solutionSteps OR finalAnswer (handles duplicate IDs).
    // Supports both TS-style (id: "...") and JSON-style ("id": "...") for pack2 files.
    // Detects inline vs multi-line FIRST to avoid false-positive closingPattern matches.
    let idIdx = -1;
    let closeIdx = -1;
    let isInline = false;
    let blockMissingSteps = false;
    let blockMissingFinalAnswer = false;
    let searchFrom = 0;
    while (true) {
      let candidateIdx = result.indexOf(idStr, searchFrom);
      if (candidateIdx === -1) candidateIdx = result.indexOf(idStrJson, searchFrom);
      if (candidateIdx === -1) break;

      // Detect inline vs multi-line: an inline object has its closing `}` on the same line.
      const cLineEnd = result.indexOf('\n', candidateIdx);
      const cLineContent = cLineEnd !== -1 ? result.slice(candidateIdx, cLineEnd) : result.slice(candidateIdx);
      const cHasCloseOnLine = cLineContent.includes('}');

      let candidateClose = -1;
      let candidateIsInline = false;

      if (cHasCloseOnLine) {
        const lastClose = cLineContent.lastIndexOf('},');
        if (lastClose !== -1) {
          candidateClose = candidateIdx + lastClose;
          candidateIsInline = true;
        } else {
          const lastBrace = cLineContent.lastIndexOf('}');
          if (lastBrace !== -1) {
            candidateClose = candidateIdx + lastBrace;
            candidateIsInline = true;
          }
        }
      } else {
        candidateClose = result.indexOf(closingPattern, candidateIdx);
      }

      if (candidateClose === -1) break;

      const bodyEnd = candidateIsInline ? (cLineEnd !== -1 ? cLineEnd + 1 : candidateClose) : candidateClose;
      const body = result.slice(candidateIdx, bodyEnd);
      const hasSteps = body.includes('solutionSteps:');
      const hasFA    = body.includes('finalAnswer:');

      if (!hasSteps || !hasFA) {
        idIdx = candidateIdx;
        closeIdx = candidateClose;
        isInline = candidateIsInline;
        blockMissingSteps = !hasSteps;
        blockMissingFinalAnswer = !hasFA;
        break;
      }
      // This occurrence is already complete — look for a later duplicate
      searchFrom = candidateClose + 1;
    }

    if (idIdx === -1) {
      const anyOccurrence = result.indexOf(idStr) !== -1 || result.indexOf(idStrJson) !== -1;
      if (!anyOccurrence) {
        console.warn(`  [patch] NOT FOUND in file: ${patch.id}`);
      } else {
        console.log(`  [patch] SKIP (already patched): ${patch.id}`);
      }
      continue;
    }

    if (closeIdx === -1) {
      console.warn(`  [patch] Closing not found for: ${patch.id}`);
      continue;
    }

    // Build the insert string (only include fields that are actually missing)
    let insert = '';

    if (blockMissingSteps) {
      const stepsBlock = patch.solutionSteps
        .map(s => `${stepIndent}"${escapeStr(s)}",`)
        .join('\n');
      insert += `\n${fieldIndent}solutionSteps: [\n${stepsBlock}\n${fieldIndent}],`;
    }

    if (blockMissingFinalAnswer && patch.finalAnswer) {
      insert += `\n${fieldIndent}finalAnswer: "${escapeStr(patch.finalAnswer)}",`;
    }

    if (!insert) continue;

    if (isInline) {
      // For inline objects the last field has no trailing comma before `}`.
      // trimEnd() removes any trailing whitespace, then prepend `,` before insert.
      const beforeClose = result.slice(0, closeIdx).trimEnd();
      result = beforeClose + ',' + insert + '\n' + closingIndent + result.slice(closeIdx);
    } else {
      result = result.slice(0, closeIdx) + insert + result.slice(closeIdx);
    }

    patchCount++;
    console.log(`  [patch] ✓ ${patch.id}  (${patch.solutionSteps.length} steps)`);
  }

  return { result, patchCount };
}

// ---------------------------------------------------------------------------
// Call Gemini to generate solutions for a batch of questions.
// ---------------------------------------------------------------------------
async function generateBatch(batch, subject, gemini) {
  const stepGuide = [
    '1-mark MCQ or Assertion-Reasoning: 2–3 short steps',
    '2-mark Short: 3–4 steps',
    '3-mark Short: 4–5 steps',
    '4-mark Case-Based: 5–6 steps',
    '5-mark Long Answer: 6–8 steps',
  ].join('; ');

  const qList = batch.map((q, i) => ({
    n:            i + 1,
    id:           q.id,
    marks:        q.marks,
    kind:         q.kind,
    topic:        [q.topicKey, q.subtopic].filter(Boolean).join(' — '),
    questionText: q.questionText,
    answer:       q.answer,
  }));

  const prompt =
`You are a CBSE Class 10 ${subject} marking-scheme expert. For each question provide:
- solutionSteps: array of strings a student should write in their answer booklet to earn all marks
- finalAnswer: must match the "answer" field exactly (copy it verbatim)

Step-count guide: ${stepGuide}
Each step = one key action, formula, substitution, or conclusion (keep each under 120 chars).
For MCQ/Assertion-Reasoning: explain the reasoning, not just the label.
Use plain text only — no LaTeX, no markdown formatting inside strings.
Return ONLY a valid JSON array — nothing else before or after.

Subject: ${subject} (CBSE Class 10)
Questions:
${JSON.stringify(qList, null, 2)}

JSON output:
[{"id":"...","solutionSteps":["...","..."],"finalAnswer":"..."},...]`;

  const result = await gemini.callGemini(
    GEMINI_MODEL,
    [{ role: 'user', parts: [{ text: prompt }] }],
    { temperature: 0.3, maxOutputTokens: 8192 },
  );

  let parsed;
  const rawText = result.text || '';

  function repairJsonStrings(s) {
    let out = '';
    let inString = false;
    let escaped = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (escaped) {
        if (!'"\\/bfnrtu'.includes(c)) out += '\\';
        out += c;
        escaped = false;
      } else if (c === '\\') {
        out += c;
        escaped = true;
      } else if (c === '"') {
        out += c;
        inString = !inString;
      } else if (inString && c === '\n') {
        out += '\\n';
      } else if (inString && c === '\r') {
        // skip bare CR
      } else {
        out += c;
      }
    }
    return out;
  }

  function tryParse(s) {
    let cleaned = s.replace(/^[\s\S]*?```(?:json)?\s*/m, '').replace(/\s*```[\s\S]*$/m, '').trim();
    if (!cleaned.startsWith('[') && !cleaned.startsWith('{')) cleaned = s;
    cleaned = repairJsonStrings(cleaned);
    return JSON.parse(cleaned);
  }

  try {
    parsed = tryParse(rawText);
  } catch {
    const arrMatch = rawText.match(/\[[\s\S]*\]/);
    if (!arrMatch) throw new Error(`No JSON array in response: ${rawText.slice(0, 300)}`);
    try {
      parsed = tryParse(arrMatch[0]);
    } catch (e2) {
      throw new Error(e2.message);
    }
  }

  if (!Array.isArray(parsed)) throw new Error(`Expected array, got ${typeof parsed}`);
  return parsed;
}

// ---------------------------------------------------------------------------
// Process one file: extract gaps → call Gemini in batches → patch & write.
// ---------------------------------------------------------------------------
async function processFile(fileSpec, gemini) {
  const filePath  = path.resolve(__dirname, fileSpec.relativePath);
  const fileName  = path.basename(filePath);
  const qField    = fileSpec.questionField || 'questionText';

  const fileText0 = fs.readFileSync(filePath, 'utf8');
  const allQ0     = extractQuestions(fileText0, qField);
  // Include questions missing solutionSteps OR finalAnswer (or both)
  const gapQ      = allQ0.filter(q => q.needsFill);
  const noSteps   = allQ0.filter(q => !q.hasSolutionSteps).length;
  const noFA      = allQ0.filter(q => !q.hasFinalAnswer).length;

  console.log(`\n──────────────────────────────────────`);
  console.log(`File   : ${fileName}`);
  console.log(`Subject: ${fileSpec.subject}`);
  console.log(`Total  : ${allQ0.length}  |  Missing solutionSteps: ${noSteps}  |  Missing finalAnswer: ${noFA}  |  Need fill: ${gapQ.length}`);

  if (gapQ.length === 0) {
    console.log('✅ All questions already have solutions — nothing to do.');
    return { total: 0, success: 0, failed: 0 };
  }

  if (DRY_RUN) {
    console.log('[DRY RUN] Would generate solutions for:');
    gapQ.forEach(q => console.log(`  ${q.id}  (${q.marks}m ${q.kind})`));
    return { total: gapQ.length, success: 0, failed: 0 };
  }

  let successCount = 0;
  let failedCount  = 0;
  const totalBatches = Math.ceil(gapQ.length / BATCH_SIZE);

  for (let i = 0; i < gapQ.length; i += BATCH_SIZE) {
    const batch    = gapQ.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    process.stdout.write(`  Batch ${batchNum}/${totalBatches}: [${batch.map(q => q.id).join(', ')}] ... `);

    let attempt = 0;
    let batchResults = null;

    while (attempt < MAX_ATTEMPTS && !batchResults) {
      try {
        batchResults = await generateBatch(batch, fileSpec.subject, gemini);
      } catch (err) {
        attempt++;
        process.stdout.write(`\n    attempt ${attempt} failed: ${err.message.slice(0, 120)}\n    `);
        if (attempt < MAX_ATTEMPTS) await sleep(1500);
      }
    }

    // If batch failed, fall back to individual questions one by one
    if (!batchResults && batch.length > 1) {
      process.stdout.write(`\n  [fallback] Retrying ${batch.length} questions individually...\n`);
      batchResults = [];
      for (const q of batch) {
        let soloAttempt = 0;
        let soloResult = null;
        while (soloAttempt < MAX_ATTEMPTS && !soloResult) {
          try {
            const res = await generateBatch([q], fileSpec.subject, gemini);
            soloResult = res;
          } catch (err2) {
            soloAttempt++;
            process.stdout.write(`    [solo ${q.id}] attempt ${soloAttempt} failed: ${err2.message.slice(0,80)}\n`);
            if (soloAttempt < MAX_ATTEMPTS) await sleep(1200);
            else failedCount++;
          }
        }
        if (soloResult) batchResults.push(...soloResult);
        await sleep(800);
      }
      if (batchResults.length === 0) batchResults = null;
    } else if (!batchResults) {
      failedCount += batch.length;
    }

    if (batchResults) {
      const patches = [];
      for (const r of batchResults) {
        const orig = batch.find(q => q.id === r.id);
        if (!r.id || !Array.isArray(r.solutionSteps) || r.solutionSteps.length === 0) {
          process.stdout.write(`\n  [bad response] id=${r.id}\n`);
          failedCount++;
          continue;
        }
        patches.push({
          id:             r.id,
          solutionSteps:  r.solutionSteps,
          finalAnswer:    r.finalAnswer || (orig ? orig.answer : ''),
          hasFinalAnswer: orig ? orig.hasFinalAnswer : false,
        });
        successCount++;
      }

      if (patches.length > 0) {
        const currentText = fs.readFileSync(filePath, 'utf8');
        const { result: newText, patchCount } = applyPatches(currentText, patches, fileSpec.closingPattern);
        fs.writeFileSync(filePath, newText, 'utf8');
        console.log(`${patches.length} generated & saved (${patchCount} written)`);
      } else {
        console.log('0 usable results');
      }
    }

    if (i + BATCH_SIZE < gapQ.length) await sleep(DELAY_BETWEEN_MS);
  }

  return { total: gapQ.length, success: successCount, failed: failedCount };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  fillPredictedQuestionSolutions          ║');
  console.log(`║  DRY_RUN=${DRY_RUN ? 'YES' : 'NO '}  MODEL=${GEMINI_MODEL.padEnd(20)} ║`);
  console.log('╚══════════════════════════════════════════╝');

  const config = resolveConfig();

  if (config.STUB_MODE) {
    console.error('\nERROR: No Gemini key available.');
    console.error('Set API_KEY + AI_PROVIDER=gemini (direct, no markup), or configure Replit proxy.');
    process.exit(1);
  }

  const authLabel = config.HAS_DIRECT_KEY
    ? 'direct-key → Google (no markup ✓)'
    : config.HAS_REPLIT_PROXY
      ? 'replit-proxy (markup applies)'
      : 'NO auth — will fail';
  console.log(`\nGemini auth: ${authLabel}`);
  console.log(`Total file list: ${FILES.length} files`);

  const gemini = createGeminiClient(config);
  let totalQ = 0, totalOk = 0, totalFail = 0;

  const onlyFile = process.env.FILL_ONLY_FILE || '';
  const activeFiles = onlyFile
    ? FILES.filter(f => path.basename(f.relativePath).includes(onlyFile))
    : FILES;

  if (activeFiles.length === 0) {
    console.error(`\nERROR: FILL_ONLY_FILE="${onlyFile}" matched no files.`);
    process.exit(1);
  }

  console.log(`Active files: ${activeFiles.length}`);
  if (onlyFile) activeFiles.forEach(f => console.log('  ' + path.basename(f.relativePath)));

  for (const fileSpec of activeFiles) {
    const r = await processFile(fileSpec, gemini);
    totalQ    += r.total;
    totalOk   += r.success;
    totalFail += r.failed;
  }

  console.log('\n══════════════════════════════════════════');
  console.log(`Questions needing solutions : ${totalQ}`);
  console.log(`Successfully generated      : ${totalOk}`);
  console.log(`Failed (re-run to retry)    : ${totalFail}`);
  console.log('══════════════════════════════════════════');

  if (totalFail > 0) {
    console.log('\nScript is idempotent — re-run to retry any failures.');
    process.exit(1);
  }
  console.log('\nDone. Run `tsc --noEmit` in lazytopper/ to verify TypeScript is clean.');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
