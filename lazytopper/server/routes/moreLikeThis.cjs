function extractVariantsJson(rawText) {
  if (typeof rawText !== 'string') return null;
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  const tryParse = (str) => {
    try { return JSON.parse(str); } catch (_) { return null; }
  };

  let fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (!fenceMatch) {
    fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]+)/i);
  }
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : trimmed;

  const repairAndParse = (s) => {
    let result = tryParse(s);
    if (result) return result;
    let repaired = s.replace(/,\s*([}\]])/g, '$1');
    result = tryParse(repaired);
    if (result) return result;
    const openBraces = (s.match(/\{/g) || []).length;
    const closeBraces = (s.match(/\}/g) || []).length;
    const openBrackets = (s.match(/\[/g) || []).length;
    const closeBrackets = (s.match(/\]/g) || []).length;
    let suffix = '';
    for (let i = 0; i < openBraces - closeBraces; i++) suffix += '}';
    for (let i = 0; i < openBrackets - closeBrackets; i++) suffix += ']';
    if (suffix) {
      let truncated = repaired.replace(/,\s*$/, '');
      const lastComma = truncated.lastIndexOf(',');
      const lastCloseBrace = truncated.lastIndexOf('}');
      if (lastComma > lastCloseBrace) {
        truncated = truncated.slice(0, lastComma);
      }
      result = tryParse(truncated + suffix);
      if (result) return result;
      result = tryParse(truncated.replace(/,\s*$/, '') + suffix);
      if (result) return result;
    }
    return null;
  };

  let obj = repairAndParse(jsonStr);
  if (!obj) {
    const fb = jsonStr.indexOf('{');
    const lb = jsonStr.lastIndexOf('}');
    if (fb !== -1 && lb > fb) obj = repairAndParse(jsonStr.slice(fb, lb + 1));
    if (!obj && fb !== -1) obj = repairAndParse(jsonStr.slice(fb));
  }
  if (!obj) {
    const fa = jsonStr.indexOf('[');
    const la = jsonStr.lastIndexOf(']');
    if (fa !== -1 && la > fa) obj = repairAndParse(jsonStr.slice(fa, la + 1));
    if (!obj && fa !== -1) obj = repairAndParse(jsonStr.slice(fa));
  }

  if (Array.isArray(obj)) return obj;
  if (obj && typeof obj === 'object' && Array.isArray(obj.questions)) return obj.questions;
  return null;
}

const { isCompleteVariant } = require('../services/questionCompleteness.cjs');

function createMoreLikeThisRoute(deps) {
  const {
    sendJson,
    readJson,
    callGemini,
    GEMINI_MODEL,
    ACTIVE_PROVIDER,
    isStubMode,
    buildStubMoreLikeThis,
    buildMoreLikeThisUserPrompt,
    pickFromPool,
    markServed,
    saveToPool,
  } = deps;

  async function handleMoreLikeThis(req, res) {
    let payload;
    try {
      payload = await readJson(req);
    } catch (e) {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }

    if (isStubMode()) {
      const stub = buildStubMoreLikeThis(payload);
      return sendJson(res, 200, { ...stub, provider: ACTIVE_PROVIDER });
    }

    const { userPrompt, numVariants } = buildMoreLikeThisUserPrompt(payload);
    const subject = payload.subject || 'Maths/Science';
    const topicKey = payload.topicKey || null;
    const seed = payload.seedQuestion || {};
    const enforcedDiff = payload.requestedDifficulty || seed.difficulty || null;
    const marks = seed.marks != null ? seed.marks : null;

    // --- Pool check: serve from cache if we have enough stored variants ---
    if (pickFromPool && topicKey) {
      try {
        const pooled = await pickFromPool(topicKey, subject, marks, enforcedDiff, numVariants);
        if (pooled.length >= numVariants) {
          // Only increment hit_count now that we've decided to serve these rows.
          const ids = pooled.map(q => q.id).filter(Boolean);
          if (markServed && ids.length > 0) {
            await markServed(ids);
          }
          console.info(`[more-like-this] pool HIT topic=${topicKey} marks=${marks} diff=${enforcedDiff} served=${pooled.length}`);
          return sendJson(res, 200, {
            subject,
            topicKey,
            provider: 'pool',
            model: 'generated_questions_cache',
            variants: pooled.map(({ id: _id, ...q }, idx) => ({ ...q, index: idx })),
          });
        }
      } catch (e) {
        console.warn('[more-like-this] pool check failed (non-fatal):', e.message);
      }
    }

    // --- AI generation path ---
    try {
      const systemPrompt =
        'You are an expert CBSE Class 10 board question setter for Maths and Science. ' +
        'You strictly follow the CBSE exam blueprint, marks scheme and language style. ' +
        'You always generate high-quality board-style questions that are safe and syllabus-aligned.';

      const contents = [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
      ];

      const reply = await callGemini(GEMINI_MODEL, contents, {
        temperature: 0.6,
        maxOutputTokens: 2048,
      });

      let variants = [];

      const mapQuestion = (q, idx) => ({
        text: String(q.questionText || q.text || '').trim(),
        marks: q.marks != null ? q.marks : (marks != null ? marks : undefined),
        difficulty: enforcedDiff || q.difficulty || undefined,
        bloomSkill: q.bloomSkill || seed.bloomSkill || undefined,
        answer: String(q.answer || '').trim() || undefined,
        solutionSteps: Array.isArray(q.solutionSteps) ? q.solutionSteps.map(s => String(s).trim()).filter(Boolean) : undefined,
        finalAnswer: String(q.finalAnswer || '').trim() || undefined,
        index: idx,
      });

      const replyText = String(reply.text || '');
      const questionsArr = extractVariantsJson(replyText);
      if (questionsArr && questionsArr.length > 0) {
        variants = questionsArr.filter(q => q && (q.questionText || q.text)).map(mapQuestion);
      } else {
        const lines = String(reply.text)
          .split(/\n+/)
          .map((l) => l.trim())
          .filter(Boolean)
          .filter((l) => {
            if (l.length < 15) return false;
            if (/^[\[{\]}`",]/.test(l)) return false;
            if (/^```/.test(l)) return false;
            if (/^\w+["']?\s*:/.test(l)) return false;
            return true;
          });
        if (lines.length > 0) {
          variants = lines.slice(0, numVariants).map((line, idx) => ({
            text: line.replace(/^\d+[.)]\s*/, '').trim(),
            marks: marks,
            difficulty: enforcedDiff,
            bloomSkill: seed.bloomSkill,
            index: idx,
          }));
        }
      }

      if (variants.length === 0) {
        return sendJson(res, 200, {
          subject,
          topicKey,
          provider: ACTIVE_PROVIDER,
          model: GEMINI_MODEL,
          variants: [],
          error: 'Could not parse AI response into valid question variants',
        });
      }

      // --- Completeness guard: only keep variants with text + answer + solutionSteps + finalAnswer ---
      const completeVariants = variants.filter(isCompleteVariant);
      const droppedCount = variants.length - completeVariants.length;
      if (droppedCount > 0) {
        console.warn(`[more-like-this] dropped ${droppedCount}/${variants.length} incomplete variant(s) (missing text/answer/solutionSteps/finalAnswer)`);
      }

      // --- Save ONLY complete variants to the pool (fire-and-forget) ---
      if (saveToPool && topicKey && completeVariants.length > 0) {
        void saveToPool(topicKey, subject, marks, enforcedDiff, completeVariants).catch(
          e => console.warn('[more-like-this] saveToPool failed (non-fatal):', e.message)
        );
      }

      return sendJson(res, 200, {
        subject,
        topicKey,
        provider: ACTIVE_PROVIDER,
        model: GEMINI_MODEL,
        variants: completeVariants,
      });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, {
        error: 'Failed to generate variants',
        details: err.message,
      });
    }
  }

  return { handleMoreLikeThis };
}

module.exports = { createMoreLikeThisRoute, extractVariantsJson };
