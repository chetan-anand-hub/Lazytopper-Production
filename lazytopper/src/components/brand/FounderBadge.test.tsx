import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import FounderBadge, { FOUNDER_BADGE_TEXT } from "./FounderBadge";

afterEach(() => cleanup());

describe("FounderBadge", () => {
  it("renders the exact owner-ruled wording in both tones", () => {
    for (const tone of ["light", "dark"] as const) {
      const { container, unmount } = render(<FounderBadge tone={tone} />);
      expect(container.textContent).toBe("Made by an IITian (IIT Kanpur)");
      expect(container.querySelector(".lt-founder-badge--" + tone)).not.toBeNull();
      expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
      expect(container.querySelector("a")).toBeNull();
      unmount();
    }
  });

  it("never says alumnus or implies IIT endorsement", () => {
    const { container } = render(<FounderBadge tone="dark" />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/alumn/i);
    expect(text).not.toMatch(/approved|endorsed|affiliated|official/i);
    const src = readFileSync(resolve(__dirname, "FounderBadge.tsx"), "utf8");
    expect(src).not.toMatch(/alumn/i);
    expect(FOUNDER_BADGE_TEXT).toBe("Made by an IITian (IIT Kanpur)");
  });
});

describe("FounderBadge in llms.txt", () => {
  it("llms.txt names the founder line without alumnus wording", () => {
    const llms = readFileSync(resolve(__dirname, "..", "..", "..", "public", "llms.txt"), "utf8");
    expect(llms).toContain("LazyTopper is made by an IITian (IIT Kanpur).");
    expect(llms).not.toMatch(/alumn/i);
  });
});
