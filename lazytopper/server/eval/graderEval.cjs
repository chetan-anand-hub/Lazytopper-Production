/* eslint-disable no-console */
// graderEval.cjs — standalone grader eval harness (TEST INFRASTRUCTURE ONLY).
//
// WHY: every prompt-only grading change used to require the owner to generate
// worksheets, handwrite answers, photograph + upload them, three times over.
// This script removes the human from that loop: it drives the WORKSHEET grader
// against the live Gemini model with FIXED synthetic inputs and asserts the JSON.
//
// HOW: it is a faithful reproduction of `gradeStructuredSet` /
// `normaliseStructuredResult` from `routes/checkSolution.cjs` (which are closure-
// private and cannot be imported). The grading RULES, the mistake taxonomy, the
// no-working / objective honesty guard, the additive-floor reconcile and the
// marks normalisation are copied verbatim so this exercises the same behaviour
// the route does. The ONE deviation: the real route attaches a PDF of handwritten
// answers and lets the model transcribe + grade in one call; here there is no PDF,
// so each case's `studentWork` is injected as already-transcribed text (exactly the
// per-step `studentWork` the route produces after PDF extraction). The grading
// logic under test is identical.
//
// The only things imported from real server files are the genuine primitives:
//   callGemini (services/geminiClient.cjs) · extractJsonObjectFromText
//   (services/httpUtils.cjs) · isObjectiveType (services/serverUtils.cjs) ·
//   resolveConfig (services/serverConfig.cjs).
//
// No product code is modified. Run with:
//   node lazytopper/server/eval/graderEval.cjs

// Force the direct-Gemini provider before config resolves (spec: AI_PROVIDER=gemini).
process.env.AI_PROVIDER = 'gemini';

const { resolveConfig } = require('../services/serverConfig.cjs');
const { createGeminiClient } = require('../services/geminiClient.cjs');
const { extractJsonObjectFromText } = require('../services/httpUtils.cjs');
const { isObjectiveType } = require('../services/serverUtils.cjs');
// ECF_POLICY_V2 — the ONE marking rule, imported from the shipped route rather
// than re-implemented here. Requiring this module only defines functions.
const {
  applyEcfPolicyV2,
  resolveFinalAnswerCorrect,
  buildMistakeSummary,
  // D2 - the DEPARTURE DEFINITION itself, imported (it is exported) rather than
  // copied, so the rule the model is given cannot drift from the rule the
  // product ships. Without it `isDeparture` is a field with no instruction.
  ECF_POLICY_V2_PROMPT,
} = require('../routes/checkSolution.cjs');

// resolveConfig() loads server/.env (if present) and reads the Codespace/CI secret
// from process.env.API_KEY — the script never reads or prints the key itself.
const config = resolveConfig();

// ── Key presence check (never echo the value) ─────────────────────────────────
const HAS_KEY = Boolean(config.GEMINI_API_KEY);
console.log('API_KEY: ' + (HAS_KEY ? 'PRESENT' : 'MISSING'));
console.log('AI_PROVIDER: ' + (process.env.AI_PROVIDER || '(unset)'));
console.log('GEMINI_MODEL: ' + config.GEMINI_MODEL);
console.log('');
if (!HAS_KEY) {
  console.error(
    'No Gemini key resolved. Set API_KEY (Codespace secret or server/.env) with ' +
    'AI_PROVIDER=gemini, then re-run. Refusing to run the eval against the stub.',
  );
  process.exit(1);
}

const { callGemini } = createGeminiClient({
  GEMINI_API_KEY: config.GEMINI_API_KEY,
  HAS_REPLIT_PROXY: config.HAS_REPLIT_PROXY,
  REPLIT_GEMINI_BASE_URL: config.REPLIT_GEMINI_BASE_URL,
  REPLIT_GEMINI_API_KEY: config.REPLIT_GEMINI_API_KEY,
  DIRECT_GEMINI_API_KEY: config.DIRECT_GEMINI_API_KEY,
  GEMINI_TUTOR_MODEL: config.GEMINI_TUTOR_MODEL,
  GEMINI_TIMEOUT_MS: config.GEMINI_TIMEOUT_MS,
});
const GEMINI_MODEL = config.GEMINI_MODEL;

// ── Verbatim copies from routes/checkSolution.cjs (kept in sync intentionally) ──
const STRUCTURED_MISTAKE_TAXONOMY =
  'For each mistake choose the type by the CAUSE the error reveals about understanding, not by where it appears:\n' +
  '- "conceptual": the METHOD or understanding is wrong — wrong formula/law/theorem, confused concepts, misread the question, (Science) wrong principle/organ/law, (Science) AN EQUATION LEFT UNBALANCED WHEN THE QUESTION ASKED FOR A BALANCED EQUATION — the species may be right, but the student did not do the chemistry that was asked, and the fix is learning that equations must balance (conservation of mass), not learning a format.\n' +
  '- "calculation": the METHOD is right but the arithmetic/algebra is wrong, (Science) WRONG COEFFICIENTS while genuinely attempting to balance an equation — the fix is to recount the atoms.\n' +
  '- "silly": the student CLEARLY understands but made a mechanical slip — a sign misread off their OWN correct working, a dropped negative, a copying error.\n' +
  '- "presentation": mathematically/chemically RIGHT but board-format short — missing formula, missing units, no conclusion/"verified" line, working not shown, (Science) a correctly BALANCED equation MISSING STATE SYMBOLS (s/l/g/aq). ⚠⚠ PRESENTATION IS CBSE\'S FORMAT — state symbols, answer structure, labelled diagrams, units, conclusion lines. ANYTHING THAT CHANGES WHETHER THE CHEMISTRY OR MATHEMATICS IS RIGHT IS NOT PRESENTATION. An equation left UNBALANCED is NOT presentation: it is conceptual when a balanced equation was asked for, or calculation when the student was balancing and miscounted.\n' +
  'A CORRECT step has mistakeType null. A step left ENTIRELY BLANK gets status "missing" and mistakeType null (marks simply not earned, never a typed mistake). An alternative valid method that reaches the answer is NOT a mistake — award full marks.';

// Verbatim from normaliseStructuredResult (checkSolution.cjs). The marks scale is
// ALWAYS the trusted scheme value (q.marks); the model only awards WITHIN it.
function normaliseStructuredResult(q, raw) {
  const VALID_MISTAKE_TYPES = new Set(['conceptual', 'calculation', 'silly', 'presentation']);
  const totalMarks = Number(q.marks) > 0 ? Number(q.marks) : 1;

  const couldNotRead = !raw || raw.couldNotRead === true || raw.couldNotRead === 'true';
  if (couldNotRead) {
    return {
      qNumber: q.qNumber,
      couldNotRead: true,
      totalMarks,
      note: String((raw && raw.note) || '').trim() ||
        "We couldn't read your answer for this question clearly — re-upload this page.",
    };
  }

  const annotatedSteps = (Array.isArray(raw.annotatedSteps) ? raw.annotatedSteps : [])
    .filter((s) => s && s.description)
    .map((s, i) => ({
      stepNumber: i + 1,
      description: String(s.description || '').trim(),
      studentWork: String(s.studentWork || '').trim(),
      status: ['correct', 'partial', 'incorrect', 'missing'].includes(s.status) ? s.status : 'partial',
      marksAwarded: Math.max(0, Math.round(Number(s.marksAwarded || 0) * 2) / 2),
      marksDeducted: Math.max(0, Math.round(Number(s.marksDeducted || 0) * 2) / 2),
      teacherAnnotation: String(s.teacherAnnotation || '').trim(),
      mistakeType: VALID_MISTAKE_TYPES.has(s.mistakeType) ? s.mistakeType : null,
      correctedWorking: s.correctedWorking ? String(s.correctedWorking).trim() : null,
      isDeparture: s.isDeparture === true,
    }));

  // No-working / objective honesty guard (MI integrity), byte-aligned with the route.
  const questionIsObjective = isObjectiveType(q.qType || q.format, q.section);
  const noWorkingNulled = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
  for (const s of annotatedSteps) {
    const noWorking = !s.studentWork?.trim();
    if (s.status === 'incorrect' && (noWorking || questionIsObjective)) {
      if (s.mistakeType && Object.prototype.hasOwnProperty.call(noWorkingNulled, s.mistakeType)) {
        noWorkingNulled[s.mistakeType] += 1;
      }
      s.mistakeType = null;
    }
  }

  // ── ECF_POLICY_V2 · THE SHARED CLAMP (caller 3 of 3) ────────────────────────
  // ★ THIS WAS THE THIRD COPY of the naked sum. The harness must measure the code
  // that SHIPS, so it now calls the product's own clamp instead of reproducing it.
  const schemeAnchored = Array.isArray(q.solutionSteps) && q.solutionSteps.length > 0;
  const finalAnswerCorrect = resolveFinalAnswerCorrect(raw, annotatedSteps);
  const policy = applyEcfPolicyV2({ annotatedSteps, totalMarks, schemeAnchored, finalAnswerCorrect });
  const capped = policy.marksAwarded;

  const mistakeSummary = buildMistakeSummary({
    annotatedSteps,
    rawSummary: raw.mistakeSummary,
    noWorkingNulled,
    departureIndex: policy.departureIndex,
  });

  return {
    qNumber: q.qNumber,
    couldNotRead: false,
    ok: true,
    totalMarks,
    marksAwarded: capped,
    percentage: Math.round((capped / totalMarks) * 100),
    annotatedSteps,
    mistakeSummary,
    teacherNote: String(raw.teacherNote || '').trim(),
  };
}

// Faithful reproduction of gradeStructuredSet's prompt + call, with studentWork
// injected as transcribed text instead of via an attached PDF.
async function gradeStructuredSetText(questions) {
  const systemPrompt =
    "You are a CBSE Class 10 board examiner grading a student's whole worksheet. " +
    "The student's handwritten answer to EACH question has been transcribed to text and is shown " +
    'below its question, labelled "Student\'s written answer". ' +
    'Grade EACH question against ITS OWN marking scheme, exactly as a real teacher marking with a red pen. ' +
    'Respond ONLY with valid JSON, no markdown fences.';

  const questionBlocks = questions
    .map((q) => {
      const scheme = Array.isArray(q.solutionSteps) && q.solutionSteps.length > 0
        ? '\n     Marking scheme:\n' +
          q.solutionSteps.map((s, i) => '       Step ' + (i + 1) + ': ' + String(s)).join('\n') +
          (q.finalAnswer ? '\n       Final answer: ' + String(q.finalAnswer) : '')
        // D3 - SCHEME-ABSENT EMITS NOTHING. The shipped `blockFor` in
        // routes/checkSolution.cjs (anchor: `const scheme = Array.isArray(q.solutionSteps)`)
        // has `: ''` on this branch. Emitting `Final answer: ...` handed the model the
        // answer it was being scored on, so every scheme-absent score was inflated BY
        // CONSTRUCTION - and scheme-absent is Check & Improve, the primary surface.
        : '';
      return (
        '  Q' + q.qNumber + '. [' + (Number(q.marks) || 1) + ' mark(s)' +
        (q.topicLabel || q.topic ? ' · ' + String(q.topicLabel || q.topic) : '') + ']\n' +
        '     ' + String(q.questionText || '').replace(/\n/g, ' ') +
        scheme +
        '\n     Student\'s written answer: ' + String(q.studentWork || '').replace(/\n/g, ' ')
      );
    })
    .join('\n\n');

  const rules =
    'GRADING RULES:\n' +
    '1. For EACH question Q1…QN, grade the transcribed student answer against ITS scheme. Award marks by the [bracket] weights in each scheme step, or distribute evenly if none.\n' +
    '2. marksAwarded (per question) = sum of that question\'s annotatedSteps[].marksAwarded. Never exceed the question\'s stated marks.\n' +
    '3. ' + STRUCTURED_MISTAKE_TAXONOMY + '\n' +
    '4. ERROR CARRIED FORWARD: if one upstream slip makes later steps wrong, mark those later steps status "incorrect" with mistakeType null — never re-charge one slip as several mistakes. ' + ECF_POLICY_V2_PROMPT + '\n' +
    '5. NO WORKING SHOWN → mistakeType null. If the student shows NO working — only a final answer (e.g. just a chosen MCQ option such as "(d)") — and it is wrong, you CANNOT diagnose the cause: set mistakeType null for that step. Never guess "conceptual" (or any type) from a bare wrong answer. A wrong answer with no working is undiagnosable, not conceptual — the marks are still not earned (status stays "incorrect"), only the type is null.\n' +
    '6. HONEST READ — anti-fabrication: a student writing \'Don\'t know\', \'Dont know\', \'I don\'t know\', \'DK\', or any similar explicit non-attempt phrase IS legible — grade it as: status "incorrect", marks deducted = question marks, mistakeType null (undiagnosable — no working shown).\n' +
    '7. teacherNote per question: 1–2 short plain-English sentences. "summary": 2–3 encouraging, exam-useful sentences about the whole worksheet.\n' +
    '8. PARTIAL CREDIT: award marks strictly by the step weights in the marking scheme. A step the student attempted correctly earns its allocated marks even if a later step is wrong. A step with a calculation error earns 0 for that step only — never redistribute or re-weight marks across steps. If no explicit per-step weight exists, distribute the question\'s total marks evenly across required steps.';

  const jsonSchema =
    'RESPOND with this exact JSON shape:\n' +
    '{\n' +
    '  "results": [\n' +
    '    {\n' +
    '      "qNumber": 1,\n' +
    '      "couldNotRead": false,\n' +
    '      "marksAwarded": <number>,\n' +
    '      "annotatedSteps": [\n' +
    '        { "stepNumber": 1, "description": "...", "studentWork": "what the student wrote", "status": "correct" | "partial" | "incorrect" | "missing", "marksAwarded": <number>, "marksDeducted": <number>, "teacherAnnotation": "...", "mistakeType": null | "conceptual" | "calculation" | "silly" | "presentation", "correctedWorking": null | "...", "isDeparture": false | true }\n' +
    '      ],\n' +
    '      "mistakeSummary": { "conceptual": 0, "calculation": 0, "silly": 0, "presentation": 0 },\n' +
    '      "finalAnswerCorrect": true | false,\n' +
    '      "teacherNote": "1-2 sentence per-question summary"\n' +
    '    }\n' +
    '  ],\n' +
    '  "summary": "2-3 sentence encouraging whole-worksheet summary"\n' +
    '}';

  const userPrompt =
    'Grade this student\'s worksheet. There are ' + questions.length + ' questions.\n\n' +
    'QUESTIONS, MARKING SCHEMES AND TRANSCRIBED STUDENT ANSWERS:\n' + questionBlocks + '\n\n' +
    jsonSchema + '\n\n' + rules;

  const parts = [{ text: systemPrompt + '\n\n' + userPrompt }];
  const contents = [{ role: 'user', parts }];

  // ★★ CLAMP (a). Shipping production at 0 while the harness that MEASURES
  // reproducibility runs at 0.05 would measure a configuration that no longer
  // ships. The instrument tracks the instrument's subject.
  const genConfig = { temperature: 0, maxOutputTokens: 32000, responseMimeType: 'application/json' };
  const gradeOnce = async () => {
    const r = await callGemini(GEMINI_MODEL, contents, genConfig);
    return { reply: r, parsed: extractJsonObjectFromText(r.text) };
  };
  const isGoodParse = (p) => !!(p && Array.isArray(p.results));

  let { reply, parsed } = await gradeOnce();
  if (!isGoodParse(parsed)) {
    console.warn('[eval] parse miss (attempt 1) — retrying once. len:', reply.text ? reply.text.length : 0);
    ({ reply, parsed } = await gradeOnce());
  }
  if (!isGoodParse(parsed)) {
    return { ok: false };
  }

  const byNumber = new Map();
  for (const r of parsed.results) {
    if (r && r.qNumber != null) byNumber.set(Number(r.qNumber), r);
  }
  const results = questions.map((q) =>
    normaliseStructuredResult(q, byNumber.get(Number(q.qNumber)) || null),
  );
  return { ok: true, results, summary: String(parsed.summary || '').trim() };
}

// ── Fixed synthetic test cases ────────────────────────────────────────────────
const CASES = [
  {
    name: 'Case 1 — "Don\'t know" non-attempt',
    question: {
      qNumber: 1, marks: 2, section: 'B', qType: 'vsa', topic: 'Real Numbers',
      questionText: 'Find the HCF of 6 and 20.',
      solutionSteps: ['[1 mark] Prime factorise: 6 = 2 × 3, 20 = 2² × 5', '[1 mark] HCF = common factors = 2'],
      finalAnswer: 'HCF = 2',
      studentWork: "Don't know",
    },
    expect: { status: 'incorrect', mistakeTypeNull: true, allBucketsZero: true },
  },
  {
    name: 'Case 2 — Wrong MCQ option (objective, no working)',
    question: {
      qNumber: 1, marks: 1, section: 'A', qType: 'mcq', topic: 'Light — Refraction',
      questionText: 'The second law of refraction is also known as: (a) Snell\'s law (b) Newton\'s law (c) Ohm\'s law (d) Hooke\'s law',
      finalAnswer: "(a) Snell's law",
      correctOption: '(a)',
      studentWork: '(d)',
    },
    expect: { status: 'incorrect', mistakeTypeNull: true, allBucketsZero: true },
  },
  {
    name: 'Case 3 — Partial credit (step 1 correct, step 2 wrong)',
    question: {
      qNumber: 1, marks: 2, section: 'B', qType: 'vsa', topic: 'Quadratic Equations',
      questionText: 'Find the value(s) of k for which 2x² + kx + 3 = 0 has equal roots.',
      solutionSteps: ['[1 mark] Set discriminant D = 0: k² − 4(2)(3) = k² − 24 = 0', '[1 mark] k = ±2√6'],
      finalAnswer: 'k = ±2√6',
      studentWork: 'D = k² − 24 = 0, so k² = 24, k = 2√6',
    },
    expect: { status: 'partial' },
  },
  {
    name: 'Case 4 — Correct answer, full marks',
    question: {
      qNumber: 1, marks: 2, section: 'B', qType: 'vsa', topic: 'Quadratic Equations',
      questionText: 'Solve x² − 7x + 12 = 0.',
      solutionSteps: ['[1 mark] Factorise: (x − 4)(x − 3) = 0', '[1 mark] x = 4 or x = 3'],
      finalAnswer: 'x = 4 or x = 3',
      studentWork: 'x² − 7x + 12 = (x − 4)(x − 3), so x = 4 or x = 3',
    },
    expect: { status: 'correct' },
  },
  {
    name: 'Case 5 — Worked wrong answer (should get a mistake type)',
    question: {
      qNumber: 1, marks: 2, section: 'B', qType: 'vsa', topic: 'Real Numbers',
      questionText: 'Find the LCM of 6 and 20.',
      solutionSteps: ['[1 mark] Prime factorise: 6 = 2 × 3, 20 = 2² × 5', '[1 mark] LCM = 2² × 3 × 5 = 60'],
      finalAnswer: 'LCM = 60',
      studentWork: '6 = 2×3, 20 = 2²×5, LCM = 2 × 3 × 5 = 30',
    },
    // The student SHOWED working (factorisation step 1 correct, step 2 dropped the
    // 2² → wrong). The invariant under test is the contrast with Case 2: because
    // working is visible, the honesty guard must NOT fire and a mistakeType must
    // survive. CBSE step-marking correctly awards step 1 → partial credit, so we
    // assert "not full marks" (the answer is wrong) rather than a hard 0.
    expect: { notFullMarks: true, mistakeTypePresent: true },
  },
];

function questionStatus(r) {
  if (r.couldNotRead) return 'couldNotRead';
  if (r.marksAwarded >= r.totalMarks) return 'correct';
  if (r.marksAwarded <= 0) return 'incorrect';
  return 'partial';
}
function bucketSum(r) {
  const m = r.mistakeSummary || {};
  return (m.conceptual || 0) + (m.calculation || 0) + (m.silly || 0) + (m.presentation || 0);
}

function evaluateCase(c, r) {
  const failures = [];
  const status = questionStatus(r);
  const buckets = bucketSum(r);
  const e = c.expect;

  if (r.couldNotRead) {
    failures.push('couldNotRead=true (the injected text answer should always be readable)');
  }

  if (e.status) {
    if (e.status === 'partial') {
      if (!(r.marksAwarded > 0 && r.marksAwarded < r.totalMarks)) {
        failures.push(`expected PARTIAL (0 < marks < ${r.totalMarks}), got ${r.marksAwarded}/${r.totalMarks}`);
      }
    } else if (status !== e.status) {
      failures.push(`expected status "${e.status}", got "${status}" (${r.marksAwarded}/${r.totalMarks})`);
    }
  }
  if (e.notFullMarks && r.marksAwarded >= r.totalMarks) {
    failures.push(`expected NOT full marks (answer is wrong), got ${r.marksAwarded}/${r.totalMarks}`);
  }
  if (e.allBucketsZero && buckets !== 0) {
    failures.push(`expected all mistake buckets 0, got sum ${buckets} (${JSON.stringify(r.mistakeSummary)})`);
  }
  if (e.mistakeTypeNull) {
    const anyTyped = (r.annotatedSteps || []).some((s) => s.mistakeType !== null);
    if (anyTyped || buckets !== 0) {
      failures.push(`expected mistakeType null everywhere, got steps=${JSON.stringify((r.annotatedSteps || []).map((s) => s.mistakeType))} buckets=${JSON.stringify(r.mistakeSummary)}`);
    }
  }
  if (e.mistakeTypePresent && buckets < 1) {
    failures.push(`expected a mistakeType (calculation/conceptual), got none (${JSON.stringify(r.mistakeSummary)})`);
  }

  return failures;
}

async function main() {
  let passed = 0;
  for (let i = 0; i < CASES.length; i++) {
    const c = CASES[i];
    let res;
    try {
      res = await gradeStructuredSetText([c.question]);
    } catch (err) {
      console.log(`FAIL — ${c.name}`);
      console.log(`   threw: ${err && err.message ? err.message : err}`);
      console.log('');
      continue;
    }
    if (!res.ok || !Array.isArray(res.results) || !res.results[0]) {
      console.log(`FAIL — ${c.name}`);
      console.log('   grader returned no parseable result (ok=false / empty results)');
      console.log('');
      continue;
    }
    const r = res.results[0];
    const failures = evaluateCase(c, r);
    const status = questionStatus(r);
    if (failures.length === 0) {
      passed++;
      console.log(`PASS — ${c.name}`);
      console.log(`   actual: status=${status} marks=${r.marksAwarded}/${r.totalMarks} buckets=${JSON.stringify(r.mistakeSummary)}`);
    } else {
      console.log(`FAIL — ${c.name}`);
      console.log(`   actual: status=${status} marks=${r.marksAwarded}/${r.totalMarks} buckets=${JSON.stringify(r.mistakeSummary)}`);
      for (const f of failures) console.log(`   ✗ ${f}`);
    }
    console.log('');
  }

  console.log(`EVAL: ${passed}/${CASES.length} passed`);
  process.exit(passed === CASES.length ? 0 : 1);
}

main().catch((err) => {
  console.error('EVAL harness crashed:', err && err.stack ? err.stack : err);
  process.exit(1);
});
