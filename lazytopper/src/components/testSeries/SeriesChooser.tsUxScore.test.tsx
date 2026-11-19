// TS-UX-SCORE-1 - the Practice-hub chooser: a numbered series paper opens with a safe returnTo (Back leads to the hub); an unsafe
// returnTo is dropped; the paper picker sits above the chapter list (no scrolling past 13 chapters on a phone); the sheet's rows never shrink.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => ({ hydrated: true, status: { tier: "free", plan: null }, isPremium: false }) }));
vi.mock("../../services/sessionRecords", () => ({ getSessionRecordsFromCloud: async () => [] }));
vi.mock("./testSeriesOwnership", () => ({ useTestSeriesOwnership: () => ({ owns: false, status: null, phase: "ready", retry: () => {} }) }));

import SeriesChooser from "./SeriesChooser";

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
const urlOf = async () => new URL((await screen.findByTestId("probe")).getAttribute("data-url") ?? "", "http://x");

beforeEach(() => {});
afterEach(() => cleanup());

describe("TS-UX-SCORE-1 - chooser returnTo", () => {
  it("a chapter paper opens with returnTo=/practice-hub", async () => {
    await mount();
    fireEvent.click(screen.getByTestId("ts-chapter-polynomials"));
    fireEvent.click(screen.getByTestId("ts-go"));
    const u = await urlOf();
    expect(u.pathname).toContain("/chapter-test/");
    expect(u.searchParams.get("series")).toBe("1");
    expect(u.searchParams.get("returnTo")).toBe("/practice-hub");
  });
  it("a full-length series paper opens with returnTo too", async () => {
    await mount({ initialTab: "full" });
    fireEvent.click(screen.getByTestId("ts-go"));
    const u = await urlOf();
    expect(u.pathname).toMatch(/^\/full-mock\//);
    expect(u.searchParams.get("paper")).toBeTruthy();
    expect(u.searchParams.get("returnTo")).toBe("/practice-hub");
  });
  it("an unsafe returnTo prop is rejected: the paper opens with no returnTo", async () => {
    for (const bad of ["https://evil.example/x", "//evil.example", "javascript:alert(1)"]) {
      cleanup();
      await mount({ returnTo: bad });
      fireEvent.click(screen.getByTestId("ts-chapter-polynomials"));
      fireEvent.click(screen.getByTestId("ts-go"));
      expect((await urlOf()).searchParams.get("returnTo")).toBeNull();
    }
  });
});

describe("TS-UX-SCORE-1 - chooser layout", () => {
  it("the paper 1-5 picker is rendered before the chapter list", async () => {
    await mount();
    const papers = screen.getByTestId("ts-papers");
    const chapters = screen.getByTestId("ts-chapters");
    expect(papers.compareDocumentPosition(chapters) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it("the fixed rows never shrink and the tap targets are >= 40 px (css contract)", () => {
    const css = readFileSync(resolve(process.cwd(), "src/components/testSeries/seriesChooser.css"), "utf8");
    for (const sel of [".lt-tsc-head", ".lt-tsc-meta", ".lt-tsc-seg", ".lt-tsc-foot"]) {
      const block = new RegExp(`${sel.replace(".", "\\.")}\\s*\\{([^}]*)\\}`).exec(css);
      expect(block?.[1], sel).toMatch(/flex-shrink:\s*0/);
    }
    const more = /\.lt-tsc-more\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(Number(/min-height:\s*(\d+)px/.exec(more)?.[1])).toBeGreaterThanOrEqual(40);
    const ct = readFileSync(resolve(process.cwd(), "src/components/chaptertest/chapterTestStyles.ts"), "utf8");
    expect(ct).toMatch(/\.lt-ct__minitg \{ min-height: 40px/);
    expect(ct).toMatch(/\.lt-ct__tg::before \{ content: ""; position: absolute; inset: -8px/);
  });
});
