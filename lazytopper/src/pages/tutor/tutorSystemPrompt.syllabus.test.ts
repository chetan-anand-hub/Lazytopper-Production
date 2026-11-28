// SYLLABUS-FIX-CODE F5 — the tutor's syllabus lists come from the ONE reference.
//
// ★ THE MECHANISM. The tutor prompt is built by a CommonJS server module
// (server/prompts/tutorSystemPrompt.cjs) that cannot import the TypeScript reference
// (src/config/syllabus2026-27.ts). So the lists the tutor needs are embedded in the .cjs
// between `BEGIN GENERATED TUTOR_SYLLABUS_2026_27` / `END GENERATED ...` markers, and THIS
// FILE is both the generator and the drift test:
//   • `deriveTutorSyllabus()` below builds the object from the TS reference;
//   • the drift test requires the embedded object to DEEP-EQUAL it — change F1 and this
//     goes red (the mandatory drift pin);
//   • regenerate the block (only after an F1 change you mean):
//       LT_WRITE_TUTOR_SYLLABUS=1 npx vitest run src/pages/tutor/tutorSystemPrompt.syllabus.test.ts
// Why embed rather than ship a .json beside it: the server deploys `server/` alone, the
// block keeps the list next to the prompt that uses it, and no runtime file read can fail.
//
// The other pins: the BUILT prompt contains every F1 OUT, FORMATIVE and LIMIT item
// verbatim, names the three formative-only topics the owner named, and tells the tutor to
// decline OUT topics and to say plainly that formative-only topics are not in the 2027 exam.

import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  FORMATIVE_ONLY_TOPICS,
  SYLLABUS_2026_27,
  SYLLABUS_FORMATIVE,
  SYLLABUS_LIMITS,
  SYLLABUS_OUT,
  type SyllabusChapter,
} from "../../config/syllabus2026-27";

const require = createRequire(import.meta.url);
const PROMPT_FILE = resolve(__dirname, "../../../server/prompts/tutorSystemPrompt.cjs");
const BEGIN = "// BEGIN GENERATED TUTOR_SYLLABUS_2026_27";
const END = "// END GENERATED TUTOR_SYLLABUS_2026_27";

const rows = (list: readonly { key: string; item: string; page: number }[]) =>
  list.map((r) => ({ chapter: r.key, item: r.item, page: r.page }));

/** The object the tutor prompt embeds — derived from the one reference, nothing else. */
export function deriveTutorSyllabus() {
  const keepIn: Array<{ subject: string; chapter: string; item: string; page: number }> = [];
  for (const subject of ["maths", "science"] as const) {
    for (const c of SYLLABUS_2026_27[subject].chapters as readonly SyllabusChapter[]) {
      for (const i of c.in) if (i.ruling) keepIn.push({ subject, chapter: c.key, item: i.item, page: i.page });
    }
  }
  return {
    sourceSha256: SYLLABUS_2026_27.meta.sourceSha256,
    pdfs: SYLLABUS_2026_27.meta.authority.map((a) => ({ subject: a.subject, url: a.url })),
    out: { maths: rows(SYLLABUS_OUT.maths), science: rows(SYLLABUS_OUT.science) },
    formativeTopics: FORMATIVE_ONLY_TOPICS.map((t) => ({
      name: t.name,
      chapter: t.parentKey ?? t.slug ?? "",
      page: t.page,
    })),
    formativeDetail: { maths: rows(SYLLABUS_FORMATIVE.maths), science: rows(SYLLABUS_FORMATIVE.science) },
    limits: { maths: rows(SYLLABUS_LIMITS.maths), science: rows(SYLLABUS_LIMITS.science) },
    keepIn,
  };
}

const renderBlock = (obj: unknown) =>
  `${BEGIN}\nconst TUTOR_SYLLABUS_2026_27 = ${JSON.stringify(obj, null, 2)};\n${END}`;

if (process.env.LT_WRITE_TUTOR_SYLLABUS === "1") {
  const src = readFileSync(PROMPT_FILE, "utf8");
  const a = src.indexOf(BEGIN);
  const b = src.indexOf(END);
  if (a < 0 || b < a) throw new Error("tutor syllabus markers not found");
  writeFileSync(PROMPT_FILE, src.slice(0, a) + renderBlock(deriveTutorSyllabus()) + src.slice(b + END.length));
}

const mod = require(PROMPT_FILE) as {
  buildTutorSystemPrompt: (args: Record<string, unknown>) => string;
  TUTOR_SYLLABUS_2026_27: unknown;
};

describe("F5 — tutor syllabus lists (drift + coverage)", () => {
  it("DRIFT: the embedded list deep-equals the one derived from src/config/syllabus2026-27.ts", () => {
    expect(
      mod.TUTOR_SYLLABUS_2026_27,
      "Regenerate: LT_WRITE_TUTOR_SYLLABUS=1 npx vitest run src/pages/tutor/tutorSystemPrompt.syllabus.test.ts",
    ).toEqual(deriveTutorSyllabus());
  });

  it("the embedded block is exactly the generator's rendering (no hand edits inside the markers)", () => {
    const src = readFileSync(PROMPT_FILE, "utf8");
    const a = src.indexOf(BEGIN);
    const b = src.indexOf(END);
    expect(a).toBeGreaterThan(-1);
    expect(src.slice(a, b + END.length).replace(/\r\n/g, "\n")).toBe(renderBlock(deriveTutorSyllabus()));
  });

  for (const subject of ["maths", "science"] as const) {
    for (const topicLabel of ["Triangles", "Magnetic Effects of Electric Current"]) {
      it(`the ${subject} prompt (topic ${topicLabel}) carries every F1 OUT, FORMATIVE and LIMIT item verbatim`, () => {
        const prompt = mod.buildTutorSystemPrompt({ topicLabel, subject });
        for (const s of ["maths", "science"] as const) {
          for (const r of SYLLABUS_OUT[s]) expect(prompt, `OUT: ${r.item}`).toContain(r.item);
          for (const r of SYLLABUS_FORMATIVE[s]) expect(prompt, `FORMATIVE: ${r.item}`).toContain(r.item);
          for (const r of SYLLABUS_LIMITS[s]) expect(prompt, `LIMIT: ${r.item}`).toContain(r.item);
        }
        for (const t of FORMATIVE_ONLY_TOPICS) expect(prompt, `formative topic: ${t.name}`).toContain(t.name);
      });
    }
  }

  it("names the owner's formative-only topics and states the two behaviours", () => {
    const prompt = mod.buildTutorSystemPrompt({ topicLabel: "Triangles", subject: "maths" });
    for (const name of ["Periodic Classification", "Evolution", "Electric Motor", "Electromagnetic Induction", "Electric Generator"]) {
      expect(prompt).toContain(name);
    }
    expect(prompt).toMatch(/OUT OF THE SYLLABUS/);
    expect(prompt).toMatch(/decline politely/i);
    expect(prompt).toMatch(/NOT in the 2027 board exam/);
    // Owner rulings that keep things IN are carried, so the tutor does not over-refuse
    // (Pythagoras as a numeric tool, heredity, lenses in contact).
    const keepIn = deriveTutorSyllabus().keepIn;
    expect(keepIn.length).toBeGreaterThanOrEqual(3);
    for (const r of keepIn) expect(prompt).toContain(r.item);
    expect(prompt).toMatch(/STILL IN/);
    // Owner ruling 2026-10-06: atmospheric refraction is kept IN; the Sun's colour stays OUT.
    const stillIn = prompt.slice(prompt.indexOf("STILL IN"));
    expect(stillIn).toMatch(/Atmospheric refraction \(twinkling of stars, advance sunrise/);
    const outBlock = prompt.slice(prompt.indexOf("OUT OF THE SYLLABUS"), prompt.indexOf("FORMATIVE-ONLY"));
    expect(outBlock).toContain("Colour of the Sun at sunrise and sunset");
    expect(outBlock).not.toMatch(/Atmospheric refraction/i);
  });

  it("an OUT sub-topic the student opened on is NOT simply 'started on'", () => {
    const prompt = mod.buildTutorSystemPrompt({
      topicLabel: "Triangles",
      subject: "maths",
      concept: "Areas of similar triangles ∝ (sides)²",
    });
    expect(prompt).toMatch(/opened on the sub-topic "Areas of similar triangles/);
    // TUTOR-SYLLABUS-1: the old "apply the syllabus gate instead of teaching it" wording is gone;
    // an OUT/formative opening now follows the ask-first, teach-if-they-insist rule.
    expect(prompt).toMatch(/OUT list[^\n]*(\n[^\n]*)?ask-first, teach-if-they-insist/i);
  });

  describe("TUTOR-SYLLABUS-1 — classify by method, teach Class-10 off-syllabus on insistence", () => {
    const prompt = () => mod.buildTutorSystemPrompt({ topicLabel: "Arithmetic Progression", subject: "maths" });

    it("carries the method-not-story rule and the polygon example", () => {
      const p = prompt();
      expect(p).toMatch(/CLASSIFY BY METHOD, NOT BY STORY/);
      expect(p).toMatch(/polygon/);
      expect(p).toMatch(/n=12/);
    });

    it("no longer forbids solving/explaining an OUT topic", () => {
      expect(prompt()).not.toContain("Do not solve, prove or explain it");
    });

    it("has the insist rule with its exact first line", () => {
      const p = prompt().replace(/\s+/g, " ");
      expect(p).toContain("Not on your 2027 board exam — explaining it for your understanding.");
      expect(p).toMatch(/insist in any way/);
      expect(p).toMatch(/no board-style practice offers|no board-style practice/);
      expect(p).toMatch(/no Answer Checker or marks nudges/);
    });

    it("keeps declining Class 11/12 material and the unsure-help rule", () => {
      const p = prompt().replace(/\s+/g, " ");
      expect(p).toMatch(/Class 11\/12 material — decline politely/);
      expect(p).toContain("check with your NCERT whether this is in your syllabus");
      expect(p).toMatch(/never claim something is out of syllabus unless/i);
    });
  });
});
