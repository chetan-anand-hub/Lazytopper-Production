// HUB-TS-1 — the Practice hub's Test Series card + chooser. Card text/counts from code, the chooser opens (tap, ?ct=1, ?ts=full), the
// step-2 "Full Test" card is gone (3 cards / 3 dots), the guide's `button.lt-ct-card` target is the new card, the FRESH options keep
// today's URLs, and VITE_HUB_TS_DISABLED restores today's hub.
import { withReturnTo } from "../../lib/testSeries/seriesNav";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";
import { buildDesktopChapterTestPath } from "../../lib/desktop/navigation";
import { chapterTestSeriesHref, fullMockSeriesHref, seriesTotals } from "../../lib/testSeries/testSeries";
import { testSeriesPriceLine } from "../../services/packs";
import { hubCardLine } from "../../components/testSeries/hubTsFlag";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: auth.user, loading: false }),
}));
vi.mock("../../services/mistakeLogService", () => ({ getMistakeLogs: async () => [] }));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));

import DesktopPracticePage from "./DesktopPracticePage";

beforeEach(() => {
  window.localStorage.clear();
  auth.user = null;
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

function Probe() {
  const loc = useLocation();
  return <div data-testid="probe" data-url={`${loc.pathname}${loc.search}`} />;
}

async function renderHub(entry: string) {
  setMatchMediaMatches(true);
  await act(async () => {
    render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/practice-hub" element={<DesktopPracticePage />} />
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

const HUB = "/practice-hub";
const tsCard = () => screen.getByRole("button", { name: /test series/i });
const chooser = () => screen.findByTestId("ts-chooser");

describe("HUB-TS-1 — the Test Series card", () => {
  it("replaces Chapter Tests in the entry pair; its words and counts come from code", async () => {
    await renderHub(HUB);
    const t = seriesTotals();
    expect(hubCardLine()).toContain(`${t.chapterTests} chapter tests and ${t.fullMocks} full-length board papers`);
    expect(tsCard().textContent).toContain(hubCardLine());
    expect(tsCard().textContent).toContain("Chapter tests and full-length papers");
    expect(tsCard().className).toContain("lt-ct-card"); // the guide's `button.lt-ct-card` target
    expect(tsCard().closest(".lt-entry-pair")).not.toBeNull();
    expect(screen.queryByRole("button", { name: /^chapter tests/i })).toBeNull();
  });

  it("step 2 keeps Quick Practice, Worksheet, Important Questions: no Full Test card, three cards, three dots, a full-width last row", async () => {
    await renderHub(HUB);
    for (const name of ["Quick Practice", "Worksheet", "Important Questions"]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole("heading", { name: "Full Test" })).toBeNull();
    expect(screen.queryByRole("button", { name: /open full test/i })).toBeNull();
    expect(document.querySelectorAll(".lt-mode-card")).toHaveLength(3);
    expect(document.querySelectorAll(".lt-mode-dots > span")).toHaveLength(3);
    expect(document.querySelector(".lt-mode-grid")?.className).toContain("lt-mode-grid--3");
    expect(document.body.innerHTML).toContain(".lt-mode-grid--3 > .lt-mode-card:last-child");
  });

  it("a tap opens the chooser on Chapter tests; Escape closes it", async () => {
    await renderHub(HUB);
    expect(screen.queryByTestId("ts-chooser")).toBeNull();
    fireEvent.click(tsCard());
    await chooser();
    expect(screen.getByTestId("ts-tab-chapter")).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Test Series" }), { key: "Escape" });
    expect(screen.queryByTestId("ts-chooser")).toBeNull();
  });

  it("?ct=1 (ads, the guide) opens the chooser on Chapter tests; ?ts=full on Full-length; the bare hub opens nothing", async () => {
    await renderHub(`${HUB}?ct=1`);
    await chooser();
    expect(screen.getByTestId("ts-tab-chapter")).toHaveAttribute("aria-pressed", "true");
    cleanup();
    await renderHub(`${HUB}?ts=full`);
    await chooser();
    expect(screen.getByTestId("ts-tab-full")).toHaveAttribute("aria-pressed", "true");
    cleanup();
    await renderHub(HUB);
    expect(screen.queryByTestId("ts-chooser")).toBeNull();
  });

  it("?cbq=1&ct=1 still opens only the CBQ picker", async () => {
    auth.user = { uid: "u1" }; // the CBQ picker opens on arrival for a signed-in student
    await renderHub(`${HUB}?cbq=1&ct=1`);
    expect(screen.getByTestId("cbq-picker")).toBeInTheDocument();
    expect(screen.queryByTestId("ts-chooser")).toBeNull();
  });

  it("the guide's own target (`button.lt-ct-card`) is the Test Series card, and clicking it opens the chooser", async () => {
    await renderHub(HUB);
    const el = document.querySelector<HTMLButtonElement>("button.lt-ct-card");
    expect(el).toBe(tsCard());
    await act(async () => el!.click());
    await chooser();
  });

  it("Chapter tests: the CTA opens the exact series URL /test-series opens", async () => {
    await renderHub(HUB);
    fireEvent.click(tsCard());
    await chooser();
    fireEvent.click(screen.getByTestId("ts-chapter-real-numbers"));
    fireEvent.click(screen.getByTestId("ts-go"));
    expect((await screen.findByTestId("probe")).getAttribute("data-url")).toBe(withReturnTo(chapterTestSeriesHref("Maths", "real-numbers"), "/practice-hub"));
  });

  it("Full-length: the CTA opens fullMockSeriesHref(subject, n)", async () => {
    await renderHub(`${HUB}?ts=full`);
    await chooser();
    fireEvent.click(screen.getByTestId("ts-subject-Science"));
    fireEvent.click(screen.getByTestId("ts-mock-3"));
    expect(screen.getByTestId("ts-go").textContent).toBe("Start Science · Full-Length Test 3 →");
    fireEvent.click(screen.getByTestId("ts-go"));
    expect((await screen.findByTestId("probe")).getAttribute("data-url")).toBe(withReturnTo(fullMockSeriesHref("Science", 3), "/practice-hub"));
  });

  it("FRESH options keep today's URLs: the old card's Chapter Test landing, and the old Full Test card's /full-mock URL", async () => {
    await renderHub(`${HUB}?ct=1`);
    await chooser();
    fireEvent.click(screen.getByTestId("ts-chapter-real-numbers"));
    fireEvent.click(screen.getByTestId("ts-fresh"));
    expect((await screen.findByTestId("probe")).getAttribute("data-url")).toBe(
      buildDesktopChapterTestPath({ subject: "Maths", topicKey: "real-numbers", source: "practice", returnTo: "/practice-hub" }),
    );
    cleanup();
    await renderHub(`${HUB}?ts=full`);
    await chooser();
    fireEvent.click(screen.getByTestId("ts-fresh"));
    expect((await screen.findByTestId("probe")).getAttribute("data-url")).toBe(
      "/full-mock/10/Maths?source=practice&returnTo=%2Fpractice-hub%3Fts%3Dfull",
    );
  });

  it("signed out: a free-test tag, the price from the SKU helper, and no progress text on any chapter", async () => {
    await renderHub(`${HUB}?ct=1`);
    await chooser();
    expect(screen.getByTestId("ts-free-tag").textContent).toBe("1 free test");
    expect(screen.getByTestId("ts-price").textContent).toBe(testSeriesPriceLine(Date.now()));
    for (const el of screen.getAllByTestId("ts-chapter-progress")) expect(el.textContent).toBe("");
  });

  it("VITE_HUB_TS_DISABLED restores today's hub: Chapter Tests card + picker, and the Full Test card", async () => {
    vi.stubEnv("VITE_HUB_TS_DISABLED", "1");
    await renderHub(`${HUB}?ct=1`);
    expect(screen.getByTestId("ct-picker")).toBeInTheDocument();
    expect(screen.queryByTestId("ts-chooser")).toBeNull();
    expect(screen.getByRole("button", { name: /chapter tests/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Full Test" })).toBeInTheDocument();
    expect(document.querySelectorAll(".lt-mode-dots > span")).toHaveLength(4);
    expect(document.querySelector(".lt-mode-grid")?.className).toBe("lt-mode-grid");
    expect(document.body.innerHTML).not.toContain("lt-mode-grid--3 >");
  });
});
