'use strict';
// lib/planner.cjs — the golden job plan: which requests are sent, through which entry
// point, in which surface's request shape. DETERMINISTIC (no clock, no randomness), so
// the request a LIVE run sent can be re-derived byte-for-byte at REPLAY time (the stored
// `requestDigest` proves it).
//
// Request shapes follow the client call sites tabled in P15 (field lists read at
// 53fe4d22; see README.md "Request shapes"):
//   CI-SINGLE   DesktopCheckImprovePage.tsx:1771-1781  question/subject/topic/marks/objective?/answer
//               (= signed-out free check, QR answer hand-off and Tutor overlay: identical body)
//   HPQ         SolutionChecker.tsx:652-668            question/marks/subject/topic/solutionSteps/finalAnswer/answer
//   PARITY      /api/grade-worksheet carrying EXACTLY the CI-SINGLE content per question
//               (typed batch / per-question photo uploads) — the single-vs-set agreement probe
//   QP-BATCH    quickPracticeSessionService.ts:458-488, :741-752  bank fields + textAnswer + pickedOption + uploads[]
//   WS/CT/FM    worksheetGradeService.ts:103-129 / chapterTestGradeService.ts:248-265 / fullMockGradeService.ts:148-165
//               bank fields + ONE application/pdf
//   CI-MULTI    DesktopCheckImprovePage.tsx:1565-1580  detect questions, session-topic labels, objective boolean, ONE document
//   DETECT      DesktopCheckImprovePage.tsx:1285-1291 + checkImproveDetection.ts:129  question/topicVocabulary (+ question photo)

const fs = require('fs');
const crypto = require('crypto');
const { load, goldenFile } = require('./data.cjs');
const { jpegsToPdf } = require('./pdf.cjs');

const b64 = (rel) => fs.readFileSync(goldenFile(rel)).toString('base64');

// Stable JSON for digests: keys sorted recursively.
function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  }
  return JSON.stringify(v);
}
function digest(obj) {
  return crypto.createHash('sha256').update(stable(obj)).digest('hex');
}

// Set composition (fixed; listed in README.md).
const HPQ_CASES = ['GS-M10-a', 'GS-M12-a', 'GS-M15-a', 'GS-S08-a', 'GS-S09-a', 'GS-S16-a'];
const QP_SETS = [
  { setId: 'QPM', subject: 'Maths', typed: ['GS-M04-a', 'GS-M05-a', 'GS-M17-a'], photo: ['GS-M08-a'] },
  { setId: 'QPS', subject: 'Science', typed: ['GS-S01-a', 'GS-S06-b', 'GS-S09-b', 'GS-S13-a'], photo: [] },
];
const DOC_SETS = [
  { setId: 'WS1', surface: 'WS', subject: 'Science', cases: ['GS-S06-a', 'GS-S14-a'] },
  { setId: 'CT1', surface: 'CT', subject: 'Science', cases: ['GS-S10-a', 'GS-S05-a'] },
  { setId: 'FM1', surface: 'FM', subject: 'Maths', cases: ['GS-M13-a', 'GS-M08-a'] },
];
const CI_MULTI_SETS = [
  { setId: 'CMM', subject: 'Maths', cases: ['GS-M09-b', 'GS-M20-a', 'GS-M24-a'] },
  { setId: 'CMS', subject: 'Science', cases: ['GS-S03-a', 'GS-S05-a'] },
];
const PARITY_SET_SIZE = 4;
// GRADER-CORE-1 PR-2 · P0 (OR-LIVE R5, production 2026-10-05): a Chapter-Test-shaped set with
// stored schemes whose ONE uploaded page answers only Q3. Every other question must come back
// UNATTEMPTED (no marks, no type) — never full marks written from the scheme.
const P0_SETS = [
  { setId: 'P0-01', surface: 'P0-CT', subject: 'Science', cases: ['GS-S10-a', 'GS-S05-a', 'GS-S14-a', 'GS-S06-a'], answered: 3 },
];
// v2 copies (acceptsV2: true) of the jobs whose bar needs a v2-only field: the answer-mismatch
// verdict, the P0 case, the owner paper (unattempted / withdrawn statuses) and the golden
// cases whose unattempted STATUS is scored (truth/repins.json unattemptedStatusRequired).
const V2_SURFACES = new Set(['MISMATCH', 'P0-CT', 'CI-MULTI-OWNER', 'CP-MULTI']);
const V2_SINGLE_CASES = ['GS-M17-a', 'GS-M19-a', 'GS-M22-a', 'GS-M24-a', 'GS-S12-a'];

function answerPartSingle(c) {
  if (c.mode === 'typed') return { textAnswer: c.textAnswer };
  return { imageBase64: b64(c.imageCompressed), imageMimeType: 'image/jpeg' };
}

function paritySets(cases) {
  const out = [];
  for (const subject of ['Maths', 'Science']) {
    const list = cases.filter((c) => c.subject === subject).map((c) => c.caseId);
    const groups = [];
    for (let i = 0; i < list.length; i += PARITY_SET_SIZE) groups.push(list.slice(i, i + PARITY_SET_SIZE));
    // A trailing single question would be a set of one; fold it into the previous set.
    if (groups.length > 1 && groups[groups.length - 1].length === 1) groups[groups.length - 2].push(groups.pop()[0]);
    groups.forEach((g, i) => out.push({ setId: 'PAR' + subject[0] + (i + 1), subject, cases: g }));
  }
  return out;
}

function docPdf(caseIds, byId) {
  const pages = caseIds.map((cid, i) => ({ jpeg: fs.readFileSync(goldenFile(byId[cid].imageCompressed)), label: 'Q' + (i + 1) + '.' }));
  return jpegsToPdf(pages).toString('base64');
}

/**
 * @param {{ includeDetect?: boolean, filter?: ((jobKey: string) => boolean)|null }} opts
 * @returns {Array<{jobKey:string, entry:'single'|'set'|'detect', handler:string, surface:string, caseIds:string[], qNumbers:Object, request:Object, requestDigest:string}>}
 */
function buildPlan(opts = {}) {
  const G = load();
  const byId = G.casesById;
  const jobs = [];
  const all = [];
  const push = (job) => {
    job.requestDigest = digest(job.request);
    all.push(job);
    if (!opts.filter || opts.filter(job.jobKey)) jobs.push(job);
  };

  // ── single entry: /api/check-solution (handleCheckSolution) ───────────────
  for (const c of G.cases) {
    push({
      jobKey: 'S.CI.' + c.caseId, entry: 'single', handler: 'handleCheckSolution', surface: 'CI-SINGLE',
      caseIds: [c.caseId], qNumbers: { [c.caseId]: 1 },
      request: {
        question: c.questionText,
        subject: c.subject,
        topic: c.detect.topicName,
        marks: c.marks,
        ...(c.detect.objective === true ? { objective: true } : {}),
        ...answerPartSingle(c),
      },
    });
  }
  for (const cid of HPQ_CASES) {
    const c = byId[cid];
    push({
      jobKey: 'S.HPQ.' + cid, entry: 'single', handler: 'handleCheckSolution', surface: 'HPQ',
      caseIds: [cid], qNumbers: { [cid]: 1 },
      request: {
        question: c.questionText, marks: c.marks, subject: c.subject, topic: c.chapterName,
        solutionSteps: c.schemeSteps, finalAnswer: c.finalAnswer, ...answerPartSingle(c),
      },
    });
  }
  const materialiseProbe = (p) => {
    const q = JSON.parse(JSON.stringify(p.payload));
    if (q.__imageFile) { q.imageBase64 = b64(q.__imageFile); q.imageMimeType = q.__imageMime || 'image/jpeg'; delete q.__imageFile; delete q.__imageMime; }
    if (Array.isArray(q.uploads)) {
      q.uploads = q.uploads.map((u) => (u.__imageFile ? { qNumber: u.qNumber, imageBase64: b64(u.__imageFile), imageMimeType: u.__imageMime || 'image/jpeg' } : u));
    }
    return q;
  };
  for (const p of G.probes.probes.filter((x) => x.entry === 'single')) {
    push({ jobKey: 'S.INJ.' + p.probeId, entry: 'single', handler: 'handleCheckSolution', surface: 'INJECTION',
      caseIds: [p.probeId], qNumbers: { [p.probeId]: 1 }, request: materialiseProbe(p) });
  }

  // ── set entry: /api/grade-worksheet (handleGradeWorksheet) ────────────────
  for (const s of paritySets(G.cases)) {
    const questions = []; const uploads = []; const qNumbers = {};
    s.cases.forEach((cid, i) => {
      const c = byId[cid]; const n = i + 1; qNumbers[cid] = n;
      const q = { qNumber: n, marks: c.marks, questionText: c.questionText, topic: c.detect.topicName, topicLabel: c.detect.topicName,
        ...(c.detect.objective === true ? { objective: true } : {}) };
      if (c.mode === 'typed') q.textAnswer = c.textAnswer;
      else uploads.push({ qNumber: n, imageBase64: b64(c.imageCompressed), imageMimeType: 'image/jpeg' });
      questions.push(q);
    });
    push({ jobKey: 'W.PAR.' + s.setId, entry: 'set', handler: 'handleGradeWorksheet', surface: 'PARITY', caseIds: s.cases, qNumbers,
      request: { worksheetId: 'golden-parity-' + s.setId, subject: s.subject, questions, ...(uploads.length ? { uploads } : {}) } });
  }
  for (const s of QP_SETS) {
    const all = s.typed.concat(s.photo);
    const questions = []; const uploads = []; const qNumbers = {};
    all.forEach((cid, i) => {
      const c = byId[cid]; const n = i + 1; qNumbers[cid] = n;
      const q = { qNumber: n, marks: c.marks, questionText: c.questionText, topicLabel: c.chapterName };
      if (c.section) q.section = c.section;
      if (c.objective) { q.answer = c.answerText; q.options = c.options; q.objective = true; }
      if (c.schemeSteps.length) q.solutionSteps = c.schemeSteps;
      if (c.finalAnswer) q.finalAnswer = c.finalAnswer;
      if (c.mode === 'typed') q.textAnswer = c.textAnswer;
      else uploads.push({ qNumber: n, imageBase64: b64(c.imageCompressed), imageMimeType: 'image/jpeg' });
      if (c.objective && c.studentOption && c.optionLetters) {
        const k = c.optionLetters.indexOf(c.studentOption);
        if (k >= 0) q.pickedOption = c.options[k];
      }
      questions.push(q);
    });
    push({ jobKey: 'W.QP.' + s.setId, entry: 'set', handler: 'handleGradeWorksheet', surface: 'QP-BATCH', caseIds: all, qNumbers,
      request: { worksheetId: 'qp-golden-' + s.setId, subject: s.subject, questions, ...(uploads.length ? { uploads } : {}) } });
  }
  for (const s of DOC_SETS) {
    const qNumbers = {};
    const questions = s.cases.map((cid, i) => {
      const c = byId[cid]; qNumbers[cid] = i + 1;
      return { qNumber: i + 1, marks: c.marks, topic: c.chapterName, topicLabel: c.chapterName, questionText: c.questionText,
        section: c.section, ...(c.objective ? { answer: c.answerText, options: c.options } : {}),
        solutionSteps: c.schemeSteps, finalAnswer: c.finalAnswer };
    });
    push({ jobKey: 'W.' + s.surface + '.' + s.setId, entry: 'set', handler: 'handleGradeWorksheet', surface: s.surface, caseIds: s.cases, qNumbers,
      request: { worksheetId: s.surface.toLowerCase() + '-golden-' + s.setId, subject: s.subject, questions,
        imageBase64: docPdf(s.cases, byId), imageMimeType: 'application/pdf' } });
  }
  for (const s of CI_MULTI_SETS) {
    const first = byId[s.cases[0]];
    const sessionTopic = first.detect.topicName;
    const qNumbers = {};
    const questions = s.cases.map((cid, i) => {
      const c = byId[cid]; qNumbers[cid] = i + 1;
      return { qNumber: i + 1, marks: c.marks, topic: sessionTopic, topicLabel: sessionTopic, questionText: c.questionText,
        objective: c.detect.objective === true };
    });
    push({ jobKey: 'W.CIM.' + s.setId, entry: 'set', handler: 'handleGradeWorksheet', surface: 'CI-MULTI', caseIds: s.cases, qNumbers,
      request: { worksheetId: 'ci:GOLDEN-' + s.setId, subject: s.subject, questions, imageBase64: docPdf(s.cases, byId), imageMimeType: 'application/pdf' } });
  }
  {
    const oa = G.owner;
    const qNumbers = {};
    const questions = oa.questions.map((q) => {
      qNumbers['OA-01.Q' + q.qNumber] = q.qNumber;
      return { qNumber: q.qNumber, marks: q.marks, topic: oa.requestShape.sessionTopic, topicLabel: oa.requestShape.sessionTopic,
        questionText: q.questionText, objective: q.objective === true };
    });
    push({ jobKey: 'W.CIM.OA-01', entry: 'set', handler: 'handleGradeWorksheet', surface: 'CI-MULTI-OWNER', caseIds: Object.keys(qNumbers), qNumbers,
      request: { worksheetId: 'ci:GOLDEN-OA-01', subject: oa.requestShape.subject, questions,
        imageBase64: b64(oa.files.answers), imageMimeType: 'application/pdf' } });
  }
  for (const p of G.probes.probes.filter((x) => x.entry === 'set')) {
    push({ jobKey: 'W.INJ.' + p.probeId, entry: 'set', handler: 'handleGradeWorksheet', surface: 'INJECTION',
      caseIds: [p.probeId], qNumbers: { [p.probeId]: 1 }, request: materialiseProbe(p) });
  }

  // ── answer-question MISMATCH (owner addendum 2026-10-05; truth/mismatch.json) ─
  // Same request shapes as CI-SINGLE (single entry) and PARITY (set entry); M5 is set only.
  const singleAnswer = (a) => (a.mode === 'typed' ? { textAnswer: a.text } : { imageBase64: b64(a.file), imageMimeType: a.mime });
  for (const m of G.mismatch) {
    if (m.entries.includes('single') && m.resolved) {
      const r = m.resolved;
      push({ jobKey: 'S.MM.' + m.caseId, entry: 'single', handler: 'handleCheckSolution', surface: 'MISMATCH', caseIds: [m.caseId], qNumbers: { [m.caseId]: 1 },
        request: { question: r.questionText, subject: r.subject, topic: r.topic, marks: r.marks, ...(r.objective ? { objective: true } : {}), ...singleAnswer(r.answer) } });
    }
    if (m.entries.includes('set')) {
      const qs = m.resolvedQuestions || [{ qNumber: 1, ...m.resolved }];
      const questions = []; const uploads = []; const qNumbers = {}; const caseIds = [];
      for (const q of qs) {
        const cid = m.resolvedQuestions ? m.caseId + '.Q' + q.qNumber : m.caseId;
        caseIds.push(cid); qNumbers[cid] = q.qNumber;
        const one = { qNumber: q.qNumber, marks: q.marks, questionText: q.questionText, topic: q.topic, topicLabel: q.topic, ...(q.objective ? { objective: true } : {}) };
        if (q.answer.mode === 'typed') one.textAnswer = q.answer.text;
        else uploads.push({ qNumber: q.qNumber, imageBase64: b64(q.answer.file), imageMimeType: q.answer.mime });
        questions.push(one);
      }
      push({ jobKey: 'W.MM.' + m.caseId, entry: 'set', handler: 'handleGradeWorksheet', surface: 'MISMATCH', caseIds, qNumbers,
        request: { worksheetId: 'golden-mm-' + m.caseId, subject: m.subject || qs[0].subject, questions, ...(uploads.length ? { uploads } : {}) } });
    }
  }

  // ── P0 (GRADER-CORE-1 PR-2): one answer page for a four-question Chapter-Test-shaped set ─
  for (const s of P0_SETS) {
    const qNumbers = {};
    const caseIds = [];
    const questions = s.cases.map((cid, i) => {
      const c = byId[cid]; const n = i + 1;
      const id = n === s.answered ? cid : s.setId + '.Q' + n;
      qNumbers[id] = n; caseIds.push(id);
      return { qNumber: n, marks: c.marks, topic: c.chapterName, topicLabel: c.chapterName, questionText: c.questionText,
        section: c.section, solutionSteps: c.schemeSteps, finalAnswer: c.finalAnswer };
    });
    const page = byId[s.cases[s.answered - 1]];
    const pdf = jpegsToPdf([{ jpeg: fs.readFileSync(goldenFile(page.imageCompressed)), label: 'Q' + s.answered + '.' }]).toString('base64');
    push({ jobKey: 'W.CT.' + s.setId, entry: 'set', handler: 'handleGradeWorksheet', surface: s.surface, caseIds, qNumbers,
      request: { worksheetId: 'ct-golden-' + s.setId, subject: s.subject, questions, imageBase64: pdf, imageMimeType: 'application/pdf' } });
  }

  // ── CONTROLLER TEST PAPERS (owner addendum): each paper as a Check & Improve MULTI set (ONE
  //    answer PDF, every block labelled with the session topic = the first question's chapter)
  //    AND each of its questions as a Check & Improve SINGLE (its own answer crop). ─
  for (const p of G.papers || []) {
    const sessionTopic = p.questions[0].chapterName;
    const qNumbers = {};
    const questions = p.questions.map((q) => {
      qNumbers[q.caseId] = q.qNumber;
      return { qNumber: q.qNumber, marks: q.marks, topic: sessionTopic, topicLabel: sessionTopic, questionText: q.questionText, objective: q.objective === true };
    });
    push({ jobKey: 'W.CP.' + p.paperId, entry: 'set', handler: 'handleGradeWorksheet', surface: 'CP-MULTI', caseIds: p.questions.map((q) => q.caseId), qNumbers,
      request: { worksheetId: 'ci:GOLDEN-CP-' + p.paperId, subject: p.questions[0].subject, questions, imageBase64: b64(p.dir + '/answers.pdf'), imageMimeType: 'application/pdf' } });
    for (const q of p.questions) {
      push({ jobKey: 'S.CP.' + q.caseId, entry: 'single', handler: 'handleCheckSolution', surface: 'CP-SINGLE', caseIds: [q.caseId], qNumbers: { [q.caseId]: 1 },
        request: { question: q.questionText, subject: q.subject, topic: q.chapterName, marks: q.marks, ...(q.objective ? { objective: true } : {}),
          imageBase64: b64(q.answerImage), imageMimeType: 'image/jpeg' } });
      if (q.expected && q.expected.answerMismatch === true) {
        push({ jobKey: 'V2.S.CP.' + q.caseId, entry: 'single', handler: 'handleCheckSolution', surface: 'CP-SINGLE-V2', caseIds: [q.caseId], qNumbers: { [q.caseId]: 1 },
          request: { question: q.questionText, subject: q.subject, topic: q.chapterName, marks: q.marks, ...(q.objective ? { objective: true } : {}),
            imageBase64: b64(q.answerImage), imageMimeType: 'image/jpeg', acceptsV2: true } });
      }
    }
  }

  // ── GRADER-CORE-1 PR-3 · the DUPLICATE-NUMBER paper (B's T2: two different questions printed
  //    "Q5"), as Check & Improve MULTI sends it today (one answer PDF, the session topic on every
  //    block), and as a v2 client that adopted per-question detect sends it (each question's own
  //    subject and chapter). Results are matched by POSITION (`qIndexes`): two rows share qNumber 5.
  if (G.dupPaper) {
    const p = G.dupPaper;
    const sessionTopic = p.questions[0].chapterName;
    const qNumbers = {};
    const qIndexes = {};
    const legacyQs = p.questions.map((q) => {
      qNumbers[q.caseId] = q.qNumber;
      qIndexes[q.caseId] = q.position;
      return { qNumber: q.qNumber, marks: q.marks, topic: sessionTopic, topicLabel: sessionTopic, questionText: q.questionText, objective: q.objective === true };
    });
    const base = { entry: 'set', handler: 'handleGradeWorksheet', caseIds: p.questions.map((q) => q.caseId), qNumbers, qIndexes };
    const doc = { imageBase64: b64(p.dir + '/' + p.key.files.answers), imageMimeType: 'application/pdf' };
    push({ ...base, jobKey: 'W.DUP.T2', surface: 'DUP-MULTI',
      request: { worksheetId: 'ci:GOLDEN-DUP-T2', subject: p.questions[0].subject, questions: legacyQs, ...doc } });
    push({ ...base, jobKey: 'V2.W.DUP.T2', surface: 'DUP-MULTI-V2',
      request: { worksheetId: 'ci:GOLDEN-DUP-T2', subject: p.questions[0].subject, acceptsV2: true, ...doc,
        questions: p.questions.map((q, i) => ({ ...legacyQs[i], subject: q.subject, chapter: q.chapterKey, topic: q.chapterName, topicLabel: q.chapterName })) } });
  }

  // ── GRADER-CORE-1 PR-3 · OWNER-ANOMALY-02 (27 questions): the C&I multi set as the client sends
  //    it (one answer PDF, session topic on every block; 27 questions → 9 chunks), its v2 twin, and
  //    every question as a C&I single with its own answer crop. ─
  if (G.owner2) {
    const o2 = G.owner2;
    const qNumbers = {};
    const questions = o2.questions.map((q) => {
      qNumbers[q.caseId] = q.qNumber;
      return { qNumber: q.qNumber, marks: q.marks, topic: o2.requestShape.sessionTopic, topicLabel: o2.requestShape.sessionTopic, questionText: q.questionText, objective: q.objective === true };
    });
    const doc = { imageBase64: b64(o2.files.answers), imageMimeType: 'application/pdf' };
    const base = { entry: 'set', handler: 'handleGradeWorksheet', caseIds: o2.questions.map((q) => q.caseId), qNumbers };
    push({ ...base, jobKey: 'W.OA2.MULTI', surface: 'OWNER2-MULTI', request: { worksheetId: 'ci:GOLDEN-OA-02', subject: o2.requestShape.subject, questions, ...doc } });
    push({ ...base, jobKey: 'V2.W.OA2.MULTI', surface: 'OWNER2-MULTI-V2', request: { worksheetId: 'ci:GOLDEN-OA-02', subject: o2.requestShape.subject, questions, ...doc, acceptsV2: true } });
    for (const q of o2.questions) {
      push({ jobKey: 'S.OA2.' + q.caseId, entry: 'single', handler: 'handleCheckSolution', surface: 'OWNER2-SINGLE', caseIds: [q.caseId], qNumbers: { [q.caseId]: 1 },
        request: { question: q.questionText, subject: q.subject, topic: q.chapterName, marks: q.marks, ...(q.objective ? { objective: true } : {}),
          imageBase64: b64(q.answerImage), imageMimeType: 'image/jpeg' } });
    }
  }

  // ── HOTFIX-2 · BOARD-38 (SYNTHETIC-COMPOSITE, 38 questions, ONE 6-page answer PDF) as the v2
  //    client sends a full board paper (session topic on every block). 38 questions → 4 chunks. ─
  if (G.board38) {
    const bp = G.board38;
    const qNumbers = {};
    const questions = bp.questions.map((q) => {
      qNumbers[q.sourceCaseId] = q.qNumber;
      return { qNumber: q.qNumber, marks: q.marks, topic: bp.requestShape.sessionTopic, topicLabel: bp.requestShape.sessionTopic, questionText: q.questionText, objective: q.objective === true };
    });
    push({ jobKey: 'V2.W.BOARD.38', entry: 'set', handler: 'handleGradeWorksheet', surface: 'BOARD-MULTI-V2', caseIds: bp.questions.map((q) => q.sourceCaseId), qNumbers,
      request: { worksheetId: 'ci:GOLDEN-BOARD-38', subject: bp.requestShape.subject, questions, imageBase64: b64(bp.files.answers), imageMimeType: 'application/pdf', acceptsV2: true } });
  }

  // ── v2 (acceptsV2: true) copies — a separate job key, so no stored PR-1 record is affected ─
  for (const j of all.slice()) {
    const v2Single = j.entry === 'single' && j.surface === 'CI-SINGLE' && V2_SINGLE_CASES.includes(j.caseIds[0]);
    if (!V2_SURFACES.has(j.surface) && !v2Single) continue;
    push({ ...j, jobKey: 'V2.' + j.jobKey, surface: j.surface + '-V2', request: { ...j.request, acceptsV2: true } });
  }

  // ── detect: /api/detect-question (handleDetectQuestion) — chapter / marks / owner paper ─
  if (opts.includeDetect) {
    const seen = new Set();
    for (const c of G.cases) {
      if (seen.has(c.itemId)) continue;
      seen.add(c.itemId);
      push({ jobKey: 'D.ITEM.' + c.itemId, entry: 'detect', handler: 'handleDetectQuestion', surface: 'DETECT', caseIds: [c.caseId], qNumbers: {},
        request: { question: c.questionText, topicVocabulary: G.vocab } });
    }
    push({ jobKey: 'D.PAPER.OA-01', entry: 'detect', handler: 'handleDetectQuestion', surface: 'DETECT-PAPER', caseIds: ['OA-01'], qNumbers: {},
      request: { imageBase64: b64(G.owner.files.questions), imageMimeType: 'application/pdf', topicVocabulary: G.vocab } });
    for (const q of G.owner.questions) {
      push({ jobKey: 'D.OAQ.' + q.qNumber, entry: 'detect', handler: 'handleDetectQuestion', surface: 'DETECT-PER-QUESTION', caseIds: ['OA-01.Q' + q.qNumber], qNumbers: {},
        request: { question: q.questionText, topicVocabulary: G.vocab } });
    }
    // GRADER-CORE-1 PR-3 (C10): the owner paper read by a v2 client (each question's own subject
    // and chapter), and the duplicate-number paper (both "Q5"s must be detected), both ways.
    push({ jobKey: 'V2.D.PAPER.OA-01', entry: 'detect', handler: 'handleDetectQuestion', surface: 'DETECT-PAPER-V2', caseIds: ['OA-01'], qNumbers: {},
      request: { imageBase64: b64(G.owner.files.questions), imageMimeType: 'application/pdf', topicVocabulary: G.vocab, acceptsV2: true } });
    if (G.owner2) {
      const q2 = b64(G.owner2.files.questions);
      push({ jobKey: 'D.PAPER.OA-02', entry: 'detect', handler: 'handleDetectQuestion', surface: 'DETECT-PAPER', caseIds: ['OA-02'], qNumbers: {},
        request: { imageBase64: q2, imageMimeType: 'application/pdf', topicVocabulary: G.vocab } });
      push({ jobKey: 'V2.D.PAPER.OA-02', entry: 'detect', handler: 'handleDetectQuestion', surface: 'DETECT-PAPER-V2', caseIds: ['OA-02'], qNumbers: {},
        request: { imageBase64: q2, imageMimeType: 'application/pdf', topicVocabulary: G.vocab, acceptsV2: true } });
    }
    if (G.dupPaper) {
      const qpdf = b64(G.dupPaper.dir + '/' + G.dupPaper.key.files.questions);
      push({ jobKey: 'D.PAPER.T2', entry: 'detect', handler: 'handleDetectQuestion', surface: 'DETECT-PAPER', caseIds: ['DUP-T2'], qNumbers: {},
        request: { imageBase64: qpdf, imageMimeType: 'application/pdf', topicVocabulary: G.vocab } });
      push({ jobKey: 'V2.D.PAPER.T2', entry: 'detect', handler: 'handleDetectQuestion', surface: 'DETECT-PAPER-V2', caseIds: ['DUP-T2'], qNumbers: {},
        request: { imageBase64: qpdf, imageMimeType: 'application/pdf', topicVocabulary: G.vocab, acceptsV2: true } });
    }
  }
  return jobs;
}

module.exports = { buildPlan, digest, stable, HPQ_CASES, QP_SETS, DOC_SETS, CI_MULTI_SETS, P0_SETS, V2_SINGLE_CASES, paritySets };
