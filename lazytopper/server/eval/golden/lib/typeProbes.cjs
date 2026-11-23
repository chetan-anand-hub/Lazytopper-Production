'use strict';
// lib/typeProbes.cjs — GRADER-TYPE-1: score one type probe's reply against the owner ruling it pins. Pure; no model, no clock.
// The probe's `expect` bounds the server's own ledger (`marksLostByType`) and the awarded marks — never comment prose.

function resultOf(body, entry) {
  if (!body || body.ok === false) return null;
  if (entry === 'single') return body;
  return Array.isArray(body.results) ? body.results[0] : null;
}

function boundOk(value, bound) {
  const v = Number(value) || 0;
  if (bound === 'gt0') return v > 0;
  if (bound === 'eq0') return v === 0;
  return typeof bound === 'number' ? Math.abs(v - bound) < 1e-9 : true;
}

/** @returns {{pass:boolean, failures:string[], lost:object|null, marks:number|null}} */
function checkProbe(body, entry, expect) {
  const r = resultOf(body, entry);
  if (!r || r.couldNotRead || !r.marksLostByType) return { pass: false, failures: ['no graded result with marksLostByType'], lost: null, marks: null };
  const failures = [];
  const lost = r.marksLostByType;
  for (const [k, bound] of Object.entries((expect && expect.marksLostByType) || {})) {
    if (!boundOk(lost[k], bound)) failures.push('marksLostByType.' + k + '=' + (lost[k] == null ? 0 : lost[k]) + ' expected ' + bound);
  }
  const m = Number(r.marksAwarded);
  if (expect && Array.isArray(expect.marks) && !(m >= expect.marks[0] && m <= expect.marks[1])) failures.push('marksAwarded=' + m + ' expected ' + expect.marks.join('..'));
  return { pass: failures.length === 0, failures, lost, marks: m };
}

module.exports = { checkProbe, resultOf, boundOk };
