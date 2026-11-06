import { describe, it, expect } from "vitest";
import {
  GUIDE_LINES,
  GUIDE_MAX_OPTIONS,
  GUIDE_ROUTES,
  buildGuidePlan,
  chapterSlugFromLanding,
  knownGuideRoute,
  subjectFromLanding,
  type ChapterRef,
  type IntentDeps,
  type IntentInput,
} from "./intentMap";
// GST-EXCL-1: expected prices are read through the shared helpers, so the copy is right on both sides of 7 Nov 2026.
import { packPriceLabel } from "../../services/packs";

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
    expect(p.options.map((o) => o.id)).toEqual(["quick", "chapter_test", "important", "notes", "worksheet"]);
    expect(p.options[0].action).toEqual({ kind: "quick", chapter: CHAPTERS.trigonometry });
    expect(p.options[1].action).toEqual({ kind: "route", path: "/chapter-test/10/Maths/trigonometry" });
    expect(p.options[2].action).toEqual({ kind: "route", path: "/highly-probable/10/Maths" });
    expect(p.options[3].action).toEqual({ kind: "route", path: "/notes/trigonometry" });
    expect(p.options[4].action).toEqual({ kind: "route", path: "/practice/worksheets" });
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
    expect(p.options.map((o) => o.id)).toEqual(["important", "chapter_test", "quick", "check_one", "worksheet"]);
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
    expect(fm.options.find((o) => o.id === "important")!.action).toEqual({ kind: "route", path: "/highly-probable/10/Science" });
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
      expect(p.options.map((o) => o.id)).toEqual(["full_mock", "chapter_test", "important", "worksheet", "check_one"]);
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

  it("rule 6 — Practice hub default: 5 quick questions first, Byte's hello line, and NO notes (no chapter known)", () => {
    const p = buildGuidePlan(input({ surface: "practice_hub" }), deps);
    expect(p.intent).toBe("default");
    expect(p.line).toBe("Hey! I'm Byte. What do you want to do today?");
    expect(p.options.map((o) => o.id)).toEqual(["quick", "check_one", "worksheet", "chapter_test", "important"]);
    expect(p.options.map((o) => o.id)).not.toContain("notes");
  });

  it("LOGIN-HOME-1 rule 3 — on HOME the default intent leads with Check one answer, then 5 quick questions; the intent and line are unchanged", () => {
    const p = buildGuidePlan(input({ surface: "home" }), deps);
    expect(p.intent).toBe("default");
    expect(p.line).toBe(GUIDE_LINES.default);
    expect(p.options.map((o) => o.id)).toEqual(["check_one", "quick", "worksheet", "chapter_test", "important"]);
    expect(p.options[0].action).toEqual({ kind: "check_one", path: "/check-improve" });
  });

  it("LOGIN-HOME-1 rule 3 — the Practice hub default is UNCHANGED: 5 quick questions first", () => {
    expect(ids(input({ surface: "practice_hub" }))).toEqual(["quick", "check_one", "worksheet", "chapter_test", "important"]);
  });

  it("LOGIN-HOME-1 rule 4 — a first landing on /check-improve gives the check_improve intent on ANY surface", () => {
    for (const surface of ["home", "practice_hub", "check_improve"] as const) {
      const p = buildGuidePlan(input({ surface, landing: "/check-improve" }), deps);
      expect(p.intent, surface).toBe("check_improve");
      expect(p.options[0].id, surface).toBe("check_one");
      expect(p.line).toBe(GUIDE_LINES.default);
    }
    expect(ids(input({ surface: "practice_hub", landing: "/check-improve" }))).toEqual(["check_one", "quick", "worksheet", "chapter_test", "important"]);
  });

  it("LOGIN-HOME-1 — landing/ad intents still win on HOME: CBQ, chapter, important, papers", () => {
    expect(buildGuidePlan(input({ utmContent: "cbq_short" }), deps).options[0].id).toBe("cbq");
    expect(ids(input({ landing: "/notes/electricity" }))).toEqual(["quick", "chapter_test", "important", "notes", "worksheet"]);
    expect(ids(input({ landing: "/highly-probable/10/Maths" }))).toEqual(["important", "chapter_test", "quick", "check_one", "worksheet"]);
    expect(ids(input({ utmContent: "sample_maths" }))).toEqual(["full_mock", "chapter_test", "important", "worksheet", "check_one"]);
    // and they win over a /check-improve landing too
    expect(buildGuidePlan(input({ landing: "/check-improve", utmContent: "cbq_short" }), deps).intent).toBe("cbq");
    expect(buildGuidePlan(input({ landing: "/check-improve", utmContent: "mock" }), deps).intent).toBe("papers");
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
    const noWorksheets: IntentDeps = { ...deps, routeExists: (p) => p !== "/practice/worksheets" && knownGuideRoute(p) };
    const o = ids(input({ surface: "practice_hub" }), noWorksheets);
    expect(o).not.toContain("worksheet");
    expect(o).toEqual(["quick", "check_one", "chapter_test", "important", "cbq"]); // cbq is next in the fill
    const nothing: IntentDeps = { ...deps, routeExists: () => false };
    expect(ids(input({ surface: "practice_hub" }), nothing)).toEqual(["quick"]); // the in-card ready state needs no route
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
    // Drop enough routes that the fill reaches Tutor: worksheets, both hub choosers, trends.
    const gone = new Set(["/practice/worksheets", "/practice-hub?ct=1", "/practice-hub?cbq=1", "/exam-trends"]);
    const thin = (tutorOpens: boolean): IntentDeps => ({ ...deps, tutorOpens, routeExists: (p) => !gone.has(p) && knownGuideRoute(p) });
    expect(ids(input({ surface: "practice_hub" }), thin(true))).toEqual(["quick", "check_one", "important", "tutor"]);
    expect(ids(input({ surface: "practice_hub" }), thin(false))).not.toContain("tutor");
    expect(ids(input({ surface: "practice_hub" }), { chapterBySlug: deps.chapterBySlug, routeExists: (p) => !gone.has(p) && knownGuideRoute(p) })).not.toContain("tutor");
  });

  it("GUIDE-OPTS-1 — each intent's first five options, in the owner's order", () => {
    expect(ids(input({ surface: "practice_hub" }))).toEqual(["quick", "check_one", "worksheet", "chapter_test", "important"]);
    expect(ids(input())).toEqual(["check_one", "quick", "worksheet", "chapter_test", "important"]); // Home (LOGIN-HOME-1)
    expect(ids(input({ surface: "check_improve" }))).toEqual(["check_one", "quick", "worksheet", "chapter_test", "important"]);
    expect(ids(input({ landing: "/notes/electricity" }))).toEqual(["quick", "chapter_test", "important", "notes", "worksheet"]);
    expect(ids(input({ landing: "/highly-probable/10/Maths" }))).toEqual(["important", "chapter_test", "quick", "check_one", "worksheet"]);
    expect(ids(input({ utmContent: "sample_maths" }))).toEqual(["full_mock", "chapter_test", "important", "worksheet", "check_one"]);
    expect(ids(input({ utmContent: "cbq_short" }))).toEqual(["cbq", "cbq_pack", "quick", "check_one", "chapter_test"]);
  });

  it("GUIDE-OPTS-1 — CBQ practice and Exam trends stay reachable through the fill", () => {
    const noCt: IntentDeps = { ...deps, routeExists: (p) => p !== "/practice-hub?ct=1" && p !== "/practice/worksheets" && knownGuideRoute(p) };
    expect(ids(input({ surface: "practice_hub" }), noCt)).toEqual(["quick", "check_one", "important", "cbq", "trends"]);
  });

  it("GUIDE-OPTS-1 — a known chapter: Chapter Test opens THAT chapter's test (the Topic Hub topicKey = desktop slug)", () => {
    const p = buildGuidePlan(input({ landing: "/topic-hub/10/Science/electricity" }), deps);
    const ct = p.options.find((o) => o.id === "chapter_test")!;
    expect(ct.action).toEqual({ kind: "route", path: "/chapter-test/10/Science/electricity" });
    expect(ct.title).toBe("Chapter Test");
    expect(ct.sub).toBe("Board-pattern test on one chapter · written answers marked step by step");
    expect(ct.point).toBe("One chapter, board-style. See exactly where marks slip.");
    expect(knownGuideRoute("/chapter-test/10/Science/electricity")).toBe(true);
  });

  it("GUIDE-OPTS-1 — no chapter known: Chapter Test opens the Practice Hub's chapter chooser (?ct=1), never a guessed chapter", () => {
    for (const i of [input(), input({ landing: "/highly-probable/10/Science" }), input({ utmContent: "mock" }), input({ utmContent: "cbq_short" })]) {
      const ct = buildGuidePlan(i, deps).options.find((o) => o.id === "chapter_test")!;
      expect(ct.action).toEqual({ kind: "route", path: "/practice-hub?ct=1" });
    }
    expect(knownGuideRoute("/practice-hub?ct=1")).toBe(true);
    expect(knownGuideRoute("/practice-hub?ct=2")).toBe(false);
    expect(knownGuideRoute("/chapter-test/10/Maths/")).toBe(false);
  });

  it("GUIDE-OPTS-1 — Worksheet opens /practice/worksheets, a GUIDE_ROUTES entry (no 'Today's': there is no daily logic)", () => {
    const ws = buildGuidePlan(input(), deps).options.find((o) => o.id === "worksheet")!;
    expect(ws.title).toBe("Worksheet");
    expect(ws.sub).toBe("Write on paper, upload a photo, get written answers marked step by step");
    expect(ws.point).toBe("Write it on paper like the real exam. I'll mark every written step.");
    expect(ws.action).toEqual({ kind: "route", path: "/practice/worksheets" });
    expect(GUIDE_ROUTES.some((r) => r.pattern.test("/practice/worksheets") && /App\.tsx:\d+/.test(r.route))).toBe(true);
    expect(knownGuideRoute("/practice/worksheets/ready")).toBe(false);
  });

  it("GUIDE-OPTS-1 — every option route, on every intent (known and unknown chapter), passes knownGuideRoute", () => {
    const all: IntentInput[] = [
      input(),
      input({ surface: "check_improve" }),
      input({ landing: "/notes/trigonometry" }),
      input({ landing: "/topic-hub/10/Science/electricity" }),
      input({ landing: "/highly-probable/10/Science" }),
      input({ utmContent: "preboard", subjectHint: "Science" }),
      input({ utmContent: "cbq_short" }),
    ];
    const seenIds = new Set<string>();
    for (const i of all) {
      // routeExists: () => true so no option is pre-filtered; tutor on.
      for (const o of buildGuidePlan(i, { ...deps, routeExists: () => true }).options) {
        seenIds.add(o.id);
        if (o.action.kind !== "quick") expect(knownGuideRoute(o.action.path), `${o.id} ${o.action.path}`).toBe(true);
      }
    }
    expect([...seenIds]).toEqual(expect.arrayContaining(["chapter_test", "worksheet"]));
  });
});

describe("GUIDE-QP-1 · packs and quick intents", () => {
  it("packs — campaign, content, or a /packs or /pricing landing leads with the packs option", () => {
    for (const over of [{ utmCampaign: "packs_search" }, { utmContent: "pack_ad" }, { landing: "/packs" }, { landing: "/pricing" }]) {
      const p = buildGuidePlan(input(over), deps);
      expect(p.intent).toBe("packs");
      expect(p.line).toBe(GUIDE_LINES.packs);
      expect(p.options.map((o) => o.id)).toEqual(["packs", "cbq", "quick", "chapter_test", "check_one"]);
      expect(p.options[0].action).toEqual({ kind: "route", path: "/pricing#packs" });
    }
  });

  it("packs — dropped when the /packs route is unknown, never a missing page", () => {
    const p = buildGuidePlan(input({ landing: "/packs" }), { ...deps, routeExists: (x) => x !== "/pricing#packs" });
    expect(p.options.some((o) => o.id === "packs")).toBe(false);
  });

  it("quick — utm_content quick / mcq / tap or ?quick=1 leads with quick, then cbq, check_one, chapter_test, worksheet", () => {
    for (const over of [{ utmContent: "quick_tap" }, { utmContent: "mcq" }, { utmContent: "tap" }, { quickLanding: true }]) {
      const p = buildGuidePlan(input(over), deps);
      expect(p.intent).toBe("quick");
      expect(p.options.map((o) => o.id)).toEqual(["quick", "cbq", "check_one", "chapter_test", "worksheet"]);
    }
  });

  it("precedence — CBQ, chapter, important and papers beat packs; packs beats quick; quick beats Check & Improve", () => {
    expect(buildGuidePlan(input({ utmContent: "cbq_pack" }), deps).intent).toBe("cbq");
    expect(buildGuidePlan(input({ landing: "/notes/trigonometry", utmCampaign: "packs" }), deps).intent).toBe("chapter");
    expect(buildGuidePlan(input({ landing: "/highly-probable/10/Maths", utmCampaign: "packs" }), deps).intent).toBe("important");
    expect(buildGuidePlan(input({ utmContent: "mock", utmCampaign: "packs" }), deps).intent).toBe("papers");
    expect(buildGuidePlan(input({ utmCampaign: "packs", utmContent: "quick" }), deps).intent).toBe("packs");
    expect(buildGuidePlan(input({ utmContent: "quick", landing: "/check-improve" }), deps).intent).toBe("quick");
    expect(buildGuidePlan(input({ surface: "check_improve", quickLanding: true }), deps).intent).toBe("quick");
  });
});

describe("BYTE-CBQ-1 — CBQ landings and the CBQ pack option", () => {
  const first = (i: Partial<IntentInput>) => buildGuidePlan(input(i), deps);

  it("a first landing on /cbq-class-10 or a chapter page is the CBQ intent (no utm needed)", () => {
    for (const landing of ["/cbq-class-10", "/cbq-class-10/", "/cbq-class-10/electricity", "/cbq-class-10/trigonometry"]) {
      const p = first({ landing });
      expect(p.intent, landing).toBe("cbq");
      expect(p.options[0].id).toBe("cbq");
    }
    expect(first({ landing: "/cbq-classes" }).intent).not.toBe("cbq");
  });

  it("a utm_campaign containing cbq is the CBQ intent", () => {
    expect(first({ utmCampaign: "yt_cbq_pack" }).intent).toBe("cbq");
  });

  it("free CBQ practice stays first; the CBQ pack is second and goes to one-tap checkout for the known subject", () => {
    const sci = first({ landing: "/cbq-class-10/electricity" });
    expect(sci.options.map((o) => o.id).slice(0, 3)).toEqual(["cbq", "cbq_pack", "quick"]);
    expect(sci.options[1].title).toBe(`Get the Science CBQ pack · ${packPriceLabel("pack_cbq")}`);
    expect(sci.options[1].action).toEqual({ kind: "route", path: "/packs?buy=pack_cbq&t=science" });
    const maths = first({ landing: "/cbq-class-10/trigonometry" });
    expect(maths.options[1].action).toEqual({ kind: "route", path: "/packs?buy=pack_cbq&t=maths" });
    const hinted = first({ cbqLanding: true, subjectHint: "Maths" });
    expect(hinted.options[1].title).toBe(`Get the Maths CBQ pack · ${packPriceLabel("pack_cbq")}`);
    expect(sci.options.length).toBeLessThanOrEqual(GUIDE_MAX_OPTIONS);
  });

  it("an unknown subject says 'the CBQ pack' and opens /pricing#cbq (both packs), never a guessed subject", () => {
    const p = first({ utmContent: "cbq_short" });
    expect(p.options[1].title).toBe(`Get the CBQ pack · ${packPriceLabel("pack_cbq")}`);
    expect(p.options[1].action).toEqual({ kind: "route", path: "/pricing#cbq" });
  });

  it("the one-tap URL is a known guide route", () => {
    expect(knownGuideRoute("/packs?buy=pack_cbq&t=maths")).toBe(true);
    expect(knownGuideRoute("/packs?buy=pack_cbq&t=history")).toBe(false);
  });
});

describe("LINKS-1 - Byte's allow-list accepts every href the intents produce", () => {
  it("every route path any intent asks about is a known guide route", () => {
    const asked = new Set<string>();
    const spy: IntentDeps = { ...deps, routeExists: (x) => { asked.add(x); return true; } };
    const landings = [undefined, "/", "/packs", "/pricing", "/cbq-class-10", "/notes/trigonometry", "/highly-probable/10/Maths", "/check-improve"];
    const campaigns = [undefined, "packs_search", "cbq", "mock"];
    const contents = [undefined, "cbq_short", "pack_ad", "quick", "mock"];
    for (const landing of landings) {
      for (const utmCampaign of campaigns) {
        for (const utmContent of contents) {
          buildGuidePlan(input({ landing, utmCampaign, utmContent } as Partial<IntentInput>), spy);
        }
      }
    }
    expect(asked.size).toBeGreaterThan(0);
    for (const path of asked) expect(knownGuideRoute(path), path).toBe(true);
    expect(knownGuideRoute("/pricing#cbq")).toBe(true);
  });
});
