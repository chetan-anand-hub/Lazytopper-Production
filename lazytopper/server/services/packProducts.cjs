'use strict';
// PACKS-SERVER-1 - the PDF pack catalogue. Server-only, pure (no I/O, no clock).
//
// ★★ THE PRICE IS DECIDED HERE AND NOWHERE ELSE (contract §0/§1). routes/payments.cjs reads
//   `PACK_PRODUCTS[sku].priceInr` and nothing from the request body contributes an amount.
// ★ `PACK_CHAPTERS` is a HARDCODED copy of the 26 authored topic slugs of
//   src/lib/desktop/topics.ts (the server cannot import TypeScript). packProducts.test.cjs reads that
//   file and fails if the two ever differ.
// ★ The coverage functions (ownsChapter / ownsMocks / isAlreadyOwned) are the SERVER copy of contract §3;
//   the client carries the same function and the same tests.

const PACK_PRODUCTS = Object.freeze({
  pack_chapter: Object.freeze({ priceInr: 49, needsTarget: 'chapter' }),
  pack_mock: Object.freeze({ priceInr: 99, needsTarget: 'subject' }),
  pack_subject: Object.freeze({ priceInr: 199, needsTarget: 'subject' }),
  pack_bundle: Object.freeze({ priceInr: 299, needsTarget: null }),
  // CBQ-PACK-1: a SEPARATE product (not covered by, and not covering, subject/bundle).
  pack_cbq: Object.freeze({ priceInr: 199, needsTarget: 'subject' }),
});

const PACK_SUBJECTS = Object.freeze(['maths', 'science']);

const PACK_CHAPTERS = Object.freeze({
  'real-numbers': 'maths',
  polynomials: 'maths',
  'pair-of-linear-equations': 'maths',
  'quadratic-equations': 'maths',
  'arithmetic-progression': 'maths',
  triangles: 'maths',
  'coordinate-geometry': 'maths',
  trigonometry: 'maths',
  circles: 'maths',
  'areas-related-to-circles': 'maths',
  'surface-areas-and-volumes': 'maths',
  statistics: 'maths',
  probability: 'maths',
  'chemical-reactions-and-equations': 'science',
  'acids-bases-and-salts': 'science',
  'metals-and-non-metals': 'science',
  'carbon-and-its-compounds': 'science',
  'light-reflection-and-refraction': 'science',
  'human-eye-and-colourful-world': 'science',
  electricity: 'science',
  'magnetic-effects-of-electric-current': 'science',
  'life-processes': 'science',
  'control-and-coordination': 'science',
  'how-do-organisms-reproduce': 'science',
  heredity: 'science',
  'our-environment': 'science',
});

const BUNDLE_TARGET = 'all';
const has = (obj, key) => typeof key === 'string' && Object.prototype.hasOwnProperty.call(obj, key);

/** The PACKS_ENABLED switch (contract §7): exactly "1" turns it on; anything else is off. */
function packsEnabled(env = process.env) {
  return String((env && env.PACKS_ENABLED) || '').trim() === '1';
}

/** True for a key of the closed pack table. */
function isPackProduct(key) {
  return has(PACK_PRODUCTS, key);
}

/** The chapter slugs of one subject, in table order. */
function chaptersOf(subject) {
  return Object.keys(PACK_CHAPTERS).filter((slug) => PACK_CHAPTERS[slug] === subject);
}

/**
 * The normalised target for `sku`, or null when `target` is not acceptable for it.
 * chapter -> one of the 26 slugs; mock / subject -> "maths" | "science"; bundle -> always "all"
 * (any supplied value is ignored, contract §1).
 */
function validateTarget(sku, target) {
  if (!isPackProduct(sku)) return null;
  const need = PACK_PRODUCTS[sku].needsTarget;
  if (need === null) return BUNDLE_TARGET;
  if (need === 'chapter') return has(PACK_CHAPTERS, target) ? target : null;
  return typeof target === 'string' && PACK_SUBJECTS.includes(target) ? target : null;
}

/** `"<sku>:<target>"`; the bundle is `"pack_bundle:all"`. null when the pair is invalid. */
function packIdFor(sku, target) {
  const t = validateTarget(sku, target);
  return t === null ? null : `${sku}:${t}`;
}

/** Split a stored packId back into { sku, target }, or null when it is not a valid pack id. */
function parsePackId(packId) {
  if (typeof packId !== 'string') return null;
  const i = packId.indexOf(':');
  if (i <= 0) return null;
  const sku = packId.slice(0, i);
  const target = packId.slice(i + 1);
  return validateTarget(sku, target) === target ? { sku, target } : null;
}

function idSet(packs) {
  const out = new Set();
  for (const p of Array.isArray(packs) ? packs : []) {
    if (p && typeof p.packId === 'string') out.add(p.packId);
  }
  return out;
}

/** Contract §3. True if pack_chapter:<slug>, pack_subject:<subjectOf(slug)> or pack_bundle:all is owned. */
function ownsChapter(packs, slug) {
  if (!has(PACK_CHAPTERS, slug)) return false;
  const ids = idSet(packs);
  return (
    ids.has(`pack_chapter:${slug}`) ||
    ids.has(`pack_subject:${PACK_CHAPTERS[slug]}`) ||
    ids.has(`pack_bundle:${BUNDLE_TARGET}`)
  );
}

/** Contract §3. True if pack_mock:<s>, pack_subject:<s> or pack_bundle:all is owned. */
function ownsMocks(packs, subject) {
  if (typeof subject !== 'string' || !PACK_SUBJECTS.includes(subject)) return false;
  const ids = idSet(packs);
  return ids.has(`pack_mock:${subject}`) || ids.has(`pack_subject:${subject}`) || ids.has(`pack_bundle:${BUNDLE_TARGET}`);
}

/** CBQ-PACK-1. Only `pack_cbq:<subject>` itself owns it: neither the Subject Pack nor the Bundle include CBQs. */
function ownsCbq(packs, subject) {
  if (typeof subject !== 'string' || !PACK_SUBJECTS.includes(subject)) return false;
  return idSet(packs).has(`pack_cbq:${subject}`);
}

/**
 * Contract §3: a request is already owned when EVERYTHING it would grant is already owned.
 *   chapter -> that chapter; mock -> that subject's mocks; subject -> its 13 chapters AND its mocks;
 *   bundle -> all 26 chapters AND both mock sets. An invalid (sku, target) is never "owned".
 */
function isAlreadyOwned(packs, sku, target) {
  const t = validateTarget(sku, target);
  if (t === null) return false;
  if (sku === 'pack_chapter') return ownsChapter(packs, t);
  if (sku === 'pack_mock') return ownsMocks(packs, t);
  if (sku === 'pack_cbq') return ownsCbq(packs, t);
  if (sku === 'pack_subject') return chaptersOf(t).every((slug) => ownsChapter(packs, slug)) && ownsMocks(packs, t);
  return Object.keys(PACK_CHAPTERS).every((slug) => ownsChapter(packs, slug)) && PACK_SUBJECTS.every((s) => ownsMocks(packs, s));
}

module.exports = {
  PACK_PRODUCTS,
  PACK_CHAPTERS,
  PACK_SUBJECTS,
  BUNDLE_TARGET,
  packsEnabled,
  isPackProduct,
  chaptersOf,
  validateTarget,
  packIdFor,
  parsePackId,
  ownsChapter,
  ownsMocks,
  ownsCbq,
  isAlreadyOwned,
};
