/**
 * Generated question pool — caches AI-generated "More like this" questions.
 *
 * Before calling Gemini, moreLikeThis.cjs calls pickFromPool().
 * If enough questions exist for (topicKey, subject, marks, difficulty) they
 * are returned immediately — zero API cost.
 *
 * After a Gemini call, saveToPool() stores all returned variants so future
 * requests for the same key are served from the pool.
 *
 * Pool rotation: questions are served in ascending hit_count order so every
 * generated variant gets used before any is repeated.
 */

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

/**
 * Normalise a value for use as a pool key segment.
 * Null/undefined → NULL in SQL; string → lowercase trimmed.
 */
function norm(v) {
  if (v == null) return null;
  const s = String(v).toLowerCase().trim();
  return s === '' ? null : s;
}

/**
 * Pick up to `n` questions from the pool for the given key.
 * Returns the least-used variants first (ascending hit_count).
 * Increments hit_count on every returned row.
 *
 * @returns {Promise<Array<{text, marks, difficulty, bloomSkill}>>}
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
      `SELECT id, question_text, marks, difficulty, bloom_skill, hit_count
       FROM generated_questions
       WHERE topic_key = $1
         AND subject   = $2
         AND (marks    = $3 OR ($3 IS NULL AND marks IS NULL))
         AND (difficulty = $4 OR ($4 IS NULL AND difficulty IS NULL))
       ORDER BY hit_count ASC, created_at DESC
       LIMIT $5`,
      [normTopic, normSubject, normMarks, normDiff, n]
    );

    if (result.rows.length === 0) return [];

    const ids = result.rows.map(r => r.id);
    void pool.query(
      `UPDATE generated_questions SET hit_count = hit_count + 1
       WHERE id = ANY($1::int[])`,
      [ids]
    ).catch(e => console.warn('[gen-q-pool] hit_count update failed:', e.message));

    console.info(`[gen-q-pool] HIT topic=${normTopic} marks=${normMarks} diff=${normDiff} served=${result.rows.length}/${n}`);
    return result.rows.map(r => ({
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
 * Save generated variants to the pool.
 * Duplicate question texts for the same key are silently ignored.
 *
 * @param {string} topicKey
 * @param {string} subject
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
    for (const questionText of rows) {
      const bloomSkill = norm(
        variants.find(v => String(v?.text || '').trim() === questionText)?.bloomSkill
      ) || null;
      await pool.query(
        `INSERT INTO generated_questions
           (topic_key, subject, marks, difficulty, question_text, bloom_skill, hit_count, created_at)
         SELECT $1, $2, $3, $4, $5, $6, 0, NOW()
         WHERE NOT EXISTS (
           SELECT 1 FROM generated_questions
           WHERE topic_key  = $1
             AND subject    = $2
             AND (marks     = $3 OR ($3 IS NULL AND marks IS NULL))
             AND (difficulty = $4 OR ($4 IS NULL AND difficulty IS NULL))
             AND question_text = $5
         )`,
        [normTopic, normSubject, normMarks, normDiff, questionText, bloomSkill]
      );
    }
    console.info(`[gen-q-pool] SAVED topic=${normTopic} marks=${normMarks} diff=${normDiff} count=${rows.length}`);
  } catch (e) {
    console.warn('[gen-q-pool] saveToPool error:', e.message);
  }
}

module.exports = { pickFromPool, saveToPool };
