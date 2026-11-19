// HUB-TS-1 — the chooser itself: progress from the student's own records, P = 1 and P = 5 with no UI change, full-length rounds,
// the free-test tag, and the access tiers for the fresh options (no gate added: they are offered to everyone, the routes decide).
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string; isLocalSession: boolean } }));
const sub = vi.hoisted(() => ({ paid: false }));
const recs = vi.hoisted(() => ({ list: [] as unknown[] }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    hydrated: true,
    status: sub.paid ? { tier: "premium", plan: "pass_till_boards" } : { tier: "free", plan: null },
    isPremium: sub.paid,
  }),
}));
vi.mock("../../services/sessionRecords", () => ({ getSessionRecordsFromCloud: async () => recs.list }));
vi.mock("./testSeriesOwnership", () => ({ useTestSeriesOwnership: () => ({ owns: false, status: null, phase: "ready", retry: () => {} }) }));

import SeriesChooser from "./SeriesChooser";
import { SERIES_MOCKS_PER_SUBJECT, seriesMockRounds, chapterTestSeriesHref } from "../../lib/testSeries/testSeries";

function Probe() {
  const loc = useLocation();
  return <div data-testid="probe" data-url={`${loc.pathname}${loc.search}`} />;
}
async function mount(props: Partial<React.ComponentProps<typeof SeriesChooser>> = {}) {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={["/practice-hub"]}>
        <Routes>
          <Route path="/practice-hub" element={<SeriesChooser open onClose={() => {}} {...props} />} />
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}
const gradedCt = (topicKey: string, awarded = 20, total = 40) => ({
  worksheetId: `ct-ts1-${topicKey}--1-1`, surface: "chapter-test", status: "graded", marksAwarded: awarded, marksTotal: total, gradedAt: 1_800_000_000_000,
});

beforeEach(() => {
  auth.user = null;
  sub.paid = false;
  recs.list = [];
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("SeriesChooser — progress (honest)", () => {
  it("signed in with no record: 'Not started'; a graded series paper: '1 of 1 done'; other chapters unchanged", async () => {
    auth.user = { uid: "s1", isLocalSession: false };
    recs.list = [gradedCt("real-numbers")];
    await mount();
    expect(await screen.findAllByText("Not started")).not.toHaveLength(0);
    expect(screen.getByTestId("ts-chapter-real-numbers").textContent).toContain("1 of 1 done");
    expect(screen.getByTestId("ts-chapter-polynomials").textContent).toContain("Not started");
  });

  it("signed out: no progress text and no records read", async () => {
    await mount();
    for (const el of screen.getAllByTestId("ts-chapter-progress")) expect(el.textContent).toBe("");
  });
});

describe("SeriesChooser — papers per chapter (P) from the prop, no other change", () => {
  it("P = 1: no paper tiles; the CTA names the chapter only and opens the series URL", async () => {
    await mount();
    expect(screen.queryByTestId("ts-papers")).toBeNull();
    fireEvent.click(screen.getByTestId("ts-chapter-polynomials"));
    expect(screen.getByTestId("ts-go").textContent).toMatch(/^Start .+ →$/);
    expect(screen.getByTestId("ts-go").textContent).not.toMatch(/Paper/);
    fireEvent.click(screen.getByTestId("ts-go"));
    expect((await screen.findByTestId("probe")).getAttribute("data-url")).toBe(chapterTestSeriesHref("Maths", "polynomials"));
  });

  it("P = 5: five tiles, the CTA names the paper, the URL carries it; 'k of 5 done' counts papers with a record", async () => {
    auth.user = { uid: "s1", isLocalSession: false };
    recs.list = [gradedCt("real-numbers")];
    const paperHref = (s: string, t: string, k: number) => `/chapter-test/10/${s}/${t}?series=1&paper=${k}`;
    await mount({ papersPerChapter: 5, paperHref });
    expect(screen.getByTestId("ts-chapter-real-numbers").textContent).toContain("1 of 5 done");
    fireEvent.click(screen.getByTestId("ts-chapter-real-numbers"));
    expect(screen.getAllByTestId(/^ts-paper-\d$/)).toHaveLength(5);
    // paper 1 has a record, so the preselected paper is the first unstarted one (2)
    expect(screen.getByTestId("ts-go").textContent).toMatch(/· Paper 2 →$/);
    fireEvent.click(screen.getByTestId("ts-paper-4"));
    expect(screen.getByTestId("ts-go").textContent).toMatch(/· Paper 4 →$/);
    fireEvent.click(screen.getByTestId("ts-go"));
    expect((await screen.findByTestId("probe")).getAttribute("data-url")).toBe("/chapter-test/10/Maths/real-numbers?series=1&paper=4");
  });
});

describe("SeriesChooser — full-length", () => {
  it("papers sit in the calendar's two rounds (same split as seriesSchedule), 'Next' marks the first unstarted", async () => {
    auth.user = { uid: "s1", isLocalSession: false };
    recs.list = [{ worksheetId: "fm-ts1-m1--1-1", surface: "full-mock", status: "graded", marksAwarded: 55, marksTotal: 80, gradedAt: 1_800_000_000_000 }];
    await mount({ initialTab: "full" });
    const rounds = seriesMockRounds();
    expect(screen.getAllByRole("region")).toHaveLength(rounds.length);
    expect(screen.getAllByTestId(/^ts-mock-\d+$/)).toHaveLength(SERIES_MOCKS_PER_SUBJECT);
    expect(await screen.findByText("55/80")).toBeInTheDocument();
    expect(screen.getByTestId("ts-mock-2").textContent).toContain("Next");
    expect(screen.getByTestId("ts-go").textContent).toBe("Start Maths · Full-Length Test 2 →");
  });
});

describe("SeriesChooser — access tiers (display only; routes keep their gates)", () => {
  it("signed-in free account that has not used its test: '1 free test' + price; the fresh options are offered", async () => {
    auth.user = { uid: "s1", isLocalSession: false };
    await mount();
    expect(await screen.findByText("1 free test")).toBeInTheDocument();
    expect(screen.getByTestId("ts-price").textContent).toContain("till your boards");
    expect(screen.getByTestId("ts-fresh")).toBeEnabled();
  });
  it("a free account that used its test: 'Free test used'", async () => {
    auth.user = { uid: "s1", isLocalSession: false };
    recs.list = [gradedCt("real-numbers")];
    await mount();
    expect(await screen.findByText("Free test used")).toBeInTheDocument();
  });
  it("a Board Pass holder: no free tag, no price; the fresh options are still offered", async () => {
    auth.user = { uid: "s1", isLocalSession: false };
    sub.paid = true;
    await mount();
    expect(screen.getByTestId("ts-free-tag").textContent).toBe("");
    expect(screen.getByTestId("ts-price").textContent).toBe("");
    expect(screen.getByTestId("ts-fresh")).toBeEnabled();
  });
});
