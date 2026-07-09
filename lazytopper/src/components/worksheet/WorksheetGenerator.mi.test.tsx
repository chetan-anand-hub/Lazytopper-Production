import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Worksheet BUILDER redesign ("A · Smart default") + FIX A (scope-relative Mistake
// Intelligence with SPLIT honest states). Asserts against the real rendered DOM.
// Runs in CI/Codespaces vitest.

const useAuthMock = vi.fn();
vi.mock("../../context/AuthContext", () => ({ useAuth: () => useAuthMock() }));
vi.mock("../../hooks/useSubjectContext", () => ({ useSubjectContext: () => ({ subject: "Maths" }) }));

import WorksheetGenerator from "./WorksheetGenerator";

const MISTAKE_KEY = "lazytopper.mistakeLogs.v1:u1";
const signedIn = { user: { uid: "u1", isLocalSession: false } };
const now = () => new Date().toISOString();

/** Seed the real Mistake-Intelligence log the selector reads. */
function seedMistakes(entries: Array<Record<string, unknown>>) {
  localStorage.setItem(
    MISTAKE_KEY,
    JSON.stringify(entries.map((e) => ({ id: Math.random().toString(36), timestamp: now(), ...e }))),
  );
}

beforeEach(() => {
  localStorage.clear();
  useAuthMock.mockReturnValue({ user: null });
});
afterEach(cleanup);

describe("WorksheetGenerator — smart-default hero + honest MI toggle", () => {
  it("leads with the smart-default hero + a Preview CTA (nothing generated yet)", () => {
    const { getByText, getAllByText, queryByText } = render(
      <MemoryRouter>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    expect(getByText(/Board exam mix ·/)).toBeTruthy();
    // Hero + desktop sticky footer both carry a Preview CTA (FIX B).
    expect(getAllByText(/Preview worksheet/i).length).toBeGreaterThanOrEqual(1);
    expect(queryByText(/worksheet is ready/i)).toBeNull();
  });

  it("MI toggle is always visible (outside the Customise drawer), titled + explained", () => {
    const { getByTestId } = render(
      <MemoryRouter>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    const mi = getByTestId("mi-enrich-box");
    expect(mi.closest(".lt-ws__drawer")).toBeNull();
    expect(mi.textContent).toContain("Personalise this worksheet");
    expect(mi.textContent).toContain("Mistake Intelligence");
  });

  it("signed-out: shows a Sign-in CTA that returns to the worksheet (no bare checkbox)", () => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/practice/worksheets?subject=Maths"]}>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    const mi = getByTestId("mi-enrich-box");
    const cta = mi.querySelector("a.lt-ws__mi-cta") as HTMLAnchorElement | null;
    expect(cta).not.toBeNull();
    expect(cta?.getAttribute("href")).toContain("/login");
    expect(cta?.getAttribute("href")).toContain("redirect=");
    expect(mi.querySelector("input.lt-ws__mi-check")).toBeNull();
  });

  it("signed-in + NO mistake data at all: the honest 'do it first' copy (locked, no toggle)", () => {
    useAuthMock.mockReturnValue(signedIn); // localStorage cleared → no MI data
    const { getByTestId } = render(
      <MemoryRouter>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    const mi = getByTestId("mi-enrich-box");
    expect(mi.className).toContain("locked");
    expect(mi.textContent).toMatch(/Check & Improve|grade a worksheet/i);
    expect(mi.querySelector("input.lt-ws__mi-check")).toBeNull();
  });
});

describe("WorksheetGenerator — FIX A: scope-relative MI with split honest states", () => {
  it("single topic IS a weak area (with section signal): shows the section-skew toggle", () => {
    useAuthMock.mockReturnValue(signedIn);
    // Default single-topic scope selects the first Maths topic (Real Numbers).
    seedMistakes([
      { topic: "real-numbers", subject: "Maths", totalMarks: 3, marksLost: 2 }, // → Section C
      { topic: "real-numbers", subject: "Maths", totalMarks: 3, marksLost: 1 },
    ]);
    const { getByTestId } = render(
      <MemoryRouter>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    const mi = getByTestId("mi-enrich-box");
    expect(mi.className).not.toContain("locked");
    expect(mi.querySelector("input.lt-ws__mi-check")).not.toBeNull(); // a real, live toggle
    expect(mi.textContent).toMatch(/weak spots in/i);
    expect(mi.textContent).toContain("Section C");
    expect(mi.textContent).toContain("Real Numbers");
  });

  it("single topic is NOT the weak area: names the TRUE weak topic + one-tap remedy (never 'grade a worksheet first')", () => {
    useAuthMock.mockReturnValue(signedIn);
    // The weak area is Circles, but the default selected topic is Real Numbers.
    seedMistakes([{ topic: "circles", subject: "Maths", totalMarks: 3, marksLost: 6 }]);
    const { getByTestId } = render(
      <MemoryRouter>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    const mi = getByTestId("mi-enrich-box");
    // It must NAME the real weak area, not falsely claim the student has no MI data.
    expect(mi.textContent).toMatch(/your weak area is/i);
    expect(mi.textContent).toContain("Circles");
    expect(mi.textContent).not.toMatch(/grade a worksheet or use check/i);
    // A one-tap remedy (button), not a live enrich toggle.
    const cta = mi.querySelector("button.lt-ws__mi-cta");
    expect(cta).not.toBeNull();
    expect(cta?.textContent).toMatch(/Focus on Circles/i);
    expect(mi.querySelector("input.lt-ws__mi-check")).toBeNull();
  });

  it("the one-tap remedy focuses the worksheet on the real weak topic", () => {
    useAuthMock.mockReturnValue(signedIn);
    seedMistakes([{ topic: "circles", subject: "Maths", totalMarks: 3, marksLost: 6 }]);
    const { getByTestId } = render(
      <MemoryRouter>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    const mi = getByTestId("mi-enrich-box");
    fireEvent.click(mi.querySelector("button.lt-ws__mi-cta")!);
    // After switching to Circles it becomes the selected topic → its own weak area.
    const after = getByTestId("mi-enrich-box");
    expect(after.textContent).not.toMatch(/your weak area is/i);
  });

  it("(2b) topic IS a weak area but only unknown-band loss: 'already targets it', locked, no toggle", () => {
    useAuthMock.mockReturnValue(signedIn);
    // Real Numbers (default topic) has loss, but from a non-band totalMarks (unknown section).
    seedMistakes([{ topic: "real-numbers", subject: "Maths", totalMarks: 0, marksLost: 4 }]);
    const { getByTestId } = render(
      <MemoryRouter>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    const mi = getByTestId("mi-enrich-box");
    expect(mi.className).toContain("locked");
    expect(mi.textContent).toMatch(/already targets it/i);
    expect(mi.textContent).toContain("Real Numbers");
    expect(mi.querySelector("input.lt-ws__mi-check")).toBeNull(); // never a section toggle with no signal
  });

  it("(3a) multi-topic: the cross-topic toggle names the weakest IN-SCOPE topic (scope-relative)", () => {
    useAuthMock.mockReturnValue(signedIn);
    seedMistakes([{ topic: "circles", subject: "Maths", totalMarks: 3, marksLost: 5 }]);
    const { getByText, getAllByText, getByTestId } = render(
      <MemoryRouter>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    fireEvent.click(getByText("Customise")); // open the drawer (scope control lives there)
    fireEvent.click(getByText("Multi-topic")); // switch scope → seeds multiTopics=[Real Numbers]
    // Add the weak topic (click its drawer CHIP, not the MI-box mention).
    fireEvent.click(getAllByText("Circles").find((el) => el.classList.contains("lt-ws__chip"))!);
    const mi = getByTestId("mi-enrich-box");
    expect(mi.className).not.toContain("locked");
    expect(mi.querySelector("input.lt-ws__mi-check")).not.toBeNull(); // live cross-topic toggle
    expect(mi.textContent).toMatch(/weight toward/i);
    expect(mi.textContent).toContain("Circles");
  });

  it("(3b) multi-topic excluding the weak area: names it + one-tap 'Add {topic}', then it enriches", () => {
    useAuthMock.mockReturnValue(signedIn);
    seedMistakes([{ topic: "triangles", subject: "Maths", totalMarks: 3, marksLost: 5 }]);
    const { getByText, getAllByText, getByTestId } = render(
      <MemoryRouter>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    fireEvent.click(getByText("Customise"));
    fireEvent.click(getByText("Multi-topic")); // multiTopics=[Real Numbers]
    // Add a NON-weak 2nd topic so the weak area (Triangles) is out of the selection.
    fireEvent.click(getAllByText("Polynomials").find((el) => el.classList.contains("lt-ws__chip"))!);
    const mi = getByTestId("mi-enrich-box");
    expect(mi.textContent).toMatch(/your weak area is/i);
    expect(mi.textContent).toContain("Triangles");
    const add = mi.querySelector("button.lt-ws__mi-cta");
    expect(add?.textContent).toMatch(/Add Triangles/i);
    expect(mi.querySelector("input.lt-ws__mi-check")).toBeNull();
    // The one-tap Add brings Triangles into scope → it becomes the in-scope weak topic (3a).
    fireEvent.click(add!);
    expect(getByTestId("mi-enrich-box").textContent).toMatch(/weight toward/i);
  });
});

describe("WorksheetGenerator — Preview step + view-aware Back", () => {
  it("Build → Preview → Generate lands on the ready view; Back returns to the builder", () => {
    const { getByText, getAllByText, queryByText } = render(
      <MemoryRouter>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    expect(getByText(/Board exam mix ·/)).toBeTruthy();

    fireEvent.click(getAllByText(/Preview worksheet/i)[0]);
    expect(getByText(/Here.s what will be generated/)).toBeTruthy();

    fireEvent.click(getByText(/Generate worksheet/i));
    expect(getByText("Back to generator")).toBeTruthy();
    expect(queryByText(/Here.s what will be generated/)).toBeNull();

    fireEvent.click(getByText("Back to generator"));
    expect(getByText(/Board exam mix ·/)).toBeTruthy();
  });
});
