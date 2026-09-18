/**
 * GUARD — the published board questions must equal what the rule produces from the
 * LIVE bank, exactly.
 *
 * ★ THIS IS WHERE §2.5 "FAIL LOUDLY" ACTUALLY LIVES.
 * A runtime throw on a prerendered notes page would NOT fail a build — it would paint
 * the error boundary, which is the soft-404 mechanism already on record in this repo.
 * A build-time guard is the only place the requirement can be enforced, so these
 * assertions FAIL. They never warn, and they never skip.
 *
 * A mismatch means the bank MOVED and the 26 published pages are now stale. The fix is
 * to regenerate, not to relax the assertion:
 *     node --import tsx scripts/generateBoardQuestions.ts
 */

import { describe, it, expect } from "vitest";

import {
  canonicalQuestionBank,
  AI_GENERATED_QUESTION_IDS,
  WITHHELD_QUESTION_IDS,
} from "../../data/canonicalQuestionBank";
import { BOARD_QUESTIONS } from "./boardQuestions";
import {
  BOARD_QUESTION_COUNT,
  compareById,
  selectBoardQuestions,
  toPracticeSubject,
} from "./selectionRule";

const live = () =>
  selectBoardQuestions(canonicalQuestionBank, AI_GENERATED_QUESTION_IDS, WITHHELD_QUESTION_IDS);

const EXPECTED_TOPICS = 26;

describe("board questions artifact — matches the live bank", () => {
  it("is byte-for-byte what the rule produces from the live bank RIGHT NOW", () => {
    // Serialised compare: catches a changed id, a re-ordered pair, an edited
    // solution step and a dropped pyqYear alike. toEqual on the parsed objects
    // would miss key ORDER, which is exactly what determinism is about.
    expect(JSON.stringify(BOARD_QUESTIONS)).toBe(JSON.stringify(live()));
  });

  it("publishes exactly 3 questions on every one of the 26 topics", () => {
    const topics = Object.keys(BOARD_QUESTIONS);
    expect(topics).toHaveLength(EXPECTED_TOPICS);
    for (const t of topics) {
      expect(BOARD_QUESTIONS[t].questions, `${t} must publish ${BOARD_QUESTION_COUNT}`)
        .toHaveLength(BOARD_QUESTION_COUNT);
    }
  });

  it("CONTROL: the equality assertion detects a single changed character", () => {
    // Proves the check above is a real instrument and not vacuously true.
    const tampered = JSON.parse(JSON.stringify(BOARD_QUESTIONS));
    const first = Object.keys(tampered)[0];
    tampered[first].questions[0].questionText += "x";
    expect(JSON.stringify(tampered)).not.toBe(JSON.stringify(live()));
  });

  it("CONTROL: the count assertion detects a topic stripped to 2", () => {
    const tampered = JSON.parse(JSON.stringify(BOARD_QUESTIONS));
    const first = Object.keys(tampered)[0];
    tampered[first].questions.pop();
    expect(tampered[first].questions).not.toHaveLength(BOARD_QUESTION_COUNT);
  });
});

describe("every question is renderable and crawler-readable", () => {
  it("carries question text, a mark total, a section and step-marked solution steps", () => {
    for (const [topic, entry] of Object.entries(BOARD_QUESTIONS)) {
      for (const q of entry.questions) {
        expect(q.questionText.trim().length, `${topic}/${q.id} questionText`).toBeGreaterThan(0);
        expect(q.marks, `${topic}/${q.id} marks`).toBeGreaterThan(0);
        expect(q.section.trim().length, `${topic}/${q.id} section`).toBeGreaterThan(0);
        // ★ The step-marked solution is the asset this lane publishes. A row with no
        //   steps would render a question a crawler can read and an answer it cannot.
        expect(q.solutionSteps.length, `${topic}/${q.id} solutionSteps`).toBeGreaterThan(0);
        for (const s of q.solutionSteps) {
          expect(s.trim().length, `${topic}/${q.id} empty step`).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe("the practice CTA subject mapping", () => {
  // ⚠ normaliseSubject (practiceQuestionBuilder.ts:325-329) maps anything that is not
  // "science"/"sci" to Maths WITHOUT ERRORING. Serving maths questions on a science
  // notes page is a defect nobody reports and everybody notices, so it is asserted here.
  it("maps all 26 topics to exactly one subject, with zero unmapped", () => {
    const topics = Object.keys(BOARD_QUESTIONS);
    expect(topics).toHaveLength(EXPECTED_TOPICS);

    const subjects = topics.map((t) => BOARD_QUESTIONS[t].subject);
    expect(subjects).toHaveLength(EXPECTED_TOPICS);
    expect(subjects.filter(Boolean)).toHaveLength(EXPECTED_TOPICS);
    for (const s of subjects) expect(["maths", "science"]).toContain(s);
  });

  it("each topic's subject matches the bank, and no topic mixes subjects", () => {
    for (const topic of Object.keys(BOARD_QUESTIONS)) {
      const bankSubjects = new Set(
        canonicalQuestionBank.filter((q) => q.topicKey === topic).map((q) => q.subject),
      );
      expect(bankSubjects.size, `${topic} must map to exactly one bank subject`).toBe(1);
      expect(BOARD_QUESTIONS[topic].subject).toBe(toPracticeSubject([...bankSubjects][0]));
    }
  });

  it("CONTROL: a note-spec subject would NOT survive this mapping", () => {
    // NoteMeta.subject is physics | chemistry | biology | maths — four values.
    // Deriving the CTA subject from the note spec sends physics/chemistry/biology
    // through normaliseSubject's silent default to Maths. This is why the artifact
    // carries a bank-derived subject instead.
    expect(toPracticeSubject("physics")).not.toBe("science");
    expect(toPracticeSubject("Science")).toBe("science");
    expect(toPracticeSubject("Maths")).toBe("maths");
  });
});

describe("determinism", () => {
  it("produces an identical result on a second, independent run", () => {
    expect(JSON.stringify(live())).toBe(JSON.stringify(live()));
  });

  it("orders topics and ids in codepoint order", () => {
    const topics = Object.keys(BOARD_QUESTIONS);
    expect(topics).toEqual([...topics].sort(compareById));
    for (const t of topics) {
      const ids = BOARD_QUESTIONS[t].questions.map((q) => q.id);
      expect(ids, `${t} ids must be codepoint-ordered`).toEqual([...ids].sort(compareById));
    }
  });

  it("CONTROL: codepoint order and localeCompare genuinely disagree on this bank", () => {
    // If this control ever goes green-by-accident (i.e. the two agree), the comment in
    // selectionRule.ts warning against localeCompare would look like superstition. It
    // is not: 41 of the bank's ids are lowercase and ICU interleaves case.
    const ids = canonicalQuestionBank.map((q) => q.id);
    const cp = [...ids].sort(compareById);
    const icu = [...ids].sort((a, b) => a.localeCompare(b, "en-US"));
    expect(cp).not.toEqual(icu);
  });
});
