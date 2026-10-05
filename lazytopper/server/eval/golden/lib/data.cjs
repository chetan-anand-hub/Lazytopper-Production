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

  _cache = { cases, casesById, itemsById, repins, appliedRepins, vocab, nameBySlug, owner, probes, GOLDEN_DIR };
  return _cache;
}

function goldenFile(rel) {
  return path.join(GOLDEN_DIR, rel);
}

module.exports = { load, composeQuestion, schemeSteps, goldenFile, GOLDEN_DIR, readJson, applyRepins };
