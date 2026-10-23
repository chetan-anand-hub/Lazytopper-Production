/**
 * Generated question pool — the generated_questions table.
 *
 * MLT-RETIRE-1 (owner ruling 2026-10-23): this used to back the student-triggered "More like
 * this" route — pickFromPool() before the model call, markServed() on a hit, saveToPool() after.
 * POST /api/more-like-this now answers 410 (routes/moreLikeThis.cjs) and /api/ai-questions
 * answers 410 (MLT-MUTE-1), so pickFromPool and markServed had no caller and were deleted.
 * saveToPool() remains: the admin / scheduled warm pool (warmQuestionPool.cjs) still writes here.
 *
 * Deduplication: saveToPool() stores an MD5 hash of the question_text and the
 * DB has a unique index on (topic_key, subject, question_hash), so concurrent
 * saves of identical questions are safe.
 */

const crypto = require('crypto');
const { isCompleteVariant } = require('./questionCompleteness.cjs');

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
 * Save generated variants to the pool.
 * Uses question_hash (MD5 of question_text) for duplicate detection with the
 * DB unique index on (topic_key, subject, question_hash).
 * Concurrent duplicate inserts are silently swallowed by ON CONFLICT DO NOTHING.
 *
 * @param {string}  topicKey
 * @param {string}  subject
 * @param {number|null} marks
 * @param {string|null} difficulty
 * @param {Array<{text, marks, difficulty, bloomSkill, answer, solutionSteps, finalAnswer}>} variants
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

  const completeVariants = variants.filter(isCompleteVariant);
  if (completeVariants.length === 0) {
    console.info(`[gen-q-pool] saveToPool: all ${variants.length} variant(s) failed completeness check — nothing saved`);
    return;
  }
  const rows = completeVariants.map(v => String(v?.text || '').trim()).filter(Boolean);

  if (rows.length === 0) return;

  try {
    // Build a single bulk INSERT … ON CONFLICT DO NOTHING statement.
    // Each row gets 10 parameters (7 original + answer, solution_steps, final_answer).
    const params = [];
    const valueClauses = rows.map((questionText, i) => {
      const qHash = hashKey(normTopic, normSubject, normMarks, normDiff, questionText);
      const variant = completeVariants.find(v => String(v?.text || '').trim() === questionText) || {};
      const bloomSkill = norm(variant.bloomSkill) || null;
      const answer = String(variant.answer || '').trim() || null;
      const solutionSteps = Array.isArray(variant.solutionSteps) && variant.solutionSteps.length > 0
        ? JSON.stringify(variant.solutionSteps)
        : null;
      const finalAnswer = String(variant.finalAnswer || '').trim() || null;
      const base = i * 10;
      params.push(normTopic, normSubject, normMarks, normDiff, questionText, qHash, bloomSkill, answer, solutionSteps, finalAnswer);
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, 0, NOW(), $${base + 8}, $${base + 9}, $${base + 10})`;
    });

    const result = await pool.query(
      `INSERT INTO generated_questions
         (topic_key, subject, marks, difficulty, question_text, question_hash, bloom_skill, hit_count, created_at, answer, solution_steps, final_answer)
       VALUES ${valueClauses.join(', ')}
       ON CONFLICT (topic_key, subject, question_hash) DO NOTHING`,
      params
    );
    console.info(`[gen-q-pool] SAVED topic=${normTopic} marks=${normMarks} diff=${normDiff} new=${result.rowCount}/${rows.length}`);
  } catch (e) {
    console.warn('[gen-q-pool] saveToPool error:', e.message);
  }
}

module.exports = { saveToPool };
