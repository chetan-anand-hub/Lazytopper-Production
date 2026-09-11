// @vitest-environment node
import { describe, it, expect } from "vitest";

import {
  STATIC_PAGE_HEADS,
  applyHead,
  escapeAttr,
  escapeText,
  headForPath,
  templateDescription,
  templateTitle,
} from "../../scripts/seo/writeStaticHeads";
import { canonicalFor } from "./canonicalUrl";
import { sitemapPaths } from "./sitemapUrls";
import { allDesktopTopics } from "../lib/desktop/topics";

/**
 * GUARD — the post-build static-head writer, `scripts/seo/writeStaticHeads.ts`.
 *
 * ★ WHAT THIS FILE EXISTS TO CATCH, AND WHY `head.guard.test.ts` CANNOT.
 * That guard reads `index.html` FROM DISK and asserts the head is well-formed.
 * Every one of its assertions was TRUE throughout the entire defect this lane
 * closes — the canonical was present, single, and byte-identical to `og:url`,
 * while naming the WRONG PAGE on 32 of 33 URLs. It checks FORM. This file checks
 * CORRESPONDENCE: that the string stamped into each page is THAT PAGE'S OWN
 * address, for every advertised URL, with none missing.
 *
 * ⚠ AND AFTER THIS LANE, `head.guard.test.ts` COVERS ONE URL OF THE 33.
 * `index.html` is still the file served for `/app/`, so its assertions remain
 * meaningful — for the home page. The other 32 URLs are served by files this
 * script writes, which that guard never opens. It is not vacuous and it is not
 * sufficient; this file is the half it does not reach.
 *
 * ★ THE SUBSTITUTION IS EXERCISED AGAINST A SYNTHETIC SHELL, not the build
 * output. A test that can only run after `vite build` does not run in CI's unit
 * step at all, and a test that reads a real artifact cannot be shown to FAIL on
 * a broken one. The fixture below is the head shape `index.html` actually ships,
 * including its three-line description tag.
 */

/**
 * A stand-in for the built shell, carrying the four tags the script rewrites in
 * the shapes they really appear in — the description across THREE lines, which
 * is the form that broke naive single-line patterns in `head.guard.test.ts`'s
 * own history.
 */
const SHELL = [
  "<!doctype html>",
  '<html lang="en-IN">',
  "  <head>",
  '    <link rel="canonical" href="https://www.lazytopper.com/app/" />',
  "    <meta",
  '      name="description"',
  '      content="Free CBSE Class 10 Maths &amp; Science prep."',
  "    />",
  '    <meta property="og:url" content="https://www.lazytopper.com/app/" />',
  '    <meta property="og:image" content="https://lazytopper.com/app/og-image.png" />',
  "    <title>LazyTopper — CBSE Class 10 Prep That Finds Lost Marks</title>",
  "  </head>",
  "  <body><div id=\"root\"></div></body>",
  "</html>",
].join("\n");

/** The tag readers, so assertions below read the OUTPUT rather than trust it. */
function canonicalOf(html: string): string | null {
  return html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i)?.[1] ?? null;
}
function ogUrlOf(html: string): string | null {
  return html.match(/<meta\s+property="og:url"\s+content="([^"]*)"/i)?.[1] ?? null;
}
function titleOf(html: string): string | null {
  return html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? null;
}
function descriptionOf(html: string): string | null {
  return html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] ?? null;
}

/**
 * `&amp;` is five source characters and ONE rendered one. Count what renders.
 *
 * ⚠ THE AMPERSAND IS DECODED LAST, AND THAT IS THE EXACT MIRROR OF `escapeAttr`
 * ENCODING IT FIRST. Decoding `&amp;` first turns `&amp;lt;` — the correct
 * encoding of the literal text `&lt;` — into `&lt;`, which the very next
 * replacement then decodes again into `<`. One source entity, decoded twice, and
 * the count comes out short. CodeQL flags this shape as `js/double-escaping`;
 * it flagged this function, in this order, and it was right.
 */
function renderedLength(value: string): number {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&").length;
}

const BASENAME = "/app";

describe("static heads — every advertised URL is stamped with its OWN address", () => {
  it("names its subject on every run, green included", () => {
    const paths = sitemapPaths();
    // eslint-disable-next-line no-console
    console.log(
      `STATIC_HEADS_GUARD_SCOPE: advertised=${paths.length} ` +
        `static_map=${Object.keys(STATIC_PAGE_HEADS).length} ` +
        `topics=${allDesktopTopics().length} shell_bytes=${SHELL.length}`,
    );
    // A guard whose corpus silently became empty passes everything below it.
    expect(paths.length, "the advertised URL set is empty").toBeGreaterThan(1);
  });

  it("stamps EVERY advertised path except the root, and the root is left alone", () => {
    const paths = sitemapPaths();
    const stamped = paths.filter((path) => path !== "/");

    // ★ THE COUNT IS DERIVED, NOT HARDCODED. Pinning 32 here would go stale the
    // first time a topic is added and would fail for the RIGHT reason with the
    // WRONG message. What must hold is that exactly one path — the root — is
    // skipped, and every other advertised path gets a file.
    expect(paths.filter((path) => path === "/"), "the root is advertised exactly once")
      .toHaveLength(1);
    expect(stamped.length).toBe(paths.length - 1);

    for (const path of stamped) {
      const url = canonicalFor(path, BASENAME);
      const head = headForPath(path);
      const html = applyHead(SHELL, {
        path,
        url,
        title: head ? head.title : templateTitle(SHELL),
        description: head ? head.description : templateDescription(SHELL),
      });

      // ★ THE WHOLE POINT: the canonical names THIS page, not the home page.
      expect(canonicalOf(html), `${path} was stamped with the wrong canonical`).toBe(url);
      expect(
        canonicalOf(html),
        `${path} still declares the home page as its canonical — the defect`,
      ).not.toBe("https://www.lazytopper.com/app/");

      // ★ BYTE-IDENTICAL, not merely equivalent — the same assertion
      // `head.guard.test.ts` makes about `index.html`, made about every page it
      // does not open.
      expect(ogUrlOf(html), `${path}: og:url and canonical disagree`).toBe(canonicalOf(html));
    }
  });

  it("gives every advertised page its own title and description, none the shell's", () => {
    const shellTitle = titleOf(SHELL);
    const shellDescription = descriptionOf(SHELL);
    const missing: string[] = [];

    for (const path of sitemapPaths().filter((p) => p !== "/")) {
      const head = headForPath(path);
      if (!head) {
        missing.push(path);
        continue;
      }
      const html = applyHead(SHELL, { path, url: canonicalFor(path, BASENAME), ...head });

      expect(titleOf(html), `${path} kept the shell title`).not.toBe(shellTitle);
      expect(descriptionOf(html), `${path} kept the shell description`).not.toBe(
        shellDescription,
      );
      expect(titleOf(html)?.length, `${path} has an empty title`).toBeGreaterThan(0);
      expect(descriptionOf(html)?.length, `${path} has an empty description`).toBeGreaterThan(0);

      // `src/config/domain.guard.test.ts` caps the shell's description at 155
      // RENDERED characters. A page-specific one is no different to a search
      // engine, so it is held to the same cap here, decoded the same way.
      expect(
        renderedLength(descriptionOf(html) as string),
        `${path} description exceeds 155 rendered characters`,
      ).toBeLessThanOrEqual(155);
    }

    // ⚠ REPORTED, NOT SILENTLY TOLERATED. A page with no honest copy keeps the
    // shell's — the brief's rule — but it must be VISIBLE that it did.
    expect(missing, `these advertised pages have no honest title/description: ${missing.join(", ")}`)
      .toEqual([]);
  });

  it("escapes the ampersands that seven chapter titles actually contain", () => {
    const withAmpersand = allDesktopTopics().filter((topic) => topic.name.includes("&"));
    expect(
      withAmpersand.length,
      "no chapter name contains an ampersand — this test no longer exercises escaping",
    ).toBeGreaterThan(0);

    for (const topic of withAmpersand) {
      const path = `/topic-hub/${topic.slug}`;
      const head = headForPath(path);
      expect(head, `${path} resolved to no head`).not.toBeNull();
      const html = applyHead(SHELL, {
        path,
        url: canonicalFor(path, BASENAME),
        ...(head as { title: string; description: string }),
      });
      // A raw `&` in the title would be an unescaped entity reference.
      expect(html).toContain(`<title>${escapeText(head?.title as string)}</title>`);
      expect(titleOf(html)).toContain("&amp;");
    }
  });
});

/* ------------------------------------------------------------------------- *
 * ★★ THE CONTROL — every detector above is proven to FIRE.
 *
 * The assertions above all read "the stamped value is right". If `applyHead`
 * silently did nothing, several of them would still need to fail — but a
 * substitution that matches ZERO tags is exactly the silent no-op this script
 * is most likely to become when Vite changes how it emits the head. These cases
 * feed it input it must REJECT, and assert that it does.
 * ------------------------------------------------------------------------- */
describe("static heads — the writer refuses to no-op silently", () => {
  const page = {
    path: "/pricing",
    url: "https://www.lazytopper.com/app/pricing",
    title: "T",
    description: "D",
  };

  it("THROWS when a tag it must rewrite is absent, rather than writing the shell unchanged", () => {
    const noCanonical = SHELL.replace(/<link\s+rel="canonical"[^>]*>/i, "");
    expect(() => applyHead(noCanonical, page), "a missing canonical passed silently").toThrow(
      /exactly ONE <link rel=canonical>/,
    );

    const noOgUrl = SHELL.replace(/<meta\s+property="og:url"[^>]*>/i, "");
    expect(() => applyHead(noOgUrl, page)).toThrow(/exactly ONE <meta property=og:url>/);

    const noTitle = SHELL.replace(/<title>[\s\S]*?<\/title>/i, "");
    expect(() => applyHead(noTitle, page)).toThrow(/exactly ONE <title>/);

    const noDescription = SHELL.replace(/<meta\s+name="description"[\s\S]*?\/>/i, "");
    expect(() => applyHead(noDescription, page)).toThrow(/exactly ONE <meta name=description>/);
  });

  it("THROWS on a DUPLICATE tag, where replacing all would be as wrong as replacing none", () => {
    const twoCanonicals = SHELL.replace(
      '<link rel="canonical" href="https://www.lazytopper.com/app/" />',
      '<link rel="canonical" href="https://www.lazytopper.com/app/" />\n' +
        '    <link rel="canonical" href="https://www.lazytopper.com/app/pricing" />',
    );
    expect(() => applyHead(twoCanonicals, page)).toThrow(/found 2/);
  });

  it("rewrites the MULTI-LINE description tag, the form index.html actually ships", () => {
    // A single-line-only pattern returns the shell's description here and the
    // guard above would report the page "kept the shell description" — but only
    // if this shape is in the fixture. It is, and this pins that it stays.
    expect(SHELL).toMatch(/<meta\s*\n\s*name="description"/);
    const html = applyHead(SHELL, { ...page, description: "Per-page copy." });
    expect(descriptionOf(html)).toBe("Per-page copy.");
  });

  it("does not touch og:image, the bundle, or anything outside the four tags", () => {
    const html = applyHead(SHELL, page);
    // og:image stays on the apex host per #612 — this script has no business
    // moving it, and a greedy `og:` pattern would.
    expect(html).toContain('<meta property="og:image" content="https://lazytopper.com/app/og-image.png" />');
    expect(html).toContain('<html lang="en-IN">');
    expect(html).toContain('<div id="root"></div>');
  });

  it("treats a replacement containing $& literally, not as a replacement pattern", () => {
    const html = applyHead(SHELL, { ...page, description: "Costs $5 & up $& more" });
    expect(descriptionOf(html)).toBe("Costs $5 &amp; up $&amp; more");
  });

  it("escapeText / escapeAttr order the ampersand first", () => {
    expect(escapeText("A & B")).toBe("A &amp; B");
    expect(escapeText("<b>")).toBe("&lt;b&gt;");
    expect(escapeAttr('say "hi" & bye')).toBe("say &quot;hi&quot; &amp; bye");
    // The failure this ordering prevents: a quote escaped first would leave
    // `&amp;quot;` after the ampersand pass.
    expect(escapeAttr('"')).toBe("&quot;");
  });

  it("renderedLength decodes each entity EXACTLY ONCE", () => {
    // ★ THIS CASE DISCRIMINATES, which is the only reason it is worth writing.
    // The literal text `&lt;` encodes to `&amp;lt;`. Decoding the ampersand
    // FIRST — the order this helper originally used — collapses that to `&lt;`
    // and then to `<`, giving 1 instead of 4 and under-counting a description
    // by three characters per occurrence. Both orders agree on every input
    // WITHOUT a nested entity, so a test using only `a &amp; b` would pass on
    // the broken version.
    expect(renderedLength("&amp;lt;")).toBe(4);
    expect(renderedLength("a &amp; b")).toBe(5);
    expect(renderedLength("&quot;x&quot;")).toBe(3);
    expect(renderedLength("plain")).toBe(5);
  });

  it("headForPath returns null for a path it has no honest copy for", () => {
    expect(headForPath("/topic-hub/not-a-real-chapter")).toBeNull();
    expect(headForPath("/some-unrouted-path")).toBeNull();
    // And it does resolve a real one, so the null above is not the only answer
    // it can give.
    expect(headForPath("/topic-hub/trigonometry")?.title).toContain("Trigonometry");
    expect(headForPath("/pricing")?.title).toContain("Pricing");
  });

  it("templateTitle / templateDescription read the shell's own values back", () => {
    expect(templateTitle(SHELL)).toBe("LazyTopper — CBSE Class 10 Prep That Finds Lost Marks");
    expect(templateDescription(SHELL)).toBe("Free CBSE Class 10 Maths &amp; Science prep.");
    expect(templateTitle("<head></head>")).toBe("");
    expect(templateDescription("<head></head>")).toBe("");
  });
});
