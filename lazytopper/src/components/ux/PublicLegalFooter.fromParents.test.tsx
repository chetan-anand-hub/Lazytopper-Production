/**
 * PARENTS-NAV-1 — PublicLegalFooter's optional `fromParents` prop.
 *
 * Default (every page but /for-parents): the hrefs are EXACTLY what they were before this lane.
 * With `fromParents` (set only by /for-parents): every in-app link carries `from=for_parents`,
 * merged into any existing query (the CBSE link's `returnTo`); the /for-parents self-link and the
 * external social links are untouched.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import PublicLegalFooter from "./PublicLegalFooter";
import { FOOTER_SOCIAL } from "../../config/socialProfiles";

afterEach(cleanup);

function footerHrefs(entry: string, fromParents?: boolean): Record<string, string> {
  render(
    <MemoryRouter initialEntries={[entry]}>
      {fromParents === undefined ? <PublicLegalFooter /> : <PublicLegalFooter fromParents={fromParents} />}
    </MemoryRouter>,
  );
  const foot = screen.getByRole("contentinfo", { name: "Legal" });
  const out: Record<string, string> = {};
  for (const a of within(foot).getAllByRole("link")) out[a.textContent ?? ""] = a.getAttribute("href") ?? "";
  cleanup();
  return out;
}

/** The footer's in-app links before PARENTS-NAV-1, on a page at `/pricing`. */
const DEFAULT_AT_PRICING: Record<string, string> = {
  Chapters: "/exam-trends",
  "CBSE 2027": "/cbse/class-10?returnTo=%2Fpricing",
  "How CBSE marks answers": "/check-your-answer",
  "For parents": "/for-parents",
  Privacy: "/legal/privacy",
  Terms: "/legal/terms",
  "Cancellation & Refunds": "/legal/refund",
  Contact: "/contact",
};

describe("PARENTS-NAV-1 — PublicLegalFooter fromParents", () => {
  it("default behaviour is unchanged (no prop, and fromParents={false})", () => {
    for (const hrefs of [footerHrefs("/pricing"), footerHrefs("/pricing", false)]) {
      for (const [label, href] of Object.entries(DEFAULT_AT_PRICING)) expect(hrefs[label], label).toBe(href);
      expect(Object.values(hrefs).some((h) => h.includes("from="))).toBe(false);
    }
  });

  it("with fromParents on /for-parents, every in-app link carries from=for_parents", () => {
    const hrefs = footerHrefs("/for-parents", true);
    expect(hrefs).toMatchObject({
      Chapters: "/exam-trends?from=for_parents",
      "CBSE 2027": "/cbse/class-10?returnTo=%2Ffor-parents&from=for_parents",
      "How CBSE marks answers": "/check-your-answer?from=for_parents",
      Privacy: "/legal/privacy?from=for_parents",
      Terms: "/legal/terms?from=for_parents",
      "Cancellation & Refunds": "/legal/refund?from=for_parents",
      Contact: "/contact?from=for_parents",
    });
    // The self-link stays the plain canonical path; it is already the parents page.
    expect(hrefs["For parents"]).toBe("/for-parents");
  });

  it("the external social links are identical with and without the prop", () => {
    const plain = footerHrefs("/for-parents");
    const flagged = footerHrefs("/for-parents", true);
    expect(FOOTER_SOCIAL.length).toBeGreaterThan(0);
    for (const { label, href } of FOOTER_SOCIAL) {
      expect(plain[label]).toBe(href);
      expect(flagged[label]).toBe(href);
    }
  });
});
