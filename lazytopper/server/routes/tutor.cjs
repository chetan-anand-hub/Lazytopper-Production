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
// UPLOAD-READ-1 PR-B (D138): the tutor takes a student's image/PDF (validateMentorImagePayload), so it reads its body with the file-route cap.
const { FILE_ROUTE_MAX_BODY_BYTES } = require('../mentorImageSupport.cjs');

// Cap conversation history sent to the model (cost + latency). A tutor session is
// short and targeted by design (Flow v2 §3G cost discipline).
const MAX_TURNS = 24;
const MAX_TURN_CHARS = 4000;

// TUTOR-FIX-1: the Tutor's one model call. With no thinkingConfig, gemini's thinking tokens come
// out of the same 900-token budget and cut replies off mid-sentence. thinkingBudget 0 turns
// thinking off (eval, ops/evals/tutor-fix-1: 8/30 MAX_TOKENS → 0/30, judged correct 21 → 29 of
// 30, lower cost per reply). Temperature and the 900 budget are unchanged.
// TUTOR-FIX-2 T3: 900 -> 1600 (live: 2 of ~20 replies still cut off). A cap, not a target: the
// prompt still asks for short turns, so only a reply that would have been cut grows. Accounting:
// the trial tutor allowance counts REQUESTS (fairUse AI_ROUTES tutorPerDay), unaffected; the
// Premium caps count cost (usage ledger costMicroInr = tokens x price), so a longer reply spends
// proportionally more of the Premium window — no per-request change.
const TUTOR_CALL_CONFIG = Object.freeze({
  temperature: 0.55,
  maxOutputTokens: 1600,
  thinkingConfig: Object.freeze({ thinkingBudget: 0 }),
});

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
 * Stage 3 — pull the visual-panel sentinel out of the model's prose. Mirrors extractOfferTag
 * exactly: the model puts `[[figure:<conceptKey>]]` on its own line ONLY when a diagram would
 * help THIS turn, choosing <conceptKey> from the closed set the client passed in `figures`.
 * We strip EVERY such tag (defensive) and return the LAST key that is a MEMBER of that set —
 * a hallucinated/unknown key yields figure:null (no panel), never a wrong figure. The
 * conceptKey token is a clean kebab slug (regex-safe even when the label carries "[]"/symbols).
 * validKeys is a Set of the allowed conceptKeys; empty/absent → figure always null.
 */
function extractFigureTag(raw, validKeys) {
  let figure = null;
  const allow = validKeys instanceof Set ? validKeys : new Set();
  const tagRe = /\[\[\s*figure\s*:\s*([a-z0-9-]+)\s*\]\]/gi;
  const text = String(raw)
    .replace(tagRe, (_m, value) => {
      const v = String(value).toLowerCase().trim();
      if (allow.has(v)) figure = v;
      return '';
    })
    .replace(/[ \t]+\n/g, '\n')
    .trim();
  return { text, figure };
}

/**
 * Stage 3 — normalize the optional client-supplied figure options to
 * `{ key, label, hasNcertPage }[]`. These are the concepts in THIS topic that have a curated
 * visual; the prompt lists them and the model picks one to signal. Anything malformed is
 * dropped; [] → no figure signalling.
 *
 * ★ This REBUILDS each option rather than passing the client's object through — deliberate:
 * it is the trust boundary, so unvalidated client fields never reach the prompt. The
 * consequence is that every new option field must be whitelisted HERE as well, or it is
 * silently dropped and can never reach buildTutorSystemPrompt. `hasNcertPage` is coerced with
 * `=== true` so a truthy-but-junk client value cannot turn into prompt text downstream.
 *
 * NOTE `hasNcertPage` is plumbing only today: figurePanelBlock() does not read it yet, so this
 * changes nothing the model sees. Using it is the tutor-round-trip lane's sequenced task.
 */
function normalizeFigures(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const f of input) {
    const key = f && typeof f.key === 'string' ? f.key.trim() : '';
    const label = f && typeof f.label === 'string' ? f.label.trim() : '';
    if (/^[a-z0-9-]+$/.test(key) && label) {
      out.push({ key, label, hasNcertPage: f.hasNcertPage === true });
    }
  }
  return out.slice(0, 40); // a topic has a handful; cap defensively
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

/**
 * Build lane (the tutor sees the graded work) — normalize the optional client-supplied
 * `returnedWork` (the just-board-marked C&I work handed as return-turn context) to the minimal
 * shape the prompt consumes. Like `normalizeFigures`, this REBUILDS at the trust boundary: no
 * unvalidated client field reaches the prompt, and every new field must be whitelisted HERE.
 *
 * - `question` — trimmed, length-capped verbatim text (quotable context; never a student turn).
 * - `hasImageQuestion` — coerced `=== true` (an image-only upload with no readable text).
 * - `steps` — the §6.3 per-step status digest: `{q,n,description,status}` ONLY. NO marks and NO
 *   free text are copied — a step's marks are a clamp artifact on objective questions, and free
 *   text is the confabulation surface the rails guard. `status` is whitelisted to the grader's
 *   four values so junk can never reach prompt copy.
 *
 * Anything malformed is dropped; nothing usable → null (the prompt renders no block).
 */
function normalizeReturnedWork(input) {
  const rw = input && typeof input === 'object' ? input : null;
  if (!rw) return null;
  const question = typeof rw.question === 'string' ? rw.question.trim().slice(0, 1200) : '';
  const hasImageQuestion = rw.hasImageQuestion === true;
  const STATUS = new Set(['correct', 'partial', 'incorrect', 'missing']);
  const steps = [];
  if (Array.isArray(rw.steps)) {
    for (const s of rw.steps) {
      if (!s || typeof s !== 'object') continue;
      const description = typeof s.description === 'string' ? s.description.trim().slice(0, 200) : '';
      const status = typeof s.status === 'string' && STATUS.has(s.status) ? s.status : '';
      if (!description || !status) continue;
      const q = Number.isFinite(s.q) ? s.q : null;
      const n = Number.isFinite(s.n) ? s.n : null;
      steps.push({ q, n, description, status });
      if (steps.length >= 60) break; // a paper has a handful of steps; cap defensively
    }
  }
  if (!question && !hasImageQuestion && steps.length === 0) return null;
  const out = {};
  if (question) out.question = question;
  if (hasImageQuestion) out.hasImageQuestion = true;
  if (steps.length) out.steps = steps;
  return out;
}

/* ── TUTOR-FIX-2 T11: the offer safety net ─────────────────────────────────────
 * The "Get my answer marked" / "Practise this" buttons must not depend on the student's
 * wording reaching the model. detectOfferIntent is a PURE function of the student's LAST turn
 * (plus, for a bare "yes", the tutor turn just before it). The route applies it only when the
 * model emitted NO offer tag; it never overrides a tag the model did emit. The client lane
 * mirrors this table (ops/.specs/INTENT_TABLE.md) — keep the two in step.
 *
 * Precedence: check-improve first (a student asking about THEIR answer's marks), then practice.
 * Non-Latin scripts use no \b (word boundaries are ASCII-only in JS regex). */
const OFFER_INTENT_TABLE = Object.freeze({
  'check-improve': Object.freeze([
    // English
    { id: 'en-check-my', re: /\b(check|mark|grade|evaluate|assess)\s+(my|this|these|it|that)\b/i },
    { id: 'en-get-it-marked', re: /\b(get|have)\s+(it|this|that|my\s+\w+(\s+\w+)?)\s+(checked|marked|graded|evaluated|assessed)\b/i },
    { id: 'en-upload', re: /\b(upload|uploading|answer\s*sheet|photo\s+of\s+my)\b/i },
    { id: 'en-how-many-marks', re: /\bhow\s+(many|much)\s+(marks?\s+)?(would|will|do|can|could|did|should)\s+(i|this|it|my\s+\w+)\s+(get|score|be\s+given|deserve|earn)\b/i },
    { id: 'en-marks-would-i-get', re: /\bmarks?\s+(would|will|do|can)\s+i\s+(get|score)\b/i },
    { id: 'en-is-my-answer-right', re: /\b(is|was)\s+my\s+(answer|solution|working|method|attempt|proof)\s+(right|correct|wrong|ok|okay|fine)\b/i },
    { id: 'en-did-i-do-it-right', re: /\b(my|answer|solution|working)\b[^\n]{0,80}\b(is|was)\s+(this|that|it)\s+(right|correct)\s*\?|\b(is|was)\s+(this|that|it)\s+(right|correct)\s*\?[^\n]{0,80}\b(my|answer|solution|working)\b|\bdid\s+i\s+(do|get|solve)\s+(it|this|that)\s+(right|correctly)\b/i },
    { id: 'en-out-of', re: /\bmark\w*\b[^.?!\n]{0,30}\bout\s+of\s+\d+\b/i },
    { id: 'en-open-check-improve', re: /\bcheck\s*(&|and)\s*improve\b/i },
    { id: 'en-show-my-working', re: /\b(show|send)\s+(you\s+)?my\s+(working|answer|solution|attempt|work)\b/i },
    // Hinglish (Latin script)
    { id: 'hi-check-karo', re: /\bcheck\s*(karo|kar\s*do|kardo|kariye|kijiye|karna|karke|kr\s*do|kro|krdo)\b/i },
    { id: 'hi-kitne-marks', re: /\bkitn[ae]\s*(marks?|number|nambar|ank)\b/i },
    { id: 'hi-jaanch', re: /\bja+n?ch\w*/i },
    { id: 'hi-mera-sahi', re: /\b(mera|meri|mere)\b[^.?!\n]{0,40}\bsahi\b/i },
    // Tamil / Telugu transliteration
    { id: 'ta-check-pannu', re: /\bcheck\s*(pannu|pannunga|pannungal|panni|pannuga)\b/i },
    { id: 'ta-evlo-marks', re: /\b(evlo|evvalavu|ethana|ethanai)\s*marks?\b/i },
    { id: 'te-check-cheyyi', re: /\bcheck\s*(cheyyi|cheyyandi|cheyandi|chey|cheyu|chesi)\b/i },
    { id: 'te-enni-marks', re: /\b(enni|entha)\s*marks?\b/i },
    // Devanagari (Hindi / Marathi) and other UI scripts
    { id: 'dev-check', re: /चेक|जाँच|जांच|तपास/u },
    { id: 'dev-kitne-ank', re: /कितने\s*(अंक|नंबर|मार्क्स)|अंक\s*मिलेंगे|किती\s*(गुण|मार्क)/u },
    { id: 'dev-sahi', re: /(मेरा|मेरी|माझे|माझा)[^.?!\n]{0,40}(सही|बरोबर)/u },
    { id: 'ta-script', re: /சரிபார்|மதிப்பெண்/u },
    { id: 'te-script', re: /చెక్|మార్కులు/u },
    { id: 'bn-script', re: /চেক|কত\s*নম্বর/u },
    { id: 'kn-script', re: /ಚೆಕ್|ಅಂಕ/u },
    { id: 'ml-script', re: /ചെക്ക്|മാർക്ക്/u },
    { id: 'gu-script', re: /ચેક|કેટલા\s*(માર્ક્સ|ગુણ)/u },
  ]),
  practice: Object.freeze([
    // English
    { id: 'en-practice', re: /\bpracti[cs]e\s+(questions?|problems?|qs|sums|set|on\s+this|on\s+it|this|more|some|a\s+few)\b/i },
    { id: 'en-want-to-practice', re: /\b(want|need|like|let\s+me|let's|can\s+i|could\s+i)\s+(to\s+)?(practi[cs]e|try\s+(some|a\s+few|a\s+couple|questions))\b/i },
    { id: 'en-give-me-practice', re: /\b(give|send|set|show)\s+me\s+(some\s+|a\s+few\s+|few\s+)?practi[cs]e\b/i },
    { id: 'en-test-quiz-me', re: /\b(test|quiz)\s+me\b/i },
    { id: 'en-give-me-questions', re: /\b(give|send|set)\s+me\s+(some|a\s+few|few|more|\d+|a\s+couple(\s+of)?|another|a|an)?\s*(more\s+)?(board[-\s]?(style|type|like|level)\s+)?(questions?|problems?|qs|mcqs?|sums)\b/i },
    { id: 'en-more-questions', re: /\b(more|another)\s+(board[-\s]?(style|type|like|level)\s+)?(questions?|problems?|mcqs?|sums)\b/i },
    { id: 'en-keep-losing-marks', re: /\b(keep|always|still|constantly)\s+(losing|lose|dropping|getting\s+low)\s+marks?\b/i },
    // Hinglish
    { id: 'hi-sawal', re: /\b(aur|kuch|naye|more|zyada)\s+sa+wa+l\b|\bsa+wa+l\s+(do|dijiye|chahiye|de\s*do|bhejo)\b/i },
    { id: 'hi-practice-karni', re: /\bpractice\s*(karni|karna|karwa|karwao|karao|karo|krni|krna|karunga|karungi)\b/i },
    { id: 'hi-test-lo', re: /\btest\s*(lo|le\s*lo|lelo|karo)\b/i },
    // Tamil / Telugu transliteration
    { id: 'ta-practice', re: /\b(practice\s*pannanum|questions?\s*kudunga)\b/i },
    { id: 'te-practice', re: /\b(practice\s*cheyyali|questions?\s*ivvandi)\b/i },
    // Devanagari and other UI scripts
    { id: 'dev-practice', re: /सवाल|अभ्यास|प्रैक्टिस|प्रश्न\s*(दो|दीजिए|द्या)|टेस्ट\s*लो/u },
    { id: 'ta-script', re: /பயிற்சி/u },
    { id: 'te-script', re: /ప్రాక్టీస్|అభ్యాసం/u },
    { id: 'bn-script', re: /অনুশীলন|প্র্যাকটিস/u },
    { id: 'kn-script', re: /ಅಭ್ಯಾಸ/u },
    { id: 'ml-script', re: /പരിശീലന/u },
    { id: 'gu-script', re: /અભ્યાસ|પ્રેક્ટિસ/u },
  ]),
});

/** A short bare agreement ("yes", "yes please", "haan", "ok let's do it", "हाँ"). */
const AFFIRMATIVE_RE = /^\s*(yes|yeah|yep|yup|ya|ok|okay|sure|please|haan|haa|han|ha|ji|ji\s+haan|go\s+ahead|let'?s\s+do\s+(it|that)|do\s+it|definitely|of\s+course|हाँ|हां|जी|ठीक\s+है)\b[\s\S]{0,40}$/iu;
/** The tutor's own previous turn offered Check & Improve. */
const PREV_OFFERED_CHECK_RE = /check\s*(&|and)\s*improve|\bupload\b|\b(get|have)\s+(it|that|this|your\s+\w+(\s+\w+)?)\s+(board[-\s])?(marked|checked|graded)\b|\bboard-marked\b/i;
/** The tutor's own previous turn offered practice. */
const PREV_OFFERED_PRACTICE_RE = /\btry\s+(a\s+couple|a\s+few|some)\b|\b(a\s+couple|a\s+few|some)\s+(of\s+)?(questions?|problems?|sums)\s+(for\s+you\s+)?to\s+try\b|\bpracti[cs]e\s+(set|questions?|a\s+few|some|this|on)\b|\bquick\s+practice\b/i;

/**
 * Pure. `text` = the student's last turn; `prevTutor` = the tutor turn right before it (optional).
 * Returns { offer: 'check-improve' | 'practice', rule } or null.
 */
function detectOfferIntent(text, { prevTutor } = {}) {
  const t = typeof text === 'string' ? text : '';
  if (!t.trim()) return null;
  for (const offer of ['check-improve', 'practice']) {
    for (const row of OFFER_INTENT_TABLE[offer]) {
      if (row.re.test(t)) return { offer, rule: row.id };
    }
  }
  const prev = typeof prevTutor === 'string' ? prevTutor : '';
  if (prev && AFFIRMATIVE_RE.test(t)) {
    if (PREV_OFFERED_CHECK_RE.test(prev)) return { offer: 'check-improve', rule: 'yes-to-check-offer' };
    if (PREV_OFFERED_PRACTICE_RE.test(prev)) return { offer: 'practice', rule: 'yes-to-practice-offer' };
  }
  return null;
}

/** T4: the reply talks about a diagram/figure/panel being on screen. Counted when no valid figure tag came with it. */
const DIAGRAM_CLAIM_RE = /\bbeside\s+us\b|\b(look\s+at|see|check|open)\s+the\s+(diagram|figure|panel|picture)\b|\b(diagram|figure|picture)\b[^.\n]{0,40}\b(beside|next\s+to|alongside|on\s+(the\s+)?(right|side|screen)|in\s+the\s+panel|shown\s+(here|above|below|beside))\b|\bin\s+the\s+(side\s+)?panel\b/i;

function mentionsDiagram(text) {
  return DIAGRAM_CLAIM_RE.test(typeof text === 'string' ? text : '');
}

/* ── TUTOR-FIX-2 T1/T2: the brief sanitiser (BRIEF CONTRACT, ops/.specs/BUILDER_R2.md) ──────
 * REBUILDS the client brief at the trust boundary, like normalizeFigures: only whitelisted
 * fields reach the prompt. Strings <= 80 chars (whitespace collapsed, no "[[" so a brief can
 * never fake a tag), numbers finite 0..1000, arrays capped. Every new field is optional: an
 * old client's { hasData, topic, mistakes } passes through unchanged in meaning. */
const BRIEF_GROUPS = Object.freeze(['knowledge', 'careless', 'examTechnique', 'notAttempted', 'unrecorded']);
const BRIEF_TOP_GROUPS = Object.freeze(['knowledge', 'careless', 'examTechnique', 'notAttempted']);

function briefStr(v) {
  if (typeof v !== 'string') return '';
  return v.replace(/\[\[|\]\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
}
function briefNum(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1000 ? Math.round(v * 100) / 100 : undefined;
}

function normalizeBrief(input) {
  const b = input && typeof input === 'object' && !Array.isArray(input) ? input : null;
  if (!b) return null;
  const out = { hasData: b.hasData === true };

  const topicIn = b.topic && typeof b.topic === 'object' ? b.topic : null;
  if (topicIn) {
    const topic = {};
    const trend = briefStr(topicIn.trend);
    if (trend) topic.trend = trend;
    if (Array.isArray(topicIn.weakConcepts)) {
      const wc = topicIn.weakConcepts.map(briefStr).filter(Boolean).slice(0, 3);
      if (wc.length) topic.weakConcepts = wc;
    }
    if (Object.keys(topic).length) out.topic = topic;
  }

  const mistakesIn = b.mistakes && typeof b.mistakes === 'object' ? b.mistakes : null;
  if (mistakesIn) {
    const mistakes = {};
    const topType = briefStr(mistakesIn.topType);
    if (topType) mistakes.topType = topType;
    const mlr = briefNum(mistakesIn.marksLostRecent);
    if (mlr !== undefined) mistakes.marksLostRecent = mlr;
    if (Object.keys(mistakes).length) out.mistakes = mistakes;
  }

  const windowLabel = briefStr(b.windowLabel);
  if (windowLabel) out.windowLabel = windowLabel;

  const chIn = b.chapter && typeof b.chapter === 'object' ? b.chapter : null;
  if (chIn) {
    const chapter = {};
    const name = briefStr(chIn.name);
    if (name) chapter.name = name;
    const ml = briefNum(chIn.marksLost);
    if (ml !== undefined) chapter.marksLost = ml;
    if (chIn.byGroup && typeof chIn.byGroup === 'object') {
      const byGroup = {};
      for (const g of BRIEF_GROUPS) {
        const n = briefNum(chIn.byGroup[g]);
        if (n !== undefined) byGroup[g] = n;
      }
      if (Object.keys(byGroup).length) chapter.byGroup = byGroup;
    }
    if (BRIEF_TOP_GROUPS.includes(chIn.topGroup)) chapter.topGroup = chIn.topGroup;
    if (Array.isArray(chIn.concepts)) {
      const concepts = [];
      for (const c of chIn.concepts) {
        const cname = c && briefStr(c.name);
        const cml = c && briefNum(c.marksLost);
        if (cname && cml !== undefined) concepts.push({ name: cname, marksLost: cml });
        if (concepts.length >= 3) break;
      }
      if (concepts.length) chapter.concepts = concepts;
    }
    if (Array.isArray(chIn.recent)) {
      const recent = [];
      for (const r of chIn.recent) {
        const id = r && briefStr(r.id);
        const rml = r && briefNum(r.marksLost);
        const surface = r && briefStr(r.surface);
        if (!id || rml === undefined || !surface) continue;
        const row = { id, marksLost: rml, surface };
        if (BRIEF_GROUPS.includes(r.group)) row.group = r.group;
        const date = briefStr(r.date);
        if (date) row.date = date;
        recent.push(row);
        if (recent.length >= 3) break;
      }
      if (recent.length) chapter.recent = recent;
    }
    if (Object.keys(chapter).length) out.chapter = chapter;
  }

  const subjIn = b.subject && typeof b.subject === 'object' ? b.subject : null;
  if (subjIn) {
    const sml = briefNum(subjIn.marksLost);
    if (sml !== undefined) out.subject = { marksLost: sml };
  }
  return out;
}

/* ── TUTOR-FIX-4: the mistake-type attribution safety net ──────────────────────────────────────
 * Live (prod, after #1203): in a thread whose history already held wrong assistant turns ("the marks
 * were lost due to concept/knowledge gaps"), the model repeated the attribution although the brief
 * says no type is recorded. Deliberately NARROW: it acts only when EVERY lost chapter mark in the
 * (sanitised) brief is unrecorded, so no typed group can support any attribution. Then, only if a
 * reply SENTENCE asserts a type (a type word and no negation marker), an English session's reply is
 * replaced by a fixed honest template built from the brief. An honest reply ("Correction: no mistake
 * type is recorded ...") passes through. Mixed / typed / no-data briefs: no-op. asksMistakeType is
 * kept as an exported helper (eval/diagnostics); it no longer triggers a replacement by itself. */
const TYPE_ATTRIBUTION_RE = /\bconcept(ual)?\s*(\/|or)?\s*knowledge\s+gaps?\b|\bknowledge\s+gaps?\b|\bconcept(ual)?\s+gaps?\b|\bcareless\s+(slips?|mistakes?|errors?|galti(yan|yaan)?)\b|\bexam\s+technique\b|\bsilly\s+(slips?|mistakes?|errors?|galti(yan|yaan)?)\b|\bconcept(ual)?\s+galti(yan|yaan)?\b/i;
const TYPE_ASK_RE = /\bcareless\b|\bsilly\b|\bconcept(ual)?\s+(gaps?|galti(yan|yaan)?|mistakes?|errors?)\b|\bknowledge\s+gaps?\b|\b(type|kind)s?\s+of\s+(my\s+)?(mistakes?|errors?|galti(yan|yaan)?)\b|\bmistake\s+types?\b|\bexam\s+technique\b/i;

function isAllUnrecordedBrief(brief) {
  const by = brief && brief.hasData && brief.chapter && brief.chapter.byGroup;
  if (!by) return false;
  const typed = BRIEF_TOP_GROUPS.some((g) => (by[g] || 0) > 0);
  return !typed && (by.unrecorded || 0) > 0;
}
function asksMistakeType(text) {
  return TYPE_ASK_RE.test(typeof text === 'string' ? text : '');
}
// A sentence carrying any of these is HONEST about the type (it says it is not recorded / cannot be told),
// even when it names the type words ("I cannot say whether they were careless slips or concept gaps").
// `whether` is included so the template's own "shows whether a slip was careless or a concept gap" is not
// read as an assertion.
const TYPE_NEGATION_RE = /\bno\s+mistake\s+type\b|\bnot\s+recorded\b|\bisn'?t\s+recorded\b|\b(can'?t|cannot|can\s+not)\s+(say|tell)\b|\bcorrection\b|\bwhether\b/i;
function splitSentences(text) {
  return String(text).split(/(?<=[.!?।])\s+|\n+/).map((x) => x.trim()).filter(Boolean);
}
/** TUTOR-FIX-4 v2: true only when some SENTENCE names a mistake type and carries no negation marker. */
function attributesMistakeType(text) {
  const t = typeof text === 'string' ? text : '';
  return splitSentences(t).some((sent) => TYPE_ATTRIBUTION_RE.test(sent) && !TYPE_NEGATION_RE.test(sent));
}
function isEnglishSession(language) {
  return !language || /^english$/i.test(String(language).trim());
}
function buildUnrecordedTypeReply(brief, chapterFallback) {
  const ch = (brief && brief.chapter) || {};
  const by = ch.byGroup || {};
  const n = typeof ch.marksLost === 'number' ? ch.marksLost : by.unrecorded;
  const marks = `${n} ${n === 1 ? 'mark' : 'marks'}`;
  const chapter = ch.name || chapterFallback || 'this chapter';
  const when = brief && brief.windowLabel ? `In the ${brief.windowLabel.replace(/^the\s+/i, '')}` : 'Recently';
  return (
    `${when} you lost ${marks} in ${chapter}. No mistake type is recorded for them - those were tap-the-answer ` +
    `questions, which record the option you picked, not why. A written answer checked in Check & Improve shows ` +
    `whether a slip was careless or a concept gap.`
  );
}

function defaultTelemetry() {
  try {
    return require('../telemetry.cjs');
  } catch {
    return { increment() {} };
  }
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
  const telemetry = deps.telemetry && typeof deps.telemetry.increment === 'function' ? deps.telemetry : defaultTelemetry();

  const MODEL = GEMINI_TUTOR_MODEL || GEMINI_MODEL;

  async function handleTutorRequest(req, res) {
    let payload;
    try {
      payload = await readJson(req, FILE_ROUTE_MAX_BODY_BYTES);
    } catch (e) {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }

    const subject =
      payload.subject === 'science' ? 'science' : payload.subject === 'maths' ? 'maths' : '';
    // TUTOR-FIX-2 T5: a cold entry (no chapter) is named by its SUBJECT, never "this topic".
    const subjectName = subject === 'science' ? 'Science' : subject === 'maths' ? 'Maths' : 'Class 10 Maths and Science';
    const chapterGiven = String(payload.topicLabel || payload.topicKey || '').trim();
    const topicLabel = chapterGiven || subjectName;
    const concept = typeof payload.concept === 'string' ? payload.concept.trim() : '';
    const language =
      typeof payload.language === 'string' && payload.language.trim()
        ? payload.language.trim()
        : 'English';
    // TUTOR-FIX-2 T1/T2: rebuilt at the trust boundary (BRIEF CONTRACT caps); old clients unchanged in meaning.
    const brief = normalizeBrief(payload.brief);
    // Fix 4: a real, owner-verified bank question the client pre-selected for the concept,
    // for the "see how it's solved" demonstration. Additive + optional — normalized to the
    // minimal shape the prompt consumes; anything malformed becomes null (self-gen fallback).
    const demoQuestion = normalizeDemoQuestion(payload.demoQuestion);
    // Stage 3: the concepts in this topic that have a curated visual, as { key, label }[].
    // The prompt lists them; the model signals one via [[figure:<key>]]; we validate the
    // returned key against exactly this set so only a real, curated figure can surface.
    const figures = normalizeFigures(payload.figures);
    const figureKeys = new Set(figures.map((f) => f.key));
    // Build lane: the just-board-marked C&I work handed as return-turn context (Piece 1 + the
    // eval-gated §6.3 digest). Additive + optional — rebuilt at the trust boundary; null when
    // absent or malformed, and the prompt then renders no block. The tutor never grades (D-TUT-8):
    // this is READ context to teach from, and the rails forbid re-judging the board's marks.
    const returnedWork = normalizeReturnedWork(payload.returnedWork);

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
    // T11: read the student's last turn (and the tutor turn before it) BEFORE the language
    // directive is appended below, so the safety net sees only what the student typed.
    const studentLast = convo[convo.length - 1].parts[0].text;
    const prevTurn = convo.length >= 2 ? convo[convo.length - 2] : null;
    const offerIntent = detectOfferIntent(studentLast, {
      prevTutor: prevTurn && prevTurn.role === 'model' ? prevTurn.parts[0].text : '',
    });

    // Stub mode (no provider / local dev / tests): honest canned reply, no model call.
    if (typeof isStubMode === 'function' && isStubMode()) {
      return sendJson(res, 200, {
        reply: `Staying on ${topicLabel}. (Local stub mode — the tutor model is not called here.)`,
        model: 'stub',
        provider: 'stub',
      });
    }

    // An empty topicLabel lets the prompt name the subject and say no chapter was chosen (T5).
    const systemPrompt = buildTutorSystemPrompt({ topicLabel: chapterGiven, subject, concept, brief, language, demoQuestion, figures, returnedWork });

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
        `Keep exam content — the NCERT definition to memorise and the answer to write — in English. ` +
        // TUTOR-FIX-2 T1 rule g: the language switch must never drop the honesty rules.
        `Every HONESTY rule in your instructions applies in this language too.]`;
    }
    // TUTOR-FIX-4 history hygiene: with an all-unrecorded brief, restate honesty rule i as the
    // MOST-RECENT content, so earlier (possibly wrong) tutor turns cannot outweigh the brief.
    // Generation-time only, like the language directive: never stored or shown.
    const allUnrecorded = isAllUnrecordedBrief(brief);
    if (allUnrecorded) {
      convo[convo.length - 1].parts[0].text +=
        `\n\n[System note: the student-data brief wins over anything said earlier in this chat, including your own ` +
        `earlier replies. No mistake type is recorded for any of this chapter's lost marks - never call them concept ` +
        `gaps, careless slips or exam technique; if you said so earlier, correct it plainly.]`;
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
      // TUTOR-FIX-1: thinking OFF (see TUTOR_CALL_CONFIG).
      const reply = await callGemini(MODEL, contents, TUTOR_CALL_CONFIG);
      const raw = String((reply && reply.text) || '').trim();
      if (!raw) {
        return sendJson(res, 502, { error: 'The tutor returned an empty reply. Please try again.' });
      }
      // Fix 3: pull the machine-readable intent tag OUT of the prose the student sees, and
      // return it as a sibling `offer` field the UI gates ONE round-trip CTA on. Robust:
      // a missing/garbled tag yields offer:null (no CTA, never a crash). Runs on the model
      // OUTPUT only — orthogonal to the language-steering append (which edits the INPUT).
      const offerOut = extractOfferTag(raw);
      // Stage 3: strip the figure sentinel too (same OUTPUT pass, order-independent — the
      // two tags are on their own lines). Validate against the curated set for this topic.
      const figureOut = extractFigureTag(offerOut.text, figureKeys);
      let text = figureOut.text;
      let offer = offerOut.offer;
      let offerSource = offer ? 'model' : null;
      // TUTOR-FIX-4 attribution safety net (all-unrecorded brief only): a reply with an ASSERTING
      // sentence that names a mistake type (no "not recorded" / "cannot say" / "Correction" marker in
      // it) gets the fixed honest template + the Check & Improve offer. The template is English, so a
      // non-English session is not replaced (rule i + the history note carry it) - counted instead.
      if (allUnrecorded && attributesMistakeType(text)) {
        if (isEnglishSession(language)) {
          text = buildUnrecordedTypeReply(brief, chapterGiven);
          offer = 'check-improve';
          offerSource = 'attribution-override';
          telemetry.increment('tutor.attribution_override');
        } else {
          telemetry.increment('tutor.attribution_unreplaced_nonenglish');
        }
      }
      // The template points at no diagram, so an overridden reply never opens a panel.
      const figure = offerSource === 'attribution-override' ? null : figureOut.figure;
      // TUTOR-FIX-2 T11 safety net: the model emitted no offer, but the student plainly asked
      // to be checked / to practise -> set the offer anyway (never overrides a model tag).
      if (!offer && offerIntent) {
        offer = offerIntent.offer;
        offerSource = 'safety-net';
        telemetry.increment(`tutor.offer_safety_net.${offerIntent.offer}`);
      }
      // TUTOR-FIX-2 T4: count (never rewrite) a reply that talks about an on-screen diagram
      // without a valid figure tag — the student would be pointed at a panel that is not there.
      if (!figure && mentionsDiagram(text)) telemetry.increment('tutor.diagram_claim_without_tag');
      if (!text) {
        return sendJson(res, 502, { error: 'The tutor returned an empty reply. Please try again.' });
      }
      // TUTOR-FIX-1: honest cut-off signal — true only when the model stopped at its token limit.
      const truncated = Boolean(reply && reply.finishReason === 'MAX_TOKENS');
      // offerSource is additive ('model' | 'safety-net' | null); older clients ignore it.
      return sendJson(res, 200, { reply: text, offer, offerSource, figure, truncated, model: MODEL, provider: ACTIVE_PROVIDER || 'gemini' });
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

module.exports = {
  createTutorRoute,
  TUTOR_CALL_CONFIG,
  coalesceTurns,
  extractOfferTag,
  extractFigureTag,
  normalizeDemoQuestion,
  normalizeFigures,
  normalizeReturnedWork,
  normalizeBrief,
  detectOfferIntent,
  mentionsDiagram,
  isAllUnrecordedBrief,
  asksMistakeType,
  attributesMistakeType,
  buildUnrecordedTypeReply,
  OFFER_INTENT_TABLE,
};
