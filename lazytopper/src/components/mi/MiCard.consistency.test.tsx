// @vitest-environment jsdom
/**
 * MI-CONSISTENCY-1 — the owner's ask, as tests over the REAL read model (mocked cloud streams only,
 * the fixture student of src/test/miFixture.ts):
 *   - Home's card and the sidebar card print IDENTICAL figures for Both, Maths and Science;
 *   - the switch defaults to Both, moves every card on the page together, and keeps ONE scope
 *     string in device storage — never a mark, a premium or a trial flag;
 *   - every number in Ziggy's line is printed on the card;
 *   - the window wording is the same on both cards.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { render, screen, within, cleanup, fireEvent, waitFor, configure } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MI_FIXTURE_NOW, MI_FIXTURE_UID, miFixtureStudent, type MiFixtureStreams } from "../../test/miFixture";

configure({ asyncUtilTimeout: 8000 });

const H = vi.hoisted(() => ({ s: null as unknown as MiFixtureStreams }));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u-mi-fixture" }, loading: false, mistakeLogsHydrated: 1 }),
}));
vi.mock("../../services/practiceInsights", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/practiceInsights")>()),
  getAttemptsFromCloud: async (_uid: string, { start }: { start?: number } = {}) =>
    H.s.attempts.filter((a) => start === undefined || a.timestamp >= start).map((a) => ({ ...a })),
}));
vi.mock("../../services/sessionRecords", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/sessionRecords")>()),
  getSessionRecordsFromCloud: async () => H.s.records.map((r) => ({ ...r })),
  getAllSessionPerQuestionFromCloud: async () => H.s.payloads.map((p) => ({ ...p })),
}));
vi.mock("../../services/mistakeLogService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/mistakeLogService")>()),
  getMistakeLogs: async () => [],
  getMistakeLogHistoryFromCloud: async (_uid: string, startMs: number) => ({
    entries: H.s.mistakes.filter((e) => Date.parse(e.timestamp) >= startMs).map((e) => ({ ...e })),
    complete: true,
  }),
}));

import { MiCardHost } from "./MiCardHost";
import { MiCard } from "./MiCard";
import { MistakeIntelCard } from "../desktop/MistakeIntelCard";
import { miVoiceInputForCard } from "./miCardVoice";
import { miVoiceFor } from "../guide/mi/miVoiceModel";
import { resetMeHomeMemo } from "../../services/meHomeSummary";
import { MI_SCOPE_STORAGE_KEY, resetMiScopeForTests, type MiScope } from "../../lib/mi/miScope";
import { selectMiCards, type MiCardSummary } from "../../lib/mi/miCardSummary";
import { readStudyModel } from "../../services/progressReadModel";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(MI_FIXTURE_NOW);
});
afterAll(() => vi.useRealTimers());
beforeEach(() => {
  H.s = miFixtureStudent();
  resetMeHomeMemo();
  localStorage.clear();
  resetMiScopeForTests();
});
afterEach(cleanup);

function renderBoth() {
  return render(
    <MemoryRouter>
      <MiCardHost uid={MI_FIXTURE_UID} gen={1} returnTo="/" />
      <MistakeIntelCard />
    </MemoryRouter>,
  );
}

/** What a card prints, figure by figure. */
function figures(card: HTMLElement) {
  const q = within(card);
  return {
    lost: q.getByTestId("mi-card-lost").textContent,
    window: q.getByTestId("mi-card-window").textContent,
    tiles: q.getAllByTestId("mi-card-tile").map((t) => `${t.getAttribute("data-row")}=${within(t).getByTestId("mi-card-tile-n").textContent}`),
    chance: q.getByTestId("mi-card-chance").textContent,
    gaps: q.queryByTestId("mi-card-gaps")?.textContent ?? null,
  };
}

describe("Home and the sidebar: identical figures for the same scope and window", () => {
  it("★ Both, Maths and Science: the two cards print the same headline, window, tiles, chance and gaps", async () => {
    renderBoth();
    const home = () => screen.getByTestId("home-mi-card");
    const side = () => screen.getByTestId("sidebar-mi-card");
    for (const scope of ["both", "maths", "science"] as MiScope[]) {
      fireEvent.click(within(home()).getByTestId(`mi-scope-${scope}`));
      await waitFor(() => expect(home().getAttribute("data-state")).toBe("ready"));
      await waitFor(() => expect(side().getAttribute("data-state")).toBe("ready"));
      expect(side().getAttribute("data-scope")).toBe(scope);
      expect(figures(side())).toEqual(figures(home()));
    }
  });

  it("★ the tiles add up to the headline on the rendered card (every scope)", async () => {
    renderBoth();
    const home = () => screen.getByTestId("home-mi-card");
    for (const scope of ["both", "maths", "science"] as MiScope[]) {
      fireEvent.click(within(home()).getByTestId(`mi-scope-${scope}`));
      await waitFor(() => expect(home().getAttribute("data-state")).toBe("ready"));
      const tiles = within(home()).getAllByTestId("mi-card-tile-n").map((n) => Number(n.textContent));
      const lost = Number((within(home()).getByTestId("mi-card-lost").textContent ?? "").match(/[\d.]+/)?.[0]);
      expect(Math.round(tiles.reduce((s, v) => s + v, 0) * 10) / 10).toBe(lost);
    }
  });
});

describe("the switch — default Both, shared, a per-viewer convenience only", () => {
  it("★ defaults to Both; one tap moves every card; storage holds the scope string and nothing else", async () => {
    renderBoth();
    await waitFor(() => expect(screen.getByTestId("home-mi-card").getAttribute("data-state")).toBe("ready"));
    expect(screen.getByTestId("home-mi-card").getAttribute("data-scope")).toBe("both");
    expect(screen.getByTestId("sidebar-mi-card").getAttribute("data-scope")).toBe("both");
    fireEvent.click(within(screen.getByTestId("sidebar-mi-card")).getByTestId("mi-scope-science"));
    expect(screen.getByTestId("home-mi-card").getAttribute("data-scope")).toBe("science");
    expect(within(screen.getByTestId("home-mi-card")).getByTestId("mi-scope-science").getAttribute("aria-pressed")).toBe("true");
    expect(localStorage.getItem(MI_SCOPE_STORAGE_KEY)).toBe("science");
    const keys = Object.keys(localStorage).filter((k) => /mi\.scope/.test(k));
    expect(keys).toEqual([MI_SCOPE_STORAGE_KEY]);
    expect(Object.keys(localStorage).some((k) => /premium|trial|pass|subscription/i.test(k))).toBe(false);
  });

  it("an unreadable or junk stored value falls back to Both", () => {
    localStorage.setItem(MI_SCOPE_STORAGE_KEY, "physics");
    resetMiScopeForTests();
    render(<MemoryRouter><MiCardHost uid={null} gen={0} returnTo="/" /></MemoryRouter>);
    expect(screen.getByTestId("home-mi-card").getAttribute("data-scope")).toBe("both");
  });
});

describe("Ziggy's line uses only numbers printed on the card", () => {
  it("★ for every scope (and the untyped and thin shapes), each number in the line is on the card", async () => {
    const model = await readStudyModel(MI_FIXTURE_UID, { window: "month", tutor: false });
    const cards = selectMiCards(model, { source: "home", returnTo: "/" });
    const untyped: MiCardSummary = { ...cards.maths, rows: cards.maths.rows.map((r) => (r.key === "unrecorded" ? { ...r, marks: cards.maths.lost } : { ...r, marks: 0 })), typed: 0, chance: null };
    for (const summary of [cards.both, cards.maths, cards.science, untyped]) {
      const voice = miVoiceFor(miVoiceInputForCard("ok", summary));
      expect(voice).not.toBeNull();
      const { container, unmount } = render(
        <MemoryRouter>
          <MiCard variant="dark" status="ok" summary={summary} scope={summary.scope} onScope={() => {}} meHref="/me" checkHref="/check-improve" />
        </MemoryRouter>,
      );
      const printed = container.textContent ?? "";
      for (const num of voice!.line.match(/\d+(?:\.\d+)?/g) ?? []) expect(printed).toContain(num);
      for (const phrase of voice!.line.match(/\d+(?:\.\d+)? marks?/g) ?? []) expect(printed).toContain(phrase);
      unmount();
    }
  });
});
