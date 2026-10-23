import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import ShareCard from "./ShareCard";
import { buildShareCardModel, type ShareSize } from "./shareCardModel";
import { ALL_SHARE_FIXTURES, FX_ALL_ZERO, FX_FOUR_TYPES, FX_OBJECTIVE_ONLY, FX_PENDING, numbersCarriedBy } from "../../../test/shareFixtures";

/** SHARE-CARD-1 - the share image's DOM (drawn off-screen, then turned into a PNG). */
afterEach(cleanup);

const DATE = "23 Oct 2026";
const SIZES: ShareSize[] = ["story", "square"];

/** The words drawn on the image: the card's text without its <style> block. */
function visibleText(root: Element): string {
  const clone = root.cloneNode(true) as Element;
  clone.querySelectorAll("style").forEach((s) => s.remove());
  return clone.textContent ?? "";
}

function card(v: Parameters<typeof buildShareCardModel>[0], over: Partial<Parameters<typeof buildShareCardModel>[1]> = {}) {
  const model = buildShareCardModel(v, { dateLabel: DATE, ...over });
  if (!model) throw new Error("fixture not shareable");
  return render(<ShareCard model={model} qrDataUrl="data:image/png;base64,iVBORw0KGgo=" />);
}

describe("ShareCard - no number that the scorecard does not carry", () => {
  for (const [name, v] of Object.entries(ALL_SHARE_FIXTURES)) {
    for (const size of SIZES) {
      it(`${name} / ${size}`, () => {
        const { container } = card(v, { size });
        const text = visibleText(container.querySelector("[data-testid=share-card]")!);
        const allowed = new Set<number>([...numbersCarriedBy(v), 10 /* Class 10 */, 23, 2026 /* the date */]);
        const found = (text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
        expect(found.filter((n) => !allowed.has(n))).toEqual([]);
        expect(text).not.toContain("½");
      });
    }
  }
});

describe("ShareCard - content", () => {
  it("shows the four MI types with count and marks lost, 0s honestly, and the biggest loss", () => {
    card(FX_FOUR_TYPES);
    expect(screen.getByTestId("share-row-silly").textContent).toBe("Silly slipBiggest loss3 mistakes3 marks");
    expect(screen.getByTestId("share-row-calculation").textContent).toBe("Calculation slip1 mistake0.5 marks");
    expect(screen.getByTestId("share-row-unattempted").textContent).toContain("0.5 marks");
    cleanup();
    card(FX_ALL_ZERO);
    for (const t of ["conceptual", "calculation", "silly", "presentation"]) {
      expect(screen.getByTestId(`share-row-${t}`).textContent).toMatch(/0 mistakes0 marks$/);
    }
  });
  it("objective-only: right / wrong + one MI line, no type rows", () => {
    card(FX_OBJECTIVE_ONLY);
    expect(screen.getByTestId("share-objective").textContent).toBe("3Right2Wrong");
    expect(screen.queryByTestId("share-row-silly")).toBeNull();
    expect(screen.getByTestId("share-byte-line").textContent).toMatch(/Tap answers show what you chose, not why/);
  });
  it("pending questions never appear", () => {
    const { container } = card(FX_PENDING);
    expect(visibleText(container)).not.toMatch(/17|pending|not graded/i);
  });
  it("Ziggy (with the score) and Byte (with the tip) are REAL rig poses, in separate panels", () => {
    card(FX_FOUR_TYPES);
    const z = screen.getByTestId("share-mascot-ziggy");
    const b = screen.getByTestId("share-mascot-byte");
    expect(z.closest("[data-testid=share-panel-score]")).not.toBeNull();
    expect(b.closest("[data-testid=share-panel-tip]")).not.toBeNull();
    expect(z.getAttribute("data-pose")).toBe("determined");
    expect(z.querySelector("svg[data-kind=ziggy]")).not.toBeNull();
    expect(b.querySelector("svg[data-kind=byte]")).not.toBeNull();
  });
  it("'Show Byte & Ziggy' off: no mascots, the tip stays", () => {
    card(FX_FOUR_TYPES, { showMascots: false });
    expect(screen.queryByTestId("share-mascot-ziggy")).toBeNull();
    expect(screen.queryByTestId("share-mascot-byte")).toBeNull();
    expect(screen.getByTestId("share-byte-line").textContent).toMatch(/Silly slips cost 3 marks/);
  });
  it("first name OFF by default; shown only when passed", () => {
    card(FX_FOUR_TYPES);
    expect(screen.queryByTestId("share-first-name")).toBeNull();
    cleanup();
    card(FX_FOUR_TYPES, { firstName: "Aarav" });
    expect(screen.getByTestId("share-first-name").textContent).toBe("Aarav's result");
  });
  it("brand + public link + QR; no surface code, no email", () => {
    const { container } = card(FX_PENDING);
    expect(visibleText(container)).toContain("lazytopper.com");
    expect(screen.getByTestId("share-qr")).not.toBeNull();
    expect(visibleText(container)).not.toMatch(/CI-M-TR-01|@/);
  });
  it("story and square sizes", () => {
    card(FX_FOUR_TYPES, { size: "story" });
    expect(screen.getByTestId("share-card").getAttribute("data-size")).toBe("story");
    cleanup();
    card(FX_FOUR_TYPES, { size: "square" });
    expect(screen.getByTestId("share-card").getAttribute("data-size")).toBe("square");
  });
});
