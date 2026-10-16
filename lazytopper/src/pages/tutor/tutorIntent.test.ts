// TUTOR-FIX-2 T11 (client) — the deterministic offer rule, table-tested. The rows mirror the
// server's OFFER_INTENT_TABLE (ops/.specs/INTENT_TABLE.md). Every live probe from the spec's
// addenda (v2: 7 check asks, v3: 6 practice asks) is a row here.

import { describe, it, expect } from "vitest";
import {
  detectOfferIntent,
  offerForTutorTurn,
  practiceCountForThread,
  practiceCountFromText,
  OFFER_INTENT_TABLE,
} from "./tutorIntent";
import type { TutorTurn } from "../../ai/tutorClient";

const CHECK_ASKS = [
  // v2 live probes (11:20) — the button appeared for only 2 of these 7.
  "Can you check my answer?",
  "Yes, I will show my working. Open Check & Improve",
  "I want to upload a photo of my answer sheet and get it graded",
  "Mera answer check karo, kitne marks milenge?",
  "grade my answer",
  "Find the zeroes of x^2 - 3x + 2. My answer: (x-1)(x-2) so 1 and 2. How many marks would I get?",
  // v2 (e) — the 5 more.
  "en answer check pannunga",
  "na answer check cheyyandi, enni marks vastayi?",
  "is my answer right?",
  "mark this out of 3",
  "upload",
  // Devanagari / Hinglish.
  "मेरा उत्तर जाँच दो",
  "kitne marks milenge isme",
  "isko jaanch lo",
];

const PRACTICE_ASKS = [
  // v3 probes (11:45) — the last two showed NO "Practise this".
  "Give me some practice questions on this chapter",
  "Test me with 5 questions",
  "mujhe is chapter ki practice karni hai",
  "ok got it, now quiz me",
  "I keep losing marks in this chapter, what should I do?",
  "aur sawal do board jaise",
  "मुझे और सवाल चाहिए",
];

const NEITHER = [
  "Why is root 2 irrational?",
  "I have a specific question I got stuck on.",
  "Explain the Fundamental Theorem of Arithmetic from the top.",
  "Please continue from where you stopped.",
  "",
];

describe("T11 · detectOfferIntent — check-improve", () => {
  it.each(CHECK_ASKS)("%s → check-improve", (text) => {
    expect(detectOfferIntent(text)?.offer).toBe("check-improve");
  });
});

describe("T11 · detectOfferIntent — practice", () => {
  it.each(PRACTICE_ASKS)("%s → practice", (text) => {
    expect(detectOfferIntent(text)?.offer).toBe("practice");
  });
});

describe("T11 · detectOfferIntent — neither", () => {
  it.each(NEITHER)("%j → null", (text) => {
    expect(detectOfferIntent(text)).toBeNull();
  });
});

describe("T11 · the bare 'yes' to the tutor's own offer", () => {
  it("'yes please' after the tutor asked about uploading for marking → check-improve (the v2 bug)", () => {
    const prev = "You can upload a photo in Check & Improve and get it board-marked. Would you like to do that?";
    expect(detectOfferIntent("yes please", prev)).toEqual({ offer: "check-improve", rule: "yes-to-check-offer" });
  });
  it("'ok' after the tutor offered to try a couple → practice", () => {
    expect(detectOfferIntent("ok", "Want to try a couple on this?")?.offer).toBe("practice");
  });
  it("a bare 'yes' after an ordinary explanation → nothing", () => {
    expect(detectOfferIntent("yes", "So the HCF is the product of the smallest powers.")).toBeNull();
  });
  // Review fix: ordinary teaching lines are not practice offers.
  it.each([
    "Try one more step: divide both sides by 2. Does that make sense?",
    "Try 2 as a factor first. Shall I go on?",
    "This is the idea a board quiz usually tests. Clear?",
  ])("'yes' after a teaching line %j → nothing", (prev) => {
    expect(detectOfferIntent("yes", prev)).toBeNull();
  });
  it.each([
    "I can give you a couple of questions to try. Want them?",
    "Want to practise a few on this?",
    "Shall we do a quick practice set?",
  ])("'yes' after an explicit practice offer %j → practice", (prev) => {
    expect(detectOfferIntent("yes", prev)).toEqual({ offer: "practice", rule: "yes-to-practice-offer" });
  });
});

describe("Review fix · 'is that correct?' needs the student's own work nearby", () => {
  it.each(["so sin = p/h, is that correct?", "and the HCF divides the LCM, is that right?"])(
    "concept check %j → null",
    (text) => {
      expect(detectOfferIntent(text)).toBeNull();
    },
  );
  it.each([
    "My answer is x = 3, is that correct?",
    "Here is my working: 2x = 6 so x = 3. Is this right?",
    "is this right? my solution: x = 3",
    "did I do it right?",
  ])("own-work check %j → check-improve", (text) => {
    expect(detectOfferIntent(text)?.offer).toBe("check-improve");
  });
});

describe("T11 · table order (mirrors the server)", () => {
  it("every check-improve row comes before every practice row", () => {
    const firstPractice = OFFER_INTENT_TABLE.findIndex((r) => r.offer === "practice");
    expect(OFFER_INTENT_TABLE.slice(firstPractice).every((r) => r.offer === "practice")).toBe(true);
    expect(OFFER_INTENT_TABLE.length).toBe(27 + 19);
  });
});

describe("T11 · offerForTutorTurn — the model's tag wins, the rule fills the gap", () => {
  const t = (over: Partial<TutorTurn>): TutorTurn => ({ role: "tutor", content: "Sure.", ...over });
  const u = (content: string): TutorTurn => ({ role: "user", content });

  it("RED on today's UI: the model omitted the tag, the student asked to be marked → check-improve", () => {
    const msgs = [u("grade my answer"), t({ content: "Go to Check & Improve for that." })];
    expect(offerForTutorTurn(msgs, 1)).toBe("check-improve");
  });
  it("the model's own tag is kept", () => {
    const msgs = [u("grade my answer"), t({ offer: "practice" })];
    expect(offerForTutorTurn(msgs, 1)).toBe("practice");
  });
  it("no ask, no tag → null", () => {
    expect(offerForTutorTurn([u("why is root 2 irrational?"), t({})], 1)).toBeNull();
  });
  it("a return opener never gains an offer from the rule", () => {
    expect(offerForTutorTurn([u("grade my answer"), t({ kind: "return-result" })], 1)).toBeNull();
  });
});

describe("[FU-PRACTICE-COUNT-PASSTHROUGH] · the count", () => {
  it.each<[string, number | null]>([
    ["Test me with 5 questions", 5],
    ["test me with 5", 5],
    ["give me 3 more questions", 3],
    ["give me a couple of questions", 2],
    ["five questions please", 5],
    ["give me 25 questions", 10], // capped
    ["practice questions on chapter 3", null], // a chapter number is not a count
    ["Give me some practice questions", null],
  ])("%s → %s", (text, n) => {
    expect(practiceCountFromText(text)).toBe(n);
  });

  it("the thread's latest practice ask decides; default 2", () => {
    const u = (content: string): TutorTurn => ({ role: "user", content });
    expect(practiceCountForThread([])).toBe(2);
    expect(practiceCountForThread([u("Test me with 5 questions")])).toBe(5);
    expect(practiceCountForThread([u("Test me with 5 questions"), u("why?")])).toBe(5);
    expect(practiceCountForThread([u("Test me with 5 questions"), u("give me some practice questions")])).toBe(2);
  });
});
