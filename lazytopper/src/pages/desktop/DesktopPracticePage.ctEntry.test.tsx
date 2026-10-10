// CT-ENTRY-1 — the Chapter Tests ENTRY card on the Practice Hub.
//
// Pins: a "Chapter Tests" button sits beside the CBQ button inside one
// `.lt-entry-pair`; it opens the `ct-picker` dialog (also via `?ct=1`); picking
// a chapter lands on EXACTLY buildDesktopChapterTestPath(...); the CBQ entry and
// the four mode cards / four carousel dots are untouched.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";
import { buildDesktopChapterTestPath } from "../../lib/desktop/navigation";

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u1" }, loading: false }),
}));
vi.mock("../../services/mistakeLogService", () => ({ getMistakeLogs: async () => [] }));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));

import DesktopPracticePage from "./DesktopPracticePage";

afterEach(cleanup);

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
const ctButton = () => screen.getByRole("button", { name: /chapter tests/i });
const cbqButton = () => screen.getByRole("button", { name: /competency-based questions/i });

describe("Practice hub — Chapter Tests entry (CT-ENTRY-1)", () => {
  it("renders the Chapter Tests button in the same .lt-entry-pair as the CBQ button", async () => {
    await renderHub(HUB);
    const pair = ctButton().closest(".lt-entry-pair");
    expect(pair).not.toBeNull();
    expect(cbqButton().closest(".lt-entry-pair")).toBe(pair);
  });

  it("clicking it opens the ct-picker dialog", async () => {
    await renderHub(HUB);
    expect(screen.queryByTestId("ct-picker")).toBeNull();
    fireEvent.click(ctButton());
    expect(screen.getByTestId("ct-picker")).toBeInTheDocument();
  });

  it.each([
    ["Maths", "real-numbers"],
    ["Science", "electricity"],
  ] as const)("picking %s / %s lands on the chapter-test landing path", async (subject, slug) => {
    await renderHub(HUB);
    fireEvent.click(ctButton());
    fireEvent.change(document.getElementById("lt-ct-subject") as HTMLSelectElement, {
      target: { value: subject },
    });
    fireEvent.change(document.getElementById("lt-ct-chapter") as HTMLSelectElement, {
      target: { value: slug },
    });
    fireEvent.click(screen.getByRole("button", { name: "Start Chapter Test →" }));
    expect(screen.getByTestId("probe").getAttribute("data-url")).toBe(
      buildDesktopChapterTestPath({
        subject,
        topicKey: slug,
        source: "practice",
        returnTo: "/practice-hub",
      }),
    );
  });

  it("?ct=1 opens the ct-picker on arrival; the bare hub does not", async () => {
    await renderHub(`${HUB}?ct=1`);
    expect(screen.getByTestId("ct-picker")).toBeInTheDocument();
    cleanup();
    await renderHub(HUB);
    expect(screen.queryByTestId("ct-picker")).toBeNull();
  });

  it("?cbq=1&ct=1 opens only the CBQ picker (the ad landing wins; never two dialogs stacked)", async () => {
    await renderHub(`${HUB}?cbq=1&ct=1`);
    expect(screen.getByTestId("cbq-picker")).toBeInTheDocument();
    expect(screen.queryByTestId("ct-picker")).toBeNull();
  });

  it("control: the CBQ button still opens cbq-picker", async () => {
    await renderHub(HUB);
    fireEvent.click(cbqButton());
    expect(screen.getByTestId("cbq-picker")).toBeInTheDocument();
  });

  it("keeps the four mode cards and exactly four carousel dots", async () => {
    await renderHub(HUB);
    for (const name of ["Quick Practice", "Worksheet", "Predicted (HPQs)", "Full Test"]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }
    expect(document.querySelectorAll(".lt-mode-dots > span")).toHaveLength(4);
  });
});
