// @vitest-environment jsdom
/**
 * MistakeIntelCard — CONTRACT (SCORECARD-MI-1 PR-2, H3 / GA-23). THE REPLACEMENT PROTECTION for
 * the lifted blanket ban on `MistakeIntelCard.tsx` in `check_improve_convergence_acceptance.mjs`
 * (owner ruling 2026-10-05: "taxonomy and wording", "marks not counts").
 *
 * What this file now pins on the card's NEW behaviour:
 *   - its labels come ONLY from lib/mistakeDisplay (the owner's three groups) — no legacy label
 *     ("concept gaps", "calculation slips", "silly mistakes", "presentation issues") can render;
 *   - "checked answers" counts GRADED ANSWERS (attempts with mode "graded"), never MI log entries
 *     (a full-mark answer has no entry, so the log can only count answers that lost marks);
 *   - the biggest loss is decided in MARKS per group when entries carry versioned v2 marks, else
 *     in mistakes — every number with its unit; a group with nothing lost is never named;
 *   - the honest states are unchanged (signed out, no data).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({
  user: { uid: "u1" } as { uid: string } | null,
  entries: [] as unknown[],
  attempts: [] as unknown[],
}));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: h.user, loading: false, mistakeLogsHydrated: 0 }),
}));
vi.mock("../../services/mistakeLogService", () => ({
  getMistakeLogs: async () => h.entries,
}));
vi.mock("../../services/practiceInsights", () => ({
  getAttemptsFromCloud: async () => h.attempts,
}));

import { MistakeIntelCard, computeMiCardSummary } from "./MistakeIntelCard";
import { mistakeGroupByKey } from "../../lib/mistakeDisplay";
import type { MistakeLogEntry } from "../../services/mistakeLogService";
import type { PracticeAttempt } from "../../services/practiceInsights";

const LEGACY = /concept gaps|calculation slips|silly mistakes|presentation issues|Top pattern/i;
const counts = (c: Partial<Record<"conceptual" | "calculation" | "silly" | "presentation", number>>) => ({
  conceptual: 0, calculation: 0, silly: 0, presentation: 0, ...c,
});
const v2 = (m: Record<string, number>) => ({
  marksLostByType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0, ...m },
  marksLostByTypeVersion: 1,
});
const entry = (marksLost: number, c: Parameters<typeof counts>[0], extra: Record<string, unknown> = {}) =>
  ({ timestamp: new Date().toISOString(), marksLost, mistakeCounts: counts(c), ...extra }) as unknown as MistakeLogEntry;
const attempt = (mode: string) => ({ mode, marksScored: 1, marksAvailable: 2, timestamp: Date.now() }) as unknown as PracticeAttempt;

const renderCard = () => render(<MemoryRouter><MistakeIntelCard /></MemoryRouter>);

beforeEach(() => {
  h.user = { uid: "u1" };
  h.entries = [];
  h.attempts = [];
});

describe("H3 — checked answers are GRADED ANSWERS, not log entries", () => {
  it("★ 5 graded attempts and 2 MI entries → 5 checked answers (MCQ clicks are not checked answers)", () => {
    const s = computeMiCardSummary(
      [entry(1, { silly: 1 }), entry(2, { conceptual: 1 })],
      [attempt("graded"), attempt("graded"), attempt("graded"), attempt("graded"), attempt("graded"), attempt("mcq")],
    );
    expect(s.checkedCount).toBe(5);
  });

  it("the rendered card says it, and never a legacy label", async () => {
    h.entries = [entry(1, { silly: 1 }, v2({ silly: 1 }))];
    h.attempts = [attempt("graded"), attempt("graded"), attempt("graded")];
    renderCard();
    await waitFor(() => expect(screen.getByTestId("mi-card-checked").textContent).toBe("3 checked answers"));
    expect(screen.getByTestId("mi-card-summary").textContent).not.toMatch(LEGACY);
  });
});

describe("H3 — the biggest loss, in the owner's groups and in MARKS when entries carry them", () => {
  it("★ marks decide: 1 conceptual mark vs 1.5 careless marks → Careless (1.5 marks)", () => {
    const s = computeMiCardSummary(
      [
        entry(1, { conceptual: 1 }, v2({ conceptual: 1 })),
        entry(1.5, { calculation: 1, silly: 2 }, v2({ calculation: 1, silly: 0.5 })),
      ],
      [],
    );
    expect(s.topLoss).toEqual({ group: "careless", label: mistakeGroupByKey("careless").label, amount: "1.5 marks", basis: "marks" });
  });

  it("★ the label comes from lib/mistakeDisplay — calculation is CARELESS, never a concept gap", async () => {
    h.entries = [entry(2, { calculation: 2 }, v2({ calculation: 2 }))];
    renderCard();
    const top = await screen.findByTestId("mi-card-top");
    expect(top.textContent).toBe(`${mistakeGroupByKey("careless").label} (2 marks)`);
    expect(top.getAttribute("data-basis")).toBe("marks");
  });

  it("CONTROL — a count-only window is decided in MISTAKES, with the unit (never called marks)", () => {
    const s = computeMiCardSummary([entry(3, { conceptual: 2, presentation: 1 })], []);
    expect(s.topLoss).toEqual({ group: "knowledge", label: mistakeGroupByKey("knowledge").label, amount: "2 mistakes", basis: "counts" });
  });

  it("not attempted and reason-not-recorded marks are never a 'biggest loss' (never a mistake group)", () => {
    const s = computeMiCardSummary([entry(3, {}, v2({ unattempted: 2, untyped: 1 }))], []);
    expect(s.topLoss).toBeNull();
  });
});

describe("honest states unchanged", () => {
  it("signed out → the sign-in prompt, no numbers", async () => {
    h.user = null;
    renderCard();
    expect(await screen.findByText(/Sign in to see mistake patterns/)).toBeTruthy();
  });
  it("no entries → the no-data prompt", async () => {
    renderCard();
    expect(await screen.findByText(/No mistake patterns yet/)).toBeTruthy();
  });
});
