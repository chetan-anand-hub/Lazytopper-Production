// CLEANUP-2 (C3) — Practice loads the question-type-first resolver ONLY when its flag is on.
//
// `questionTypeFirstResolver` imports the Triangles + Trigonometry pack1 strategy data. A
// static import of it from PracticePage put that data on EVERY Practice visit, although the
// "Why this question" panel it feeds renders only when VITE_QTYPE_FIRST_TRIGONOMETRY === "true"
// (unset in Vercel Production). The page now reaches it with a dynamic import() inside an
// effect that returns first when the flag is off.
//
//   (a) SOURCE: PracticePage has no static import of the resolver; its one import() of it is
//       guarded by the flag. CONTROL: the same reader DOES see a static import when one exists.
//   (b) FLAG ON (env stubbed): the "Why this question" details still appear for a Triangles
//       question (the resolver is loaded, the tag index answers for the question id).
//   (c) FLAG OFF: the resolver module is never imported, and the page renders exactly what the
//       flag-on page renders minus the panel — nothing else moves.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { setMatchMediaMatches } from "../test/setup";

const loads = vi.hoisted(() => ({ resolver: 0 }));

vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({ isPremium: false, status: { tier: "free" } }),
}));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../services/adaptivePracticeEngine", () => ({
  computeAdaptiveDifficultyMix: () => undefined,
  getWrongConceptsForTopic: () => [],
}));
vi.mock("../services/guidedJourneyService", () => ({ recordDetour: () => {} }));
vi.mock("../services/practiceInsights", () => ({
  getAttempts: () => [],
  getAttemptsFromCloud: async () => [],
  recordAttempt: () => {},
}));
vi.mock("../components/practice/practiceQuestionBuilder", async (importActual) => {
  const actual = await importActual<typeof import("../components/practice/practiceQuestionBuilder")>();
  return { ...actual, buildPracticeQuestionsWithAiTopup: vi.fn() };
});

import { trianglesQuestionTagIndex } from "../data/contentStrategy/triangles";

type PQ = import("../data/predictionDataService").PracticeQuestion;

/** A Triangles MCQ whose id is a key of the Triangles tag index — so whichever lands as Q1 is tagged. */
function triItem(id: string): PQ {
  return {
    id,
    questionText: `Triangles question ${id}: find the ratio.`,
    marks: 1,
    section: "A",
    format: "mcq",
    difficulty: "Easy",
    subtopic: "Area of similar triangles",
    topicKey: "triangles",
    options: ["4 : 9", "2 : 3", "16 : 81", "8 : 27"],
    answer: "4 : 9",
  } as unknown as PQ;
}
const TAGGED_IDS = Object.keys(trianglesQuestionTagIndex).filter((id) => trianglesQuestionTagIndex[id].skillFamily);
const POOL: PQ[] = TAGGED_IDS.slice(0, 25).map(triItem);
const QTEXT = /^Triangles question (\S+): find the ratio\.$/;

/** The skill the panel must show for the question rendered as Q1. */
function skillOfFirstQuestion(): string {
  const id = QTEXT.exec(screen.getAllByText(QTEXT)[0].textContent || "")?.[1] || "";
  const meta = trianglesQuestionTagIndex[id];
  expect(meta, `Q1 id ${id} is in the Triangles tag index`).toBeTruthy();
  return String(meta.skillFamily);
}

const URL = "/practice/10/maths?topic=triangles&count=5";

async function mountPractice(flag: "true" | undefined) {
  vi.resetModules();
  // Re-registered on EVERY mount: a hoisted vi.mock factory runs once per FILE (its result is
  // cached across resetModules), which would make a flag-off "never loaded" count vacuous
  // after a flag-on mount. vi.doMock after resetModules re-runs the factory on the next load,
  // so this counter is the number of times anything loaded the resolver during THIS mount.
  vi.doMock("../services/questionTypeFirstResolver", async (importActual) => {
    loads.resolver += 1;
    return importActual<typeof import("../services/questionTypeFirstResolver")>();
  });
  // The set order is seeded from the session start time: pin it, so two mounts draw the same set.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-04T06:30:00Z"));
  if (flag) vi.stubEnv("VITE_QTYPE_FIRST_TRIGONOMETRY", flag);
  else vi.stubEnv("VITE_QTYPE_FIRST_TRIGONOMETRY", "");
  const { buildPracticeQuestionsWithAiTopup } = await import("../components/practice/practiceQuestionBuilder");
  vi.mocked(buildPracticeQuestionsWithAiTopup).mockResolvedValue(POOL);
  const { default: PracticePage } = await import("./PracticePage");
  setMatchMediaMatches(true);
  const view = render(
    <MemoryRouter initialEntries={[URL]}>
      <Routes>
        <Route path="/practice/:grade/:subject" element={<PracticePage />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findAllByText(QTEXT, undefined, { timeout: 60000 });
  return view;
}

beforeEach(() => {
  window.localStorage.clear();
  loads.resolver = 0;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// ── (a) the source ──────────────────────────────────────────────────────────────
const RESOLVER = "../services/questionTypeFirstResolver";

/** Static (bundle-graph) import/export specifiers, and every import("…") call with its enclosing function text. */
function readEdges(source: string): { statics: string[]; dynamics: { spec: string; enclosing: string }[] } {
  const sf = ts.createSourceFile("PracticePage.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const statics: string[] = [];
  const dynamics: { spec: string; enclosing: string }[] = [];
  const visit = (n: ts.Node): void => {
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
      statics.push(n.moduleSpecifier.text);
    } else if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const a0 = n.arguments[0];
      let fn: ts.Node | undefined = n.parent;
      while (fn && !ts.isArrowFunction(fn) && !ts.isFunctionExpression(fn) && !ts.isFunctionDeclaration(fn)) fn = fn.parent;
      if (a0 && ts.isStringLiteral(a0)) dynamics.push({ spec: a0.text, enclosing: fn ? fn.getText(sf) : "" });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { statics, dynamics };
}

describe("C3 (a) — PracticePage has no static import of the resolver", () => {
  const SOURCE = readFileSync(resolve(process.cwd(), "src/pages/PracticePage.tsx"), "utf8");

  it("CONTROL: the reader sees a static import of the resolver when one exists", () => {
    const mutant = `import { getQuestionMeta } from "${RESOLVER}";\n${SOURCE}`;
    expect(readEdges(mutant).statics).toContain(RESOLVER);
  });

  it("no import/export declaration names the resolver; its only import() is behind the flag", () => {
    const { statics, dynamics } = readEdges(SOURCE);
    expect(statics.length, "the reader found PracticePage's imports").toBeGreaterThan(20);
    expect(statics.filter((s) => s.includes("questionTypeFirstResolver"))).toEqual([]);
    const lazy = dynamics.filter((d) => d.spec === RESOLVER);
    expect(lazy).toHaveLength(1);
    expect(lazy[0].enclosing).toMatch(/if \(!QTYPE_FIRST_TRIG\) return;/);
    expect(lazy[0].enclosing.indexOf("if (!QTYPE_FIRST_TRIG) return;")).toBeLessThan(lazy[0].enclosing.indexOf("import("));
  });
});

// ── (b) / (c) the rendered page ─────────────────────────────────────────────────
describe("C3 (b) — flag ON: the 'Why this question' details still appear for a Triangles question", () => {
  it("loads the resolver and shows the panel with the tag-index details for Q1", async () => {
    await mountPractice("true");
    const panel = await screen.findByTestId("practice-why-panel", undefined, { timeout: 30000 });
    expect(panel.textContent).toMatch(/Why this question\? \(Q1\)/);
    const skill = skillOfFirstQuestion();
    await waitFor(() => expect(panel.textContent).toContain(`Skill: ${skill}`));
    expect(panel.textContent).not.toMatch(/isn't tagged yet/);
    expect(loads.resolver).toBe(1);
  }, 90000);
});

describe("C3 (c) — flag OFF: the resolver is never imported and nothing else renders differently", () => {
  it("no resolver load, no panel; DOM equals the flag-on DOM minus the panel", async () => {
    const on = await mountPractice("true");
    const panel = await screen.findByTestId("practice-why-panel", undefined, { timeout: 30000 });
    const skill = skillOfFirstQuestion();
    await waitFor(() => expect(panel.textContent).toContain(`Skill: ${skill}`));
    // CONTROL: the counter DOES see a load within this test, so the 0 below can fail.
    expect(loads.resolver).toBe(1);
    panel.remove();
    const onHtml = on.container.innerHTML;
    cleanup();

    loads.resolver = 0;
    window.localStorage.clear();
    const off = await mountPractice(undefined);
    // Give a would-be lazy load every chance to land before asserting it never happened.
    await new Promise((r) => setTimeout(r, 300));
    expect(screen.queryByTestId("practice-why-panel")).toBeNull();
    expect(loads.resolver, "the resolver module was imported with the flag off").toBe(0);
    expect(off.container.innerHTML).toBe(onHtml);
  }, 120000);
});
