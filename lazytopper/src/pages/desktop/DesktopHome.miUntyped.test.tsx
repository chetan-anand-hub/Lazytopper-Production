// @vitest-environment jsdom
/**
 * MI-COPY (owner ask, 16 Oct 2026) — Home's Mistake Intelligence card explains marks with no type.
 * Re-formed by MI-CONSISTENCY-1 (owner ask, 23 Oct 2026): Home now renders the ONE MI card
 * (components/mi/MiCard). The owner's question ("are these tiles empty by design?") is answered by
 * the card's rows themselves: a wrong tap is its OWN tile ("Wrong MCQ taps", with the nudge to add
 * working), the honest remainder is "No reason recorded", and "Biggest chance to gain" says it shows
 * once a checked written answer tells us why — with the "Check a written answer" action. Typed marks
 * and the no-data state render as designed. Display only — no number here is derived differently.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MiCard, MI_CARD_COPY } from "../../components/mi/MiCard";
import { MI_ROW_LABEL, type MiCardSummary } from "../../lib/mi/miCardSummary";
import { MISTAKE_TYPE_LABEL, STORED_MISTAKE_TYPES } from "../../lib/mistakeDisplay";

afterEach(cleanup);

function summary(over: Partial<Record<string, number>>, extra: Partial<MiCardSummary> = {}): MiCardSummary {
  const rows = [
    ...STORED_MISTAKE_TYPES.map((t) => ({ key: t, label: MISTAKE_TYPE_LABEL[t], marks: over[t] ?? 0 })),
    { key: "wrongTap" as const, label: MI_ROW_LABEL.wrongTap, marks: over.wrongTap ?? 0 },
    { key: "blank" as const, label: MI_ROW_LABEL.blank, marks: over.blank ?? 0 },
    { key: "unrecorded" as const, label: MI_ROW_LABEL.unrecorded, marks: over.unrecorded ?? 0 },
  ];
  const lost = rows.reduce((s, r) => s + r.marks, 0);
  const typed = STORED_MISTAKE_TYPES.reduce((s, t) => s + (over[t] ?? 0), 0);
  return { scope: "maths", state: "ready", lost, rows, typed, chance: null, withheld: [], splitWithheld: false, conceptGaps: 0, ...extra };
}

const renderCard = (s: MiCardSummary | null, status: "ok" | "idle" = "ok") =>
  render(
    <MemoryRouter>
      <MiCard variant="light" status={status} summary={s} scope="maths" onScope={() => {}} meHref="/me" checkHref="/check-improve?source=home&returnTo=%2F" testId="home-mi-card" />
    </MemoryRouter>,
  );

describe("MI-COPY — lost marks with no mistake type (MCQ-only)", () => {
  it("★ the wrong taps are their own tile, with the nudge to add working (linking to Check & Improve)", () => {
    renderCard(summary({ wrongTap: 7 }));
    const tap = screen.getAllByTestId("mi-card-tile").find((t) => t.getAttribute("data-row") === "wrongTap")!;
    expect(tap.textContent).toBe(`7${MI_ROW_LABEL.wrongTap}`);
    const nudge = screen.getByTestId("mi-card-tap-nudge");
    expect(nudge.textContent).toBe(`${MI_ROW_LABEL.wrongTap}: ${MI_CARD_COPY.tapNudge}`);
    expect(within(nudge).getByRole("link").getAttribute("href")).toBe("/check-improve?source=home&returnTo=%2F");
  });

  it("★ 'Biggest chance to gain' says why it is empty, and 'Check a written answer' is the action", () => {
    renderCard(summary({ wrongTap: 4, unrecorded: 3 }));
    const chance = screen.getByTestId("mi-card-chance");
    expect(chance.getAttribute("data-empty")).toBe("true");
    expect(chance.textContent).toContain(MI_CARD_COPY.chanceEmpty);
    expect(within(chance).getByTestId("mi-card-check").textContent).toBe("Check a written answer →");
  });

  it("the four type tiles show 0 — never a guessed type", () => {
    renderCard(summary({ wrongTap: 4, unrecorded: 3 }));
    for (const t of screen.getAllByTestId("mi-card-tile").filter((x) => STORED_MISTAKE_TYPES.includes(x.getAttribute("data-row") as never))) {
      expect(t.getAttribute("data-zero")).toBe("true");
    }
  });
});

describe("MI-COPY — CONTROLS: typed marks and the no-data state", () => {
  it("typed marks: the chance is named, no empty-chance line, no tap nudge when there are no taps", () => {
    renderCard(summary({ silly: 2 }, { chance: { type: "silly", group: "careless", label: MISTAKE_TYPE_LABEL.silly, marks: 2, amount: "2 marks", action: { kind: "tip", text: "x" } } }));
    expect(screen.getByTestId("mi-card-chance-what").textContent).toBe(`${MISTAKE_TYPE_LABEL.silly} — 2 marks`);
    expect(screen.queryByTestId("mi-card-tap-nudge")).toBeNull();
  });

  it("no real account to read: the honest empty state, no tiles", () => {
    renderCard(null, "idle");
    expect(screen.getByText(MI_CARD_COPY.emptyTitle)).toBeInTheDocument();
    expect(screen.queryAllByTestId("mi-card-tile")).toHaveLength(0);
  });
});
