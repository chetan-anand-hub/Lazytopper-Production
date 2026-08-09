import { describe, it, expect } from "vitest";
import {
  parseMarkBandRange,
  buildDesktopConceptPracticePath,
  buildDesktopChapterTestPath,
  buildDesktopPracticePath,
  buildDesktopTopicHubPath,
  buildDesktopWorksheetPath,
  buildDesktopCheckPath,
  buildDesktopMePath,
} from "./navigation";

/**
 * PR-E1 + amendment — [FU-PRACTISE-CONCEPT-FILTER].
 *
 * The amendment replaces the lossy coarse-bucket model (which FUSED 2- and
 * 3-mark questions into one bucket "23" and so contaminated a "3-5" request with
 * 2-mark questions) with an EXACT numeric mark range carried as marksMin/marksMax.
 * These tests lock:
 *   1. concept-row Practise routes DIRECTLY to Quick Practice (NOT /practice-hub);
 *   2. the concept mark BAND is carried as an EXACT range (marksMin/marksMax), NOT
 *      the old coarse bucket set (and NOT the dead markBand string);
 *   3. the back-nav label (Back to {Topic}) rides the URL (Link can't carry state);
 *   4. PATH-CONDITIONAL: the hub-entry builder forces NO range.
 */

describe("parseMarkBandRange — exact numeric range from a band string (PR-E1 amendment)", () => {
  it("maps the real concept bands to exact {min,max} (no bucket fusion)", () => {
    expect(parseMarkBandRange("1–2")).toEqual({ min: 1, max: 2 }); // en-dash 1–2
    expect(parseMarkBandRange("2–3")).toEqual({ min: 2, max: 3 }); // en-dash 2–3 — now isolates 3!
    expect(parseMarkBandRange("3–5")).toEqual({ min: 3, max: 5 }); // en-dash 3–5 — NO 2-mark
    expect(parseMarkBandRange("1–3")).toEqual({ min: 1, max: 3 }); // en-dash 1–3
  });

  it("is robust to the dash glyph (hyphen / em-dash / 'to') — no literal-dash match", () => {
    expect(parseMarkBandRange("1-2")).toEqual({ min: 1, max: 2 }); // ascii hyphen
    expect(parseMarkBandRange("3—5")).toEqual({ min: 3, max: 5 }); // em-dash
    expect(parseMarkBandRange("1 to 3")).toEqual({ min: 1, max: 3 });
  });

  it("treats a single number as min==max", () => {
    expect(parseMarkBandRange("1")).toEqual({ min: 1, max: 1 });
    expect(parseMarkBandRange("5")).toEqual({ min: 5, max: 5 });
    expect(parseMarkBandRange("4")).toEqual({ min: 4, max: 4 });
  });

  it("returns null for an empty / unparseable band (caller then emits no filter)", () => {
    expect(parseMarkBandRange(undefined)).toBeNull();
    expect(parseMarkBandRange("")).toBeNull();
    expect(parseMarkBandRange("n/a")).toBeNull();
  });
});

describe("buildDesktopConceptPracticePath — concept-row Practise target (PR-E1 amendment)", () => {
  it("lands DIRECTLY in Quick Practice (/practice/:grade/:subject), NOT /practice-hub", () => {
    const href = buildDesktopConceptPracticePath({
      subject: "Maths",
      topic: "trigonometry",
      focus: "Ratios at standard angles",
      markBand: "1–2",
    });
    expect(href.startsWith("/practice/10/Maths")).toBe(true);
    expect(href).not.toContain("/practice-hub");
  });

  it("carries the mark band as an EXACT range (marksMin/marksMax), not buckets", () => {
    const href = buildDesktopConceptPracticePath({
      subject: "Maths",
      topic: "trigonometry",
      markBand: "3–5",
    });
    const qs = new URLSearchParams(href.split("?")[1]);
    expect(qs.get("marksMin")).toBe("3");
    expect(qs.get("marksMax")).toBe("5");
    // the old lossy coarse-bucket param is gone entirely
    expect(qs.has("marks")).toBe(false);
    expect(qs.has("markBand")).toBe(false);
  });

  it("a 2–3 band now isolates 3-mark too (min=2,max=3) — the fixed bug", () => {
    const href = buildDesktopConceptPracticePath({
      subject: "Science",
      topic: "electricity",
      markBand: "2–3",
    });
    const qs = new URLSearchParams(href.split("?")[1]);
    expect(qs.get("marksMin")).toBe("2");
    expect(qs.get("marksMax")).toBe("3");
  });

  it("carries focus + subtopicHint + backLabel + source/returnTo context", () => {
    const href = buildDesktopConceptPracticePath({
      subject: "Maths",
      topic: "trigonometry",
      focus: "Ratios",
      subtopicHint: "Plug into evaluation",
      markBand: "1–2",
      backLabel: "Back to Trigonometry",
      source: "topicHub",
      returnTo: "/topic-hub/10/Maths/trigonometry",
    });
    const qs = new URLSearchParams(href.split("?")[1]);
    expect(qs.get("topic")).toBe("trigonometry");
    expect(qs.get("focus")).toBe("Ratios");
    expect(qs.get("subtopicHint")).toBe("Plug into evaluation");
    expect(qs.get("backLabel")).toBe("Back to Trigonometry");
    expect(qs.get("source")).toBe("topicHub");
    expect(qs.get("returnTo")).toBe("/topic-hub/10/Maths/trigonometry");
  });

  it("emits NO range params when the band is unparseable (honest default)", () => {
    const href = buildDesktopConceptPracticePath({
      subject: "Maths",
      topic: "trigonometry",
      markBand: "n/a",
    });
    const qs = new URLSearchParams(href.split("?")[1]);
    expect(qs.has("marksMin")).toBe(false);
    expect(qs.has("marksMax")).toBe(false);
  });
});

describe("PATH-CONDITIONAL — hub entry forces NO range (PR-E1)", () => {
  it("the generic hub practice path never emits a marks range", () => {
    // Path 1 — via the Practice hub: student sets their own filters, no concept
    // context. buildDesktopPracticePath carries no exact range at all.
    const hub = buildDesktopPracticePath({
      scope: "topic",
      subject: "Maths",
      topic: "trigonometry",
      mode: "practice-set",
    });
    const qs = new URLSearchParams(hub.split("?")[1]);
    expect(qs.has("marksMin")).toBe(false);
    expect(qs.has("marksMax")).toBe(false);
    expect(qs.has("marks")).toBe(false);
  });
});

describe("buildDesktopChapterTestPath — Topic Hub Chapter test button (PR-E1 item 3)", () => {
  it("targets the existing ChapterTestPage route with grade/subject/topicKey", () => {
    const href = buildDesktopChapterTestPath({
      subject: "Maths",
      topicKey: "trigonometry",
      source: "topicHub",
      returnTo: "/topic-hub/10/Maths/trigonometry",
    });
    expect(href.startsWith("/chapter-test/10/Maths/trigonometry")).toBe(true);
    const qs = new URLSearchParams(href.split("?")[1]);
    expect(qs.get("source")).toBe("topicHub");
    expect(qs.get("returnTo")).toBe("/topic-hub/10/Maths/trigonometry");
  });
});

/* ══════════════ ME-2 — buildDesktopTopicHubPath, previously UNTESTED ══════════════
 *
 * [FU-TOPICHUBPATH-ZERO-TEST-COVERAGE]. Before ME-2 this file did not reference
 * `buildDesktopTopicHubPath` at all, and it is the ONE builder whose output #647's
 * `DesktopTopicHubPage` reads back as an arrival intent.
 *
 * ★ THE ARRIVAL CONCEPT IS A THIRD, OPTIONAL ARGUMENT — NOT A FIELD ON
 *   `DesktopRouteContext`. `addContext` is shared by all seven builders in this file,
 *   so a `concept?` on the shared context type would silently let SIX unrelated URLs
 *   emit `concept`. The last describe below is the CONTROL that protects exactly that:
 *   it re-runs every other builder with a `concept` bolted onto its input and proves
 *   none of them emits the key.
 */

describe("buildDesktopTopicHubPath — the ?concept= arrival (ME-2 produces, #647 consumes)", () => {
  it("emits NO concept key when the third argument is omitted (it is optional)", () => {
    const href = buildDesktopTopicHubPath("trigonometry", { source: "me", returnTo: "/me" });
    const qs = new URLSearchParams(href.split("?")[1]);
    expect(qs.has("concept")).toBe(false);
    // ...while the context half is still carried, so the absence is not "nothing ran".
    expect(qs.get("source")).toBe("me");
    expect(qs.get("returnTo")).toBe("/me");
  });

  it("emits NO concept key for an empty / whitespace-only concept", () => {
    expect(
      new URLSearchParams(buildDesktopTopicHubPath("trigonometry", {}, {}).split("?")[1]).has(
        "concept",
      ),
    ).toBe(false);
    expect(
      new URLSearchParams(
        buildDesktopTopicHubPath("trigonometry", {}, { concept: "   " }).split("?")[1],
      ).has("concept"),
    ).toBe(false);
  });

  it("★ carries the boardEssentials NAME VERBATIM — never slugified or case-folded", () => {
    // A real `boardEssentials[].name` shape: capitals, spaces and an apostrophe.
    const name = "Ohm's law and resistance";
    const href = buildDesktopTopicHubPath("electricity", { source: "me", returnTo: "/me" }, {
      concept: name,
    });
    const qs = new URLSearchParams(href.split("?")[1]);
    // Round-trips to the EXACT string #647 compares with `c.name === raw`.
    expect(qs.get("concept")).toBe(name);
    // ...and it is URI-encoded on the wire, not raw.
    expect(href).toContain("concept=Ohm");
    expect(href).not.toContain("concept=Ohm's law and resistance");
  });

  it("★ CONTROL: a slugified value does NOT round-trip to the name — the failure is visible", () => {
    const name = "Ohm's law and resistance";
    const slug = "ohms-law-and-resistance";
    const href = buildDesktopTopicHubPath("electricity", {}, { concept: slug });
    const qs = new URLSearchParams(href.split("?")[1]);
    expect(qs.get("concept")).toBe(slug);
    // This is the mutation M2 assertion in miniature: a slug is NOT the name, so
    // #647's `boardEssentials.find((c) => c.name === raw)` would resolve to null.
    expect(qs.get("concept")).not.toBe(name);
  });

  it("trims surrounding whitespace so a stray space cannot break the exact match", () => {
    const href = buildDesktopTopicHubPath("electricity", {}, { concept: "  Refraction  " });
    expect(new URLSearchParams(href.split("?")[1]).get("concept")).toBe("Refraction");
  });

  it("still encodes the topic slug in the path", () => {
    const href = buildDesktopTopicHubPath("light-reflection-and-refraction", {}, {
      concept: "Refraction",
    });
    expect(href.startsWith("/topic-hub/light-reflection-and-refraction")).toBe(true);
  });
});

describe("★ CONTROL — the concept param is confined to the Topic Hub builder", () => {
  /**
   * The leak this protects against: putting `concept` on `DesktopRouteContext` (which
   * `addContext` writes for EVERY builder). If that happened, these six would start
   * emitting `concept` and six unrelated URLs would change meaning. Each input below
   * carries a `concept` property that the builder must IGNORE.
   */
  const withConcept = { concept: "Ohm's law and resistance" } as Record<string, unknown>;

  const cases: Array<[string, string]> = [
    [
      "buildDesktopConceptPracticePath",
      buildDesktopConceptPracticePath({
        subject: "Maths",
        topic: "trigonometry",
        ...withConcept,
      } as Parameters<typeof buildDesktopConceptPracticePath>[0]),
    ],
    [
      "buildDesktopPracticePath",
      buildDesktopPracticePath({
        scope: "full-subject",
        subject: "Maths",
        ...withConcept,
      } as Parameters<typeof buildDesktopPracticePath>[0]),
    ],
    [
      "buildDesktopWorksheetPath",
      buildDesktopWorksheetPath({
        scope: "full-subject",
        subject: "Maths",
        mistakeAware: true,
        ...withConcept,
      } as Parameters<typeof buildDesktopWorksheetPath>[0]),
    ],
    [
      "buildDesktopChapterTestPath",
      buildDesktopChapterTestPath({
        subject: "Maths",
        topicKey: "trigonometry",
        ...withConcept,
      } as Parameters<typeof buildDesktopChapterTestPath>[0]),
    ],
    [
      "buildDesktopCheckPath",
      buildDesktopCheckPath("trigonometry", {
        source: "me",
        ...withConcept,
      } as Parameters<typeof buildDesktopCheckPath>[1]),
    ],
    [
      "buildDesktopMePath",
      buildDesktopMePath({ source: "home", ...withConcept } as Parameters<
        typeof buildDesktopMePath
      >[0]),
    ],
  ];

  it.each(cases)("%s emits NO concept key", (_name, href) => {
    expect(new URLSearchParams(href.split("?")[1]).has("concept")).toBe(false);
  });

  it("★ POSITIVE CONTROL: the SAME assertion DOES fire for the Topic Hub builder", () => {
    // Without this, the six absences above could all be a broken query.
    const href = buildDesktopTopicHubPath("electricity", {}, withConcept);
    expect(new URLSearchParams(href.split("?")[1]).has("concept")).toBe(true);
  });

  it("★ the worksheet builder still emits mistakeAware=1 — the six are not inert", () => {
    const href = buildDesktopWorksheetPath({
      scope: "full-subject",
      subject: "Maths",
      mistakeAware: true,
    });
    expect(new URLSearchParams(href.split("?")[1]).get("mistakeAware")).toBe("1");
  });
});
