/**
 * Generated question pool — caches AI-generated "More like this" questions.
 *
 * Lifecycle:
 *  1. moreLikeThis route calls pickFromPool() BEFORE calling Gemini.
 *     pickFromPool returns candidate rows (with their DB ids) WITHOUT yet
 *     incrementing hit_count — the route has not decided to use them yet.
 *  2. If pool has >= numVariants rows, route calls markServed(ids) to
 *     increment hit_count on the rows it is about to return, then serves them.
 *  3. On a pool miss (or partial miss), route calls Gemini, then calls
 *     saveToPool() fire-and-forget to persist all generated variants.
 *
 * Pool rotation: questions are returned in ascending hit_count order so the
 * least-used variants surface first. hit_count is only incremented for rows
 * that are actually served to the client.
 *
 * Deduplication: saveToPool() stores an MD5 hash of the question_text and the
 * DB has a unique index on (topic_key, subject, question_hash), so concurrent
 * saves of identical questions are safe.
 */

const crypto = require('crypto');

let _pool = null;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (_pool) return _pool;
  try {
    const pg = require('pg');
    const Pool = pg.Pool || pg.default?.Pool;
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
    _pool.on('error', (err) => console.warn('[gen-q-pool] pool error:', err.message));
    return _pool;
  } catch (e) {
    console.warn('[gen-q-pool] pg unavailable:', e.message);
    return null;
  }
}

function norm(v) {
  if (v == null) return null;
  const s = String(v).toLowerCase().trim();
  return s === '' ? null : s;
}

/**
 * Hash the full dedup key: (topicKey, subject, marks, difficulty, questionText).
 * All five fields feed the hash so questions with the same text but different
 * marks/difficulty are treated as distinct pool entries.
 */
function hashKey(topicKey, subject, marks, difficulty, questionText) {
  const composite = [
    String(topicKey ?? ''),
    String(subject ?? ''),
    marks != null ? String(marks) : 'null',
    difficulty != null ? String(difficulty) : 'null',
    String(questionText),
  ].join('|');
  return crypto.createHash('md5').update(composite).digest('hex');
}

/**
 * Pick up to `n` questions from the pool for the given key.
 * Returns candidates with their DB ids but does NOT yet increment hit_count.
 * Call markServed(ids) if and only if you decide to serve these rows.
 *
 * @returns {Promise<Array<{id, text, marks, difficulty, bloomSkill}>>}
 */
async function pickFromPool(topicKey, subject, marks, difficulty, n) {
  const pool = getPool();
  if (!pool) return [];
  if (!topicKey || !subject) return [];

  const normTopic = norm(topicKey);
  const normSubject = norm(subject);
  const normMarks = marks != null ? Number(marks) : null;
  const normDiff = norm(difficulty);

  try {
    const result = await pool.query(
      `SELECT id, question_text, marks, difficulty, bloom_skill
       FROM generated_questions
       WHERE topic_key = $1
         AND subject   = $2
         AND (marks    = $3 OR ($3 IS NULL AND marks IS NULL))
         AND (difficulty = $4 OR ($4 IS NULL AND difficulty IS NULL))
       ORDER BY hit_count ASC, created_at DESC
       LIMIT $5`,
      [normTopic, normSubject, normMarks, normDiff, n]
    );

    return result.rows.map(r => ({
      id: r.id,
      text: r.question_text,
      marks: r.marks,
      difficulty: r.difficulty,
      bloomSkill: r.bloom_skill,
    }));
  } catch (e) {
    console.warn('[gen-q-pool] pickFromPool error:', e.message);
    return [];
  }
}

/**
 * Increment hit_count on the rows that were actually served to the client.
 * Call this AFTER deciding the pool result is sufficient.
 *
 * @param {number[]} ids  DB ids of served rows
 */
async function markServed(ids) {
  if (!ids || ids.length === 0) return;
  const pool = getPool();
  if (!pool) return;
  try {
    await pool.query(
      `UPDATE generated_questions SET hit_count = hit_count + 1
       WHERE id = ANY($1::int[])`,
      [ids]
    );
    console.info(`[gen-q-pool] markServed ids=[${ids.join(',')}]`);
  } catch (e) {
    console.warn('[gen-q-pool] markServed error:', e.message);
  }
}

/**
 * Save generated variants to the pool.
 * Uses question_hash (MD5 of question_text) for duplicate detection with the
 * DB unique index on (topic_key, subject, question_hash).
 * Concurrent duplicate inserts are silently swallowed by ON CONFLICT DO NOTHING.
 *
 * @param {string}  topicKey
 * @param {string}  subject
 * @param {number|null} marks
 * @param {string|null} difficulty
 * @param {Array<{text, marks, difficulty, bloomSkill}>} variants
 */
async function saveToPool(topicKey, subject, marks, difficulty, variants) {
  const pool = getPool();
  if (!pool) return;
  if (!Array.isArray(variants) || variants.length === 0) return;
  if (!topicKey || !subject) return;

  const normTopic = norm(topicKey);
  const normSubject = norm(subject);
  const normMarks = marks != null ? Number(marks) : null;
  const normDiff = norm(difficulty);

  const rows = variants
    .map(v => String(v?.text || '').trim())
    .filter(Boolean);

  if (rows.length === 0) return;

  try {
    // Build a single bulk INSERT … ON CONFLICT DO NOTHING statement.
    // Each row gets 7 parameters; the shared topic/marks/diff are inlined once per row.
    const params = [];
    const valueClauses = rows.map((questionText, i) => {
      const qHash = hashKey(normTopic, normSubject, normMarks, normDiff, questionText);
      const bloomSkill = norm(
        variants.find(v => String(v?.text || '').trim() === questionText)?.bloomSkill
      ) || null;
      const base = i * 7;
      params.push(normTopic, normSubject, normMarks, normDiff, questionText, qHash, bloomSkill);
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, 0, NOW())`;
    });

    const result = await pool.query(
      `INSERT INTO generated_questions
         (topic_key, subject, marks, difficulty, question_text, question_hash, bloom_skill, hit_count, created_at)
       VALUES ${valueClauses.join(', ')}
       ON CONFLICT (topic_key, subject, question_hash) DO NOTHING`,
      params
    );
    console.info(`[gen-q-pool] SAVED topic=${normTopic} marks=${normMarks} diff=${normDiff} new=${result.rowCount}/${rows.length}`);
  } catch (e) {
    console.warn('[gen-q-pool] saveToPool error:', e.message);
  }
}

module.exports = { pickFromPool, markServed, saveToPool };
