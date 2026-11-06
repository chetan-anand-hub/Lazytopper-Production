import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import NcertHubLink, { NCERT_HUB_LINK_CSS } from "../components/ncert/NcertHubLink";
import { StepsLockedStyleInline } from "../components/practice/StepsLockedNote";
import { STEPS_LOCKED_CSS } from "../components/practice/stepsLockedCss";

/**
 * HPQ-CLS-1 (found on #1612) - on the prerendered Important Questions pages, the NCERT Hub link and the locked-steps note were
 * styled by ROUTE-CHUNK stylesheets, which arrive after the prerendered HTML paints: both painted unstyled, then moved
 * (CLS up to 0.064 at 1280 px). Their rules now render WITH the markup (the #1607 pattern), so the prerendered body carries them.
 */
const ROOT = process.cwd();
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

describe("HPQ-CLS-1 - no late stylesheet behind the Important Questions page's first paint", () => {
  it("the NCERT Hub link renders its own rules and imports no stylesheet", () => {
    const { container } = render(
      <MemoryRouter>
        <NcertHubLink subject="Maths" topic="probability" />
      </MemoryRouter>,
    );
    expect(container.querySelector("[data-testid=ncert-hub-link] style")?.textContent).toBe(NCERT_HUB_LINK_CSS);
    expect(NCERT_HUB_LINK_CSS).toMatch(/\.lt-nhl \{/);
    expect(read("src/components/ncert/NcertHubLink.tsx")).not.toMatch(/import\s+"[^"]*\.css"/);
    expect(existsSync(resolve(ROOT, "src/components/ncert/ncertHubLink.css"))).toBe(false);
  });

  it("the locked-steps rules come from ONE string; the page writes them once into its body", () => {
    const { container } = render(<StepsLockedStyleInline />);
    expect(container.querySelector("style")?.textContent).toBe(STEPS_LOCKED_CSS);
    expect(STEPS_LOCKED_CSS).toMatch(/\.lt-steps-locked \{/);
    expect(STEPS_LOCKED_CSS).toMatch(/\.lt-show-all \{/);
    expect(read("src/components/practice/StepsLockedNote.tsx")).not.toMatch(/import\s+"[^"]*\.css"/);
    expect(existsSync(resolve(ROOT, "src/components/practice/StepsLockedNote.css"))).toBe(false);
    const hpq = read("src/pages/HighlyProbableQuestions.tsx");
    expect(hpq.match(/<StepsLockedStyleInline \/>/g)).toHaveLength(1);
  });

  it("CONTROL - a component that still imports a stylesheet is caught", () => {
    expect('import "./x.css";\nexport default 1;').toMatch(/import\s+"[^"]*\.css"/);
  });
});
