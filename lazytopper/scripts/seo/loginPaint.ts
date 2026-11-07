/**
 * SPEED-LOGIN-1 — `/login` PAINTS FROM STATIC HTML BEFORE THE APP BOOTS.
 *
 * ★ THE DEFECT. `/login` (825 visitors / 7 days, the sign-up gate) was served the clean SPA shell,
 * `<div id="root"></div>`. Nothing painted until the entry graph (~155 KB gz) downloaded and ran:
 * PageSpeed mobile FCP = LCP = 3.2 s, field p75 LCP 6.48 s.
 *
 * ★ THE SHAPE. The CI capture (`captureStaticBodies.ts`) records React's FIRST COMMIT of `/login` —
 * the exact DOM React itself puts on screen first — at 390 px and 1280 px, for two states: the door
 * (`door`) and the return trip from Google (`signing-in`, `SigningInScreen`). `applyPrerendered.ts`
 * writes `login.html` / `login/index.html` / `__desktop/login.html` from the noindex `__shell.html`
 * with both captures in `#root`, followed by ONE inline script (this file) that runs before the
 * browser can paint them:
 *
 *   1. it reads what React will read on its first render — the URL, the sign-in intent in
 *      sessionStorage, router state, the user agent, the viewport, the clock;
 *   2. it DECIDES: `door`, `signing-in`, or `off`;
 *   3. it REMOVES every node that is not the chosen state (`off` removes them all, leaving the
 *      empty root the shell serves today), patches the two query-dependent details of the door
 *      (the back link's words, the plans link's `?redirect=`), and only then lets the result show.
 *
 * ★ `off` IS THE SAFETY VALVE, AND IT IS CHOSEN WHENEVER THE STATIC STATE MIGHT DIFFER FROM REACT'S
 * FIRST FRAME. Every condition below is a SUPERSET of the condition under which `Login.tsx` renders
 * something other than the captured door: blank (today's behaviour) is never wrong; a door that
 * React then replaces with a different screen would be. In particular:
 *
 *   - GOOGLE REDIRECT RETURN (constraint 2). `Login.tsx` renders `SigningInScreen` iff
 *     `readSigninIntent()` (services/signinIntent.ts) returns a record. The door is shown ONLY when
 *     there is NO intent record at all; an exactly-valid record (same checks, same TTL) shows the
 *     captured `SigningInScreen`; ANY other record (expired, malformed) is `off`. So a visitor coming
 *     back from Google never sees live-looking sign-in buttons.
 *   - Static buttons are INERT (constraint 3): a capture-phase click listener swallows taps on the
 *     static nodes until React replaces them. Nothing is queued, nothing fakes success.
 *   - Firebase init order is untouched: this script imports nothing and touches no auth state.
 *
 * ⚠ THE BROWSER-SIDE FUNCTIONS HERE ARE SHIPPED AS SOURCE (`Function.prototype.toString`), the same
 * technique `captureStaticBodies.ts` uses for its strip. So they must be SELF-CONTAINED: no imports,
 * no module-scope references, no inner `const f = () => …` (esbuild's keepNames would emit `__name`
 * calls, which the shipped wrapper defines as an identity function anyway). The helpers they need
 * (`inAppBrowser`, `safeSigninRedirect`, `withSigninRedirect`) are passed in. `inAppBrowser` is the app's
 * OWN function, serialized from utils/inAppBrowser.ts. The two redirect helpers are COPIES of
 * services/freeCheckClient.ts's (that module cannot be imported here: it pulls `.tsx` into the node
 * typecheck, `tsc -b` / tsconfig.node.json); `loginPaint.guard.test.ts` pins the copies to the originals
 * source-for-source and over a fixture table, so they cannot drift apart in silence.
 */

import { join } from "node:path";
import { inAppBrowser } from "../../src/utils/inAppBrowser";
import { SIGNIN_INTENT_KEY, SIGNIN_INTENT_TTL_MS } from "../../src/services/signinIntent";
import * as pricing from "../../src/config/pricing";

/** The non-advertised paths served a paint shell. Never in the sitemap; their head is `__shell.html`'s (noindex). */
export const PAINT_PATHS: readonly string[] = ["/login"];

/** Where the paint captures live inside the committed artifact (`prerendered/`). Never a public URL. */
export const PAINT_DIR = "__paint";

export type PaintKind = "door" | "signing-in";
export const PAINT_KINDS: readonly PaintKind[] = ["door", "signing-in"];
export type PaintVariant = "mobile" | "desktop";
export const PAINT_VARIANTS: readonly PaintVariant[] = ["mobile", "desktop"];

/** `<prerendered>/__paint/login.door.html`, `<prerendered>/__paint/__desktop/login.signing-in.html`. */
export function paintFragmentPathFor(dir: string, path: string, kind: PaintKind, variant: PaintVariant): string {
  const stem = path.replace(/^\//, "");
  return variant === "desktop"
    ? join(dir, PAINT_DIR, "__desktop", `${stem}.${kind}.html`)
    : join(dir, PAINT_DIR, `${stem}.${kind}.html`);
}

/** The paint artifact's own record: which paths, and the clock window its captures hold for. */
export const PAINT_RECORD = "paint.json";
export interface PaintRecord {
  paths: string[];
  clock: { from: number; until: number };
}

/** The attribute every top-level static node carries (never present on anything React renders). */
export const PAINT_ATTR = "data-lt-paint";
/** On `<html>` once the script has chosen and patched the static state. Until then it is hidden. */
export const PAINT_READY_CLASS = "lt-paint-ready";

/** `AuthContext.tsx` LOCAL_AUTH_KEY (module-private there; `loginPaint.guard.test.ts` pins the literal). */
export const LOCAL_AUTH_KEY = "lazytopper.auth.local.v1";

/** The door's two query-dependent details, as `Login.tsx` / `OfferStrip.tsx` render them (pinned by test + parity). */
export const BACK_HOME_TEXT = "<- Back to home";
export const BACK_LANDING_TEXT = "<- Back to landing";
export const DOOR_PRICING_BASE = "/pricing?source=login";

/**
 * SPEED-SITE-1d's invisible slot for the lazy email-code door, EXACTLY as React's first commit renders
 * it (`EmailCodeDoorSlot`, Login.tsx) when `VITE_EMAIL_CODE_SIGNIN_ENABLED` is on. The CI capture
 * build does not set that flag (production does), so the committed artifact is stored WITHOUT it and
 * the build inserts it per its own flag (`withEmailCodeSlot`). `loginPaint.guard.test.tsx` renders
 * Login with the flag on and asserts this string is byte-identical to its slot.
 */
export const EMAIL_CODE_SLOT_HTML =
  '<div class="lt-method lt-method--slot" aria-hidden="true" data-testid="lt-email-code-door-slot">' +
  '<span class="lt-method-icon"><svg viewBox="0 0 24 24" width="18" height="18"></svg></span>' +
  "Sign in with email code</div>";

/** The email door button's end, after which the slot sits (the last child of `.lt-doors` before it). */
const EMAIL_DOOR_END = "Continue with email</button>";

/** The flag, read exactly as `services/emailCodeFlag.ts` reads it. */
export function emailCodeFlagOn(raw: unknown): boolean {
  return /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
}

/** The door fragment with the slot removed (artifact form). */
export function withoutEmailCodeSlot(fragment: string): string {
  return fragment.split(EMAIL_CODE_SLOT_HTML).join("");
}

/** The door fragment as THIS build's React renders its first commit: the slot iff the flag is on. Throws on an unexpected shape. */
export function withEmailCodeSlot(fragment: string, flagOn: boolean): string {
  const bare = withoutEmailCodeSlot(fragment);
  if (!flagOn) return bare;
  const at = bare.split(EMAIL_DOOR_END).length - 1;
  if (at !== 1) {
    throw new Error(
      `loginPaint: expected exactly one "${EMAIL_DOOR_END}" in the door fragment to place the email-code slot after, found ${at}`,
    );
  }
  return bare.replace(EMAIL_DOOR_END, () => `${EMAIL_DOOR_END}${EMAIL_CODE_SLOT_HTML}`);
}

/** COPY of services/freeCheckClient.ts `safeSigninRedirect` (pinned by loginPaint.guard.test.ts). */
export function safeSigninRedirect(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  if (trimmed.includes("\\")) return null;
  if (/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return null;
  return trimmed;
}

/** COPY of services/freeCheckClient.ts `withSigninRedirect` (pinned by loginPaint.guard.test.ts). */
export function withSigninRedirect(base: string, redirect: string | null): string {
  if (!redirect) return base;
  return `${base}${base.includes("?") ? "&" : "?"}redirect=${encodeURIComponent(redirect)}`;
}

/* ------------------------------------------------------------------------------------------------ *
 * THE CLOCK WINDOW. The door renders `OfferStrip`, whose copy follows the calendar (founding offer,
 * GST cut-over: every `*_MS` instant in config/pricing.ts). A capture is true only between the two
 * instants around the moment it was taken; outside that window the script chooses `off`.
 * ------------------------------------------------------------------------------------------------ */

/** Every epoch instant exported by config/pricing.ts (`*_MS`), ascending. */
export function pricingInstants(mod: Record<string, unknown> = pricing as unknown as Record<string, unknown>): number[] {
  return Object.entries(mod)
    .filter(([key, value]) => key.endsWith("_MS") && typeof value === "number" && Number.isFinite(value) && value > 1e12)
    .map(([, value]) => value as number)
    .sort((a, b) => a - b);
}

/** The window [from, until) around `now` in which no pricing instant falls. */
export function clockWindowAt(now: number, instants: readonly number[] = pricingInstants()): { from: number; until: number } {
  let from = 0;
  let until = Number.MAX_SAFE_INTEGER;
  for (const t of instants) {
    if (t <= now && t > from) from = t;
    if (t > now && t < until) until = t;
  }
  return { from, until };
}

/* ------------------------------------------------------------------------------------------------ *
 * THE DECISION — pure, self-contained, shipped as source.
 * ------------------------------------------------------------------------------------------------ */

export interface LoginPaintEnv {
  /** `location.search`. */
  search: string;
  /** sessionStorage[SIGNIN_INTENT_KEY]; null when absent or storage is unreadable (as `readSigninIntent`). */
  intentRaw: string | null;
  /** localStorage[LOCAL_AUTH_KEY]; null when absent or unreadable. */
  localAuthRaw: string | null;
  /** `history.state?.usr` — React Router's `location.state` on a cold load. */
  historyUsr: unknown;
  userAgent: string;
  standalone: boolean;
  /** matchMedia("(max-width: 1023px)") — Login's phone layout and isPhoneClient's width test. */
  narrow: boolean;
  /** matchMedia("(min-width: 1024px)") — useIsDesktop. */
  wide: boolean;
  now: number;
}

export interface LoginPaintConfig {
  /** Which capture this file carries (`middleware.ts` serves desktop clients the 1280-px one). */
  variant: PaintVariant;
  intentKey: string;
  intentTtlMs: number;
  localAuthKey: string;
  clockFrom: number;
  clockUntil: number;
  pricingBase: string;
  backHome: string;
  backLanding: string;
  attr: string;
  readyClass: string;
}

export interface LoginPaintDecision {
  kind: PaintKind | "off";
  reason: string;
  backText: string | null;
  pricingHref: string | null;
}

export interface LoginPaintHelpers {
  inApp: (userAgent: string, standalone: boolean) => unknown;
  safe: (raw: string | null | undefined) => string | null;
  withRedirect: (base: string, redirect: string | null) => string;
}

export function decideLoginPaint(
  env: LoginPaintEnv,
  config: LoginPaintConfig,
  helpers: LoginPaintHelpers,
): LoginPaintDecision {
  var off = function (reason: string): LoginPaintDecision {
    return { kind: "off", reason: reason, backText: null, pricingHref: null };
  };
  // The calendar-dependent offer copy is true only inside the window it was captured in.
  if (!(env.now >= config.clockFrom && env.now < config.clockUntil)) return off("clock");
  // Login's isPhoneClient (UA, else width <= 1023) and App's useIsDesktop (width >= 1024) must render
  // what the served capture holds: the 390-px capture is phone-first with the mobile chrome, the
  // 1280-px one is Google-first with the desktop chrome.
  var phoneUa = /Android|iPhone|iPod|Mobile/i.test(env.userAgent || "");
  if (config.variant === "mobile" ? !env.narrow : !(env.wide && !phoneUa)) return off("variant");
  // In-app browsers get the in-app note and "Open in Chrome" (not captured).
  if (helpers.inApp(env.userAgent, env.standalone) !== null) return off("in-app");
  // A local dev / E2E session (AuthContext reads it synchronously) — never the captured signed-out door.
  if (env.localAuthRaw !== null) return off("local-session");
  // Router state: phoneFirst / guestPayPhone / guestPayExisting open other steps. `from` changes nothing rendered.
  var usr = env.historyUsr;
  if (usr !== null && usr !== undefined) {
    if (typeof usr !== "object") return off("router-state");
    var keys = Object.keys(usr as object);
    for (var i = 0; i < keys.length; i += 1) if (keys[i] !== "from") return off("router-state");
  }
  var params: URLSearchParams;
  try {
    params = new URLSearchParams(env.search || "");
  } catch (e) {
    return off("search");
  }
  // ?method=phone (phone step), the email-link finish markers (finish / mode / oobCode).
  var other = ["method", "finish", "mode", "oobCode"];
  for (var j = 0; j < other.length; j += 1) if (params.has(other[j])) return off("search");
  var redirect = params.get("redirect");
  // A sign-in that interrupted a purchase shows a buy line (and a pack's loads asynchronously).
  if (redirect !== null && /buy=/i.test(redirect)) return off("buy-intent");
  // GOOGLE REDIRECT RETURN — readSigninIntent(), check for check. Any record that is not exactly
  // valid is `off`: the door shows only when there is no record at all.
  if (env.intentRaw !== null) {
    var p: { v?: unknown; method?: unknown; at?: unknown } | null;
    try {
      p = JSON.parse(env.intentRaw);
    } catch (e) {
      return off("intent");
    }
    var at = p && typeof p.at === "number" ? p.at : NaN;
    if (!p || p.v !== 1 || p.method !== "google" || !Number.isFinite(at) || env.now - at > config.intentTtlMs || at - env.now > 60000) {
      return off("intent");
    }
    return { kind: "signing-in", reason: "intent", backText: null, pricingHref: null };
  }
  return {
    kind: "door",
    reason: "door",
    backText: params.get("reason") === "start-trial" ? config.backLanding : config.backHome,
    pricingHref: helpers.withRedirect(config.pricingBase, helpers.safe(redirect)),
  };
}

/** What React reads, read the same way. Browser-only; shipped as source. */
export function gatherLoginPaintEnv(config: LoginPaintConfig): LoginPaintEnv {
  var w = window as Window & typeof globalThis;
  var nav = (w.navigator || {}) as Navigator & { standalone?: boolean };
  var read = function (area: "sessionStorage" | "localStorage", key: string): string | null {
    try {
      var store = w[area];
      return store ? store.getItem(key) : null;
    } catch (e) {
      return null;
    }
  };
  var matches = function (query: string): boolean {
    try {
      return typeof w.matchMedia === "function" && w.matchMedia(query).matches;
    } catch (e) {
      return false;
    }
  };
  var usr: unknown;
  try {
    var state = w.history.state as { usr?: unknown } | null;
    usr = state && typeof state === "object" ? state.usr : null;
  } catch (e) {
    usr = "unreadable";
  }
  return {
    search: String(w.location.search || ""),
    intentRaw: read("sessionStorage", config.intentKey),
    localAuthRaw: read("localStorage", config.localAuthKey),
    historyUsr: usr === undefined ? null : usr,
    userAgent: String(nav.userAgent || ""),
    standalone: nav.standalone === true,
    narrow: matches("(max-width: 1023px)"),
    wide: matches("(min-width: 1024px)"),
    now: Date.now(),
  };
}

/**
 * Keep only the chosen state's nodes under `root` and patch the door's two query-dependent details.
 * Returns the state left on screen (`off` = `root` emptied). Browser-only; shipped as source, and
 * run by the capture's parity check on a detached copy, so the shipped code is the tested code.
 */
export function applyLoginPaint(root: Element, decision: LoginPaintDecision, config: LoginPaintConfig): PaintKind | "off" {
  var keep = decision.kind === "door" || decision.kind === "signing-in" ? decision.kind : null;
  var nodes = Array.prototype.slice.call(root.childNodes) as ChildNode[];
  for (var i = 0; i < nodes.length; i += 1) {
    var node = nodes[i] as ChildNode & { getAttribute?: (name: string) => string | null };
    if (keep !== null && node.nodeType === 1 && node.getAttribute && node.getAttribute(config.attr) === keep) continue;
    root.removeChild(node);
  }
  if (keep === "door") {
    var back = root.querySelectorAll("a.lt-login-back-link");
    var links = root.querySelectorAll("a.lt-offer-strip-link");
    if (back.length !== 1 || links.length < 1 || decision.backText === null || decision.pricingHref === null) {
      while (root.firstChild) root.removeChild(root.firstChild);
      return "off";
    }
    if (back[0].textContent !== decision.backText) back[0].textContent = decision.backText;
    for (var j = 0; j < links.length; j += 1) {
      if (links[j].getAttribute("href") !== decision.pricingHref) links[j].setAttribute("href", decision.pricingHref);
    }
  }
  return keep === null ? "off" : keep;
}

/* ------------------------------------------------------------------------------------------------ *
 * THE SHIPPED SCRIPT AND CSS.
 * ------------------------------------------------------------------------------------------------ */

export function loginPaintConfig(variant: PaintVariant, clock: { from: number; until: number }): LoginPaintConfig {
  return {
    variant,
    intentKey: SIGNIN_INTENT_KEY,
    intentTtlMs: SIGNIN_INTENT_TTL_MS,
    localAuthKey: LOCAL_AUTH_KEY,
    clockFrom: clock.from,
    clockUntil: clock.until,
    pricingBase: DOOR_PRICING_BASE,
    backHome: BACK_HOME_TEXT,
    backLanding: BACK_LANDING_TEXT,
    attr: PAINT_ATTR,
    readyClass: PAINT_READY_CLASS,
  };
}

/** `var helpers = {...}; var decide = ...; var gather = ...; var apply = ...;` — the shared prelude. */
function prelude(config: LoginPaintConfig): string {
  return (
    `var __name=function(f){return f};` +
    `var config=${JSON.stringify(config)};` +
    `var helpers={inApp:(${inAppBrowser.toString()}),safe:(${safeSigninRedirect.toString()}),withRedirect:(${withSigninRedirect.toString()})};` +
    `var decide=(${decideLoginPaint.toString()});` +
    `var gather=(${gatherLoginPaintEnv.toString()});` +
    `var apply=(${applyLoginPaint.toString()});`
  );
}

/** An expression (for the capture's init script): the decision this page's environment yields right now. */
export function loginPaintDecisionSource(config: LoginPaintConfig): string {
  return `(function(){${prelude(config)}return decide(gather(config),config,helpers);})()`;
}

/** An expression (for the capture's parity check): `function(root, decision)` running the shipped `apply`. */
export function loginPaintApplySource(config: LoginPaintConfig): string {
  return `(function(){${prelude(config)}return function(root,decision){return apply(root,decision,config);};})()`;
}

/**
 * The inline script placed IMMEDIATELY after `#root`'s static markup. Any exception empties the root
 * (today's shell); nothing is shown until it has decided and patched.
 */
export function loginPaintScript(config: LoginPaintConfig): string {
  const body =
    `(function(){var root=document.getElementById("root");try{${prelude(config)}` +
    `var decision=decide(gather(config),config,helpers);` +
    `var shown=apply(root,decision,config);` +
    `if(shown==="off")return;` +
    `document.addEventListener("click",function(event){var t=event.target;` +
    `if(t&&t.closest&&t.closest("["+config.attr+"]")){event.preventDefault();event.stopPropagation();}},true);` +
    `document.documentElement.classList.add(config.readyClass);` +
    `}catch(error){if(root)while(root.firstChild)root.removeChild(root.firstChild);}})();`;
  if (/<\/script/i.test(body)) throw new Error("loginPaint: the shipped script contains </script");
  return `<script data-lt-paint-script>${body}</script>`;
}

/** Hides the static nodes until the script has chosen and patched them. */
export const LOGIN_PAINT_CSS =
  `<style data-lt-paint-css>html:not(.${PAINT_READY_CLASS}) #root>[${PAINT_ATTR}]{display:none!important}</style>`;

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

/**
 * Add `data-lt-paint="<kind>"` to every top-level element of `fragment` (serialized innerHTML, as the
 * capture writes it). A small tag walker, not a parser: it honours raw-text elements (`style`,
 * `script`, `textarea`, `title`), comments and void elements, which is everything innerHTML emits.
 * A non-whitespace top-level text node throws (it could not be hidden or removed by attribute).
 */
export function markTopLevel(fragment: string, kind: PaintKind): string {
  let out = "";
  let i = 0;
  let depth = 0;
  const n = fragment.length;
  while (i < n) {
    if (fragment.startsWith("<!--", i)) {
      const end = fragment.indexOf("-->", i + 4);
      if (end < 0) throw new Error("loginPaint: unterminated comment in fragment");
      if (depth === 0) throw new Error("loginPaint: a top-level comment in the fragment");
      out += fragment.slice(i, end + 3);
      i = end + 3;
      continue;
    }
    if (fragment[i] === "<") {
      const close = fragment[i + 1] === "/";
      const m = fragment.slice(i).match(/^<\/?([a-zA-Z][a-zA-Z0-9-]*)/);
      if (!m) throw new Error(`loginPaint: unexpected "<" at ${i} in fragment`);
      const name = m[1].toLowerCase();
      let end = i + 1;
      let quote: string | null = null;
      while (end < n) {
        const c = fragment[end];
        if (quote) {
          if (c === quote) quote = null;
        } else if (c === '"' || c === "'") quote = c;
        else if (c === ">") break;
        end += 1;
      }
      if (end >= n) throw new Error("loginPaint: unterminated tag in fragment");
      let tag = fragment.slice(i, end + 1);
      if (close) {
        depth -= 1;
        out += tag;
        i = end + 1;
        continue;
      }
      if (depth === 0 && !tag.includes(` ${PAINT_ATTR}=`)) {
        tag = tag.replace(/^<([a-zA-Z][a-zA-Z0-9-]*)/, `<$1 ${PAINT_ATTR}="${kind}"`);
      }
      out += tag;
      i = end + 1;
      const selfClosing = /\/>$/.test(tag);
      if (VOID.has(name) || selfClosing) continue;
      if (["style", "script", "textarea", "title"].includes(name)) {
        const endTag = fragment.toLowerCase().indexOf(`</${name}`, i);
        if (endTag < 0) throw new Error(`loginPaint: unterminated <${name}> in fragment`);
        const closeEnd = fragment.indexOf(">", endTag);
        out += fragment.slice(i, closeEnd + 1);
        i = closeEnd + 1;
        continue;
      }
      depth += 1;
      continue;
    }
    const next = fragment.indexOf("<", i);
    const text = fragment.slice(i, next < 0 ? n : next);
    if (depth === 0 && text.trim() !== "") throw new Error(`loginPaint: a top-level text node "${text.slice(0, 40)}" in the fragment`);
    out += text;
    i = next < 0 ? n : next;
  }
  if (depth !== 0) throw new Error("loginPaint: unbalanced tags in fragment");
  return out;
}

/** `<html …>` gains `data-theme="light"`: what ThemeProvider sets at mount, so Login's first render reads light. */
export const PAINT_THEME = "light";
export function withPaintTheme(html: string): string {
  const tags = html.match(/<html\b[^>]*>/gi) ?? [];
  if (tags.length !== 1) throw new Error(`loginPaint: expected exactly one <html> tag, found ${tags.length}`);
  if (/\bdata-theme=/.test(tags[0])) throw new Error(`loginPaint: the <html> tag already carries a data-theme: ${tags[0]}`);
  return html.replace(tags[0], () => tags[0].replace(/>$/, ` data-theme="${PAINT_THEME}">`));
}

/** The viewport meta every built shell carries once; the paint CSS goes right after it (before any stylesheet). */
const VIEWPORT_META = /<meta name="viewport"[^>]*>/g;

/**
 * Build one paint page from the clean (noindex) shell: theme, the hiding rule, the two states in
 * `#root`, and the script right after it. `door` / `signingIn` are artifact fragments (no marks).
 */
export function buildLoginPaintPage(
  shellHtml: string,
  fragments: { door: string; signingIn: string },
  config: LoginPaintConfig,
  emailCodeOn: boolean,
): string {
  const metas = shellHtml.match(VIEWPORT_META) ?? [];
  if (metas.length !== 1) throw new Error(`loginPaint: expected exactly one viewport meta in the shell, found ${metas.length}`);
  const emptyRoot = '<div id="root"></div>';
  if (shellHtml.split(emptyRoot).length - 1 !== 1) throw new Error("loginPaint: the shell has no single empty #root to fill");
  const door = markTopLevel(withEmailCodeSlot(fragments.door, emailCodeOn), "door");
  const signingIn = markTopLevel(fragments.signingIn, "signing-in");
  return withPaintTheme(shellHtml)
    .replace(metas[0], () => `${metas[0]}${LOGIN_PAINT_CSS}`)
    .replace(emptyRoot, () => `<div id="root">${door}${signingIn}</div>${loginPaintScript(config)}`);
}
