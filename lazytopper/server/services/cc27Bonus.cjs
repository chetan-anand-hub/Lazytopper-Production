'use strict';
// CC27-SITE-1 - the Crash Course 2027 bonus: pure catalogue + entitlement ladder. No I/O, no clock.
//
// A FREE BONUS inside paid products, never sold alone. Fixed private objects under packs/bonus/cc27/ (uploaded by the owner),
// served as 15-minute signed links by routes/packs.cjs (same auth / ownership / re-download window / rate limit as BONUS-BOOK-1).
//
// Ladder (computed on the SERVER from the existing ownership records):
//   Board Pass (a running paid pass) / Test Series Pack (test_series:all) -> both subject books + every chapter file
//   Bundle (pack_bundle:all)                                              -> both books + every chapter file
//   Subject Pack (pack_subject:<s>)                                       -> that subject's book + its chapter files
//   CBQ Pack (pack_cbq:<s>)                                               -> that subject's book
//   Chapter Pack (pack_chapter:<slug>) or any owner of that chapter       -> that chapter's file(s)
//   Mock pack / free / trial                                              -> nothing

const { PACK_CHAPTERS } = require('./packProducts.cjs');

const CC27_DIR = 'packs/bonus/cc27/';
/** Kill switch: CC27_BONUS_DISABLED=1 -> no rows in /mine and the link route answers 404. */
function isCc27Disabled(env = process.env) {
  return /^(1|true|on|yes)$/i.test(String((env && env.CC27_BONUS_DISABLED) || '').trim());
}

/** The product slugs whose Crash Course chapter file is not 1:1 by name. Source file names are in UPLOAD_MANIFEST. */
const TRIG_FILES = Object.freeze(['trigonometry-intro', 'trigonometry-applications']);

/** file key -> { path, filename, label }. Keys: `book:<subject>` and `ch:<object-name-without-extension>`. */
function buildCatalogue() {
  const files = {};
  const SUBJ = { maths: 'Maths', science: 'Science' };
  for (const s of Object.keys(SUBJ)) {
    files[`book:${s}`] = { path: `${CC27_DIR}cc27-book-${s}.pdf`, filename: `LazyTopper-Crash-Course-2027-${SUBJ[s]}.pdf`, label: `Crash Course 2027 - ${SUBJ[s]}` };
  }
  const chapterFiles = {}; // slug -> [fileKey]
  for (const [slug, subject] of Object.entries(PACK_CHAPTERS)) {
    const names = slug === 'trigonometry' ? TRIG_FILES : [slug];
    chapterFiles[slug] = names.map((n) => {
      const key = `ch:${subject}-${n}`;
      files[key] = { path: `${CC27_DIR}cc27-${subject}-${n}.pdf`, filename: `LazyTopper-Crash-Course-2027-${SUBJ[subject]}-${n}.pdf`, label: n.replace(/-/g, ' ') };
      return key;
    });
  }
  return { files: Object.freeze(files), chapterFiles: Object.freeze(chapterFiles) };
}
const { files: CC27_FILES, chapterFiles: CC27_CHAPTER_FILES } = buildCatalogue();

/**
 * The file keys a caller may download. `ownedPackIds` = the packIds inside their re-download window; `boardPass` = a running paid
 * Board Pass (true / false / null=unknown, which is treated as not entitled).
 */
function entitledFileKeys(ownedPackIds, boardPass) {
  const ids = new Set(Array.isArray(ownedPackIds) ? ownedPackIds.filter((x) => typeof x === 'string') : []);
  const out = new Set();
  const all = boardPass === true || ids.has('test_series:all');
  const bundle = ids.has('pack_bundle:all');
  for (const subject of ['maths', 'science']) {
    if (all || bundle || ids.has(`pack_subject:${subject}`) || ids.has(`pack_cbq:${subject}`)) out.add(`book:${subject}`);
  }
  for (const [slug, subject] of Object.entries(PACK_CHAPTERS)) {
    if (all || bundle || ids.has(`pack_subject:${subject}`) || ids.has(`pack_chapter:${slug}`)) for (const k of CC27_CHAPTER_FILES[slug]) out.add(k);
  }
  return [...out];
}

module.exports = { CC27_DIR, CC27_FILES, CC27_CHAPTER_FILES, isCc27Disabled, entitledFileKeys };
