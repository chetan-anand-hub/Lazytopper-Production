import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { render, screen, within, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import { SAME_AS, FOOTER_SOCIAL, WHATSAPP_URL } from "./socialProfiles";

/**
 * ORG-SAMEAS-1 — the site declares its own social profiles, once, and says so in two places.
 *
 *   (a) the shell `index.html` has exactly ONE ld+json block (head.guard pins that too), and its
 *       Organization node's `sameAs` deep-equals `socialProfiles.ts`'s `SAME_AS` — the 5 URLs, in
 *       order. `index.html` cannot import the module, so THIS is what stops the two drifting.
 *   (b) the retired Facebook handle appears in no source file.
 *   (c) the public footer renders the 4 social links with `rel` ⊇ {me, noopener}, no `nofollow`,
 *       and no `utm_` anywhere in an href.
 *
 * Every detector takes its input as an argument and is run against SYNTHETIC violating input in
 * the CONTROL block, so a typo'd regex cannot sit green on a correct tree.
 */

const ROOT = process.cwd(); // vitest runs with cwd = lazytopper/
const INDEX_HTML = resolve(ROOT, "index.html");

/** The raw body of every `<script type="application/ld+json">` block. */
function ldJsonBlocks(html: string): string[] {
  return [...html.matchAll(/<script\s+type="application\/ld\+json"\s*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
}

/** The Organization node of the one block's `@graph`, or null. */
function organizationNode(html: string): Record<string, unknown> | null {
  const blocks = ldJsonBlocks(html);
  if (blocks.length !== 1) return null;
  const graph = (JSON.parse(blocks[0]) as { "@graph"?: Array<Record<string, unknown>> })["@graph"] ?? [];
  return graph.find((n) => n["@type"] === "Organization") ?? null;
}

// built by concatenation so this file itself does not contain the retired handle
const RETIRED_HANDLE = "lazytopper" + "india";

const SCAN_EXT = /\.(tsx?|cjs|mjs|js|json|html|css|txt|md|xml)$/;
function filesUnder(dir: string, skip: (rel: string) => boolean, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(ROOT, full).replace(/\\/g, "/");
    if (skip(rel)) continue;
    if (statSync(full).isDirectory()) filesUnder(full, skip, out);
    else if (SCAN_EXT.test(name)) out.push(rel);
  }
  return out;
}

/** Files (relative paths) whose text contains `needle`. */
function filesContaining(needle: string, files: string[], read: (rel: string) => string): string[] {
  return files.filter((f) => read(f).includes(needle));
}

/** Problems with a rendered footer's social links; empty means fine. */
function socialLinkProblems(anchors: Array<{ href: string; rel: string; target: string }>, expected: string[]): string[] {
  const problems: string[] = [];
  const hrefs = anchors.map((a) => a.href);
  if (JSON.stringify(hrefs) !== JSON.stringify(expected)) problems.push(`hrefs ${JSON.stringify(hrefs)} != ${JSON.stringify(expected)}`);
  for (const a of anchors) {
    const rel = a.rel.split(/\s+/);
    if (!rel.includes("me") || !rel.includes("noopener")) problems.push(`${a.href}: rel "${a.rel}" lacks me/noopener`);
    if (rel.includes("nofollow")) problems.push(`${a.href}: rel has nofollow`);
    if (/utm_/i.test(a.href)) problems.push(`${a.href}: carries a utm_ tag`);
    if (a.target !== "_blank") problems.push(`${a.href}: target "${a.target}" is not _blank`);
  }
  return problems;
}

describe("ORG-SAMEAS-1 (a) — the shell's Organization sameAs equals config/socialProfiles.ts", () => {
  const html = readFileSync(INDEX_HTML, "utf8");

  it("the shell has exactly one ld+json block", () => {
    expect(ldJsonBlocks(html).length).toBe(1);
  });

  it("sameAs is the 5 profile URLs, in order, and equals SAME_AS", () => {
    const org = organizationNode(html);
    expect(org, "no Organization node in the shell's ld+json").not.toBeNull();
    expect(org!.sameAs).toEqual([...SAME_AS]);
    expect(SAME_AS).toEqual([
      "https://www.youtube.com/@Lazytopper_CBSE",
      "https://www.instagram.com/lazy_topper_/",
      "https://www.facebook.com/lazytoppercbse",
      "https://x.com/lazy_topper_",
      "https://www.linkedin.com/company/146258133",
    ]);
  });

  it("the Organization node carries the identity fields, and the WebSite points at it", () => {
    const org = organizationNode(html)!;
    expect(org["@id"]).toBe("https://www.lazytopper.com/#organization");
    expect(org.alternateName).toEqual(["Lazy Topper", "lazytopper"]);
    expect(org.logo).toBe(LOGO_URL);
    expect(org.email).toBe("support@lazytopper.com");
    expect(org.contactPoint).toEqual([
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "support@lazytopper.com",
        url: WHATSAPP_URL,
        areaServed: "IN",
        availableLanguage: ["en", "hi"],
      },
    ]);
    const graph = (JSON.parse(ldJsonBlocks(html)[0]) as { "@graph": Array<Record<string, unknown>> })["@graph"];
    const site = graph.find((n) => n["@type"] === "WebSite")!;
    expect(site.publisher).toEqual({ "@id": "https://www.lazytopper.com/#organization" });
  });
});

/** [width, height] of a PNG buffer, or null if it is not one. */
function pngSize(buf: Buffer): [number, number] | null {
  const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buf.length < 24 || !SIG.every((b, i) => buf[i] === b)) return null;
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

const LOGO_URL = "https://www.lazytopper.com/logo-square.png";

describe("ORG-SAMEAS-1 (a2) — the Organization logo is a real, square PNG that the site serves", () => {
  const html = readFileSync(INDEX_HTML, "utf8");

  it("the logo URL is the square logo, a file in public/, and og:image / twitter:image are untouched", () => {
    expect(organizationNode(html)!.logo).toBe(LOGO_URL);
    const file = resolve(ROOT, "public", new URL(LOGO_URL).pathname.slice(1));
    const size = pngSize(readFileSync(file));
    expect(size, `${file} is not a PNG`).not.toBeNull();
    const [w, h] = size!;
    expect(w, "the logo must be square").toBe(h);
    expect(w, "Google's Organization-logo minimum is 112 px").toBeGreaterThanOrEqual(112);
    expect([...html.matchAll(/(?:og|twitter):image"\s+content="([^"]*)"/g)].map((m) => m[1])).toEqual([
      "https://www.lazytopper.com/og-image.png",
      "https://www.lazytopper.com/og-image.png",
    ]);
  });

  it("CONTROL — pngSize reads a real header and rejects a non-PNG and a non-square image", () => {
    const hdr = (w: number, h: number) => {
      const b = Buffer.alloc(24);
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b);
      b.writeUInt32BE(w, 16);
      b.writeUInt32BE(h, 20);
      return b;
    };
    expect(pngSize(hdr(1200, 1200))).toEqual([1200, 1200]);
    expect(pngSize(hdr(1200, 630))).toEqual([1200, 630]); // the caller's width === height check is what rejects this
    expect(pngSize(Buffer.from("<svg></svg>".padEnd(30, " ")))).toBeNull();
  });
});

describe("ORG-SAMEAS-1 (b) — the retired Facebook handle appears nowhere", () => {
  const files = [
    "index.html",
    ...filesUnder(resolve(ROOT, "src"), (r) => r.startsWith("src/data/")),
    ...filesUnder(resolve(ROOT, "public"), () => false),
    ...filesUnder(resolve(ROOT, "scripts"), () => false),
  ];
  const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

  it("names its scope on every run", () => {
    expect(files.length).toBeGreaterThan(300);
    expect(files).toContain("src/config/socialProfiles.ts");
  });

  it(`no scanned file contains ${"lazytopper" + "india"}`, () => {
    expect(filesContaining(RETIRED_HANDLE, files, read)).toEqual([]);
  });

  it("CONTROL — the detector fires on a file that contains the handle", () => {
    const fake: Record<string, string> = { "a.ts": `https://www.facebook.com/${RETIRED_HANDLE}`, "b.ts": "clean" };
    expect(filesContaining(RETIRED_HANDLE, Object.keys(fake), (f) => fake[f])).toEqual(["a.ts"]);
  });
});

describe("ORG-SAMEAS-1 (c) — the footer renders 4 social links: rel me+noopener, no nofollow, no utm_", () => {
  function renderedSocialAnchors() {
    render(
      <MemoryRouter>
        <PublicLegalFooter />
      </MemoryRouter>,
    );
    const foot = screen.getByRole("contentinfo", { name: "Legal" });
    const anchors = within(foot)
      .getAllByRole("link")
      .filter((a) => /^https:\/\//.test(a.getAttribute("href") || ""))
      .map((a) => ({ href: a.getAttribute("href") || "", rel: a.getAttribute("rel") || "", target: a.getAttribute("target") || "" }));
    const labels = within(foot)
      .getAllByRole("link")
      .filter((a) => /^https:\/\//.test(a.getAttribute("href") || ""))
      .map((a) => a.textContent);
    cleanup();
    return { anchors, labels };
  }

  it("exactly YouTube, Instagram, Facebook and WhatsApp, with the URLs from socialProfiles.ts", () => {
    const { anchors, labels } = renderedSocialAnchors();
    expect(anchors.length).toBe(4);
    expect(labels).toEqual(["YouTube", "Instagram", "Facebook", "WhatsApp: ask a doubt"]);
    expect(socialLinkProblems(anchors, FOOTER_SOCIAL.map((s) => s.href))).toEqual([]);
    // X and LinkedIn are sameAs only, never in the footer
    expect(anchors.map((a) => a.href).some((h) => /x\.com|linkedin\.com/.test(h))).toBe(false);
    // the footer's WhatsApp link is the same URL the Organization's contactPoint carries
    expect(anchors[3].href).toBe(WHATSAPP_URL);
  });

  it("CONTROL — the checker catches a missing rel token, nofollow, a utm_ tag and a wrong target", () => {
    const good = { href: "https://x.test/a", rel: "me noopener", target: "_blank" };
    expect(socialLinkProblems([good], ["https://x.test/a"])).toEqual([]);
    expect(socialLinkProblems([{ ...good, rel: "noopener" }], ["https://x.test/a"]).length).toBeGreaterThan(0);
    expect(socialLinkProblems([{ ...good, rel: "me noopener nofollow" }], ["https://x.test/a"]).length).toBeGreaterThan(0);
    expect(socialLinkProblems([{ ...good, href: "https://x.test/a?utm_source=x" }], ["https://x.test/a?utm_source=x"]).length).toBeGreaterThan(0);
    expect(socialLinkProblems([{ ...good, target: "" }], ["https://x.test/a"]).length).toBeGreaterThan(0);
    expect(socialLinkProblems([good], ["https://x.test/other"]).length).toBeGreaterThan(0);
  });

  it("CONTROL — the sameAs extractor sees a dropped URL (mutation)", () => {
    const html = readFileSync(INDEX_HTML, "utf8").replace(/\s*"https:\/\/x\.com\/lazy_topper_",/, "");
    expect(html).not.toEqual(readFileSync(INDEX_HTML, "utf8"));
    expect(organizationNode(html)!.sameAs).not.toEqual([...SAME_AS]);
  });
});
