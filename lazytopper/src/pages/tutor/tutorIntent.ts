// src/pages/tutor/tutorIntent.ts
// TUTOR-FIX-2 T11 (client) — the deterministic offer rule. The tutor's two round trips
// (Check & Improve, Quick Practice) must never depend on the model remembering to tag its
// reply: when the STUDENT's turn asks to have work checked / marked / graded / uploaded, or
// asks for practice, the matching offer shows under the reply even if the model emitted no
// `[[offer:...]]` tag.
//
// ★ A MIRROR of the server's `OFFER_INTENT_TABLE` + `detectOfferIntent`
// (server/routes/tutor.cjs, TUTOR-FIX-2 S-A, written out in ops/.specs/INTENT_TABLE.md).
// Same rows, same order (every check-improve row first, then every practice row, first match
// wins), same bare-"yes"-to-the-tutor's-own-offer rule. Keep the two in step.
//
// PURE: no imports, no I/O. The model's own tag still wins when present (the UI uses this only
// when the tutor turn carries no offer).

import type { TutorOffer } from "../../ai/tutorClient";

export interface OfferIntentRule {
  id: string;
  offer: TutorOffer;
  re: RegExp;
}

const CHECK: ReadonlyArray<[string, RegExp]> = [
  ["en-check-my", /\b(check|mark|grade|evaluate|assess)\s+(my|this|these|it|that)\b/i],
  ["en-get-it-marked", /\b(get|have)\s+(it|this|that|my\s+\w+(\s+\w+)?)\s+(checked|marked|graded|evaluated|assessed)\b/i],
  ["en-upload", /\b(upload|uploading|answer\s*sheet|photo\s+of\s+my)\b/i],
  ["en-how-many-marks", /\bhow\s+(many|much)\s+(marks?\s+)?(would|will|do|can|could|did|should)\s+(i|this|it|my\s+\w+)\s+(get|score|be\s+given|deserve|earn)\b/i],
  ["en-marks-would-i-get", /\bmarks?\s+(would|will|do|can)\s+i\s+(get|score)\b/i],
  ["en-is-my-answer-right", /\b(is|was)\s+my\s+(answer|solution|working|method|attempt|proof)\s+(right|correct|wrong|ok|okay|fine)\b/i],
  ["en-did-i-do-it-right", /\b(is|was)\s+(this|that|it)\s+(right|correct)\s*\?|\bdid\s+i\s+(do|get|solve)\s+(it|this|that)\s+(right|correctly)\b/i],
  ["en-out-of", /\bmark\w*\b[^.?!\n]{0,30}\bout\s+of\s+\d+\b/i],
  ["en-open-check-improve", /\bcheck\s*(&|and)\s*improve\b/i],
  ["en-show-my-working", /\b(show|send)\s+(you\s+)?my\s+(working|answer|solution|attempt|work)\b/i],
  ["hi-check-karo", /\bcheck\s*(karo|kar\s*do|kardo|kariye|kijiye|karna|karke|kr\s*do|kro|krdo)\b/i],
  ["hi-kitne-marks", /\bkitn[ae]\s*(marks?|number|nambar|ank)\b/i],
  ["hi-jaanch", /\bja+n?ch\w*/i],
  ["hi-mera-sahi", /\b(mera|meri|mere)\b[^.?!\n]{0,40}\bsahi\b/i],
  ["ta-check-pannu", /\bcheck\s*(pannu|pannunga|pannungal|panni|pannuga)\b/i],
  ["ta-evlo-marks", /\b(evlo|evvalavu|ethana|ethanai)\s*marks?\b/i],
  ["te-check-cheyyi", /\bcheck\s*(cheyyi|cheyyandi|cheyandi|chey|cheyu|chesi)\b/i],
  ["te-enni-marks", /\b(enni|entha)\s*marks?\b/i],
  ["dev-check", /चेक|जाँच|जांच|तपास/u],
  ["dev-kitne-ank", /कितने\s*(अंक|नंबर|मार्क्स)|अंक\s*मिलेंगे|किती\s*(गुण|मार्क)/u],
  ["dev-sahi", /(मेरा|मेरी|माझे|माझा)[^.?!\n]{0,40}(सही|बरोबर)/u],
  ["ta-script", /சரிபார்|மதிப்பெண்/u],
  ["te-script", /చెక్|మార్కులు/u],
  ["bn-script", /চেক|কত\s*নম্বর/u],
  ["kn-script", /ಚೆಕ್|ಅಂಕ/u],
  ["ml-script", /ചെക്ക്|മാർക്ക്/u],
  ["gu-script", /ચેક|કેટલા\s*(માર્ક્સ|ગુણ)/u],
];

const PRACTICE: ReadonlyArray<[string, RegExp]> = [
  ["en-practice", /\bpracti[cs]e\s+(questions?|problems?|qs|sums|set|on\s+this|on\s+it|this|more|some|a\s+few)\b/i],
  ["en-want-to-practice", /\b(want|need|like|let\s+me|let's|can\s+i|could\s+i)\s+(to\s+)?(practi[cs]e|try\s+(some|a\s+few|a\s+couple|questions))\b/i],
  ["en-give-me-practice", /\b(give|send|set|show)\s+me\s+(some\s+|a\s+few\s+|few\s+)?practi[cs]e\b/i],
  ["en-test-quiz-me", /\b(test|quiz)\s+me\b/i],
  ["en-give-me-questions", /\b(give|send|set)\s+me\s+(some|a\s+few|few|more|\d+|a\s+couple(\s+of)?|another|a|an)?\s*(more\s+)?(board[-\s]?(style|type|like|level)\s+)?(questions?|problems?|qs|mcqs?|sums)\b/i],
  ["en-more-questions", /\b(more|another)\s+(board[-\s]?(style|type|like|level)\s+)?(questions?|problems?|mcqs?|sums)\b/i],
  ["en-keep-losing-marks", /\b(keep|always|still|constantly)\s+(losing|lose|dropping|getting\s+low)\s+marks?\b/i],
  ["hi-sawal", /\b(aur|kuch|naye|more|zyada)\s+sa+wa+l\b|\bsa+wa+l\s+(do|dijiye|chahiye|de\s*do|bhejo)\b/i],
  ["hi-practice-karni", /\bpractice\s*(karni|karna|karwa|karwao|karao|karo|krni|krna|karunga|karungi)\b/i],
  ["hi-test-lo", /\btest\s*(lo|le\s*lo|lelo|karo)\b/i],
  ["ta-practice", /\b(practice\s*pannanum|questions?\s*kudunga)\b/i],
  ["te-practice", /\b(practice\s*cheyyali|questions?\s*ivvandi)\b/i],
  ["dev-practice", /सवाल|अभ्यास|प्रैक्टिस|प्रश्न\s*(दो|दीजिए|द्या)|टेस्ट\s*लो/u],
  ["ta-script", /பயிற்சி/u],
  ["te-script", /ప్రాక్టీస్|అభ్యాసం/u],
  ["bn-script", /অনুশীলন|প্র্যাকটিস/u],
  ["kn-script", /ಅಭ್ಯಾಸ/u],
  ["ml-script", /പരിശീലന/u],
  ["gu-script", /અભ્યાસ|પ્રેક્ટિસ/u],
];

/** The ordered table: every check-improve row, then every practice row (first match wins). */
export const OFFER_INTENT_TABLE: ReadonlyArray<OfferIntentRule> = [
  ...CHECK.map(([id, re]) => ({ id, offer: "check-improve" as const, re })),
  ...PRACTICE.map(([id, re]) => ({ id, offer: "practice" as const, re })),
];

const AFFIRMATIVE_RE =
  /^\s*(yes|yeah|yep|yup|ya|ok|okay|sure|please|haan|haa|han|ha|ji|ji\s+haan|go\s+ahead|let'?s\s+do\s+(it|that)|do\s+it|definitely|of\s+course|हाँ|हां|जी|ठीक\s+है)\b[\s\S]{0,40}$/iu;
const PREV_OFFERED_CHECK_RE =
  /check\s*(&|and)\s*improve|\bupload\b|\b(get|have)\s+(it|that|this|your\s+\w+(\s+\w+)?)\s+(board[-\s])?(marked|checked|graded)\b|\bboard-marked\b/i;
const PREV_OFFERED_PRACTICE_RE =
  /\btry\s+(a\s+couple|a\s+few|some|one|two|three|\d+)\b|\bpracti[cs]e\s+(set|questions?|a\s+few|some|this|on)\b|\bquick\s+practice\b|\bquiz\b/i;

export interface OfferIntent {
  offer: TutorOffer;
  rule: string;
}

/**
 * The offer the student's turn asks for, or null. `prevTutor` is the tutor turn right before
 * it (for the bare-"yes" rule: "yes please" after the tutor offered Check & Improve).
 */
export function detectOfferIntent(studentText: string, prevTutor?: string | null): OfferIntent | null {
  const text = String(studentText || "");
  if (!text.trim()) return null;
  for (const row of OFFER_INTENT_TABLE) {
    if (row.re.test(text)) return { offer: row.offer, rule: row.id };
  }
  const prev = String(prevTutor || "");
  if (prev && AFFIRMATIVE_RE.test(text)) {
    if (PREV_OFFERED_CHECK_RE.test(prev)) return { offer: "check-improve", rule: "yes-to-check-offer" };
    if (PREV_OFFERED_PRACTICE_RE.test(prev)) return { offer: "practice", rule: "yes-to-practice-offer" };
  }
  return null;
}

/** The minimal turn shape the thread helpers read (TutorTurn satisfies it). */
interface IntentTurn {
  role: "user" | "tutor";
  content: string;
  kind?: string;
  offer?: TutorOffer;
}

/**
 * The offer to show under the tutor turn at `index`: the model's own tag when it emitted one,
 * else the deterministic rule applied to the student turn that prompted it. Null for anything
 * that is not a normal tutor reply (away cue, return opener) or that has no prompting student turn.
 */
export function offerForTutorTurn(messages: ReadonlyArray<IntentTurn>, index: number): TutorOffer | null {
  const m = messages[index];
  if (!m || m.role !== "tutor" || m.kind === "away-cue" || m.kind === "return-result") return m?.offer ?? null;
  if (m.offer) return m.offer;
  let u = index - 1;
  while (u >= 0 && messages[u].role !== "user") u--;
  if (u < 0) return null;
  let p = u - 1;
  while (p >= 0 && (messages[p].role !== "tutor" || messages[p].kind === "away-cue")) p--;
  return detectOfferIntent(messages[u].content, p >= 0 ? messages[p].content : null)?.offer ?? null;
}

/* ── [FU-PRACTICE-COUNT-PASSTHROUGH] ─────────────────────────────────────────────────────── */

/** The default set size when the student names no number ("a couple"). */
export const PRACTICE_COUNT_DEFAULT = 2;
/** The largest set the tutor opens (the student can extend it in Practice). */
export const PRACTICE_COUNT_MAX = 10;

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  couple: 2,
  // Hinglish counts that cannot be confused with a verb ("do" = "give" is deliberately absent).
  teen: 3,
  char: 4,
  chaar: 4,
  paanch: 5,
  panch: 5,
  das: 10,
};

/** The number of questions a practice ask names ("test me with 5" → 5, "a couple" → 2), capped
 *  at 10; null when it names none. */
export function practiceCountFromText(text: string): number | null {
  const s = String(text || "").toLowerCase();
  // A number counts only when it counts QUESTIONS ("5 questions", "test me with 5", "give me 5"),
  // never a chapter or question number ("chapter 3", "Q2").
  const NOUN = String.raw`\s+(?:more\s+)?(?:board[-\s]?\w+\s+)?(?:questions?|qs|problems?|sums|mcqs?|sa+wa+l)\b`;
  const LEAD = String.raw`\b(?:with|me|try|do)\s+`;
  const digit = new RegExp(String.raw`\b(\d{1,3})${NOUN}|${LEAD}(\d{1,3})\b`).exec(s);
  if (digit) {
    const n = Number(digit[1] ?? digit[2]);
    if (n >= 1) return Math.min(PRACTICE_COUNT_MAX, n);
  }
  const WORDS = "one|two|three|four|five|six|seven|eight|nine|ten|couple|teen|chaa?r|paa?nch|das";
  const word = new RegExp(String.raw`\b(${WORDS})(?:\s+of)?${NOUN}|${LEAD}(?:a\s+)?(${WORDS})\b|\ba\s+(couple)\b`).exec(s);
  if (word) {
    const w = (word[1] ?? word[2] ?? word[3]).replace(/^chaar$/, "char").replace(/^paanch$/, "panch");
    return NUMBER_WORDS[w] ?? null;
  }
  return null;
}

/** The set size for the tutor's practice overlay: the number named in the latest practice ask
 *  in the thread, else the default (2). */
export function practiceCountForThread(messages: ReadonlyArray<IntentTurn>): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    if (detectOfferIntent(m.content)?.offer !== "practice") continue;
    return practiceCountFromText(m.content) ?? PRACTICE_COUNT_DEFAULT;
  }
  return PRACTICE_COUNT_DEFAULT;
}
