/**
 * QUICK-FIXES-1 owner follow-up — notes figures (owner's words):
 *   "two separate images for elevation and depression (clearer, and how NCERT presents them)";
 *   "on phones, figures fit the screen width (scale down, never cut off; tap to enlarge if available)".
 *
 * What this pins:
 *   1. FIT — the phone rule that sizes every notes figure to the screen width (viewport less
 *      a 16 px gutter each side, centred, aspect kept). jsdom has no layout, so the rule text
 *      in the note's scoped stylesheet is the assertion; the live widths are measured in the
 *      lane's 390/1440 screenshots.
 *   2. ENLARGE — every asset figure is a button that opens an accessible full-screen view,
 *      closable by tap, ✕, Escape and Back, with focus moved in and trapped.
 *   3. SPLIT — trigonometry carries Fig 9.2 (elevation) and Fig 9.3 (depression) as two
 *      separate figure refs on two concepts, never one combined asset.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { Note } from "./Note";
import { ensureAllNoteSpecs, getNoteSpecForTopic } from "./noteSpecRegistry";

await ensureAllNoteSpecs();

afterEach(cleanup);

const mountNote = (topic: string) => {
  const spec = getNoteSpecForTopic(topic);
  if (!spec) throw new Error("no note spec for " + topic);
  return render(
    <MemoryRouter>
      <Note spec={spec} />
    </MemoryRouter>,
  );
};

const noteCss = (container: HTMLElement): string =>
  Array.from(container.querySelectorAll("style"))
    .map((s) => s.textContent || "")
    .join("\n");

/** The body of the first `@media (max-width: 560px) { … }` block (brace-matched). */
const phoneBlocks = (css: string): string[] => {
  const out: string[] = [];
  const head = "@media (max-width: 560px) {";
  let at = css.indexOf(head);
  while (at !== -1) {
    let depth = 1;
    let i = at + head.length;
    for (; i < css.length && depth > 0; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
    }
    out.push(css.slice(at + head.length, i - 1));
    at = css.indexOf(head, i);
  }
  return out;
};

const tick = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

describe("notes figures fit the phone screen", () => {
  it("every asset figure image keeps its aspect ratio at full card width", () => {
    const { container } = mountNote("circles");
    const imgs = container.querySelectorAll<HTMLImageElement>("img.lt-note__fimg");
    expect(imgs.length).toBeGreaterThan(0);
    const css = noteCss(container);
    expect(css).toMatch(/\.lt-note__fimg \{[^}]*width: 100%;[^}]*height: auto;/);
  });

  it("on phones a figure is sized to the screen width (viewport less 16 px gutters), centred", () => {
    const { container } = mountNote("trigonometry");
    const phone = phoneBlocks(noteCss(container)).join("\n");
    // The figure rule itself.
    const rule = /\.lt-note__figure \{([^}]*)\}/.exec(phone);
    expect(rule, "phone .lt-note__figure rule").not.toBeNull();
    expect(rule![1]).toContain("width: calc(100vw - 32px)");
    expect(rule![1]).toContain("margin-left: calc(50% - 50vw + 16px - var(--lt-note-fig-shift, 0px))");
    // A concept row's number column (28 px) + gap (13 px) is compensated: half of 41 px.
    expect(phone).toMatch(/\.lt-note__concept \.lt-note__figure \{ --lt-note-fig-shift: 20\.5px; \}/);
    // CONTROL: the desktop rule is untouched — outside the phone block the card is not resized.
    const desktop = noteCss(container).split("@media")[0];
    expect(desktop).not.toContain("100vw");
  });
});

describe("tap a notes figure to enlarge it", () => {
  it("each asset figure image sits inside an accessible enlarge button", () => {
    const { container } = mountNote("trigonometry");
    const imgs = Array.from(container.querySelectorAll<HTMLImageElement>("img.lt-note__fimg"));
    expect(imgs.length).toBeGreaterThanOrEqual(3);
    for (const img of imgs) {
      const btn = img.closest("button");
      expect(btn, img.alt).not.toBeNull();
      expect(btn!.className).toContain("lt-note__fzoom");
      expect(btn!.getAttribute("aria-label") || "").toMatch(/^Enlarge figure: /);
    }
  });

  it("opens a full-screen dialog and closes it by ✕, tap, Escape and Back", async () => {
    mountNote("trigonometry");
    const open = () =>
      fireEvent.click(screen.getByRole("button", { name: /Enlarge figure: NCERT Fig\. 9\.2/ }));

    expect(screen.queryByRole("dialog")).toBeNull();

    // ✕ button — focus starts on it.
    open();
    let dialog = screen.getByRole("dialog", { name: /Enlarged figure: NCERT Fig\. 9\.2/ });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const img = within(dialog).getByRole("img");
    // The enlarged image is the same asset as the card's (small SVGs are inlined as data URIs).
    const cardImg = screen
      .getByRole("button", { name: /Enlarge figure: NCERT Fig\. 9\.2/ })
      .querySelector("img");
    expect(img.getAttribute("src")).toBeTruthy();
    expect(img.getAttribute("src")).toBe(cardImg?.getAttribute("src"));
    const close = within(dialog).getByRole("button", { name: "Close enlarged figure" });
    expect(document.activeElement).toBe(close);
    // Tab is trapped inside the dialog.
    fireEvent.keyDown(window, { key: "Tab" });
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent.click(close);
    expect(screen.queryByRole("dialog")).toBeNull();

    // Tap anywhere on the overlay.
    open();
    fireEvent.click(screen.getByRole("dialog"));
    expect(screen.queryByRole("dialog")).toBeNull();

    // Escape.
    open();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();

    // Back (popstate) — the history entry is pushed one tick after opening.
    open();
    await tick();
    expect(screen.getByRole("dialog")).toBeTruthy();
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("trigonometry: elevation and depression are two separate NCERT figures", () => {
  it("Fig 9.2 and Fig 9.3 are separate figure refs on separate concepts", () => {
    const spec = getNoteSpecForTopic("trigonometry");
    if (!spec) throw new Error("no trigonometry spec");
    const refs = spec.concepts.map((c) => c.figure_ref).filter((r): r is string => !!r);
    const elev = spec.concepts.find((c) => c.figure_ref === "fig_angle_of_elevation_92");
    const depr = spec.concepts.find((c) => c.figure_ref === "fig_angle_of_depression_93");
    expect(elev, "a concept references Fig 9.2").toBeTruthy();
    expect(depr, "a concept references Fig 9.3").toBeTruthy();
    expect(elev!.id).not.toBe(depr!.id);
    expect(elev!.title).toMatch(/elevation/i);
    expect(depr!.title).toMatch(/depression/i);
    expect(new Set(refs).size).toBe(refs.length);

    const f92 = spec.figures["fig_angle_of_elevation_92"];
    const f93 = spec.figures["fig_angle_of_depression_93"];
    expect(f92.caption || "").toMatch(/^Fig 9\.2 /);
    expect(f93.caption || "").toMatch(/^Fig 9\.3 /);
    expect(f92.asset).toBe("trigonometry/fig_angle_of_elevation_92.svg");
    expect(f93.asset).toBe("trigonometry/fig_angle_of_depression_93.svg");
    expect(f92.asset).not.toBe(f93.asset);

    // No figure combines the two any more.
    for (const [id, fig] of Object.entries(spec.figures)) {
      const both = /9\.2/.test(`${fig.tag} ${fig.caption}`) && /9\.3/.test(`${fig.tag} ${fig.caption}`);
      expect(both, id).toBe(false);
    }
    // Each has its own source-ledger row.
    const items = spec.source_ledger.map((r) => r.item);
    expect(items).toContain("fig_angle_of_elevation_92");
    expect(items).toContain("fig_angle_of_depression_93");
  });
});
