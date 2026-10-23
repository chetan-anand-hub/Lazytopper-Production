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

const H = vi.hoisted(() => ({
  s: null as unknown as MiFixtureStreams,
  user: { uid: "u-mi-fixture" } as { uid: string; isLocalSession?: boolean },
  reads: 0,
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: H.user, loading: false, mistakeLogsHydrated: 1 }),
}));
vi.mock("../../services/practiceInsights", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/practiceInsights")>()),
  getAttemptsFromCloud: async (_uid: string, { start }: { start?: number } = {}) =>
    (H.reads++, H.s.attempts).filter((a) => start === undefined || a.timestamp >= start).map((a) => ({ ...a })),
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
import { recordAttempt, type PracticeAttempt } from "../../services/practiceInsights";
import { recordWrongAnswer } from "../../services/adaptivePracticeEngine";
import { setActiveProgressUser } from "../../services/studentProgressStore";
import { Link } from "react-router-dom";
import { act } from "react";

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
  H.user = { uid: MI_FIXTURE_UID };
  H.reads = 0;
  setActiveProgressUser(MI_FIXTURE_UID);
  vi.setSystemTime(MI_FIXTURE_NOW);
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

/** A wrong Quick Practice MCQ pick an hour ago, as the cloud stream will return it. */
function wrongPick(id: string): PracticeAttempt {
  return {
    id, questionId: `new-${id}`, topicKey: "real-numbers", topicName: "Real Numbers", subject: "maths",
    correct: false, marksScored: 0, marksAvailable: 1, mode: "mcq", timestamp: Date.now() - 3600000,
  } as unknown as PracticeAttempt;
}
const lostOf = (card: HTMLElement) => within(card).getByTestId("mi-card-lost").textContent;
const gapsOf = (card: HTMLElement) => within(card).queryByTestId("mi-card-gaps-n")?.textContent ?? null;

describe("the always-mounted sidebar and Home never disagree on one screen (no reload)", () => {
  it("★ a clean drill clears a concept gap on BOTH cards at once", async () => {
    recordWrongAnswer("graded:real-numbers", "real-numbers", "real-numbers", "Medium", 2);
    recordWrongAnswer("graded:real-numbers", "real-numbers", "real-numbers", "Medium", 2);
    renderBoth();
    const home = () => screen.getByTestId("home-mi-card");
    const side = () => screen.getByTestId("sidebar-mi-card");
    await waitFor(() => expect([gapsOf(home()), gapsOf(side())]).toEqual(["2", "2"]));
    act(() => {
      recordAttempt({ uid: MI_FIXTURE_UID } as never, { subject: "Maths", topic: "Real Numbers", question: "clean drill", marksScored: 3, marksAvailable: 3, mode: "graded" });
    });
    await waitFor(() => expect([gapsOf(home()), gapsOf(side())]).toEqual(["1", "1"]));
  });

  it("★ a new attempt moves the 30-day headline on BOTH cards at once (no 60 s stale read)", async () => {
    renderBoth();
    const home = () => screen.getByTestId("home-mi-card");
    const side = () => screen.getByTestId("sidebar-mi-card");
    await waitFor(() => expect(side().getAttribute("data-state")).toBe("ready"));
    await waitFor(() => expect(home().getAttribute("data-state")).toBe("ready"));
    const before = lostOf(home());
    expect(lostOf(side())).toBe(before);
    const pick = wrongPick("w1");
    H.s.attempts.push(pick);
    act(() => {
      recordAttempt({ uid: MI_FIXTURE_UID } as never, { subject: "Maths", topic: "Real Numbers", questionId: pick.questionId, question: "tap", marksScored: 0, marksAvailable: 1, mode: "mcq" });
    });
    await waitFor(() => expect(lostOf(home())).not.toBe(before));
    await waitFor(() => expect(lostOf(side())).toBe(lostOf(home())));
  });

  it("★ the sidebar re-asks the read on a route change once the 60 s read has expired; its links return to THIS page", async () => {
    render(
      <MemoryRouter initialEntries={["/practice"]}>
        <MistakeIntelCard />
        <Link to="/worksheets">go</Link>
      </MemoryRouter>,
    );
    const side = () => screen.getByTestId("sidebar-mi-card");
    await waitFor(() => expect(side().getAttribute("data-state")).toBe("ready"));
    expect(within(side()).getByTestId("mi-card-breakdown").getAttribute("href")).toBe("/me?source=me&returnTo=%2Fpractice");
    const before = lostOf(side());
    H.s.attempts.push(wrongPick("w2")); // written elsewhere (another device): no signal on this one
    vi.setSystemTime(MI_FIXTURE_NOW + 61_000);
    fireEvent.click(screen.getByText("go"));
    await waitFor(() => expect(lostOf(side())).not.toBe(before));
    expect(within(side()).getByTestId("mi-card-breakdown").getAttribute("href")).toBe("/me?source=me&returnTo=%2Fworksheets");
  });

  it("★ a local session is never read in the sidebar either — the honest empty state, as on Home", async () => {
    H.user = { uid: MI_FIXTURE_UID, isLocalSession: true };
    // Home passes `user && !user.isLocalSession ? user.uid : null` (DesktopHome / MobileHome).
    render(
      <MemoryRouter>
        <MiCardHost uid={null} gen={1} returnTo="/" />
        <MistakeIntelCard />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("sidebar-mi-card").getAttribute("data-state")).toBe("empty"));
    expect(screen.getByTestId("home-mi-card").getAttribute("data-state")).toBe("empty");
    expect(H.reads).toBe(0);
  });
});
