/**
 * PACK-PREVIEW-1 - a pack with no preview set: the pop-up says so honestly, draws no image, and has just the "What you get" slide.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "u1" }, loading: false }) }));
vi.mock("../components/packs/PackSampleLink", () => ({ default: () => <a href="/sample">See a free sample</a> }));
vi.mock("../lib/packs/packPreviews", async (orig) => ({ ...(await orig<typeof import("../lib/packs/packPreviews")>()), packPreviewFor: () => null }));

import PackDialog from "./PackDialog";
import { PREVIEW_FALLBACK_CAPTION } from "../lib/packs/packPreviews";

afterEach(() => cleanup());

describe("PackDialog without a preview set", () => {
  it("shows the honest fallback caption and no preview image", () => {
    render(
      <MemoryRouter>
        <PackDialog sku="pack_mock" chapter="" subject="maths" onChapter={vi.fn()} onSubject={vi.fn()} questions={null} buy={<button type="button">Buy</button>} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(document.querySelectorAll(".lt-pkd__slide img")).toHaveLength(0);
    expect(document.querySelectorAll(".lt-pkd__slide")).toHaveLength(1);
    expect(screen.getByTestId("pack-preview-caption").textContent).toBe(PREVIEW_FALLBACK_CAPTION);
    expect(PREVIEW_FALLBACK_CAPTION).not.toMatch(/premium|refund/i);
  });
});
