/**
 * SAMPLE-FOLLOWUP-1 - the pack window's free sample is a clear SECOND button next to Buy: a real download link styled as a
 * secondary button (outlined, never the filled Buy), full width, >= 48px, firing pack_sample_download { pack, surface }.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";

const { sampleEvent } = vi.hoisted(() => ({ sampleEvent: vi.fn() }));
vi.mock("../../lib/packs/packAnalytics", () => ({ trackPackSampleDownload: sampleEvent }));

import PackSampleButton from "./PackSampleButton";
import PackDialog from "../../pages/PackDialog";
import { MemoryRouter } from "react-router-dom";

afterEach(() => {
  cleanup();
  sampleEvent.mockClear();
});

describe("PackSampleButton", () => {
  it("is a same-origin download link that fires pack_sample_download { pack, surface } on a tap, with no account", () => {
    render(<PackSampleButton sku="pack_cbq" target="science" surface="packs_dialog" />);
    const a = screen.getByTestId("pack-sample-lazytopper-sample-cbq-science");
    expect(a.tagName).toBe("A");
    expect(a.getAttribute("href")).toBe("/samples/lazytopper-sample-cbq-science.pdf");
    expect(a.hasAttribute("download")).toBe(true);
    expect(a.className).toBe("lt-psbtn");
    expect(a.textContent).toContain("Free sample page");
    fireEvent.click(a);
    expect(sampleEvent).toHaveBeenCalledTimes(1);
    expect(sampleEvent).toHaveBeenCalledWith("pack_cbq:science", "packs_dialog");
  });

  it("renders nothing for a pack without a sample (never a dead button)", () => {
    const { container } = render(<PackSampleButton sku="pack_mock" target="history" surface="packs_dialog" />);
    expect(container.innerHTML).toBe("");
  });

  it("the pack window shows it right after Buy, following the chosen subject (the bundle has one sample)", () => {
    const open = (sku: "pack_mock" | "pack_bundle", subject: "maths" | "science") =>
      render(
        <MemoryRouter>
          <PackDialog sku={sku} chapter="" subject={subject} onChapter={() => {}} onSubject={() => {}} questions={null} buy={<button type="button" className="lt-pkd__btn" data-testid="buy">Buy</button>} onClose={() => {}} />
        </MemoryRouter>,
      );
    open("pack_mock", "science");
    const buy = screen.getByTestId("buy");
    const sample = screen.getByTestId("pack-sample-lazytopper-sample-mock-science");
    expect(sample.className).toBe("lt-psbtn");
    expect(sample.getAttribute("data-surface")).toBe("packs_dialog");
    expect(buy.compareDocumentPosition(sample) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    cleanup();
    open("pack_bundle", "science");
    expect(screen.getByTestId("pack-sample-lazytopper-sample-bundle")).toBeTruthy();
  });
});

describe("styles", () => {
  const css = readFileSync(path.join(process.cwd(), "src/components/packs/packSampleButton.css"), "utf8");
  it("is outlined (Buy stays the filled one), full width, >= 48px tall, and wraps on a narrow phone", () => {
    const rule = css.match(/\.lt-psbtn \{([^}]*)\}/)?.[1] ?? "";
    expect(rule).toMatch(/width:\s*100%/);
    expect(rule).toMatch(/min-height:\s*(4[89]|[5-9]\d)px/);
    expect(rule).toMatch(/background:\s*#fff/);
    expect(rule).not.toMatch(/white-space:\s*nowrap/);
    expect(rule).toMatch(/border:\s*2px solid/);
  });
});
