// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Cbse2027Page from "./Cbse2027Page";
import {
  CBSE_CIRCULARS,
  CBSE_SUBJECTS,
  CBSE_THEORY_MARKS,
  CBSE_TRAPS,
  daysUntilMainExam,
} from "./cbse2027Sources";
import { SELF_CANONICAL_EXACT } from "../config/canonicalUrl";
import { sitemapPaths } from "../config/sitemapUrls";
import { STATIC_PAGE_HEADS } from "../../scripts/seo/writeStaticHeads";

/**
 * GUARD — the CBSE 2027 page (`/cbse-2027`), CBSE-PAGE-1.
 *
 * ★ WHAT THIS FILE EXISTS TO CATCH. Three of this page's properties are
 * invisible to every other gate in the repo, and each has a specific way of
 * regressing silently:
 *
 *   1. ONE COMPONENT, NO WIDTH HOOK (ruling a). `tsc` and the build are perfectly
 *      happy with a `useIsDesktop()` added later. Only a source assertion catches
 *      it — and a source assertion that greps for a string it can never find is
 *      worthless, so the check below is run against a file that DOES use the hook
 *      as its control.
 *   2. "OPEN", NOT "DOWNLOAD", AND NO DOWN-ARROW (ruling b). CBSE serves
 *      `Content-Disposition: inline`; a control saying "Download" describes
 *      something that does not happen. Nothing else in the repo would notice.
 *   3. THE TRAP ANSWERS MUST BE IN THE DOM WHILE CLOSED. This is the page's whole
 *      SEO purpose. A `<details>` swapped for conditional rendering looks
 *      identical to a user and is invisible to a crawler, and every other gate
 *      stays green.
 *
 * ⚠ EVERY NEGATIVE ASSERTION HERE IS PAIRED WITH A PRECONDITION. A test that
 * asserts "no control reads Download" passes vacuously on a page that rendered
 * nothing at all. Each one first proves the subject is really on screen.
 */

const PAGE_SRC = resolve(__dirname, "Cbse2027Page.tsx");
const HOOK_USER_SRC = resolve(__dirname, "MeProgressPage.tsx");

/**
 * ⚠ SOURCE TEXT IS NOT SOURCE CODE. A bare `src.includes("useIsDesktop")` reports
 * a HIT on this page — its header comment explains at length why the hook is
 * forbidden here. A detector that cannot tell a prohibition from a use would fail
 * the moment anyone documented the rule, and would pass on a file that mentioned
 * the hook in a string. Comments are stripped before the check.
 */
function codeOnly(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * ⚠ `textContent` ON A CONTAINER INCLUDES THE INLINE `<style>` BLOCK. This page
 * renders its CSS through `<style>{CBSE_CSS}</style>`, so a naive read of the
 * body text returns every selector and every CSS comment as if it were copy — and
 * a `/Download/i` assertion then fails on the word inside a CSS comment while the
 * rendered page is clean. What a reader (or a crawler) actually sees is the text
 * with the style element removed.
 */
function visibleText(root: HTMLElement): string {
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("style").forEach((node) => node.remove());
  return clone.textContent ?? "";
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/cbse-2027"]}>
      <Routes>
        <Route path="/cbse-2027" element={<Cbse2027Page />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe("ruling (a) — one component at every width, no width hook", () => {
  it("names its subject on every run, green included", () => {
    expect(PAGE_SRC).toMatch(/Cbse2027Page\.tsx$/);
  });

  it("★ uses useIsDesktop zero times — WITH the control that the check can fire", () => {
    const page = codeOnly(readFileSync(PAGE_SRC, "utf8"));
    const control = codeOnly(readFileSync(HOOK_USER_SRC, "utf8"));

    // CONTROL FIRST. If this detector cannot find the hook in a file that
    // demonstrably uses it, its silence on our page proves nothing. MeProgressPage
    // both imports and calls it, so a working detector must see both.
    expect(
      /import\s*\{[^}]*useIsDesktop/.test(control),
      "control file no longer imports useIsDesktop — this detector is now blind",
    ).toBe(true);
    expect(
      /useIsDesktop\s*\(/.test(control),
      "control file no longer CALLS useIsDesktop — this detector is now blind",
    ).toBe(true);

    // The subject: no import, no call. Prose about the rule is not a use.
    expect(/import\s*\{[^}]*useIsDesktop/.test(page)).toBe(false);
    expect(/useIsDesktop\s*\(/.test(page)).toBe(false);
  });

  it("renders the same component tree regardless of viewport width", () => {
    // jsdom has no layout, so width cannot be simulated meaningfully here; what
    // CAN be proved is that nothing in the component reads a width at all.
    const page = codeOnly(readFileSync(PAGE_SRC, "utf8"));
    expect(page).not.toMatch(/window\.(innerWidth|matchMedia)/);
    expect(page).not.toMatch(/useMediaQuery/);
  });
});

describe("ruling (b) — links open, they do not download", () => {
  it("★ no control reads Download and none carries a down-arrow", () => {
    const { container } = renderPage();

    // PRECONDITION: the source rows really rendered. Without this the two
    // negative assertions below would pass on an empty page.
    const openLabels = screen.getAllByText("Open");
    expect(openLabels.length).toBeGreaterThan(0);

    // CONTROL: the reader excludes <style>, and the page really does have one —
    // so this is the text a person sees, not the stylesheet.
    expect(container.querySelector("style")).toBeTruthy();
    const body = visibleText(container);
    expect(body).toContain("Free papers from CBSE");

    expect(body).not.toMatch(/Download/i);
    expect(body).not.toContain("↓");
    expect(body).not.toContain("⤓");
  });

  it("no source link carries a download attribute, and all open in a new tab", () => {
    const { container } = renderPage();
    const external = Array.from(container.querySelectorAll('a[href^="https://"]'));

    expect(external.length).toBeGreaterThan(0);
    for (const anchor of external) {
      expect(anchor.hasAttribute("download"), `${anchor.getAttribute("href")} has download`).toBe(
        false,
      );
      expect(anchor.getAttribute("target")).toBe("_blank");
      expect(anchor.getAttribute("rel")).toContain("noopener");
    }
  });

  it("says in its own copy that the links open on CBSE's site", () => {
    renderPage();
    // Two places say it: the papers lede and the page footer. Both must survive.
    expect(screen.getAllByText(/opens the original file on/i).length).toBeGreaterThan(0);
  });
});

describe("ruling (c) — hand-rolled CSS bars, no chart library", () => {
  it("imports no charting library", () => {
    const page = readFileSync(PAGE_SRC, "utf8");
    expect(page).not.toMatch(/from ["']recharts["']/);
    expect(page).not.toMatch(/from ["']chart\.js["']/);
    expect(page).not.toMatch(/from ["']d3["']/);
  });
});

describe("the subject switcher", () => {
  it("★ swaps CONTENT, not just a class — Maths 20 for Algebra, Science 25 for Chemical Substances", async () => {
    const user = userEvent.setup();
    renderPage();

    const science = screen.getByRole("tab", { name: "Science" });
    const maths = screen.getByRole("tab", { name: "Maths" });

    // Science is the opening subject.
    expect(science.getAttribute("aria-selected")).toBe("true");
    const sciencePanel = screen.getByRole("tabpanel");
    expect(within(sciencePanel).getByText("Question bank")).toBeTruthy();

    const scienceChart = screen.getByText("Chemical Substances").closest(".lt-cbse__mrow");
    expect(within(scienceChart as HTMLElement).getByText("25")).toBeTruthy();

    await user.click(maths);

    expect(maths.getAttribute("aria-selected")).toBe("true");
    expect(science.getAttribute("aria-selected")).toBe("false");

    // The visible panel is now the Maths one — a DIFFERENT list, not a restyle.
    const mathsPanel = screen.getByRole("tabpanel", { hidden: false });
    expect(within(mathsPanel).getByText("Item bank")).toBeTruthy();

    const algebra = screen.getByText("Algebra").closest(".lt-cbse__mrow");
    expect(within(algebra as HTMLElement).getByText("20")).toBeTruthy();
  });

  it("is keyboard-operable — arrow keys move between subjects", async () => {
    const user = userEvent.setup();
    renderPage();

    const science = screen.getByRole("tab", { name: "Science" });
    science.focus();
    expect(document.activeElement).toBe(science);

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Maths" }).getAttribute("aria-selected")).toBe("true");

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Science" }).getAttribute("aria-selected")).toBe("true");
  });

  it("keeps BOTH subjects' source links in the DOM, so a crawler reads all of them", () => {
    const { container } = renderPage();
    const hrefs = Array.from(container.querySelectorAll('a[href^="https://"]')).map((a) =>
      a.getAttribute("href"),
    );

    for (const subject of CBSE_SUBJECTS) {
      for (const paper of subject.papers) {
        expect(hrefs, `${paper.href} is not in the DOM`).toContain(paper.href);
      }
    }
  });
});

describe("★ the trap cards are crawlable", () => {
  it("renders six <details>, and every answer is in the DOM while CLOSED", () => {
    const { container } = renderPage();
    const details = Array.from(container.querySelectorAll("details"));

    expect(details).toHaveLength(6);

    // PRECONDITION: they really are closed. An "answer is present" assertion on
    // an already-open card would prove nothing about the crawler's view.
    for (const node of details) {
      expect(node.hasAttribute("open")).toBe(false);
    }

    const body = visibleText(container);
    expect(body).toContain("Essential Repeat");
    for (const trap of CBSE_TRAPS) {
      for (const paragraph of trap.answer) {
        expect(body, `closed answer missing: ${paragraph.slice(0, 40)}`).toContain(paragraph);
      }
    }
  });

  it("CONTROL — a string that is NOT on the page is reported as absent", () => {
    const { container } = renderPage();
    const body = visibleText(container);
    expect(body).not.toContain("Essential Repeat Is Not A Real Phrase Here");
  });
});

describe("the sources", () => {
  it("links only cbse.gov.in and cbseacademic.nic.in, over https", () => {
    for (const subject of CBSE_SUBJECTS) {
      for (const paper of subject.papers) {
        expect(paper.href).toMatch(
          /^https:\/\/(www\.cbse\.gov\.in|cbseacademic\.nic\.in)\//,
        );
      }
    }
  });

  it("★ ships none of the four dead *VIC* variants CBSE still links from its own index", () => {
    // HEADed live 2026-09-18: all four return 404 with a 624-byte HTML body.
    const dead = [
      "MathsBasicVIC-MS.pdf",
      "MathsBasicVIC-SQP.pdf",
      "MathsStandardVIC-MS.pdf",
      "MathsStandardVIC-SQP.pdf",
    ];
    const all = CBSE_SUBJECTS.flatMap((s) => s.papers.map((p) => p.href));

    // PRECONDITION: there are real Maths sample papers here, so "no VIC" is not
    // vacuously true on an empty or Science-only list.
    expect(all.some((h) => h.includes("MathsStandard-SQP.pdf"))).toBe(true);

    for (const name of dead) {
      expect(all.some((h) => h.includes(name)), `${name} is dead and must not ship`).toBe(false);
    }
  });

  it("unit marks total 80 for both subjects, per the official 2026-27 syllabus", () => {
    for (const subject of CBSE_SUBJECTS) {
      const total = subject.units.reduce((sum, u) => sum + u.marks, 0);
      expect(total, `${subject.label} units do not total ${CBSE_THEORY_MARKS}`).toBe(
        CBSE_THEORY_MARKS,
      );
    }
  });
});

describe("the circular feed — committed data, and no automation claim", () => {
  it("★ makes no claim about update frequency", () => {
    const { container } = renderPage();

    // PRECONDITION: the feed really rendered.
    expect(screen.getByText(CBSE_CIRCULARS[0].title)).toBeTruthy();

    const body = visibleText(container);
    expect(body).not.toMatch(/updated daily/i);
    expect(body).not.toMatch(/every day/i);
    expect(body).not.toMatch(/rebuilt from/i);
    // It states only when it was last checked.
    expect(body).toMatch(/Checked against CBSE.s circulars pages on/);
  });

  it("marks the one row that opens an index rather than a document", () => {
    renderPage();
    const indexRows = CBSE_CIRCULARS.filter((c) => c.source === "index");
    expect(indexRows.length).toBe(1);
    expect(screen.getByText(/on CBSE.s circulars index/)).toBeTruthy();
  });

  it("★ carries the provisioned banner fields WITHOUT surfacing them", () => {
    // Shape for a later lane's Home strip. Declared, deployed nowhere.
    for (const circular of CBSE_CIRCULARS) {
      expect(typeof circular.important).toBe("boolean");
      expect(circular.important, "nothing ships important:true in this lane").toBe(false);
      expect(typeof circular.headline).toBe("string");
      expect(circular.headline.length).toBeGreaterThan(0);
      expect(circular.headline).not.toBe(circular.title);
    }

    // And the page must not render them.
    const { container } = renderPage();
    const body = visibleText(container);
    for (const circular of CBSE_CIRCULARS) {
      expect(body, "a provisioned headline reached the page").not.toContain(circular.headline);
    }
  });
});

describe("the page is advertised", () => {
  it("is self-canonical, in the sitemap, and has its own head entry", () => {
    expect(SELF_CANONICAL_EXACT).toContain("/cbse-2027");
    expect(sitemapPaths()).toContain("/cbse-2027");

    const head = STATIC_PAGE_HEADS["/cbse-2027"];
    expect(head).toBeTruthy();
    expect(head.title).toContain("2027");
    expect(head.description.length).toBeGreaterThan(50);

    // CONTROL — a path that is NOT advertised is reported as absent.
    expect(sitemapPaths()).not.toContain("/cbse-2028");
  });
});

describe("the countdown", () => {
  it("counts down to the assumed main exam and disappears once it is past", () => {
    expect(daysUntilMainExam(new Date(2027, 1, 10))).toBe(7);
    expect(daysUntilMainExam(new Date(2027, 1, 16))).toBe(1);
    expect(daysUntilMainExam(new Date(2027, 1, 18))).toBeNull();
    expect(daysUntilMainExam(new Date(2030, 0, 1))).toBeNull();
  });

  it("hedges the date in the visible copy, because CBSE has not published it", () => {
    renderPage();
    expect(screen.getByText(/if it starts mid-February like last year/)).toBeTruthy();
    expect(screen.getByText(/Date sheet/)).toBeTruthy();
  });
});
