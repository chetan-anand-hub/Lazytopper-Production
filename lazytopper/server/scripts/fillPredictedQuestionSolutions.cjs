'use strict';

/**
 * fillPredictedQuestionSolutions.cjs
 *
 * Fills missing `solutionSteps` (and `finalAnswer` where absent) in all three
 * predicted-question TypeScript source files by calling Gemini with CBSE
 * marking-scheme prompts.
 *
 * Usage:
 *   node server/scripts/fillPredictedQuestionSolutions.cjs
 *   DRY_RUN=1 node server/scripts/fillPredictedQuestionSolutions.cjs
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

const FILES = [
  {
    relativePath:   '../../src/data/predictedQuestions.ts',
    subject:        'Mathematics',
    closingPattern: '\n  },',
  },
  {
    relativePath:   '../../src/data/predictedQuestionsScience.ts',
    subject:        'Science',
    closingPattern: '\n  },',
  },
  {
    relativePath:   '../../src/data/predictedScienceQuestions.ts',
    subject:        'Science',
    closingPattern: '\n      },',
  },
];

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function escapeStr(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// ---------------------------------------------------------------------------
// Parse question metadata from raw TypeScript source text.
// Uses id-boundary scanning — no eval, no tsc.
// ---------------------------------------------------------------------------
function extractQuestions(fileText) {
  const questions = [];
  const idRegex   = /\bid:\s*["']([\w-]+)["']/g;
  const allMatches = [...fileText.matchAll(idRegex)];

  for (let i = 0; i < allMatches.length; i++) {
    const m     = allMatches[i];
    const id    = m[1];
    const start = m.index;
    // Slice from this id to the next id (or end of file) to get the object body
    const end   = (i + 1 < allMatches.length) ? allMatches[i + 1].index : fileText.length;
    const body  = fileText.slice(start, end);

    const hasSolutionSteps = /\bsolutionSteps\s*:/.test(body);
    const hasFinalAnswer   = /\bfinalAnswer\s*:/.test(body);

    const marksM    = body.match(/\bmarks\s*:\s*(\d+)/);
    const kindM     = body.match(/\b(?:kind|type)\s*:\s*["']([\w-]+)["']/);
    const topicM    = body.match(/\btopicKey\s*:\s*["']([\w]+)["']/);
    const subtopicM = body.match(/\bsubtopic\s*:\s*["']([\s\S]*?)["']/);

    // questionText: handles inline, multi-line, and backtick template literals
    let questionText = '';
    const qtInline   = body.match(/\bquestionText\s*:\s*"([\s\S]*?)",\s*\n/);
    const qtMulti    = body.match(/\bquestionText\s*:\s*\n\s+"([\s\S]*?)",\s*\n/);
    const qtTemplate = body.match(/\bquestionText\s*:\s*`([\s\S]*?)`,/);
    if (qtMulti)        questionText = qtMulti[1].replace(/\\n/g, '\n');
    else if (qtInline)  questionText = qtInline[1].replace(/\\n/g, '\n');
    else if (qtTemplate) questionText = qtTemplate[1].trim();

    // answer: same treatment
    let answer = '';
    const ansInline  = body.match(/\banswer\s*:\s*"([\s\S]*?)",\s*\n/);
    const ansMulti   = body.match(/\banswer\s*:\s*\n\s+"([\s\S]*?)",\s*\n/);
    const ansTemplate = body.match(/\banswer\s*:\s*`([\s\S]*?)`,/);
    if (ansMulti)        answer = ansMulti[1].replace(/\\n/g, '\n');
    else if (ansInline)  answer = ansInline[1].replace(/\\n/g, '\n');
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
// ---------------------------------------------------------------------------
function applyPatches(fileText, patches, closingPattern) {
  let result     = fileText;
  let patchCount = 0;

  const indentMatch  = closingPattern.match(/\n(\s*)/);
  const closingIndent = indentMatch ? indentMatch[1] : '  ';
  const fieldIndent  = closingIndent + '  ';
  const stepIndent   = closingIndent + '    ';

  for (const patch of patches) {
    const idStr  = `id: "${patch.id}"`;

    // Find the occurrence that is missing solutionSteps OR finalAnswer (handles duplicate IDs).
    let idIdx = -1;
    let closeIdx = -1;
    let blockMissingSteps = false;
    let blockMissingFinalAnswer = false;
    let searchFrom = 0;
    while (true) {
      const candidateIdx = result.indexOf(idStr, searchFrom);
      if (candidateIdx === -1) break;
      const candidateClose = result.indexOf(closingPattern, candidateIdx);
      if (candidateClose === -1) break;
      const body = result.slice(candidateIdx, candidateClose);
      const hasSteps = body.includes('solutionSteps:');
      const hasFA    = body.includes('finalAnswer:');
      if (!hasSteps || !hasFA) {
        // Found a block that still needs at least one field
        idIdx = candidateIdx;
        closeIdx = candidateClose;
        blockMissingSteps = !hasSteps;
        blockMissingFinalAnswer = !hasFA;
        break;
      }
      // This occurrence is already complete — look for a later duplicate
      searchFrom = candidateClose + 1;
    }

    if (idIdx === -1) {
      // Either not found at all, or all occurrences are fully complete
      if (result.indexOf(idStr) === -1) {
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

    let insert = '';

    // Only add solutionSteps if the block is missing them
    if (blockMissingSteps) {
      const stepsBlock = patch.solutionSteps
        .map(s => `${stepIndent}"${escapeStr(s)}",`)
        .join('\n');
      insert += `\n${fieldIndent}solutionSteps: [\n${stepsBlock}\n${fieldIndent}],`;
    }

    // Only add finalAnswer if the block is missing it and we have a value
    if (blockMissingFinalAnswer && patch.finalAnswer) {
      insert += `\n${fieldIndent}finalAnswer: "${escapeStr(patch.finalAnswer)}",`;
    }

    if (!insert) continue; // nothing to add

    result = result.slice(0, closeIdx) + insert + result.slice(closeIdx);
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
    // Walk the JSON char-by-char to fix literal newlines and invalid escapes
    // inside string values — the two main causes of parse failures.
    let out = '';
    let inString = false;
    let escaped = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (escaped) {
        // If the escape char is not a valid JSON escape, double the backslash
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
    // Strip markdown code fences if present
    let cleaned = s.replace(/^[\s\S]*?```(?:json)?\s*/m, '').replace(/\s*```[\s\S]*$/m, '').trim();
    if (!cleaned.startsWith('[') && !cleaned.startsWith('{')) cleaned = s;

    // Repair literal newlines and invalid escape sequences inside JSON strings
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

  // Re-read file each time to get updated gap count (incremental writes below)
  const fileText0 = fs.readFileSync(filePath, 'utf8');
  const allQ0     = extractQuestions(fileText0);
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
        // Write incrementally after each batch so partial progress is never lost
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

  // Routing: after Task #396 merged, HAS_DIRECT_KEY means direct-key is PRIMARY.
  const authLabel = config.HAS_DIRECT_KEY
    ? 'direct-key → Google (no markup ✓)'
    : config.HAS_REPLIT_PROXY
      ? 'replit-proxy (markup applies)'
      : 'NO auth — will fail';
  console.log(`\nGemini auth: ${authLabel}`);

  const gemini = createGeminiClient(config);
  let totalQ = 0, totalOk = 0, totalFail = 0;

  const onlyFile = process.env.FILL_ONLY_FILE || '';
  const activeFiles = onlyFile
    ? FILES.filter(f => path.basename(f.relativePath).includes(onlyFile))
    : FILES;

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
