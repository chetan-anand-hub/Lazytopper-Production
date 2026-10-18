import { describe, it, expect, afterEach } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { CONTACT_TITLE, CONTACT_DESCRIPTION } from "../pages/ContactPage";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import { SELF_CANONICAL_EXACT, canonicalFor, canonicalPathFor, SITE_ORIGIN } from "./canonicalUrl";
import { sitemapPaths } from "./sitemapUrls";
import { STATIC_PAGE_HEADS, ROUTE_CHUNK_MODULES, routeChunkModulesFor } from "../../scripts/seo/writeStaticHeads";

/**
 * CONTACT-INDEX-1 (owner ruling, 18 Oct 2026; closes [FU-CONTACT-INDEX]) — `/contact`
 * (shipped in WA-CONTACT-1, #1215) is a public, indexable page, registered at every point
 * the other static pages (`/for-parents`, `/check-your-answer`, `/legal/*`) are:
 *
 *   (a) self-canonical (`SELF_CANONICAL_EXACT`), so its canonical names itself, not the root;
 *   (b) advertised: `sitemapPaths()`, the GENERATED `public/sitemap.xml`, `public/llms.txt`;
 *   (c) built: a `STATIC_PAGE_HEADS` entry that IS the page's own title/description, and a
 *       `ROUTE_CHUNK_MODULES` preload entry naming `ContactPage`;
 *   (d) served: the Vercel shell rewrite and the committed prerender (both variants, the
 *       manifest and the lastmod ledger);
 *   (e) linked: the shared public footer carries "Contact" -> /contact, beside the legal links.
 */

const ROOT = process.cwd(); // vitest runs with cwd = lazytopper/
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

afterEach(() => cleanup());

describe("CONTACT-INDEX-1 (a) — /contact is self-canonical", () => {
  it("is in SELF_CANONICAL_EXACT and its canonical names itself", () => {
    expect(SELF_CANONICAL_EXACT).toContain("/contact");
    expect(canonicalPathFor("/contact")).toBe("/contact");
    expect(canonicalPathFor("/contact/")).toBe("/contact");
    expect(canonicalFor("/contact", "")).toBe(`${SITE_ORIGIN}/contact`);
  });

  it("CONTROL — an exact path only: a deeper path still falls to the root", () => {
    expect(canonicalPathFor("/contact/anything")).toBe("/");
    expect(canonicalPathFor("/contacts")).toBe("/");
  });
});

describe("CONTACT-INDEX-1 (b) — /contact is advertised", () => {
  it("is in the sitemap set and in the generated sitemap.xml", () => {
    expect(sitemapPaths()).toContain("/contact");
    expect(read("public/sitemap.xml")).toContain(`<loc>${SITE_ORIGIN}/contact</loc>`);
  });

  it("is in llms.txt", () => {
    expect(read("public/llms.txt")).toContain(`- [Contact](${SITE_ORIGIN}/contact):`);
  });
});

describe("CONTACT-INDEX-1 (c) — the build stamps and preloads /contact", () => {
  it("its static head IS the page's own title and description, within the limits", () => {
    const head = STATIC_PAGE_HEADS["/contact"];
    expect(head, "no static head for /contact").toBeDefined();
    expect(head.title).toBe(CONTACT_TITLE);
    expect(head.description).toBe(CONTACT_DESCRIPTION);
    expect(head.title.length, head.title).toBeLessThanOrEqual(60);
    expect(head.description.length, head.description).toBeLessThanOrEqual(155);
  });

  it("has an exact route-module preload entry naming ContactPage", () => {
    expect(ROUTE_CHUNK_MODULES.some((e) => e.prefix === "/contact" && e.exact && e.modules.includes("ContactPage"))).toBe(
      true,
    );
    expect(routeChunkModulesFor("/contact")).toEqual(["ContactPage"]);
  });
});

describe("CONTACT-INDEX-1 (d) — /contact is served and prerendered", () => {
  it("has the Vercel shell rewrite", () => {
    const sources = JSON.parse(readFileSync(resolve(ROOT, "..", "vercel.json"), "utf8")).rewrites.map(
      (r: { source: string }) => r.source,
    );
    expect(sources).toContain("/:path(contact/?)");
  });

  it("the committed prerender (mobile and desktop) has the page, and the manifest and ledger list it", () => {
    for (const rel of ["prerendered/contact.html", "prerendered/__desktop/contact.html"]) {
      expect(existsSync(resolve(ROOT, rel)), `${rel} is missing: take the artifact from this PR's capture run`).toBe(true);
      const pre = read(rel);
      expect(pre, rel).toContain("Contact us");
      expect(pre, rel).toContain('data-testid="contact-page"');
    }
    expect(JSON.parse(read("prerendered/manifest.json")).paths).toContain("/contact");
    expect(Object.keys(JSON.parse(read("prerendered/lastmod.json")))).toContain("/contact");
  });
});

describe("CONTACT-INDEX-1 (e) — the public footer links to /contact", () => {
  it("renders 'Contact' -> /contact after the legal links and before the social row", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/pricing"]}>
        <PublicLegalFooter />
      </MemoryRouter>,
    );
    const footer = container.querySelector("footer") as HTMLElement;
    const contact = within(footer).getByRole("link", { name: "Contact" });
    expect(contact.getAttribute("href")).toBe("/contact");
    expect(contact.getAttribute("target")).toBeNull();
    const hrefs = Array.from(footer.querySelectorAll("a")).map((a) => a.getAttribute("href") ?? "");
    const at = hrefs.indexOf("/contact");
    expect(at).toBe(hrefs.indexOf("/legal/refund") + 1);
    expect(hrefs.slice(at + 1).every((h) => h.startsWith("https://"))).toBe(true);
  });
});
