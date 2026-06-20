import { describe, it, expect } from "vitest";
import {
  markBandToBuckets,
  marksBucketsToParam,
  buildDesktopConceptPracticePath,
  buildDesktopChapterTestPath,
  buildDesktopPracticePath,
} from "./navigation";

/**
 * PR-E1 — [FU-PRACTISE-CONCEPT-FILTER] + Chapter-test wiring.
 *
 * These tests lock the two behaviours the owner reported broken:
 *   1. concept-row Practise must route DIRECTLY to Quick Practice
 *      (/practice/:grade/:subject), NOT the generic /practice-hub;
 *   2. the concept mark BAND must be carried in the `marks` format PracticePage
 *      CONSUMES — a RANGE -> bucket SET mapping (not the old never-read markBand
 *      string).
 * Plus the band->bucket mapping itself, and the PATH-CONDITIONAL guarantee that
 * the hub-entry builder forces NO marks band.
 */

describe("markBandToBuckets — range -> bucket SET (PR-E1)", () => {
  it("maps the four real concept bands to their bucket unions", () => {
    // The exact mapping from the spec.
    expect(markBandToBuckets("1–2")).toEqual(["1", "23"]); // en-dash 1–2
    expect(markBandToBuckets("2–3")).toEqual(["23"]); //       en-dash 2–3
    expect(markBandToBuckets("3–5")).toEqual(["23", "5"]); //  en-dash 3–5
    expect(markBandToBuckets("1–3")).toEqual(["1", "23"]); //  en-dash 1–3
  });

  it("is robust to the dash glyph (hyphen / em-dash / 'to') — no literal-dash match", () => {
    expect(markBandToBuckets("1-2")).toEqual(["1", "23"]); // ascii hyphen
    expect(markBandToBuckets("3—5")).toEqual(["23", "5"]); // em-dash
    expect(markBandToBuckets("1 to 3")).toEqual(["1", "23"]);
  });

  it("treats a single number as low==high", () => {
    expect(markBandToBuckets("1")).toEqual(["1"]);
    expect(markBandToBuckets("5")).toEqual(["5"]);
    expect(markBandToBuckets("4")).toEqual(["4"]);
  });

  it("returns [] for an empty / unparseable band (caller then emits no filter)", () => {
    expect(markBandToBuckets(undefined)).toEqual([]);
    expect(markBandToBuckets("")).toEqual([]);
    expect(markBandToBuckets("n/a")).toEqual([]);
  });

  it("serialises to the comma `marks` param PracticePage reads (or null when empty)", () => {
    expect(marksBucketsToParam(markBandToBuckets("1–2"))).toBe("1,23");
    expect(marksBucketsToParam(markBandToBuckets("2–3"))).toBe("23");
    expect(marksBucketsToParam(markBandToBuckets(""))).toBeNull();
  });
});

describe("buildDesktopConceptPracticePath — concept-row Practise target (PR-E1 items 1+2)", () => {
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

  it("carries the mark band as the CONSUMED `marks` set (not the dead markBand string)", () => {
    const href = buildDesktopConceptPracticePath({
      subject: "Maths",
      topic: "trigonometry",
      markBand: "1–2",
    });
    const qs = new URLSearchParams(href.split("?")[1]);
    expect(qs.get("marks")).toBe("1,23");
    expect(qs.has("markBand")).toBe(false);
  });

  it("a single-bucket band emits a single `marks` value", () => {
    const href = buildDesktopConceptPracticePath({
      subject: "Science",
      topic: "electricity",
      markBand: "2–3",
    });
    expect(new URLSearchParams(href.split("?")[1]).get("marks")).toBe("23");
  });

  it("carries focus + subtopicHint + source/returnTo context", () => {
    const href = buildDesktopConceptPracticePath({
      subject: "Maths",
      topic: "trigonometry",
      focus: "Ratios",
      subtopicHint: "Plug into evaluation",
      markBand: "1–2",
      source: "topicHub",
      returnTo: "/topic-hub/10/Maths/trigonometry",
    });
    const qs = new URLSearchParams(href.split("?")[1]);
    expect(qs.get("topic")).toBe("trigonometry");
    expect(qs.get("focus")).toBe("Ratios");
    expect(qs.get("subtopicHint")).toBe("Plug into evaluation");
    expect(qs.get("source")).toBe("topicHub");
    expect(qs.get("returnTo")).toBe("/topic-hub/10/Maths/trigonometry");
  });

  it("emits NO marks param when the band is unparseable (honest default)", () => {
    const href = buildDesktopConceptPracticePath({
      subject: "Maths",
      topic: "trigonometry",
      markBand: "n/a",
    });
    expect(new URLSearchParams(href.split("?")[1]).has("marks")).toBe(false);
  });
});

describe("PATH-CONDITIONAL — hub entry forces NO band (PR-E1)", () => {
  it("the generic hub practice path never emits a `marks` band", () => {
    // Path 1 — via the Practice hub: student sets their own filters, no concept
    // context. buildDesktopPracticePath carries no marks bucket at all.
    const hub = buildDesktopPracticePath({
      scope: "topic",
      subject: "Maths",
      topic: "trigonometry",
      mode: "practice-set",
    });
    const qs = new URLSearchParams(hub.split("?")[1]);
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
