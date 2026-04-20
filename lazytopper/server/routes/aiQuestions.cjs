'use strict';

/**
 * /api/ai-questions — read and write the generated_questions DB cache.
 *
 * GET  /api/ai-questions?topicKey=&subject=&difficulty=&marks=&n=
 *   Returns up to `n` cached questions for the given tags.
 *   Increments hit_count for any rows served.
 *
 * POST /api/ai-questions
 *   Body: { topicKey, subject, difficulty?, marks?, variants: [{text, marks?, difficulty?, bloomSkill?}] }
 *   Saves new AI-generated questions to the pool (deduplicated by question_hash).
 */

const { isCompleteVariant } = require('../services/questionCompleteness.cjs');

function createAiQuestionsRoute({ sendJson, readJson, pickFromPool, markServed, saveToPool }) {
  async function handleGet(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const topicKey = url.searchParams.get('topicKey') || '';
    const subject = url.searchParams.get('subject') || '';
    const difficulty = url.searchParams.get('difficulty') || null;
    const rawMarks = url.searchParams.get('marks');
    const marks = rawMarks != null && rawMarks !== '' ? Number(rawMarks) : null;
    const n = Math.min(Math.max(1, Number(url.searchParams.get('n') || '5')), 20);

    if (!topicKey || !subject) {
      return sendJson(res, 400, { ok: false, error: 'topicKey and subject are required' });
    }

    try {
      const raw = await pickFromPool(topicKey, subject, marks, difficulty, n);
      const candidates = raw.filter(isCompleteVariant);
      if (candidates.length < raw.length) {
        console.warn(`[ai-questions] GET: dropped ${raw.length - candidates.length} incomplete row(s) before serving`);
      }
      if (candidates.length > 0) {
        const ids = candidates.map(q => q.id).filter(Boolean);
        if (ids.length > 0) {
          markServed(ids).catch(e =>
            console.warn('[ai-questions] markServed error (non-fatal):', e.message)
          );
        }
      }
      return sendJson(res, 200, {
        ok: true,
        questions: candidates.map(({ id: _id, ...q }) => q),
        total: candidates.length,
      });
    } catch (e) {
      console.warn('[ai-questions] GET error:', e.message);
      return sendJson(res, 200, { ok: true, questions: [], total: 0 });
    }
  }

  async function handlePost(req, res) {
    let body;
    try {
      body = await readJson(req);
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
    }

    const { topicKey, subject, difficulty, marks, variants } = body || {};
    if (!topicKey || !subject || !Array.isArray(variants) || variants.length === 0) {
      return sendJson(res, 400, {
        ok: false,
        error: 'topicKey, subject, and a non-empty variants array are required',
      });
    }

    try {
      await saveToPool(topicKey, subject, marks ?? null, difficulty ?? null, variants);
      return sendJson(res, 200, { ok: true });
    } catch (e) {
      console.warn('[ai-questions] POST error (non-fatal):', e.message);
      return sendJson(res, 200, { ok: true });
    }
  }

  return { handleGet, handlePost };
}

module.exports = { createAiQuestionsRoute };
