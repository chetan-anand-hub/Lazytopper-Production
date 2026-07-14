// tutor.cjs — FRESH tutor conversation endpoint (POST /api/tutor).
//
// D-TUT-12: this is a NEW engine. It does NOT import or extend mentor.cjs,
// tutorOrchestrator.cjs, mentorModeHandler.cjs or any of the old tutor files.
// It reuses ONLY orthogonal product primitives passed in as deps (callGemini,
// sendJson, readJson) — the same provider client every other route uses.
//
// D-TUT-8 (honesty guard, structural): this handler is STATELESS. It reads the
// conversation + a client-assembled context brief from the request, asks the
// model for the next tutor turn, and returns text. It writes NOTHING to
// Firestore — so it CANNOT write a grade/score/mastery. Durable session +
// round-trip are Stage 2; visuals are Stage 3.

'use strict';

const { buildTutorSystemPrompt } = require('../prompts/tutorSystemPrompt.cjs');

// Cap conversation history sent to the model (cost + latency). A tutor session is
// short and targeted by design (Flow v2 §3G cost discipline).
const MAX_TURNS = 24;
const MAX_TURN_CHARS = 4000;

/**
 * Merge consecutive same-role turns so the contents array strictly alternates,
 * which Gemini requires. The leading system turn is role:user; the primer is
 * role:model; the real conversation follows. Coalescing makes the endpoint robust
 * to whatever ordering the client sends (e.g. a display-only opener turn).
 */
function coalesceTurns(turns) {
  const out = [];
  for (const t of turns) {
    const text = t.parts.map((p) => p.text).join('\n');
    const last = out[out.length - 1];
    if (last && last.role === t.role) {
      last.parts[0].text = `${last.parts[0].text}\n\n${text}`;
    } else {
      out.push({ role: t.role, parts: [{ text }] });
    }
  }
  return out;
}

function createTutorRoute(deps) {
  const {
    sendJson,
    readJson,
    callGemini,
    GEMINI_TUTOR_MODEL,
    GEMINI_MODEL,
    ACTIVE_PROVIDER,
    isStubMode,
  } = deps;

  const MODEL = GEMINI_TUTOR_MODEL || GEMINI_MODEL;

  async function handleTutorRequest(req, res) {
    let payload;
    try {
      payload = await readJson(req);
    } catch (e) {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }

    const topicLabel = String(payload.topicLabel || payload.topicKey || 'this topic').trim();
    const subject =
      payload.subject === 'science' ? 'science' : payload.subject === 'maths' ? 'maths' : '';
    const concept = typeof payload.concept === 'string' ? payload.concept.trim() : '';
    const language =
      typeof payload.language === 'string' && payload.language.trim()
        ? payload.language.trim()
        : 'English';
    const brief = payload.brief && typeof payload.brief === 'object' ? payload.brief : null;

    // Map the conversation to Gemini turns (user | model), dropping empties and
    // capping both history length and per-turn size.
    const convo = (Array.isArray(payload.messages) ? payload.messages : [])
      .filter((m) => m && typeof m.content === 'string' && m.content.trim())
      .slice(-MAX_TURNS)
      .map((m) => ({
        role:
          m.role === 'tutor' || m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
        parts: [{ text: String(m.content).slice(0, MAX_TURN_CHARS) }],
      }));

    if (convo.length === 0) {
      return sendJson(res, 400, { error: 'No student message to respond to' });
    }
    if (convo[convo.length - 1].role !== 'user') {
      return sendJson(res, 400, { error: 'The last message must be the student turn' });
    }

    // Stub mode (no provider / local dev / tests): honest canned reply, no model call.
    if (typeof isStubMode === 'function' && isStubMode()) {
      return sendJson(res, 200, {
        reply: `Staying on ${topicLabel}. (Local stub mode — the tutor model is not called here.)`,
        model: 'stub',
        provider: 'stub',
      });
    }

    const systemPrompt = buildTutorSystemPrompt({ topicLabel, subject, concept, brief, language });

    // Language stickiness (Stage-1 follow-up Fix 1). The leading system prompt's language
    // instruction loses weight against many recent turns in another language, so a selector
    // switch (e.g. Hindi -> English) would not take effect. Append a SHORT steering directive
    // as the MOST-RECENT user-side content so it overrides the conversation's recent language
    // for THIS turn. Server-only: payload.messages (what the client persists/displays) is never
    // touched — this is a generation-time directive, not a chat message, so it never accumulates.
    if (language) {
      const lastUser = convo[convo.length - 1];
      lastUser.parts[0].text +=
        `\n\n[Reply in ${language} for THIS response, regardless of the language used in earlier turns. ` +
        `Keep exam content — the NCERT definition to memorise and the answer to write — in English.]`;
    }

    // Gemini has no system role — fold the system prompt into a leading user turn,
    // answered by a short model primer, then the real conversation. coalesceTurns
    // guarantees the final array strictly alternates user/model.
    const contents = coalesceTurns([
      { role: 'user', parts: [{ text: systemPrompt }] },
      {
        role: 'model',
        parts: [
          {
            text: `Understood. I'll stay on ${topicLabel}, keep it board-shaped and brief, ground in NCERT, never invent data, and never grade the student's own work.`,
          },
        ],
      },
      ...convo,
    ]);

    try {
      const reply = await callGemini(MODEL, contents, { temperature: 0.55, maxOutputTokens: 900 });
      const text = String((reply && reply.text) || '').trim();
      if (!text) {
        return sendJson(res, 502, { error: 'The tutor returned an empty reply. Please try again.' });
      }
      return sendJson(res, 200, { reply: text, model: MODEL, provider: ACTIVE_PROVIDER || 'gemini' });
    } catch (err) {
      console.error('[tutor] generation failed:', err && err.message);
      const status = err && err.status === 504 ? 504 : 500;
      return sendJson(res, status, {
        error: 'The tutor is unavailable right now. Please try again in a moment.',
      });
    }
  }

  return { handleTutorRequest };
}

module.exports = { createTutorRoute, coalesceTurns };
