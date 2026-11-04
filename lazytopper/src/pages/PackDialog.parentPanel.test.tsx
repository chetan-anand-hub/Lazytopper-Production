/**
 * PACK-DIALOG-1 (owner, 4 Nov 15:05: "complete empty on the left side!") - in the pack pop-up, an opened "Ask a parent to pay"
 * / "Pay by QR code" panel is NEVER inside the sticky footer (a sticky white box taller than the scroller covered the title and
 * the slides). It renders in the dialog's own full-width slot below the footer, in normal flow, and its heading takes focus.
 * On desktop the footer is not sticky at all. The preview strip says plainly that its pages are from a Maths Chapter Pack.
 * Everywhere else (no host) the panel stays where it always was.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

vi.mock("../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../analytics/analytics")>();
  return { ...actual, trackPaywallAction: vi.fn() };
});
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "u1" }, loading: false }) }));
vi.mock("../components/packs/PackSampleLink", () => ({ default: () => <a href="/sample">See a free sample</a> }));

import PackDialog, { PREVIEW_CAPTION } from "./PackDialog";
import { FORWARD_LABEL, QR_LABEL } from "../components/pricing/PaywallActions";
import {
  PARENT_SHARE_HEADING,
  PaywallActionsView,
  dataUrlToBlob,
  type ParentShareDeps,
} from "../components/pricing/PaywallActionsView";
import type { MintedParentLink } from "../services/parentPay";
import type { PackSku } from "../services/packs";

const here = path.dirname(fileURLToPath(import.meta.url));
/** 4 Nov 2026 10:00 UTC; the link expires 72 h later (fixed strings: no clock in this test). */
const NOW = 1793786400000;
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const MINTED: MintedParentLink = {
  token: "T".repeat(43),
  expiresAt: "2026-11-07T10:00:00.000Z",
  prices: { month: null, till_boards: null },
  pack: { sku: "pack_cbq", target: "science", priceInr: 199 },
};

function deps(): ParentShareDeps {
  return {
    mint: vi.fn(async () => MINTED),
    loadCheckedCount: vi.fn(async () => null),
    makeQr: vi.fn(async () => ({ dataUrl: PNG, blob: dataUrlToBlob(PNG) })),
    nav: undefined,
    origin: "https://www.lazytopper.com",
    base: "/",
    now: () => NOW,
    openWindow: vi.fn(() => ({ opener: {} as unknown })),
    copyText: vi.fn(async () => undefined),
    download: vi.fn(),
  };
}

function dialog(sku: PackSku = "pack_cbq", chapter = "") {
  const buy = (
    <>
      <button type="button" className="lt-pkd__btn">Buy for ₹199</button>
      <PaywallActionsView
        surface="pricing"
        showParent
        product={{ kind: "pack", sku, ...(sku === "pack_bundle" ? {} : { target: chapter || "science" }), name: "Science CBQ Pack" }}
        deps={deps()}
      />
    </>
  );
  return render(
    <MemoryRouter>
      <PackDialog
        sku={sku}
        chapter={chapter}
        subject="science"
        onChapter={vi.fn()}
        onSubject={vi.fn()}
        questions={null}
        buy={buy}
        onClose={vi.fn()}
      />
    </MemoryRouter>,
  );
}

async function tap(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
}

/** The dialog's direct children, by class: the structure the layout rests on. */
function structure(): string[] {
  return Array.from(screen.getByTestId("pack-dialog").children).map((el) => el.className);
}

afterEach(cleanup);

describe("PACK-DIALOG-1 · the parent panel leaves the sticky footer", () => {
  it("collapsed: head, slides, caption, footer, and an EMPTY share slot after the footer", () => {
    dialog();
    expect(structure()).toEqual([
      "lt-pkd__grab",
      "lt-pkd__head",
      "lt-pkd__stage",
      "lt-pkd__dots",
      "lt-pkd__samplecap",
      "lt-pkd__sr",
      "lt-pkd__foot",
      "lt-pkd__share",
    ]);
    expect(screen.getByTestId("pack-parent-share-slot").children).toHaveLength(0);
    expect(screen.queryByTestId("parent-share-panel")).toBeNull();
  });

  it.each([FORWARD_LABEL, QR_LABEL])("'%s' opens the panel in the full-width slot, NOT inside the footer, and focuses its heading", async (label) => {
    dialog();
    await tap(label);
    const panel = screen.getByTestId("parent-share-panel");
    const foot = document.querySelector(".lt-pkd__foot") as HTMLElement;
    expect(foot.contains(panel)).toBe(false);
    expect(panel.closest(".lt-pkd__buy")).toBeNull();
    expect(panel.parentElement).toBe(screen.getByTestId("pack-parent-share-slot"));
    expect(panel.className).toBe("lt-parent-share-sheet lt-parent-share-sheet--wide");
    // The buttons stay in the buy column.
    expect(foot.contains(screen.getByRole("button", { name: label }))).toBe(true);
    const heading = screen.getByTestId("parent-share-heading");
    expect(heading.textContent).toBe(PARENT_SHARE_HEADING);
    expect(document.activeElement).toBe(heading);
    expect(structure()).toEqual([
      "lt-pkd__grab",
      "lt-pkd__head",
      "lt-pkd__stage",
      "lt-pkd__dots",
      "lt-pkd__samplecap",
      "lt-pkd__sr",
      "lt-pkd__foot",
      "lt-pkd__share",
    ]);
  });

  it("the message is the same text, whole, with the language toggle, the send actions and the privacy line", async () => {
    dialog();
    await tap(FORWARD_LABEL);
    const panel = screen.getByTestId("parent-share-panel");
    expect(screen.getByTestId("parent-share-message").textContent).toContain("Science CBQ Pack");
    expect(screen.getByTestId("parent-share-message").textContent).toContain("₹199");
    expect(panel.querySelector(".lt-parent-share-lang")).not.toBeNull();
    expect(screen.getByTestId("parent-share-whatsapp")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy link" })).toBeTruthy();
    expect(panel.textContent).toContain("LazyTopper never sees or stores their number.");
  });

  it("the buy card carries the price, then the picker, Buy and the parent actions", () => {
    dialog("pack_chapter", "polynomials");
    const card = screen.getByTestId("pack-buy-card");
    expect(card.querySelector(".lt-pkd__cardprice")?.textContent).toContain("one-time");
    expect(card.contains(screen.getByTestId("pack-chapter-select"))).toBe(true);
    expect(card.contains(screen.getByRole("button", { name: FORWARD_LABEL }))).toBe(true);
  });

  it("the Chapter Pack (picker on the left) behaves the same", async () => {
    dialog("pack_chapter", "polynomials");
    await tap(FORWARD_LABEL);
    const panel = screen.getByTestId("parent-share-panel");
    expect((document.querySelector(".lt-pkd__foot") as HTMLElement).contains(panel)).toBe(false);
    expect(screen.getByTestId("pack-chapter-select").closest(".lt-pkd__pick")).not.toBeNull();
  });

  it("no host (every other surface): the panel stays in place with no heading, exactly as before", async () => {
    render(
      <MemoryRouter>
        <PaywallActionsView surface="lock" onPay={vi.fn()} showParent deps={deps()} />
      </MemoryRouter>,
    );
    await tap(FORWARD_LABEL);
    const panel = screen.getByTestId("parent-share-panel");
    expect(panel.parentElement).toBe(screen.getByTestId("paywall-actions"));
    expect(panel.className).toBe("lt-parent-share-sheet");
    expect(screen.queryByTestId("parent-share-heading")).toBeNull();
  });
});

describe("PACK-DIALOG-1 · honest previews", () => {
  it("the strip says its pages are from a Maths Chapter Pack", () => {
    dialog();
    expect(screen.getByTestId("pack-preview-caption").textContent).toBe(PREVIEW_CAPTION);
    expect(PREVIEW_CAPTION).toBe("Sample pages from a Maths Chapter Pack — your pack has the same layout");
  });
});

describe("PACK-DIALOG-1 · the CSS: nothing sticky over the content", () => {
  const css = readFileSync(path.join(here, "packsDialog.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const desktop = css.slice(css.indexOf("@media (min-width: 640px)"));

  it("only the phone footer is sticky; the share slot never is", () => {
    const stickyRules = css.match(/[^{}]+\{[^}]*position:\s*sticky[^}]*\}/g) ?? [];
    // The phone footer (Buy row), and from 900px only the small close button - never anything holding the parent panel.
    expect(stickyRules.map((r) => r.slice(0, r.indexOf("{")).trim())).toEqual([".lt-pkd__foot", ".lt-pkd__x"]);
    expect(css).not.toMatch(/\.lt-pkd__share[^{]*\{[^}]*sticky/);
  });

  it(">= 900px: two columns - slides left, the buy card right (top of its column), the parent panel across both", () => {
    const wide = css.slice(css.indexOf("@media (min-width: 900px)"));
    expect(wide).toMatch(/\.lt-pkd__panel\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(0, 1fr\) 300px;/);
    expect(wide).toMatch(/\.lt-pkd__foot\s*\{[^}]*grid-column:\s*2;[^}]*align-self:\s*start;/);
    expect(wide).toMatch(/\.lt-pkd__share\s*\{[^}]*grid-column:\s*1 \/ -1;/);
    expect(wide.match(/[^{}]+\{[^}]*sticky[^}]*\}/g)?.map((r) => r.slice(0, r.indexOf("{")).trim())).toEqual([".lt-pkd__x"]);
    expect(wide).toMatch(/\.lt-pkd__foot\s*\{[^}]*min-width:\s*0;/);
  });

  it("on desktop the footer is not sticky", () => {
    expect(desktop).toMatch(/\.lt-pkd__foot\s*\{\s*position:\s*static;/);
  });
});
