// TS-NAV-2 (owner, 25 Nov 2026) — the /test-series picker:
//   (e) every select shows a down-chevron (CSS background SVG, appearance none, room on the right);
//   (b) Back keeps your place: the choice is remembered in sessionStorage `lt-ts-picker` (UI state only) and restored in the same tab
//       session; the picker scrolls itself into view ONLY when returning from a paper (a flag set on Start, consumed once);
//       unreadable storage -> today's defaults;
//   (c) "Start: ..." on a paper not started, "Open: ..." on one started / attempted / awaiting (same href);
//   kill switch VITE_TS_NAV2_DISABLED -> no memory, no scroll, always "Start" (the arrows stay: pure CSS).
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TestSeriesPaperPicker, { TS_PICKER_STORAGE_KEY, readPickerMemory } from "./TestSeriesPaperPicker";
import { seriesChapterTests, seriesFullMocks, seriesMockRounds, type SeriesProgress } from "../../lib/testSeries/testSeries";
import { focusSetCount, focusSets } from "../../lib/testSeries/focusSets";

const scrolls = vi.hoisted(() => ({ n: 0 }));

beforeEach(() => {
  window.sessionStorage.clear();
  scrolls.n = 0;
  Element.prototype.scrollIntoView = function scrollIntoView() {
    scrolls.n += 1;
  };
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  window.sessionStorage.clear();
});

function mount(progress: SeriesProgress | null = null) {
  return render(
    <MemoryRouter>
      <TestSeriesPaperPicker
        chapters={seriesChapterTests()}
        mocks={seriesFullMocks()}
        rounds={seriesMockRounds()}
        progress={progress}
        mocksPerSubject={25}
        focusSets={focusSets()}
        focusProgress={null}
        focusCount={focusSetCount()}
      />
    </MemoryRouter>,
  );
}
const sel = (id: string) => screen.getByTestId(id) as HTMLSelectElement;
const flush = () => act(() => vi.runAllTimers());

describe("TS-NAV-2 (e) dropdown arrows", () => {
  it("every .lt-ts-pick__ctl select gets a chevron background, appearance none, and room for it on the right", () => {
    const css = fs.readFileSync(path.resolve(__dirname, "../../pages/testSeriesPage.css"), "utf8");
    const rule = /\.lt-ts select\.lt-ts-pick__ctl\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(rule).toMatch(/appearance:\s*none/);
    expect(rule).toMatch(/background-image:\s*url\("data:image\/svg\+xml,[^"]*%2315233a/);
    expect(rule).toMatch(/background-position:\s*right 14px center/);
    expect(rule).toMatch(/padding-right:\s*40px/);
    expect(rule).toMatch(/background-repeat:\s*no-repeat/);
    expect(rule).toMatch(/text-overflow:\s*ellipsis/);
    mount();
    for (const s of document.querySelectorAll("select")) expect(s.classList.contains("lt-ts-pick__ctl")).toBe(true);
  });
});

describe("TS-NAV-2 (b) Back keeps your place", () => {
  it("Full-length, test 2 -> Start -> back: restored, and the picker scrolls into view ONCE", () => {
    const first = mount();
    fireEvent.click(screen.getByTestId("ts-pick-type-full"));
    fireEvent.change(sel("ts-pick-full"), { target: { value: "2" } });
    const start = screen.getByTestId("ts-start");
    expect(start.getAttribute("href")).toContain("paper=2");
    fireEvent.click(start);
    expect(JSON.parse(window.sessionStorage.getItem(TS_PICKER_STORAGE_KEY)!)).toMatchObject({ subject: "Maths", type: "full", fullN: 2, back: true });
    first.unmount();

    // The student comes back from the paper.
    mount();
    flush();
    expect(screen.getByTestId("ts-pick-type-full").getAttribute("aria-pressed")).toBe("true");
    expect(sel("ts-pick-full").value).toBe("2");
    expect(screen.getByTestId("ts-start").textContent).toContain("Full-length test 2");
    expect(scrolls.n).toBe(1);
    expect(readPickerMemory()?.back).toBe(false); // consumed
    cleanup();

    // A later visit in the same tab session: the choice is still there, but no scroll.
    mount();
    flush();
    expect(sel("ts-pick-full").value).toBe("2");
    expect(scrolls.n).toBe(1);
  });

  it("remembers subject, chapter + paper, and the focus theme + set", () => {
    const first = mount();
    fireEvent.click(screen.getByTestId("ts-pick-subject-Science"));
    fireEvent.click(screen.getByTestId("ts-pick-type-focus"));
    fireEvent.change(sel("ts-pick-focus-theme"), { target: { value: sel("ts-pick-focus-theme").options[1].value } });
    fireEvent.change(sel("ts-pick-focus-set"), { target: { value: "3" } });
    const theme = sel("ts-pick-focus-theme").value;
    first.unmount();
    const second = mount();
    flush();
    expect(screen.getByTestId("ts-pick-subject-Science").getAttribute("aria-pressed")).toBe("true");
    expect(sel("ts-pick-focus-theme").value).toBe(theme);
    expect(sel("ts-pick-focus-set").value).toBe("3");
    expect(scrolls.n).toBe(0); // a fresh visit, no Start: no scroll
    fireEvent.click(screen.getByTestId("ts-pick-type-chapter"));
    const chapter = sel("ts-pick-chapter").options[2].value;
    fireEvent.change(sel("ts-pick-chapter"), { target: { value: chapter } });
    if (screen.queryByTestId("ts-pick-paper")) fireEvent.change(sel("ts-pick-paper"), { target: { value: "2" } });
    second.unmount();
    mount();
    flush();
    expect(sel("ts-pick-chapter").value).toBe(chapter);
    if (screen.queryByTestId("ts-pick-paper")) expect(sel("ts-pick-paper").value).toBe("2");
  });

  it("a first visit (nothing stored) opens on today's defaults with no scroll and stores nothing until the student chooses", () => {
    mount();
    flush();
    expect(screen.getByTestId("ts-pick-subject-Maths").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("ts-pick-type-chapter").getAttribute("aria-pressed")).toBe("true");
    expect(window.sessionStorage.getItem(TS_PICKER_STORAGE_KEY)).toBeNull();
    expect(scrolls.n).toBe(0);
  });

  it("unreadable / malformed storage falls back to the defaults", () => {
    window.sessionStorage.setItem(TS_PICKER_STORAGE_KEY, "{not json");
    mount();
    expect(screen.getByTestId("ts-pick-type-chapter").getAttribute("aria-pressed")).toBe("true");
    cleanup();
    window.sessionStorage.setItem(TS_PICKER_STORAGE_KEY, JSON.stringify({ subject: "History", type: "full" }));
    mount();
    expect(screen.getByTestId("ts-pick-subject-Maths").getAttribute("aria-pressed")).toBe("true");
    cleanup();
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded");
    });
    mount();
    fireEvent.click(screen.getByTestId("ts-pick-type-full"));
    fireEvent.click(screen.getByTestId("ts-start"));
    expect(screen.getByTestId("ts-pick-type-full").getAttribute("aria-pressed")).toBe("true");
    get.mockRestore();
    set.mockRestore();
  });
});

describe("TS-NAV-2 (c) Start / Open by status", () => {
  const mocks = seriesFullMocks().filter((m) => m.subject === "Maths");
  const progress = (status: "not-started" | "attempted" | "graded"): SeriesProgress => ({
    byCode: Object.fromEntries(mocks.map((m) => [m.code, { status: m.n === 2 ? status : "not-started", score: status === "graded" && m.n === 2 ? { awarded: 50, total: 80 } : null }])),
    done: 0,
    total: 0,
    mockTrend: { Maths: [], Science: [] },
  });

  it.each([
    ["not-started", "Start: Full-length test 2"],
    ["attempted", "Open: Full-length test 2"],
    ["graded", "Open: Full-length test 2"],
  ] as const)("full-length 2 %s -> %s (same href)", (status, label) => {
    mount(progress(status));
    fireEvent.click(screen.getByTestId("ts-pick-type-full"));
    fireEvent.change(sel("ts-pick-full"), { target: { value: "2" } });
    const start = screen.getByTestId("ts-start");
    expect(start.textContent).toContain(label);
    expect(start.getAttribute("href")).toBe(mocks.find((m) => m.n === 2)!.href);
  });

  it("signed out: always Start", () => {
    mount(null);
    expect(screen.getByTestId("ts-start").textContent).toMatch(/^Start: /);
  });
});

describe("TS-NAV-2 kill switch VITE_TS_NAV2_DISABLED", () => {
  it("no memory, no scroll, always Start", () => {
    vi.stubEnv("VITE_TS_NAV2_DISABLED", "1");
    window.sessionStorage.setItem(
      TS_PICKER_STORAGE_KEY,
      JSON.stringify({ subject: "Science", type: "full", chapterKey: "", paper: 1, fullN: 2, focusTheme: "", focusN: 1, back: true }),
    );
    const mocks = seriesFullMocks().filter((m) => m.subject === "Maths");
    mount({
      byCode: Object.fromEntries(mocks.map((m) => [m.code, { status: "attempted", score: null }])),
      done: 0,
      total: 0,
      mockTrend: { Maths: [], Science: [] },
    });
    flush();
    expect(screen.getByTestId("ts-pick-subject-Maths").getAttribute("aria-pressed")).toBe("true");
    expect(scrolls.n).toBe(0);
    fireEvent.click(screen.getByTestId("ts-pick-type-full"));
    expect(screen.getByTestId("ts-start").textContent).toMatch(/^Start: /);
    fireEvent.click(screen.getByTestId("ts-start"));
    expect(JSON.parse(window.sessionStorage.getItem(TS_PICKER_STORAGE_KEY)!).subject).toBe("Science"); // untouched
  });
});
