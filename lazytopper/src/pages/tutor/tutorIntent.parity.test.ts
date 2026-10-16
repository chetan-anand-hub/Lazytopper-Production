// TUTOR-FIX-2 integration — the client offer rule (tutorIntent.ts, lane C) and the server safety
// net (server/routes/tutor.cjs detectOfferIntent, lane A) are two copies of ONE table. Run both
// over the same phrases and pin that they agree, row for row.
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { detectOfferIntent as clientDetect, OFFER_INTENT_TABLE as CLIENT_TABLE } from "./tutorIntent";

const require = createRequire(import.meta.url);
const server = require("../../../server/routes/tutor.cjs") as {
  detectOfferIntent: (text: string, opts?: { prevTutor?: string }) => { offer: string; rule: string } | null;
  OFFER_INTENT_TABLE: Record<string, ReadonlyArray<{ id: string; re: RegExp }>>;
};

const PHRASES: Array<[string, string | null]> = [
  ["Can you check my answer?", null],
  ["Yes, I will show my working. Open Check & Improve", null],
  ["I want to upload a photo of my answer sheet and get it graded", null],
  ["Mera answer check karo, kitne marks milenge?", null],
  ["grade my answer", null],
  ["Find the zeroes of x^2 - 3x + 2. My answer: (x-1)(x-2) so 1 and 2. How many marks would I get?", null],
  ["en answer check pannunga", null],
  ["na answer check cheyyandi, enni marks vastayi?", null],
  ["is my answer right?", null],
  ["mark this out of 3", null],
  ["upload", null],
  ["मेरा उत्तर जाँच दो", null],
  ["kitne marks milenge isme", null],
  ["Give me some practice questions on this chapter", null],
  ["Test me with 5 questions", null],
  ["mujhe is chapter ki practice karni hai", null],
  ["ok got it, now quiz me", null],
  ["I keep losing marks in this chapter, what should I do?", null],
  ["aur sawal do board jaise", null],
  ["मुझे और सवाल चाहिए", null],
  ["Why is root 2 irrational?", null],
  ["Explain the Fundamental Theorem of Arithmetic from the top.", null],
  ["Please continue from where you stopped.", null],
  ["", null],
  ["yes please", "You can upload a photo in Check & Improve and get it board-marked. Would you like to do that?"],
  ["ok", "Want to try a couple on this?"],
  ["haan", "Shall we do a quick practice set?"],
  ["yes", "So the HCF is the product of the smallest powers."],
  ["yes", "Try one more step: divide both sides by 2. Does that make sense?"],
  ["yes", "This is the idea a board quiz usually tests. Clear?"],
  ["yes", "I can give you a couple of questions to try. Want them?"],
  ["so sin = p/h, is that correct?", null],
  ["My answer is x = 3, is that correct?", null],
];

describe("TUTOR-FIX-2 · client intent table == server intent table", () => {
  it.each(PHRASES)("%j (prev: %j) → same result on both sides", (text, prev) => {
    const c = clientDetect(text, prev);
    const s = server.detectOfferIntent(text, { prevTutor: prev ?? "" });
    expect(c).toEqual(s);
  });

  it("the rows are identical: same ids, same order, same patterns", () => {
    const serverRows = [...server.OFFER_INTENT_TABLE["check-improve"], ...server.OFFER_INTENT_TABLE.practice];
    expect(CLIENT_TABLE.map((r) => [r.id, r.re.source, r.re.flags])).toEqual(
      serverRows.map((r) => [r.id, r.re.source, r.re.flags]),
    );
  });
});
