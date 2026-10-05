'use strict';
// lib/data.cjs — the golden set as ONE in-memory model.
//
// Sources (all committed under server/eval/golden/):
//   data/verify/items.verified.json        the examiner-verified items (S2b) — the expectation base
//   data/verify/expected_flat.verified.json flat per-case flags (departureFlagRequired, declineAcceptable, ...)
//   data/supplement/items.supplement.json  GS-SUP-01..03 (S2b), merged by caseId
//   truth/repins.json                      owner rulings (2)-(7) applied on top (guarded: old value must match)
//   owner-anomaly-01/case.json             the owner's real 10-question paper (REAL, owner-supplied)
//   probes/injection.json                  the audit's prompt-injection probes (S5b)
//   truth/topic_vocab.json                 the canonical topic vocabulary (lib/desktop/topics.ts)
//   fixtures/ci_detect.audit-S3.json       recorded detect results used to build C&I request bodies
//
// Nothing here calls a model, the network or the clock. Pure reads + deterministic transforms.

const fs = require('fs');
const path = require('path');

const GOLDEN_DIR = path.join(__dirname, '..');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, rel), 'utf8'));
}

function asArray(x) {
  if (Array.isArray(x)) return x;
  if (x && typeof x === 'object') return Object.values(x);
  return [];
}

const same = (a, b) => JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);

// The question text a student would type into Check & Improve: the stem, its parts, the
// lettered options of an MCQ, and a figure description. Ported from the audit harness
// (grader-audit-1/s3/harness/build_inputs.py `compose_question`) so request bodies are
// identical to the ones the audit measured.
function composeQuestion(item) {
  const q = item.question;
  let t = String(q.text || '').trim();
  if (Array.isArray(q.parts) && q.parts.length) {
    t += '\n' + q.parts.map((p) => p.label + ' ' + p.text).join('\n');
  }
  if (q.options && q.type === 'mcq') {
    t += '\n' + Object.entries(q.options).map(([k, v]) => '(' + k + ') ' + v).join('  ');
  }
  if (q.needsFigure && q.figureDescription) {
    t += '\n[Figure: ' + q.figureDescription + ']';
  }
  return t;
}

// The official value points rendered the way a bank row carries them ("[n mark(s)] ...").
function schemeSteps(item) {
  return (item.scheme || []).map((s) => '[' + s.marks + ' mark' + (Number(s.marks) === 1 ? '' : 's') + '] ' + s.valuePoint);
}

function setPath(obj, dotted, value) {
  const parts = dotted.split('.');
  if (parts[0] === 'perStep') {
    const step = Number(parts[1]);
    const row = (obj.perStep || []).find((p) => Number(p.step) === step);
    if (!row) throw new Error('repin: no perStep ' + step);
    row[parts[2]] = value;
    return;
  }
  obj[dotted] = value;
}
function getPath(obj, dotted) {
  const parts = dotted.split('.');
  if (parts[0] === 'perStep') {
    const row = (obj.perStep || []).find((p) => Number(p.step) === Number(parts[1]));
    return row ? row[parts[2]] : undefined;
  }
  return obj[dotted];
}

function applyRepins(casesById, repins) {
  const applied = [];
  for (const r of repins.repins) {
    const c = casesById[r.caseId];
    if (!c) throw new Error('repin: unknown case ' + r.caseId);
    const e = c.expected;
    const cur = getPath(e, r.field);
    if (r.kind === 'changed') {
      if (!same(cur, r.old)) {
        throw new Error('repin ' + r.caseId + '.' + r.field + ': current value ' + JSON.stringify(cur) +
          ' no longer equals the recorded old value ' + JSON.stringify(r.old) + ' — the verified set moved; re-derive the re-pin');
      }
      setPath(e, r.field, r.new);
    } else if (r.kind === 'added') {
      if (cur !== undefined && cur !== null) {
        throw new Error('repin ' + r.caseId + '.' + r.field + ': field already present (' + JSON.stringify(cur) + ')');
      }
      setPath(e, r.field, r.new);
      if (r.v2Only) (e.v2Only = e.v2Only || []).push(r.field);
    } else if (r.kind === 'settled') {
      if (r.field === 'contested') e.contested = false;
    } else {
      throw new Error('repin: unknown kind ' + r.kind);
    }
    (e.repinnedBy = e.repinnedBy || []).push({ field: r.field, ruling: r.ruling, kind: r.kind });
    applied.push(r);
  }
  return applied;
}

let _cache = null;

function load() {
  if (_cache) return _cache;
  const verified = asArray(readJson('data/verify/items.verified.json'));
  const flat = asArray(readJson('data/verify/expected_flat.verified.json'));
  const flatById = Object.fromEntries(flat.map((r) => [r.caseId, r]));
  const supplement = asArray(readJson('data/supplement/items.supplement.json'));
  const repins = readJson('truth/repins.json');
  const vocab = readJson('truth/topic_vocab.json');
  const detect = readJson('fixtures/ci_detect.audit-S3.json').items;
  const nameBySlug = Object.fromEntries(vocab.map((v) => [v.slug, v.name]));

  const cases = [];
  const itemsById = {};
  const addItem = (item, origin) => {
    if (!itemsById[item.id]) itemsById[item.id] = item;
    for (const c of item.cases) {
      if (c.excluded) continue;
      const q = item.question;
      const isObj = q.type === 'mcq' || q.type === 'ar';
      const e = JSON.parse(JSON.stringify(c.expected));
      const f = flatById[c.caseId] || {};
      // Fold the flat-only flags into the expectation (the flat file is derived from the
      // same verification; items.verified omits these three keys).
      for (const k of ['departureFlagRequired', 'wrongStepAcceptable', 'declineAcceptable']) {
        if (e[k] === undefined && f[k] !== undefined) e[k] = f[k];
      }
      if (e.declineAcceptable === undefined) e.declineAcceptable = e.totalMarks === null;
      const options = q.options ? Object.values(q.options) : null;
      const optionLetters = q.options ? Object.keys(q.options) : null;
      const finalStep = (item.scheme || [])[item.scheme.length - 1];
      cases.push({
        caseId: c.caseId,
        itemId: item.id,
        origin,
        subject: item.subject,
        marks: Number(q.marks),
        section: q.section || '',
        qType: q.type,
        objective: isObj,
        options,
        optionLetters,
        correctOption: q.correctOption || null,
        answerText: isObj && q.options && q.correctOption ? q.options[q.correctOption] : null,
        studentOption: e.objective ? e.objective.studentOption || null : null,
        questionText: composeQuestion(item),
        schemeSteps: schemeSteps(item),
        finalAnswer: finalStep ? String(finalStep.valuePoint) : null,
        mode: c.mode,
        textAnswer: c.mode === 'typed' ? String(c.text || '').trim() : null,
        transcript: String(c.text || ''),
        image: c.image || null,
        imageCompressed: c.imageCompressed || null,
        synthetic: c.mode === 'image' ? c.synthetic === true : null,
        chapterKey: item.chapterTrue.appTopicKey,
        chapterName: nameBySlug[item.chapterTrue.appTopicKey] || item.chapterTrue.name,
        probes: c.probes || [],
        expected: e,
        detect: detect[item.id] || null,
      });
    }
  };
  for (const it of verified) addItem(it, 'verified');
  for (const it of supplement) addItem(it, 'supplement');
  const casesById = Object.fromEntries(cases.map((c) => [c.caseId, c]));
  const appliedRepins = applyRepins(casesById, repins);

  const owner = readJson('owner-anomaly-01/case.json');
  const probes = readJson('probes/injection.json');
  const mismatch = resolveMismatch(readJson('truth/mismatch.json'), { itemsById, casesById, detect, nameBySlug });

  // GRADER-CORE-1 PR-2 · the four CONTROLLER TEST PAPERS (owner addendum 2026-10-05). SYNTHETIC
  // answer sheets (font-rendered handwriting) for CBSE published questions, every value point
  // cited (controller-papers/INDEX.md). One question = one case (`items[].cases[0]`).
  const papers = ['paper-01', 'paper-02', 'paper-03', 'paper-04'].map((p) => {
    const key = readJson('controller-papers/' + p + '/key.json');
    if (key.synthetic !== true) throw new Error('controller paper ' + p + ' is not labelled synthetic');
    return {
      paperId: p, dir: 'controller-papers/' + p, key,
      questions: key.items.map((it) => ({
        id: it.id, qNumber: it.qNumber, subject: it.subject, marks: it.question.marks, questionText: it.question.text,
        objective: it.question.type === 'mcq' || it.question.type === 'ar', chapterName: (it.chapterTrue && it.chapterTrue.name) || '',
        chapterKey: (it.chapterTrue && it.chapterTrue.appTopicKey) || null,
        caseId: it.cases[0].caseId, answerImage: 'controller-papers/' + p + '/' + it.cases[0].image, expected: it.cases[0].expected,
      })),
    };
  });
  const paperCaseById = Object.fromEntries(papers.flatMap((p) => p.questions.map((q) => [q.caseId, { ...q, paperId: p.paperId }])));

  // GRADER-CORE-1 PR-3 · the DUPLICATE-NUMBER paper (Controller B's T2, copied: dup-number-T2/
  // key.json "provenance"). SYNTHETIC answers. Two different questions are printed "Q5", so its
  // results are matched to questions by POSITION. Graded as ONE set only (no per-question crops).
  const dupKey = readJson('dup-number-T2/key.json');
  if (dupKey.synthetic !== true) throw new Error('dup-number-T2 is not labelled synthetic');
  const dupPaper = {
    paperId: dupKey.paperId, dir: 'dup-number-T2', key: dupKey,
    questions: dupKey.items.map((it) => ({
      id: it.id, qNumber: it.qNumber, position: it.position, subject: it.subject, marks: it.question.marks, questionText: it.question.text,
      objective: it.question.type === 'mcq' || it.question.type === 'ar', chapterName: (it.chapterTrue && it.chapterTrue.name) || '',
      chapterKey: (it.chapterTrue && it.chapterTrue.appTopicKey) || null, caseId: it.cases[0].caseId, expected: it.cases[0].expected,
    })),
  };
  for (const q of dupPaper.questions) paperCaseById[q.caseId] = { ...q, paperId: dupPaper.paperId };

  _cache = { cases, casesById, itemsById, repins, appliedRepins, vocab, nameBySlug, owner, probes, mismatch, papers, paperCaseById, dupPaper, GOLDEN_DIR };
  return _cache;
}

// The answer-question MISMATCH cases (owner addendum 2026-10-05), resolved from their
// compositions into concrete questions + answers. Every reference must resolve.
function resolveMismatch(raw, ctx) {
  const answerOf = (a) => {
    if (a.file) return { mode: 'upload', file: a.file, mime: a.mime };
    const src = ctx.casesById[a.fromCase];
    if (!src) throw new Error('mismatch: unknown answer case ' + a.fromCase);
    if (src.mode !== 'typed') throw new Error('mismatch: answer case ' + a.fromCase + ' is not typed');
    let text = src.textAnswer;
    if (Array.isArray(a.keepLines)) text = text.split('\n').filter((_, i) => a.keepLines.includes(i)).join('\n');
    return { mode: 'typed', text, fromCase: a.fromCase };
  };
  const questionOf = (q, fallbackFromCase) => {
    if (q.placeholder) {
      const src = ctx.casesById[fallbackFromCase];
      return { questionText: q.placeholder, subject: q.subject, marks: src.marks, topic: q.placeholder, objective: false, itemId: null };
    }
    const item = ctx.itemsById[q.fromItem];
    if (!item) throw new Error('mismatch: unknown question item ' + q.fromItem);
    const d = ctx.detect[item.id];
    return {
      questionText: composeQuestion(item), subject: item.subject, marks: Number(item.question.marks),
      topic: d ? d.topicName : (ctx.nameBySlug[item.chapterTrue.appTopicKey] || item.chapterTrue.name),
      objective: Boolean(d && d.objective === true), itemId: item.id,
    };
  };
  const out = [];
  for (const c of raw.cases) {
    if (Array.isArray(c.questions)) {
      out.push({ ...c, label: raw.label, resolvedQuestions: c.questions.map((q) => {
        const exp = { ...q.expected };
        if (exp.expectedFromCase) {
          const e = ctx.casesById[exp.expectedFromCase].expected;
          Object.assign(exp, { totalMarks: e.totalMarks, mistakeType: e.mistakeType, wrongStep: e.wrongStep });
        }
        return { qNumber: q.qNumber, ...questionOf(q.question), answer: answerOf(q.answer), expected: exp };
      }) });
    } else {
      out.push({ ...c, label: raw.label, resolved: { ...questionOf(c.question, c.answer.fromCase), answer: answerOf(c.answer) } });
    }
  }
  return out;
}

function goldenFile(rel) {
  return path.join(GOLDEN_DIR, rel);
}

module.exports = { load, composeQuestion, schemeSteps, goldenFile, GOLDEN_DIR, readJson, applyRepins };
