/**
 * Server-side visual lookup service.
 *
 * Resolves a topic key to a pre-built visual from the persistent visual store
 * (public/visuals/ on disk). This is the server-side counterpart to the
 * client-side visualConceptRegistry.ts / findVisualForConcept function.
 *
 * The lookup is read-only (no DB mutations). It returns a filePath suitable
 * for serving as a browser URL (/visuals/...) and a human-readable title.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Canonical topic slug → { subjectSlug, chapterSlug }
// Matches the chapter/concept structure of visualConceptRegistry.ts
const TOPIC_TO_CHAPTER = {
  // Maths
  'real-numbers': { subjectSlug: 'maths', chapterSlug: 'real-numbers' },
  'polynomials': { subjectSlug: 'maths', chapterSlug: 'polynomials' },
  'pair-of-linear-equations': { subjectSlug: 'maths', chapterSlug: 'linear-equations' },
  'pair-of-linear-equations-in-two-variables': { subjectSlug: 'maths', chapterSlug: 'linear-equations' },
  'linear-equations': { subjectSlug: 'maths', chapterSlug: 'linear-equations' },
  'quadratic-equations': { subjectSlug: 'maths', chapterSlug: 'quadratic-equations' },
  'arithmetic-progression': { subjectSlug: 'maths', chapterSlug: 'arithmetic-progression' },
  'arithmetic-progressions': { subjectSlug: 'maths', chapterSlug: 'arithmetic-progression' },
  'triangles': { subjectSlug: 'maths', chapterSlug: 'triangles' },
  'coordinate-geometry': { subjectSlug: 'maths', chapterSlug: 'coordinate-geometry' },
  'trigonometry': { subjectSlug: 'maths', chapterSlug: 'trigonometry' },
  'introduction-to-trigonometry': { subjectSlug: 'maths', chapterSlug: 'trigonometry' },
  'maths-introduction-trigonometry': { subjectSlug: 'maths', chapterSlug: 'trigonometry' },
  'maths-applications-trigonometry': { subjectSlug: 'maths', chapterSlug: 'trigonometry' },
  'circles': { subjectSlug: 'maths', chapterSlug: 'circles' },
  'areas-related-to-circles': { subjectSlug: 'maths', chapterSlug: 'areas-related-to-circles' },
  'surface-areas-and-volumes': { subjectSlug: 'maths', chapterSlug: 'surface-areas-and-volumes' },
  'statistics': { subjectSlug: 'maths', chapterSlug: 'statistics' },
  'probability': { subjectSlug: 'maths', chapterSlug: 'probability' },
  // Science
  'chemical-reactions-and-equations': { subjectSlug: 'science', chapterSlug: 'chemical-reactions-and-equations' },
  'acids-bases-and-salts': { subjectSlug: 'science', chapterSlug: 'acids-bases-and-salts' },
  'metals-and-non-metals': { subjectSlug: 'science', chapterSlug: 'metals-and-non-metals' },
  'carbon-and-its-compounds': { subjectSlug: 'science', chapterSlug: 'carbon-and-its-compounds' },
  'life-processes': { subjectSlug: 'science', chapterSlug: 'life-processes' },
  'control-and-coordination': { subjectSlug: 'science', chapterSlug: 'control-and-coordination' },
  'control-and-co-ordination': { subjectSlug: 'science', chapterSlug: 'control-and-coordination' },
  'reproduction': { subjectSlug: 'science', chapterSlug: 'reproduction' },
  'how-do-organisms-reproduce': { subjectSlug: 'science', chapterSlug: 'reproduction' },
  'heredity': { subjectSlug: 'science', chapterSlug: 'heredity' },
  'heredity-and-evolution': { subjectSlug: 'science', chapterSlug: 'heredity' },
  'light-reflection-and-refraction': { subjectSlug: 'science', chapterSlug: 'light-reflection-and-refraction' },
  'light-reflection-and-refraction-incl-human-eye-prism': { subjectSlug: 'science', chapterSlug: 'light-reflection-and-refraction' },
  'human-eye': { subjectSlug: 'science', chapterSlug: 'human-eye-and-colourful-world' },
  'human-eye-and-colourful-world': { subjectSlug: 'science', chapterSlug: 'human-eye-and-colourful-world' },
  'electricity': { subjectSlug: 'science', chapterSlug: 'electricity' },
  'magnetic-effects': { subjectSlug: 'science', chapterSlug: 'magnetic-effects' },
  'magnetic-effects-of-electric-current': { subjectSlug: 'science', chapterSlug: 'magnetic-effects' },
};

/**
 * Convert a raw topic key string to a canonical slug for lookup.
 * Examples:
 *   "Trigonometry" → "trigonometry"
 *   "Introduction to Trigonometry" → "introduction-to-trigonometry"
 *   "maths_introduction_trigonometry" → "maths-introduction-trigonometry"
 */
function canonicalise(topicKey) {
  return String(topicKey || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Derive a human-readable concept title from a filename slug.
 * Example: "trigonometric-ratios" → "Trigonometric Ratios"
 */
function titleFromSlug(slug) {
  return slug
    .replace(/-+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Look up the first pre-built visual for a given topic from the filesystem.
 *
 * @param {string} topicKey  - Raw topic key (any casing/separator)
 * @param {string} subject   - "Maths" or "Science" (or lowercase variant)
 * @param {string} visualsDir - Absolute path to the visuals root directory
 * @returns {{ filePath: string, title: string } | null}
 *   filePath is the browser-accessible URL (e.g. /visuals/maths/trigonometry/trigonometric-ratios.html)
 *   Returns null when no visual exists for the topic.
 */
function findVisualForTopicFromStore(topicKey, subject, visualsDir) {
  if (!visualsDir || !topicKey) return null;

  const slug = canonicalise(topicKey);

  // Resolve to (subjectSlug, chapterSlug) via the lookup map.
  let chapter = TOPIC_TO_CHAPTER[slug];

  // Fallback: if not in map, derive from the subject parameter + topic slug directly.
  if (!chapter) {
    const subjectNorm = String(subject || '').toLowerCase().includes('sci') ? 'science' : 'maths';
    chapter = { subjectSlug: subjectNorm, chapterSlug: slug };
  }

  const { subjectSlug, chapterSlug } = chapter;
  const chapterDir = path.join(visualsDir, subjectSlug, chapterSlug);

  let files;
  try {
    files = fs.readdirSync(chapterDir).filter((f) => f.endsWith('.html')).sort();
  } catch (_) {
    return null;
  }

  if (!files.length) return null;

  const firstFile = files[0];
  const conceptSlug = firstFile.replace(/\.html$/, '');
  const filePath = `/visuals/${subjectSlug}/${chapterSlug}/${firstFile}`;
  const title = titleFromSlug(conceptSlug);

  return { filePath, title, chapter: chapterSlug, subject: subjectSlug };
}

module.exports = { findVisualForTopicFromStore, canonicalise };
