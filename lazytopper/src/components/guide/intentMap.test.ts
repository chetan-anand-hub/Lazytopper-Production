import { describe, it, expect } from "vitest";
import {
  GUIDE_LINES,
  GUIDE_MAX_OPTIONS,
  buildGuidePlan,
  chapterSlugFromLanding,
  knownGuideRoute,
  subjectFromLanding,
  type ChapterRef,
  type IntentDeps,
  type IntentInput,
} from "./intentMap";

/** GUIDE-1 §3C — the intent map, rule by rule (first match wins). */

const CHAPTERS: Record<string, ChapterRef> = {
  trigonometry: { slug: "trigonometry", name: "Introduction to Trigonometry", subject: "Maths" },
  electricity: { slug: "electricity", name: "Electricity", subject: "Science" },
};
const deps: IntentDeps = { chapterBySlug: (s) => CHAPTERS[s] ?? null, routeExists: knownGuideRoute, tutorOpens: true };
const input = (over: Partial<IntentInput> = {}): IntentInput => ({
  landing: null,
  utmContent: null,
  utmCampaign: null,
  cbqLanding: false,
  subjectHint: null,
  surface: "home",
  ...over,
});
const ids = (i: IntentInput, d: IntentDeps = deps) => buildGuidePlan(i, d).options.map((o) => o.id);

describe("GUIDE-1 · intent map rules", () => {
  it("rule 1 — utm_content containing cbq puts CBQ practice first, with the CBQ line", () => {
    const p = buildGuidePlan(input({ utmContent: "cbq_short" }), deps);
    expect(p.intent).toBe("cbq");
    expect(p.line).toBe(GUIDE_LINES.cbq);
    expect(p.options[0].id).toBe("cbq");
    expect(p.options[0].action).toEqual({ kind: "route", path: "/practice-hub?cbq=1" });
  });

  it("rule 1 — a ?cbq=1 landing (the surviving subject hint) does too, and wins over a chapter landing", () => {
    expect(ids(input({ cbqLanding: true, landing: "/notes/trigonometry" }))[0]).toBe("cbq");
  });

  it("rule 2 — a /notes/<chapter> landing leads with THAT chapter's 5 quick questions, then important Qs and its notes", () => {
    const p = buildGuidePlan(input({ landing: "/notes/trigonometry" }), deps);
    expect(p.intent).toBe("chapter");
    expect(p.line).toBe("Doing Introduction to Trigonometry? These will help:");
    expect(p.options.slice(0, 3).map((o) => o.id)).toEqual(["quick", "important", "notes"]);
    expect(p.options[0].action).toEqual({ kind: "quick", chapter: CHAPTERS.trigonometry });
    expect(p.options[1].action).toEqual({ kind: "route", path: "/highly-probable/10/Maths" });
    expect(p.options[2].action).toEqual({ kind: "route", path: "/notes/trigonometry" });
  });

  it("rule 2 — /topic-hub/10/<subject>/<chapter> and /topic-hub/<chapter> are chapter landings; the subject follows the chapter", () => {
    expect(chapterSlugFromLanding("/topic-hub/10/Science/electricity")).toBe("electricity");
    expect(chapterSlugFromLanding("/topic-hub/electricity")).toBe("electricity");
    expect(chapterSlugFromLanding("/topic-hub/10/Maths")).toBeNull();
    const p = buildGuidePlan(input({ landing: "/topic-hub/10/Science/electricity" }), deps);
    expect(p.intent).toBe("chapter");
    expect(p.options.find((o) => o.id === "important")!.action).toEqual({ kind: "route", path: "/highly-probable/10/Science" });
  });

  it("rule 2 — an unknown chapter slug is NOT a chapter landing (falls through)", () => {
    expect(buildGuidePlan(input({ landing: "/notes/not-a-chapter" }), deps).intent).toBe("default");
  });

  it("GUIDE-IQ-1 (a) — /highly-probable/10/Science is the important-questions intent: its line, Science important Qs first, no Maths paths", () => {
    const p = buildGuidePlan(input({ landing: "/highly-probable/10/Science" }), deps);
    expect(p.intent).toBe("important");
    expect(p.line).toBe("Important questions? Start here:");
    expect(p.line).toBe(GUIDE_LINES.important);
    expect(p.options[0].id).toBe("important");
    expect(p.options[0].action).toEqual({ kind: "route", path: "/highly-probable/10/Science" });
    expect(p.options.map((o) => o.id)).toEqual(["important", "quick", "check_one", "cbq", "trends"]);
    for (const o of p.options) {
      if (o.action.kind !== "quick") expect(o.action.path).not.toMatch(/Maths/);
      expect(o.sub).not.toMatch(/Maths/);
    }
    expect(p.options.map((o) => o.id)).not.toContain("full_mock");
  });

  it("GUIDE-IQ-1 (b) — /highly-probable/10/Maths gives Maths important questions", () => {
    const p = buildGuidePlan(input({ landing: "/highly-probable/10/Maths", subjectHint: "Science" }), deps);
    expect(p.intent).toBe("important");
    expect(p.options[0].action).toEqual({ kind: "route", path: "/highly-probable/10/Maths" });
  });

  it("GUIDE-IQ-1 — the landing wins: an important-questions landing with a sample / mock / preboard utm_content stays important", () => {
    for (const utmContent of ["preboard_v2", "sample_maths", "mock_1"]) {
      const p = buildGuidePlan(input({ landing: "/highly-probable/10/Science", utmContent }), deps);
      expect(p.intent).toBe("important");
      expect(p.line).toBe(GUIDE_LINES.important);
      expect(p.options[0].id).toBe("important");
    }
  });

  it("GUIDE-IQ-1 (c) — /sample-paper/2026-27 is papers, line unchanged", () => {
    const p = buildGuidePlan(input({ landing: "/sample-paper/2026-27" }), deps);
    expect(p.intent).toBe("papers");
    expect(p.line).toBe("Sample paper prep? Try these:");
    expect(p.options[0].id).toBe("full_mock");
  });

  it("GUIDE-IQ-1 (d) — utm_content=preboard with no landing is papers", () => {
    const p = buildGuidePlan(input({ utmContent: "preboard" }), deps);
    expect(p.intent).toBe("papers");
    expect(p.line).toBe(GUIDE_LINES.papers);
  });

  it("GUIDE-IQ-1 — the landing's subject reaches the options (full mock, tutor) on any landing that names one", () => {
    const fm = buildGuidePlan(input({ landing: "/full-mock/10/Science" }), deps);
    expect(fm.intent).toBe("papers");
    expect(fm.options[0].action).toEqual({ kind: "route", path: "/full-mock/10/Science" });
    expect(fm.options[1].action).toEqual({ kind: "route", path: "/highly-probable/10/Science" });
    const tutor = buildGuidePlan(input({ landing: "/tutor/10/science" }), { ...deps, routeExists: () => true });
    expect(tutor.options.find((o) => o.id === "important")!.action).toEqual({ kind: "route", path: "/highly-probable/10/Science" });
    expect(subjectFromLanding("/practice/10/Science")).toBe("Science");
    expect(subjectFromLanding("/practice/10/MATHS")).toBe("Maths");
    expect(subjectFromLanding("/notes/electricity")).toBeNull();
    expect(subjectFromLanding("/sciences/x")).toBeNull();
    expect(subjectFromLanding(null)).toBeNull();
  });

  it("GUIDE-IQ-1 (f) — subject precedence: chapter, then landing subject, then subjectHint, then Maths", () => {
    // a chapter beats the landing subject (Maths chapter on a /science/ topic-hub path)
    const p = buildGuidePlan(input({ landing: "/topic-hub/10/Science/trigonometry", subjectHint: "Science" }), deps);
    expect(p.intent).toBe("chapter");
    expect(p.options.find((o) => o.id === "important")!.action).toEqual({ kind: "route", path: "/highly-probable/10/Maths" });
    // the landing subject beats the subject hint
    const q = buildGuidePlan(input({ landing: "/full-mock/10/Maths", subjectHint: "Science" }), deps);
    expect(q.options[0].action).toEqual({ kind: "route", path: "/full-mock/10/Maths" });
    // no chapter, no landing subject: the hint, then Maths
    expect(buildGuidePlan(input({ utmContent: "mock", subjectHint: "Science" }), deps).options[0].action).toEqual({ kind: "route", path: "/full-mock/10/Science" });
    expect(buildGuidePlan(input({ utmContent: "mock" }), deps).options[0].action).toEqual({ kind: "route", path: "/full-mock/10/Maths" });
  });

  it("rule 4 — sample-paper / mock landings, or sample / mock / preboard ads, lead with the full mock", () => {
    for (const i of [
      input({ landing: "/cbse/sample-paper" }),
      input({ utmContent: "preboard_v2" }),
      input({ utmContent: "sample_maths" }),
      input({ utmContent: "mock_1" }),
    ]) {
      const p = buildGuidePlan(i, deps);
      expect(p.intent).toBe("papers");
      expect(p.line).toBe(GUIDE_LINES.papers);
      expect(p.options.slice(0, 2).map((o) => o.id)).toEqual(["full_mock", "important"]);
    }
  });

  it("rule 5 — on Check & Improve, Check one answer leads", () => {
    const p = buildGuidePlan(input({ surface: "check_improve" }), deps);
    expect(p.intent).toBe("check_improve");
    expect(p.options[0].id).toBe("check_one");
    expect(p.line).toBe(GUIDE_LINES.default);
  });

  it("GUIDE-IQ-1 (e) — the cbq and chapter rules still win over an important-questions landing", () => {
    expect(buildGuidePlan(input({ landing: "/highly-probable/10/Science", utmContent: "cbq_short" }), deps).intent).toBe("cbq");
    expect(buildGuidePlan(input({ landing: "/highly-probable/10/Science", cbqLanding: true }), deps).intent).toBe("cbq");
    expect(buildGuidePlan(input({ landing: "/notes/electricity", utmContent: "preboard" }), deps).intent).toBe("chapter");
  });

  it("rule 5 loses to rule 1 — a CBQ student on Check & Improve still gets CBQ first", () => {
    expect(ids(input({ surface: "check_improve", utmContent: "cbq_short" }))[0]).toBe("cbq");
  });

  it("rule 6 — default: 5 quick questions first, Byte's hello line, and NO notes (no chapter known)", () => {
    const p = buildGuidePlan(input(), deps);
    expect(p.intent).toBe("default");
    expect(p.line).toBe("Hey! I'm Byte. What do you want to do today?");
    expect(p.options.map((o) => o.id)).toEqual(["quick", "check_one", "cbq", "important", "trends"]);
  });

  it("at most 5 options, never a repeat, the first always defined", () => {
    for (const i of [input(), input({ landing: "/notes/electricity" }), input({ utmContent: "mock" }), input({ landing: "/highly-probable/10/Science" }), input({ surface: "check_improve" })]) {
      const o = ids(i);
      expect(o.length).toBeLessThanOrEqual(GUIDE_MAX_OPTIONS);
      expect(o.length).toBeGreaterThanOrEqual(4);
      expect(new Set(o).size).toBe(o.length);
    }
  });

  it("★ an option whose route does not exist is DROPPED (never a link to a missing page) and the next fills its slot", () => {
    const noTrends: IntentDeps = { ...deps, routeExists: (p) => p !== "/exam-trends" && knownGuideRoute(p) };
    const o = ids(input(), noTrends);
    expect(o).not.toContain("trends");
    expect(o).toEqual(["quick", "check_one", "cbq", "important", "tutor"]);
    const nothing: IntentDeps = { ...deps, routeExists: () => false };
    expect(ids(input(), nothing)).toEqual(["quick"]); // the in-card ready state needs no route
    expect(ids(input({ utmContent: "mock" }), nothing)).toEqual(["quick"]);
  });

  it("every route the map can emit is a real App.tsx route pattern", () => {
    for (const i of [input(), input({ landing: "/notes/trigonometry" }), input({ utmContent: "mock", subjectHint: "Science" }), input({ surface: "check_improve" })]) {
      for (const o of buildGuidePlan(i, { ...deps, routeExists: () => true }).options) {
        if (o.action.kind !== "quick") expect(knownGuideRoute(o.action.path), o.action.path).toBe(true);
      }
    }
    expect(knownGuideRoute("/mock-builder")).toBe(false);
    expect(knownGuideRoute("/notes/../admin")).toBe(false);
  });

  it("★ GUIDE-1 v1.1 — Tutor is offered only when it will open (Premium or an active trial); otherwise dropped", () => {
    const noTrends = (tutorOpens: boolean): IntentDeps => ({ ...deps, tutorOpens, routeExists: (p) => p !== "/exam-trends" && knownGuideRoute(p) });
    expect(ids(input(), noTrends(true))).toContain("tutor");
    expect(ids(input(), noTrends(false))).not.toContain("tutor");
    expect(ids(input(), { chapterBySlug: deps.chapterBySlug, routeExists: knownGuideRoute })).not.toContain("tutor");
  });
});
