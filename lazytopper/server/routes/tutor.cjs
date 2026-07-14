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

/**
 * Fix 3 — pull the intent sentinel out of the model's prose. The model is instructed to
 * put `[[offer:practice]]` or `[[offer:check-improve]]` on its OWN final line when (and
 * only when) a round-trip is earned. We strip EVERY such tag (defensive against a stray
 * mid-text one) and return the LAST recognised offer. Robust by construction: no tag, an
 * unknown value, or a malformed bracket → offer:null and the prose is returned untouched
 * (minus any well-formed tag). The tag never reaches the student.
 */
function extractOfferTag(raw) {
  let offer = null;
  const tagRe = /\[\[\s*offer\s*:\s*([a-z-]+)\s*\]\]/gi;
  const text = String(raw)
    .replace(tagRe, (_m, value) => {
      const v = String(value).toLowerCase().trim();
      if (v === 'practice' || v === 'check-improve') offer = v;
      return '';
    })
    .replace(/[ \t]+\n/g, '\n')
    .trim();
  return { text, offer };
}

/**
 * Fix 4 — normalize the optional client-supplied bank question to the minimal shape the
 * prompt consumes. Anything missing a usable questionText → null (self-gen fallback).
 */
function normalizeDemoQuestion(input) {
  const q = input && typeof input === 'object' ? input : null;
  const questionText = q && typeof q.questionText === 'string' ? q.questionText.trim() : '';
  if (!questionText) return null;
  const out = { questionText };
  if (typeof q.marks === 'number' && q.marks > 0) out.marks = q.marks;
  if (Array.isArray(q.solutionSteps) && q.solutionSteps.length) {
    out.solutionSteps = q.solutionSteps.filter((s) => typeof s === 'string');
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
    // Fix 4: a real, owner-verified bank question the client pre-selected for the concept,
    // for the "see how it's solved" demonstration. Additive + optional — normalized to the
    // minimal shape the prompt consumes; anything malformed becomes null (self-gen fallback).
    const demoQuestion = normalizeDemoQuestion(payload.demoQuestion);

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

    const systemPrompt = buildTutorSystemPrompt({ topicLabel, subject, concept, brief, language, demoQuestion });

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
      const raw = String((reply && reply.text) || '').trim();
      if (!raw) {
        return sendJson(res, 502, { error: 'The tutor returned an empty reply. Please try again.' });
      }
      // Fix 3: pull the machine-readable intent tag OUT of the prose the student sees, and
      // return it as a sibling `offer` field the UI gates ONE round-trip CTA on. Robust:
      // a missing/garbled tag yields offer:null (no CTA, never a crash). Runs on the model
      // OUTPUT only — orthogonal to the language-steering append (which edits the INPUT).
      const { text, offer } = extractOfferTag(raw);
      if (!text) {
        return sendJson(res, 502, { error: 'The tutor returned an empty reply. Please try again.' });
      }
      return sendJson(res, 200, { reply: text, offer, model: MODEL, provider: ACTIVE_PROVIDER || 'gemini' });
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

module.exports = { createTutorRoute, coalesceTurns, extractOfferTag, normalizeDemoQuestion };
