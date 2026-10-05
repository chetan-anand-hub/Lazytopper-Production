// CBQ-ENTRY-1 (E5) — the landing's second hero button, "Practise CBQs", beside "Check my
// answer" in the P7 block, opening the Practice Hub's CBQ chooser (/practice-hub?cbq=1).
//
// The landing is ONE responsive DOM (no width read in JS — Welcome.tsx header), so the
// same two buttons are the 390 and the 1440 page; the matchMedia state is varied anyway
// so a future width branch cannot drop one silently. Layout (side by side at 1440,
// wrapping below at 390) is CSS and is proven by the lane's screenshots; the rule that
// makes it is asserted here.

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";
import Welcome from "./Welcome";

afterEach(cleanup);

function renderLanding(desktop: boolean): HTMLElement {
  setMatchMediaMatches(desktop);
  return render(
    <MemoryRouter>
      <Welcome />
    </MemoryRouter>,
  ).container;
}

describe("CBQ-ENTRY-1 (E5) — the landing's 'Practise CBQs' button", () => {
  it.each([
    ["390", false],
    ["1440", true],
  ])("★ (f) at %s: both buttons in the hero CTA block; 'Practise CBQs' → /practice-hub?cbq=1", (_w, desktop) => {
    const container = renderLanding(desktop);
    const block = container.querySelector(".lt-landing-hero .lt-landing-hcta");
    expect(block, "the P7 CTA block is missing").not.toBeNull();
    const links = Array.from(block!.querySelectorAll("a"));
    expect(links.map((a) => a.textContent)).toEqual(["Check my answer", "Practise CBQs"]);
    const cbq = links[1];
    expect(cbq.getAttribute("href")).toBe("/practice-hub?cbq=1");
    // The same .btn as "Check my answer" (same size), in its outlined variant.
    expect(cbq.className).toBe("btn line");
    expect(links[0].className).toBe("btn solid");
  });

  it("it is the ONLY 'Practise CBQs' on the page — nothing else on the landing changed", () => {
    const container = renderLanding(false);
    const all = Array.from(container.querySelectorAll("a")).filter((a) => a.textContent === "Practise CBQs");
    expect(all).toHaveLength(1);
    // The three primary 'Check my answer' CTAs are still the only solid buttons.
    expect(container.querySelectorAll("a.btn.solid")).toHaveLength(3);
  });

  it("the CTA block wraps (the second button drops below on a narrow phone)", () => {
    const container = renderLanding(false);
    const css = Array.from(container.querySelectorAll("style")).map((s) => s.textContent ?? "").join("\n");
    expect(css).toContain(".lt-landing-hcta{margin-top:24px;display:flex;flex-wrap:wrap;gap:10px}");
    expect(css).toContain(".lt-landing .btn.line{");
  });
});
