/**
 * CT-KATEX-2 — Check & Improve keeps its KaTeX idle prefetch, at the same moment as before.
 *
 * MathText used to arm a background idle prefetch at its own module evaluation, for every
 * importer. That moved into an explicit `prefetchKatexWhenIdle()` so the Chapter Test can
 * opt out (it fetches on the first interaction instead). Check & Improve calls it itself at
 * ITS module evaluation — the moment its graph used to evaluate MathText — so its timing is
 * unchanged: armed on import, before the page ever renders, exactly once.
 *
 * MUTATION (M2, run alone, restore verified by an empty `git diff`): remove the
 * `prefetchKatexWhenIdle()` call from DesktopCheckImprovePage.tsx -> this pin RED.
 */
import { describe, it, expect, vi } from "vitest";

const P = vi.hoisted(() => ({ calls: 0, loads: 0 }));

vi.mock("../../components/question/MathText", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../components/question/MathText")>();
  return {
    ...actual,
    prefetchKatexWhenIdle: () => {
      P.calls += 1;
    },
    loadKatex: () => {
      P.loads += 1;
      return actual.loadKatex();
    },
  };
});

describe("CT-KATEX-2 · Check & Improve arms the KaTeX idle prefetch itself", () => {
  it("★ importing the page arms it once, before any render, and fetches nothing up front", async () => {
    expect(P.calls).toBe(0); // CONTROL — nothing armed before the page module is evaluated
    const mod = await import("./DesktopCheckImprovePage");
    expect(typeof mod.default).toBe("function"); // the page really was evaluated (never rendered)
    expect(P.calls, "Check & Improve no longer arms the KaTeX idle prefetch").toBe(1);
    expect(P.loads, "Check & Improve fetched KaTeX up front").toBe(0);
  });
});
