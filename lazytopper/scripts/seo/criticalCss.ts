/**
 * SPEED-SITE-2f — CRITICAL CSS for a prerendered page: the subset of the entry stylesheet that can
 * possibly apply to the elements the page's HTML already contains.
 *
 * ★ WHY. On a slow phone link (Lighthouse: 300 ms RTT, 700 kbps, 6x CPU) first paint of the
 * prerendered pages was 5.5–7 s. The ONE render-blocking resource is the entry stylesheet
 * (`index-*.css`, ~108 KB raw / ~20 KB gz), and it downloads in competition with ~370 KB of
 * scripts, the heading font and images requested in the same head. Inlining the rules the page
 * needs lets the browser paint as soon as the HTML arrives; the full stylesheet still loads, just
 * without blocking that paint (applyPrerendered `withCriticalEntryCss`).
 *
 * ★ HOW, AND WHY IT IS SAFE. No browser and no CSS library: the build has neither on every path.
 *   - The CSS is Vite's minified output: rules and at-rules only (@media, @container, @supports,
 *     @keyframes, @font-face). It is split by brace matching, honouring quoted strings.
 *   - A style rule is kept when ANY of its selectors MAY match: every class, id, element name and
 *     attribute name the selector names exists somewhere in the page. Pseudo-classes and
 *     pseudo-elements are ignored (dropped), so `:hover`, `::before`, `:not(…)` never exclude a
 *     rule. This over-includes (a selector whose parts all exist but never match together is
 *     kept); it never drops a rule that could apply to the HTML. Over-inclusion costs bytes only.
 *   - @font-face and @keyframes are always kept; @media / @container / @supports keep their
 *     matching inner rules and are dropped only when nothing inside is kept.
 *   - Kept rules keep their original text and their original ORDER, so the cascade among them is
 *     the cascade of the full sheet. When the full sheet arrives it repeats the same rules after
 *     these, with identical values: nothing changes on screen.
 *   - Elements the app renders LATER (signed-in chrome, dialogs) are styled by the full sheet;
 *     main.tsx does not start React until that sheet has loaded (`deferredStylesheetReady`).
 */

/** One top-level block: the text before `{` and the text between the braces. */
export interface CssBlock {
  prelude: string;
  body: string;
}

/** Split a CSS text into its top-level blocks. Throws on unbalanced braces (the input is not CSS we understand). */
export function splitBlocks(css: string): CssBlock[] {
  const blocks: CssBlock[] = [];
  let i = 0;
  const n = css.length;
  while (i < n) {
    // skip whitespace and stray semicolons between blocks
    while (i < n && (css[i] === ";" || /\s/.test(css[i]))) i += 1;
    if (i >= n) break;
    const preludeStart = i;
    let quote: string | null = null;
    while (i < n) {
      const c = css[i];
      if (quote) {
        if (c === "\\") i += 1;
        else if (c === quote) quote = null;
      } else if (c === '"' || c === "'") quote = c;
      else if (c === "{") break;
      else if (c === ";") break; // a statement at-rule (@charset / @import): no body
      i += 1;
    }
    if (i >= n) throw new Error("criticalCss: unterminated rule");
    if (css[i] === ";") {
      blocks.push({ prelude: css.slice(preludeStart, i).trim(), body: "\u0000statement" });
      i += 1;
      continue;
    }
    const prelude = css.slice(preludeStart, i).trim();
    i += 1; // past "{"
    const bodyStart = i;
    let depth = 1;
    quote = null;
    while (i < n && depth > 0) {
      const c = css[i];
      if (quote) {
        if (c === "\\") i += 1;
        else if (c === quote) quote = null;
      } else if (c === '"' || c === "'") quote = c;
      else if (c === "{") depth += 1;
      else if (c === "}") depth -= 1;
      i += 1;
    }
    if (depth !== 0) throw new Error("criticalCss: unbalanced braces");
    blocks.push({ prelude, body: css.slice(bodyStart, i - 1) });
  }
  return blocks;
}

/** What a page's HTML contains: class names, ids, element names, attribute names (all lower-cased except classes/ids). */
export interface PageTokens {
  classes: ReadonlySet<string>;
  ids: ReadonlySet<string>;
  tags: ReadonlySet<string>;
  attrs: ReadonlySet<string>;
}

export function pageTokens(html: string): PageTokens {
  const classes = new Set<string>();
  const ids = new Set<string>();
  const tags = new Set<string>(["html", "head", "body"]);
  const attrs = new Set<string>();
  for (const tag of html.matchAll(/<([A-Za-z][A-Za-z0-9-]*)((?:\s[^<>]*)?)>/g)) {
    tags.add(tag[1].toLowerCase());
    const rest = tag[2] ?? "";
    for (const attr of rest.matchAll(/\s([^\s=/>"']+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g)) {
      const name = attr[1].toLowerCase();
      attrs.add(name);
      const raw = attr[2] ?? "";
      const value = raw.replace(/^["']|["']$/g, "");
      if (name === "class") for (const c of value.split(/\s+/)) if (c) classes.add(c);
      if (name === "id" && value) ids.add(value);
    }
  }
  return { classes, ids, tags, attrs };
}

/** Split a selector list on top-level commas (not those inside parentheses or brackets). */
export function splitSelectors(prelude: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < prelude.length; i += 1) {
    const c = prelude[i];
    if (c === "\\") {
      i += 1;
      continue;
    }
    if (c === "(" || c === "[") depth += 1;
    else if (c === ")" || c === "]") depth -= 1;
    else if (c === "," && depth === 0) {
      out.push(prelude.slice(start, i));
      start = i + 1;
    }
  }
  out.push(prelude.slice(start));
  return out.map((s) => s.trim()).filter(Boolean);
}

const unescape = (s: string): string => s.replace(/\\(.)/g, "$1");

/** Remove every pseudo-class / pseudo-element, including a parenthesised argument (`:not(.x)`, `::before`). */
function withoutPseudos(selector: string): string {
  let out = "";
  for (let i = 0; i < selector.length; i += 1) {
    const c = selector[i];
    if (c === "\\") {
      out += selector.slice(i, i + 2);
      i += 1;
      continue;
    }
    if (c === "[") {
      // attribute selectors are copied whole (their values may contain ':')
      const end = selector.indexOf("]", i);
      out += selector.slice(i, end === -1 ? undefined : end + 1);
      i = end === -1 ? selector.length : end;
      continue;
    }
    if (c === ":") {
      let j = i + 1;
      if (selector[j] === ":") j += 1;
      while (j < selector.length && /[A-Za-z0-9_-]/.test(selector[j])) j += 1;
      if (selector[j] === "(") {
        let depth = 1;
        j += 1;
        while (j < selector.length && depth > 0) {
          if (selector[j] === "(") depth += 1;
          else if (selector[j] === ")") depth -= 1;
          j += 1;
        }
      }
      i = j - 1;
      continue;
    }
    out += c;
  }
  return out;
}

/** May this selector match an element of the page? Conservative: false only when a named part is absent. */
export function selectorMayMatch(selector: string, tokens: PageTokens): boolean {
  const s = withoutPseudos(selector);
  for (const m of s.matchAll(/\.((?:\\.|[A-Za-z0-9_-])+)/g)) if (!tokens.classes.has(unescape(m[1]))) return false;
  for (const m of s.matchAll(/#((?:\\.|[A-Za-z0-9_-])+)/g)) if (!tokens.ids.has(unescape(m[1]))) return false;
  for (const m of s.matchAll(/\[\s*([A-Za-z0-9_:-]+)/g)) if (!tokens.attrs.has(m[1].toLowerCase())) return false;
  // element names: an identifier at the start of a compound (start, or after a combinator / whitespace)
  for (const m of s.matchAll(/(?:^|[\s>+~])([A-Za-z][A-Za-z0-9-]*)/g)) {
    if (!tokens.tags.has(m[1].toLowerCase())) return false;
  }
  return true;
}

const KEEP_WHOLE = /^@(?:font-face|(?:-webkit-)?keyframes|charset|import|property|counter-style|font-feature-values|layer\s+[^{]*$)/i;
const RECURSE = /^@(?:media|container|supports|layer)\b/i;

function filterBlocks(css: string, tokens: PageTokens): string {
  let out = "";
  for (const { prelude, body } of splitBlocks(css)) {
    if (body === "\u0000statement") {
      out += `${prelude};`;
      continue;
    }
    if (prelude.startsWith("@")) {
      if (KEEP_WHOLE.test(prelude)) out += `${prelude}{${body}}`;
      else if (RECURSE.test(prelude)) {
        const inner = filterBlocks(body, tokens);
        if (inner) out += `${prelude}{${inner}}`;
      } else out += `${prelude}{${body}}`; // unknown at-rule: keep (never drop what we do not understand)
      continue;
    }
    if (splitSelectors(prelude).some((sel) => selectorMayMatch(sel, tokens))) out += `${prelude}{${body}}`;
  }
  return out;
}

/** The critical subset of `css` for a page whose HTML is `html`. */
export function criticalCss(css: string, html: string): string {
  return filterBlocks(css, pageTokens(html));
}
