// @vitest-environment node
/**
 * GUARD — SPEED-SITE-2f: the critical CSS a prerendered page inlines (scripts/seo/criticalCss.ts) and the deferred
 * entry stylesheet around it (applyPrerendered withCriticalEntryCss).
 *
 * The failure this exists to prevent is a FLASH OF UNSTYLED CONTENT: a rule that applies to the page's HTML left
 * out of the inlined subset. So the selector test is checked to be conservative (never false when the page holds
 * every named part), the subset is checked to be the full sheet's rules IN ORDER (the cascade is unchanged), and
 * the page keeps a no-JS route to the full sheet.
 */
import { describe, expect, it } from "vitest";
import { criticalCss, pageTokens, selectorMayMatch, splitBlocks, splitSelectors } from "../../scripts/seo/criticalCss";
import { DEFERRED_CSS_ATTR, entryStylesheetOf, withCriticalEntryCss } from "../../scripts/seo/applyPrerendered";

const PAGE = `<body><div id="root"><div class="phone-shell"><header class="lt-top"><h1>Notes</h1></header>
<main data-x="1"><p class="lead big">Hi</p><a href="/x">x</a><svg class="lt-icon"><path d="M0"></path></svg></main></div></div></body>`;

describe("SPEED-SITE-2f criticalCss", () => {
  const tokens = pageTokens(PAGE);

  it("reads classes, ids, element and attribute names from the HTML", () => {
    expect([...tokens.classes].sort()).toEqual(["big", "lead", "lt-icon", "lt-top", "phone-shell"]);
    expect([...tokens.ids]).toEqual(["root"]);
    for (const t of ["html", "body", "div", "header", "h1", "main", "p", "a", "svg", "path"]) expect(tokens.tags.has(t), t).toBe(true);
    for (const a of ["class", "id", "data-x", "href", "d"]) expect(tokens.attrs.has(a), a).toBe(true);
  });

  it("keeps a selector whose every named part is on the page; pseudo-classes / elements never exclude", () => {
    for (const sel of [".phone-shell", "#root .lead", "main>p.lead.big", ".lead:hover", ".lead::before", ".lead:not(.zzz)", "a:focus-visible", "[data-x]", "*", ":root", "html", "body p", ".lt-top h1", "svg path"]) {
      expect(selectorMayMatch(sel, tokens), sel).toBe(true);
    }
  });

  it("drops a selector naming a class, id, element or attribute the page does not contain", () => {
    for (const sel of [".modal", "#dialog .lead", "table td", "[data-open]", ".lead .missing", "button"]) {
      expect(selectorMayMatch(sel, tokens), sel).toBe(false);
    }
  });

  it("keeps @font-face and @keyframes whole, filters inside @media / @container, drops an emptied at-rule", () => {
    const css =
      '@font-face{font-family:"F";src:url(/f.woff2)}.lead{color:red}.modal{color:blue}' +
      "@media (min-width:768px){.lead{color:green}.modal{display:none}}@media print{.modal{display:none}}" +
      "@keyframes spin{from{transform:rotate(0)}to{transform:rotate(1turn)}}" +
      "@container card (min-width:300px){.lt-top{padding:0}}";
    expect(criticalCss(css, PAGE)).toBe(
      '@font-face{font-family:"F";src:url(/f.woff2)}.lead{color:red}' +
        "@media (min-width:768px){.lead{color:green}}" +
        "@keyframes spin{from{transform:rotate(0)}to{transform:rotate(1turn)}}" +
        "@container card (min-width:300px){.lt-top{padding:0}}",
    );
  });

  it("splits selector lists only at top-level commas, and honours strings in bodies", () => {
    expect(splitSelectors(".a:is(.b,.c),.d")).toEqual([".a:is(.b,.c)", ".d"]);
    expect(splitBlocks('.a{content:"}{"}.b{x:1}')).toEqual([
      { prelude: ".a", body: 'content:"}{"' },
      { prelude: ".b", body: "x:1" },
    ]);
    expect(() => splitBlocks(".a{x:1")).toThrow();
  });

  it("the subset is the full sheet's rules, in the full sheet's order (cascade unchanged)", () => {
    const css = ".lead{a:1}.modal{b:2}.big{c:3}.lead.big{d:4}.zz{e:5}";
    const out = criticalCss(css, PAGE);
    expect(out).toBe(".lead{a:1}.big{c:3}.lead.big{d:4}");
    let at = 0;
    for (const rule of out.split("}").filter(Boolean)) {
      const i = css.indexOf(`${rule}}`, at);
      expect(i, rule).toBeGreaterThanOrEqual(at);
      at = i;
    }
  });
});

describe("SPEED-SITE-2f withCriticalEntryCss", () => {
  const shell = '<html><head><link rel="stylesheet" crossorigin href="/assets/index-AbC123.css"></head><body><p class="lead">x</p></body></html>';

  it("finds the entry stylesheet in the shell", () => {
    expect(entryStylesheetOf(shell)).toBe("index-AbC123.css");
    expect(entryStylesheetOf("<html></html>")).toBeNull();
  });

  it("inlines the subset, defers the full sheet, keeps a noscript copy; the body is untouched", () => {
    const out = withCriticalEntryCss(shell, "index-AbC123.css", ".lead{a:1}.modal{b:2}", criticalCss);
    expect(out).toContain('<style data-lt-critical="index-AbC123.css">.lead{a:1}</style>');
    expect(out).toContain(`<link rel="stylesheet" crossorigin href="/assets/index-AbC123.css" media="print" onload="this.media='all'" ${DEFERRED_CSS_ATTR}>`);
    expect(out).toContain('<noscript><link rel="stylesheet" crossorigin href="/assets/index-AbC123.css"></noscript>');
    expect(out.slice(out.indexOf("<body"))).toBe(shell.slice(shell.indexOf("<body")));
  });

  it("refuses a page with no (or two) entry stylesheet links", () => {
    expect(() => withCriticalEntryCss("<html><head></head><body></body></html>", "index-AbC123.css", "", criticalCss)).toThrow();
  });
});
