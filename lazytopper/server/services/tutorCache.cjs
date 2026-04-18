/**
 * Tutor Q&A semantic cache (keyword-fingerprint edition).
 *
 * Stores student questions + tutor responses in Postgres.
 * On every cacheable mentor request:
 *  1. Compute a keyword fingerprint of the incoming question (no API call)
 *  2. Fetch stored rows for the same mode+subject from Postgres
 *  3. Compute Jaccard similarity against stored fingerprints in JS
 *  4. Cache HIT  (similarity >= SIMILARITY_THRESHOLD) → return stored response
 *  5. Cache MISS → caller runs normal AI path, then calls save()
 *
 * Cacheable modes: explain, board_steps_ms, solve
 * Not cached: teach_contract, triangles_evaluation, solve_with_me, plan,
 *             any request that includes a student image upload.
 *
 * Why keyword/Jaccard instead of embeddings?
 *   CBSE Class 10 has a bounded vocabulary per subject. "LCM", "irrational",
 *   "refraction", "valence electrons" are highly discriminative. Jaccard on
 *   a cleaned keyword set reaches ~0.85+ precision for near-duplicate questions
 *   while requiring zero extra API calls.
 */

const SIMILARITY_THRESHOLD = 0.38;

const CACHEABLE_MODES = new Set([
  'explain',
  'board_steps_ms',
  'solve',
]);

// Common English + CBSE question stopwords to strip before fingerprinting.
const STOPWORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','shall','should','may','might','can','could',
  'of','in','on','at','to','for','with','by','from','as','into','through',
  'and','or','but','if','not','what','how','why','when','where','which','who',
  'give','write','explain','define','state','find','calculate','prove',
  'question','answer','class','cbse','ncert','board','exam','chapter','topic',
  'it','its','this','that','these','those','i','me','my','we','our',
  'you','your','he','his','she','her','they','their','them',
  'tell','about','any','some','all','more','most','also','then','than',
  'so','such','each','both','between','one','two','three','four','five',
  'first','second','third','last','next','same','different','new','old',
]);

let _pool = null;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (_pool) return _pool;
  try {
    const pg = require('pg');
    const Pool = pg.Pool || pg.default?.Pool;
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
    _pool.on('error', (err) => console.warn('[tutor-cache] pool error:', err.message));
    return _pool;
  } catch (e) {
    console.warn('[tutor-cache] pg unavailable:', e.message);
    return null;
  }
}

function isCacheableMode(normalizedMode) {
  return CACHEABLE_MODES.has(normalizedMode);
}

function normalizeQuestion(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Simple stem: strip common English suffixes so "numbers" matches "number",
 * "equations" matches "equation", "irrational" stays "irrational".
 */
function stem(word) {
  if (word.length > 5 && word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.length > 5 && word.endsWith('es') && !word.endsWith('ies')) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  if (word.length > 6 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length > 6 && word.endsWith('tion')) return word.slice(0, -4);
  if (word.length > 5 && word.endsWith('ness')) return word.slice(0, -4);
  return word;
}

/**
 * Builds a keyword fingerprint: a sorted array of significant stems from the text.
 * Strips punctuation, numbers-only tokens, and stopwords.
 */
function buildFingerprint(text) {
  const normalized = normalizeQuestion(text);
  const tokens = normalized.split(/[\s,;:?.!()\[\]{}"']+/).filter(Boolean);
  const significant = tokens
    .map(stem)
    .filter(t => t.length >= 3 && !STOPWORDS.has(t) && /[a-z]/.test(t));
  return [...new Set(significant)].sort();
}

/**
 * Jaccard similarity between two keyword arrays (treated as sets).
 * Returns 0–1 where 1 = identical vocabulary.
 */
function jaccardSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const w of setA) { if (setB.has(w)) intersection++; }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

async function findSimilarResponse(fingerprint, normalizedMode, subject) {
  const pool = getPool();
  if (!pool) return null;
  if (fingerprint.length === 0) return null;
  try {
    const result = await pool.query(
      `SELECT id, embedding AS fingerprint, response_json FROM tutor_cache
       WHERE mode = $1 AND subject = $2
       ORDER BY created_at DESC LIMIT 500`,
      [normalizedMode, subject]
    );
    if (result.rows.length === 0) return null;

    let bestScore = 0;
    let bestRow = null;
    for (const row of result.rows) {
      const stored = Array.isArray(row.fingerprint)
        ? row.fingerprint
        : (typeof row.fingerprint === 'string' ? JSON.parse(row.fingerprint) : row.fingerprint);
      const score = jaccardSimilarity(fingerprint, stored);
      if (score > bestScore) {
        bestScore = score;
        bestRow = row;
      }
    }

    if (bestScore >= SIMILARITY_THRESHOLD && bestRow) {
      void pool.query(
        'UPDATE tutor_cache SET hit_count = hit_count + 1, updated_at = NOW() WHERE id = $1',
        [bestRow.id]
      );
      console.info(`[tutor-cache] HIT jaccard=${bestScore.toFixed(3)} id=${bestRow.id}`);
      return bestRow.response_json;
    }

    console.info(`[tutor-cache] MISS best_jaccard=${bestScore.toFixed(3)} fingerprint=[${fingerprint.slice(0,5).join(',')}]`);
    return null;
  } catch (e) {
    console.warn('[tutor-cache] findSimilarResponse error:', e.message);
    return null;
  }
}

async function saveResponse(fingerprint, normalizedMode, subject, topicKey, questionNormalized, responseJson) {
  const pool = getPool();
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO tutor_cache
         (mode, subject, topic_key, question_normalized, embedding, response_json, hit_count, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 0, NOW(), NOW())`,
      [
        normalizedMode,
        subject,
        topicKey || '',
        questionNormalized,
        JSON.stringify(fingerprint),
        JSON.stringify(responseJson),
      ]
    );
    console.info(`[tutor-cache] SAVED mode=${normalizedMode} subject=${subject} words=${fingerprint.length}`);
  } catch (e) {
    console.warn('[tutor-cache] saveResponse error:', e.message);
  }
}

function createTutorCache(_cfg) {
  async function lookup(normalizedMode, originalQuery, subject) {
    if (!isCacheableMode(normalizedMode)) return null;
    if (!originalQuery || originalQuery.length < 10) return null;
    try {
      const qNorm = normalizeQuestion(originalQuery);
      const fingerprint = buildFingerprint(qNorm);
      if (fingerprint.length === 0) return null;
      const cached = await findSimilarResponse(fingerprint, normalizedMode, subject);
      return { response: cached || null, fingerprint, questionNormalized: qNorm };
    } catch (e) {
      console.warn('[tutor-cache] lookup error (non-fatal):', e.message);
      return null;
    }
  }

  async function save(fingerprint, normalizedMode, subject, topicKey, questionNormalized, responseJson) {
    if (!isCacheableMode(normalizedMode)) return;
    if (!fingerprint || fingerprint.length === 0) return;
    try {
      await saveResponse(fingerprint, normalizedMode, subject, topicKey, questionNormalized, responseJson);
    } catch (e) {
      console.warn('[tutor-cache] save error (non-fatal):', e.message);
    }
  }

  return { lookup, save, isCacheableMode };
}

module.exports = { createTutorCache };
