/**
 * SPEED-ISLANDS-1 — the island's analytics: what `RouteAnalytics` + `src/analytics/` do for a signed-out
 * visitor's first page view, without the app.
 *
 * ★ WHY COPIES AND NOT IMPORTS. `analytics.ts` imports firebase/auth and the activity client. Importing
 * it here would make Rollup move it (and Firebase) out of the app's entry into a chunk shared with the
 * island — a change to how the full app boots, which this lane may not make — or put Firebase in the
 * island. So the few functions a page view needs are COPIED, and `islandAnalytics.parity.test.ts` runs
 * every copy against the original on the same inputs and against the same vendor stubs. A change to the
 * original that is not mirrored here fails that test, not a dashboard.
 *
 * What is mirrored, per document: the vendor page view (Vercel `va`, GA4 `page_view`, Meta `PageView`),
 * the visit source (rememberVisitSourceOnce), `engaged_visit`, the `engaged_5min` / `engaged_10min`
 * minute counter, Vercel Speed Insights with its route family, and the three named events the island's
 * own controls send (`sol_hint`, `whatsapp_contact_tap`).
 *
 * ★ NO DOUBLE COUNT ON UPGRADE. When the island loads the app, the app's RouteAnalytics sends the page
 * view again and starts its own watches. `suppressAppRepeats` drops exactly the vendor hits the island
 * already sent (one page view; `engaged_visit` if sent; a counted number of replayed `sol_hint`s), and
 * `stopIslandWatches` hands the minute counter to the app with its time flushed to storage.
 */

/* ------------------------------------------------------------------ context (analytics.ts) */

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]", "0.0.0.0"]);

export function analyticsEnabled(): boolean {
  try {
    const host = window.location.hostname;
    if (LOOPBACK_HOSTS.has(host) || host.endsWith(".local")) return false;
    return window.navigator?.webdriver !== true;
  } catch {
    return false;
  }
}

const EMAIL_SEGMENT = /@|%40/i;
const OPAQUE_ID_SEGMENT = /^[A-Za-z0-9_-]{20,}$/;
const CONTENT_SLUG_SEGMENT = /^[a-z]+(?:-[a-z0-9]+)*$/;
const LONG_DIGIT_RUN = /[0-9]{6,}/g;

function redactSegment(segment: string): string {
  if (EMAIL_SEGMENT.test(segment)) return ":email";
  if (OPAQUE_ID_SEGMENT.test(segment) && !CONTENT_SLUG_SEGMENT.test(segment)) return ":id";
  return segment.replace(LONG_DIGIT_RUN, ":num");
}

/** Copy of analytics.ts `normalisePath`. */
export function normalisePath(rawPath: string): string {
  let path = String(rawPath || "/").split("?")[0].split("#")[0];
  if (!path.startsWith("/")) path = `/${path}`;
  if (/^\/u\/[^/]+.*$/.test(path)) path = "/u/:token";
  path = path.split("/").map(redactSegment).join("/");
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (path.length > 200) path = path.slice(0, 200);
  return path;
}

/** The app is served at the domain root (ROOT-URL-1): the router path IS the pathname. */
export function routerPathOf(pathname: string): string {
  return String(pathname || "/");
}

const ADMIN_PATH = /^\/admin(?:\/|$)/;

function isInternalDevice(): boolean {
  try {
    return window.localStorage.getItem("lazytopper.internal") === "1";
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ vendors (analytics.ts send) */

type AnyFn = (...args: unknown[]) => unknown;
type Win = Window & { va?: AnyFn; gtag?: AnyFn; fbq?: AnyFn & { callMethod?: unknown; queue?: unknown } };
const win = (): Win => window as Win;

export function ga4PageLocation(routerPath: string, search: string, origin: string): string {
  const kept: string[] = [];
  for (const part of String(search || "").replace(/^\?/, "").split("&")) {
    const key = part.split("=")[0];
    if (key === "gclid" || key.indexOf("utm_") === 0) kept.push(part);
  }
  return `${origin}${normalisePath(routerPath)}${kept.length ? `?${kept.join("&")}` : ""}`;
}

export function ga4PageReferrer(referrer: string): string {
  const match = /^(https?:\/\/)(?:[^/?#@]*@)?([^/?#@]+)/i.exec(String(referrer || ""));
  return match ? `${match[1]}${match[2]}/` : "";
}

const META_QUERY_KEEP = /^(?:utm_.*|fbclid|gclid|cbq|ct)$/;

function metaQueryAndHashAreClean(search: string, hash: string): boolean {
  if (hash && hash !== "#") return false;
  for (const part of String(search || "").replace(/^\?/, "").split("&")) {
    if (part && !META_QUERY_KEEP.test(part.split("=")[0])) return false;
  }
  return true;
}

function metaPathIsClean(pathname: string): boolean {
  const full = String(pathname || "/");
  if (/^(?:\/app)?\/u(?:\/|$)/.test(full)) return false;
  return normalisePath(full) === full;
}

const siteOf = (host: string): string => String(host || "").toLowerCase().replace(/^www\./, "");

export function metaAddressIsClean(
  loc: { pathname: string; search: string; hash: string; hostname: string },
  referrer: string,
): boolean {
  if (!metaPathIsClean(loc.pathname) || !metaQueryAndHashAreClean(loc.search, loc.hash)) return false;
  const ref = String(referrer || "");
  if (!ref) return true;
  let url: URL;
  try {
    url = new URL(ref);
  } catch {
    return false;
  }
  if (!metaQueryAndHashAreClean(url.search, url.hash)) return false;
  return siteOf(url.hostname) !== siteOf(loc.hostname) || metaPathIsClean(url.pathname);
}

/** analytics.ts META_EVENTS, for the names the island can send. */
const META_EVENTS: Record<string, readonly [string, string]> = {
  engaged_10min: ["trackCustom", "Engaged10Min"],
  engaged_5min: ["trackCustom", "Engaged5Min"],
};

const metaPending: unknown[][] = [];
let metaListening = false;

function sendToMeta(kind: "pageview" | "event", name: string | undefined): void {
  const fbq = win().fbq;
  if (typeof fbq !== "function") return;
  if (!metaAddressIsClean(window.location, document.referrer)) {
    metaPending.length = 0;
    const queue = fbq.queue;
    if (Array.isArray(queue)) {
      for (let i = queue.length - 1; i >= 0; i--) {
        const method = (queue[i] as ArrayLike<unknown> | undefined)?.[0];
        if (method === "track" || method === "trackCustom") queue.splice(i, 1);
      }
    }
    return;
  }
  const call = kind === "pageview" ? ["track", "PageView"] : name && META_EVENTS[name] ? [...META_EVENTS[name]] : null;
  if (!call) return;
  if (typeof fbq.callMethod === "function") {
    fbq(...call);
    return;
  }
  metaPending.push(call);
  if (metaPending.length > 20) metaPending.shift();
  if (!metaListening) {
    metaListening = true;
    window.addEventListener("lt:fbq-ready", () => {
      const calls = metaPending.splice(0);
      try {
        const ready = win().fbq;
        if (typeof ready !== "function" || !metaAddressIsClean(window.location, document.referrer)) return;
        for (const c of calls) ready(...c);
      } catch {
        /* analytics must never break the page */
      }
    });
  }
}

function send(kind: "pageview" | "event", payload: Record<string, unknown>, ga4Params?: Record<string, unknown>): void {
  if (!analyticsEnabled()) return;
  const routerPath = kind === "pageview" && typeof payload.path === "string" ? payload.path : routerPathOf(window.location.pathname);
  if (ADMIN_PATH.test(routerPath)) return;
  try {
    const va = win().va;
    if (typeof va === "function") va.call(window, kind, payload);
  } catch {
    /* analytics must never break the page */
  }
  try {
    const gtag = win().gtag;
    const name = kind === "pageview" ? "page_view" : payload.name;
    if (typeof gtag === "function" && typeof name === "string" && name) {
      const loc = window.location;
      const page: Record<string, string> = {
        page_location: ga4PageLocation(routerPath, loc.search, loc.origin),
        page_referrer: ga4PageReferrer(document.referrer),
      };
      if (isInternalDevice()) page.traffic_type = "internal";
      gtag("set", page);
      gtag("event", name, { ...(ga4Params ?? {}), ...page });
    }
  } catch {
    /* analytics must never break the page */
  }
  try {
    sendToMeta(kind, typeof payload.name === "string" ? payload.name : undefined);
  } catch {
    /* analytics must never break the page */
  }
}

/** trackNamedEvent(name) — a bare named event. */
export function sendNamedEvent(name: string): void {
  send("event", { name });
}

/** trackWhatsAppContactTap(placement). */
export function sendWhatsAppTap(placement: string): void {
  send("event", { name: "whatsapp_contact_tap", data: { placement } });
}

/* ------------------------------------------------------------------ visit source (visitSource.ts) */

const VISIT_SOURCE_KEY = "lazytopper.visitSource";
const LONG_KEEP_KEY = "lazytopper.visitSourceKeep";
const LONG_KEEP_MS = 7 * 24 * 60 * 60 * 1000;
const GUIDE_INTENT_KEY = "lazytopper.guideIntent";
const START_HERE_SUBJECT_HINT_KEY = "lazytopper.startHereSubject";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
const UTM_CHARSET = /^[A-Za-z0-9_.\-{}]+$/;
const HOST_CHARSET = /^[a-z0-9.-]{1,253}$/;
const LANDING_CHARSET = /^\/[A-Za-z0-9_\-./:]*$/;
const MOBILE_SHAPE = /(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{9}(?!\d)/;

interface VisitSource {
  ref: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  landing: string;
  gclid: boolean;
  fbclid: boolean;
  gbraid?: boolean;
  wbraid?: boolean;
}

function cleanUtm(raw: string | null): string | null {
  if (raw === null) return null;
  const value = raw.trim().slice(0, 64);
  if (value.length === 0 || !UTM_CHARSET.test(value) || MOBILE_SHAPE.test(value)) return null;
  return value;
}

function redactPhoneSegments(path: string): string {
  return path
    .split("/")
    .map((seg) => {
      let decoded = seg;
      try {
        decoded = decodeURIComponent(seg);
      } catch {
        /* keep the raw segment */
      }
      return MOBILE_SHAPE.test(decoded) || MOBILE_SHAPE.test(seg) ? ":id" : seg;
    })
    .join("/");
}

function cleanLanding(pathname: string): string {
  const path = redactPhoneSegments(normalisePath(pathname));
  return LANDING_CHARSET.test(path) ? path : "/";
}

const bareHost = (host: string): string => host.toLowerCase().replace(/^www\./, "");

/** Copy of visitSource.ts `captureVisitSource`. */
export function captureVisitSource(location: { pathname: string; search: string }, referrer: string, ownHost: string): VisitSource | null {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(location.search || "");
  } catch {
    params = new URLSearchParams();
  }
  let kind: "none" | "same" | "cross" = "none";
  let host = "";
  try {
    const url = new URL(String(referrer || ""));
    if (url.protocol === "https:" || url.protocol === "http:") {
      host = url.hostname.toLowerCase();
      if (HOST_CHARSET.test(host)) {
        const own = bareHost(ownHost);
        const theirs = bareHost(host);
        kind = own && (theirs === own || theirs.endsWith(`.${own}`)) ? "same" : "cross";
      }
    }
  } catch {
    kind = "none";
  }
  const ref = kind === "cross" ? host : null;
  const utm = {
    utm_source: cleanUtm(params.get(UTM_KEYS[0])),
    utm_medium: cleanUtm(params.get(UTM_KEYS[1])),
    utm_campaign: cleanUtm(params.get(UTM_KEYS[2])),
    utm_content: cleanUtm(params.get(UTM_KEYS[3])),
  };
  const carried = new Set((params.get("lt_clk") ?? "").split(",").map((x) => x.trim()));
  const flag = (k: string) => (params.get(k) ?? "") !== "" || carried.has(k);
  const gclid = flag("gclid");
  const fbclid = flag("fbclid");
  const gbraid = flag("gbraid");
  const wbraid = flag("wbraid");
  const tagged = ref !== null || gclid || fbclid || gbraid || wbraid || Object.values(utm).some((v) => v !== null);
  if (kind === "same" && !tagged) return null;
  return {
    ref,
    ...utm,
    landing: cleanLanding(location.pathname),
    gclid,
    fbclid,
    ...(gbraid ? { gbraid: true } : {}),
    ...(wbraid ? { wbraid: true } : {}),
  };
}

function isTaggedSource(source: Partial<VisitSource> | null | undefined): boolean {
  if (!source || typeof source !== "object") return false;
  return (
    [source.utm_source, source.utm_medium, source.utm_campaign, source.utm_content].some((v) => typeof v === "string" && v !== "") ||
    source.gclid === true ||
    source.fbclid === true ||
    source.gbraid === true ||
    source.wbraid === true
  );
}

function parseStored(raw: string | null): VisitSource | null {
  if (raw === null) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as VisitSource) : null;
  } catch {
    return null;
  }
}

function sanitiseStored(v: unknown): VisitSource | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const str = (x: unknown) => (typeof x === "string" ? x : null);
  const ref = str(o.ref);
  const landing = str(o.landing);
  return {
    ref: ref !== null && HOST_CHARSET.test(ref) ? ref : null,
    utm_source: cleanUtm(str(o.utm_source)),
    utm_medium: cleanUtm(str(o.utm_medium)),
    utm_campaign: cleanUtm(str(o.utm_campaign)),
    utm_content: cleanUtm(str(o.utm_content)),
    landing: landing !== null && landing.length <= 200 && LANDING_CHARSET.test(landing) ? redactPhoneSegments(landing) : "/",
    gclid: o.gclid === true,
    fbclid: o.fbclid === true,
    ...(o.gbraid === true ? { gbraid: true } : {}),
    ...(o.wbraid === true ? { wbraid: true } : {}),
  };
}

function readLongKeep(): VisitSource | null {
  try {
    const raw = window.localStorage.getItem(LONG_KEEP_KEY);
    if (raw === null) return null;
    const nowMs = Date.now();
    const entry = JSON.parse(raw) as { v?: unknown; exp?: unknown } | null;
    const exp = entry && typeof entry.exp === "number" ? entry.exp : 0;
    if (!entry || exp <= nowMs || exp > nowMs + LONG_KEEP_MS + 60_000) {
      window.localStorage.removeItem(LONG_KEEP_KEY);
      return null;
    }
    const clean = sanitiseStored(entry.v);
    return clean && isTaggedSource(clean) ? clean : null;
  } catch {
    return null;
  }
}

/** Copy of visitSource.ts `rememberVisitSourceOnce` (once per island document). */
export function rememberVisitSource(
  location: { pathname: string; search: string } = window.location,
  referrer: string = document.referrer,
  ownHost: string = window.location.hostname,
): void {
  try {
    if (window.sessionStorage.getItem(START_HERE_SUBJECT_HINT_KEY) === null) {
      const search = location.search || "";
      const content = String(cleanUtm(new URLSearchParams(search).get("utm_content")) || "").trim().toLowerCase();
      const hint =
        content === "cbq_short" ? "Maths" : content.indexOf("sci_") === 0 ? "Science" : new URLSearchParams(search).get("cbq") === "1" && !content.startsWith("sci_") ? "Maths" : null;
      if (hint) window.sessionStorage.setItem(START_HERE_SUBJECT_HINT_KEY, hint);
    }
  } catch {
    /* blocked storage: the card just asks */
  }
  try {
    const captured = captureVisitSource(location, referrer, ownHost);
    const raw = window.sessionStorage.getItem(VISIT_SOURCE_KEY);
    const keepStored = raw !== null && isTaggedSource(parseStored(raw));
    if (captured && !keepStored && (raw === null || isTaggedSource(captured))) {
      window.sessionStorage.setItem(VISIT_SOURCE_KEY, JSON.stringify(captured));
      try {
        window.sessionStorage.setItem(
          GUIDE_INTENT_KEY,
          JSON.stringify({ landing: captured.landing, utm_content: captured.utm_content, utm_campaign: captured.utm_campaign }),
        );
      } catch {
        /* blocked storage */
      }
    }
    if (captured && isTaggedSource(captured) && !readLongKeep()) {
      try {
        window.localStorage.setItem(LONG_KEEP_KEY, JSON.stringify({ v: captured, exp: Date.now() + LONG_KEEP_MS }));
      } catch {
        /* blocked storage: the tab copy still works */
      }
    }
  } catch {
    /* blocked storage: the source simply is not recorded */
  }
}

/* ------------------------------------------------------------------ engaged_visit (engagedVisit.ts) */

const ENGAGED_VISIBLE_MS = 10_000;
const ENGAGED_SCROLL_PX = 200;
const LISTEN: AddEventListenerOptions = { capture: true, passive: true };
const visible = (): boolean => {
  try {
    return document.visibilityState === "visible";
  } catch {
    return false;
  }
};
const monoNow = (): number => {
  try {
    return performance.now();
  } catch {
    return 0;
  }
};

const ev = { started: false, done: false, sent: false, timeSpent: false, visibleMs: 0, since: null as number | null, timer: null as ReturnType<typeof setTimeout> | null, startY: 0 };

function evAttempt(trigger: "time" | "interaction"): void {
  if (ev.done || !visible()) return;
  if (!analyticsEnabled() || ADMIN_PATH.test(routerPathOf(window.location.pathname))) return;
  const data = { trigger, path: normalisePath(routerPathOf(window.location.pathname)) };
  send("event", { name: "engaged_visit", data }, data);
  ev.sent = true;
  evStop();
}
function evArm(): void {
  if (ev.timer !== null) clearTimeout(ev.timer);
  ev.timer = null;
  if (ev.done || ev.timeSpent) return;
  ev.timer = setTimeout(() => {
    ev.timer = null;
    ev.timeSpent = true;
    evAttempt("time");
  }, Math.max(0, ENGAGED_VISIBLE_MS - ev.visibleMs));
}
function evVisibility(): void {
  if (ev.done) return;
  if (visible()) {
    if (ev.since === null) {
      ev.since = monoNow();
      evArm();
    }
  } else {
    if (ev.since !== null) {
      ev.visibleMs += Math.max(0, monoNow() - ev.since);
      ev.since = null;
    }
    if (ev.timer !== null) clearTimeout(ev.timer);
    ev.timer = null;
  }
}
const evInteraction = (): void => evAttempt("interaction");
const evScroll = (): void => {
  if (Math.abs((Number(window.scrollY) || 0) - ev.startY) > ENGAGED_SCROLL_PX) evAttempt("interaction");
};
function evStop(): void {
  ev.done = true;
  if (ev.timer !== null) clearTimeout(ev.timer);
  ev.timer = null;
  window.removeEventListener("pointerdown", evInteraction, LISTEN);
  window.removeEventListener("keydown", evInteraction, LISTEN);
  window.removeEventListener("scroll", evScroll, LISTEN);
  document.removeEventListener("visibilitychange", evVisibility);
}
function startEngagedVisit(): void {
  if (ev.started) return;
  ev.started = true;
  ev.startY = Number(window.scrollY) || 0;
  window.addEventListener("pointerdown", evInteraction, LISTEN);
  window.addEventListener("keydown", evInteraction, LISTEN);
  window.addEventListener("scroll", evScroll, LISTEN);
  document.addEventListener("visibilitychange", evVisibility);
  if (visible()) {
    ev.since = monoNow();
    evArm();
  }
}

/* ------------------------------------------------------------------ engaged_5min / 10min (engaged10.ts) */

const ENGAGED5_MS = 5 * 60_000;
const ENGAGED10_MS = 10 * 60_000;
const TICK_MS = 5_000;
const IDLE_MS = 5 * 60_000;
const WRITE_MS = 15_000;
const ENGAGED10_KEY = "lazytopper.engaged10";
const IST_OFFSET_MS = 330 * 60_000;
const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"];
type Stored = { day: string; ms: number; sent: boolean; sent5: boolean; act: number };
const EMPTY: Stored = { day: "", ms: 0, sent: false, sent5: false, act: 0 };
const e10 = { started: false, interval: null as ReturnType<typeof setInterval> | null, lastTick: null as number | null, memAct: 0, mem: { ...EMPTY } as Stored, pending: 0 };

const istDay = (wall: number): string => new Date(wall + IST_OFFSET_MS).toISOString().slice(0, 10);

function readStored(): Stored | null {
  try {
    const raw = window.localStorage.getItem(ENGAGED10_KEY);
    if (!raw) return { ...EMPTY };
    const v = JSON.parse(raw) as Partial<Stored> | null;
    if (!v || typeof v.day !== "string" || typeof v.ms !== "number" || !(v.ms >= 0)) return { ...EMPTY };
    const sent = v.sent === true;
    return { day: v.day, ms: v.ms, sent, sent5: v.sent5 === true || sent, act: typeof v.act === "number" && v.act > 0 ? v.act : 0 };
  } catch {
    return null;
  }
}
function writeStored(rec: Stored): void {
  try {
    window.localStorage.setItem(ENGAGED10_KEY, JSON.stringify(rec));
  } catch {
    /* in-memory copy carries this document */
  }
}
const e10Allowed = (): boolean => analyticsEnabled() && !ADMIN_PATH.test(routerPathOf(window.location.pathname));

function credit(slice: number, flushIn: boolean): void {
  if (!e10Allowed()) return;
  let flush = flushIn;
  const wall = Date.now();
  const day = istDay(wall);
  const stored = readStored();
  const fromMemory = stored === null;
  const base = stored === null ? e10.mem : stored;
  const rec = base.day === day ? { ...base } : { ...EMPTY, day };
  if (e10.mem.day === day && e10.mem.sent) rec.sent = true;
  if (e10.mem.day === day && e10.mem.sent5) rec.sent5 = true;
  if (rec.sent) rec.sent5 = true;
  if (e10.mem.day === day && e10.mem.act > rec.act) rec.act = e10.mem.act;
  if (rec.sent && rec.sent5) {
    e10.mem = rec;
    e10.pending = 0;
    return;
  }
  let act = Math.max(rec.act, e10.memAct);
  if (act === 0) act = wall;
  if (wall - act > IDLE_MS) {
    rec.act = act;
    e10.mem = rec;
    return;
  }
  rec.act = act;
  rec.ms += slice + (fromMemory ? 0 : e10.pending);
  e10.pending += slice;
  if (rec.ms >= ENGAGED5_MS && !rec.sent5) {
    if (e10Allowed()) {
      sendNamedEvent("engaged_5min");
      rec.sent5 = true;
    }
    flush = true;
  }
  if (rec.ms >= ENGAGED10_MS && !rec.sent) {
    if (e10Allowed()) {
      sendNamedEvent("engaged_10min");
      rec.sent = true;
    }
    flush = true;
  }
  e10.mem = rec;
  if (flush || e10.pending >= WRITE_MS) {
    writeStored(rec);
    e10.pending = 0;
  }
}
function e10Tick(): void {
  const now = monoNow();
  if (!visible()) {
    e10.lastTick = null;
    return;
  }
  const since = e10.lastTick === null ? 0 : now - e10.lastTick;
  e10.lastTick = now;
  const slice = Math.min(Math.max(0, since), TICK_MS * 2);
  if (slice > 0) credit(slice, false);
}
function e10StartTicker(): void {
  if (e10.interval !== null) return;
  e10.lastTick = monoNow();
  e10.interval = setInterval(e10Tick, TICK_MS);
}
function e10StopTicker(): void {
  if (e10.interval !== null) clearInterval(e10.interval);
  e10.interval = null;
}
/** Credit the time since the last tick and write it (visibility hidden, or the hand-over to the app). */
function e10Flush(): void {
  if (e10.lastTick !== null) {
    const slice = Math.min(Math.max(0, monoNow() - e10.lastTick), TICK_MS);
    if (slice > 0) credit(slice, true);
    else if (e10.pending > 0) {
      writeStored(e10.mem);
      e10.pending = 0;
    }
  }
  e10.lastTick = null;
}
function e10Visibility(): void {
  if (visible()) {
    e10StartTicker();
    return;
  }
  e10Flush();
  e10StopTicker();
}
const e10Activity = (): void => {
  e10.memAct = Date.now();
};
function startEngaged10(): void {
  if (e10.started) return;
  e10.started = true;
  for (const name of ACTIVITY_EVENTS) window.addEventListener(name, e10Activity, LISTEN);
  document.addEventListener("visibilitychange", e10Visibility);
  if (visible()) e10StartTicker();
}

/* ------------------------------------------------------------------ Speed Insights (speedInsights.ts) */

const KNOWN_TOP_LEVEL = new Set([
  "/", "/welcome", "/browse", "/login", "/sign-up", "/pricing", "/packs", "/exam-trends", "/practice-hub",
  "/check-improve", "/check-your-answer", "/for-parents", "/contact", "/cbq-class-10", "/highly-probable",
  "/ncert-class-10", "/topic-hub", "/me", "/tutor", "/intent", "/practice", "/notes", "/funnel", "/admin",
]);
const STATIC_MULTI_SEGMENT = new Set(["/cbse/class-10", "/practice/worksheets", "/practice/worksheets/ready"]);
const FAMILY: ReadonlyArray<[RegExp, string]> = [
  [/^\/notes\/[^/]+$/, "/notes/[chapter]"],
  [/^\/cbq-class-10\/[^/]+$/, "/cbq-class-10/[chapter]"],
  [/^\/topic-hub\/[^/]+$/, "/topic-hub/[chapter]"],
  [/^\/topic-hub\/[^/]+\/[^/]+$/, "/topic-hub/[grade]/[subject]"],
  [/^\/topic-hub\/[^/]+\/[^/]+\/[^/]+$/, "/topic-hub/[grade]/[subject]/[topic]"],
  [/^\/highly-probable\/[^/]+\/[^/]+$/, "/highly-probable/[grade]/[subject]"],
  [/^\/practice\/[^/]+\/[^/]+$/, "/practice/[grade]/[subject]"],
  [/^\/legal\/[^/]+$/, "/legal/[page]"],
];

/** Copy of speedInsights.ts `speedRouteFor`. */
export function speedRouteFor(routerPath: string): string {
  const path = normalisePath(routerPath);
  if (STATIC_MULTI_SEGMENT.has(path)) return path;
  for (const [pattern, family] of FAMILY) if (pattern.test(path)) return family;
  const segments = path.split("/").filter(Boolean);
  if (segments.length <= 1) return KNOWN_TOP_LEVEL.has(path) ? path : "/[other]";
  const first = segments[0];
  return KNOWN_TOP_LEVEL.has(`/${first}`) || /^ncert-(solutions|exemplar)$/.test(first) || first === "legal" || first === "chapter-test" || first === "full-mock" || first === "cbse"
    ? `/${first}/[…]`
    : "/[other]";
}

/** Copy of speedInsights.ts `scrubSpeedEvent`. */
export function scrubSpeedEvent<T extends { url: string; route?: string }>(event: T): T | null {
  try {
    const u = new URL(event.url, window.location.origin);
    const routerPath = routerPathOf(u.pathname);
    if (ADMIN_PATH.test(routerPath) || /^\/u\/[^/]+/.test(routerPath)) return null;
    return { ...event, url: `${u.origin}${normalisePath(u.pathname)}`, route: speedRouteFor(routerPath) };
  } catch {
    return null;
  }
}

/** What `injectSpeedInsights({ beforeSend, sampleRate: 0.5, route })` (@vercel/speed-insights 2.0.0) does. */
export function injectSpeedInsights(routerPath: string): void {
  const w = window as unknown as { si?: AnyFn; siq?: unknown[] };
  if (!w.si) {
    w.si = function si(...params: unknown[]) {
      w.siq = w.siq || [];
      w.siq.push(params);
    };
  }
  const src = "/_vercel/speed-insights/script.js";
  if (document.head.querySelector(`script[src*="${src}"]`)) return;
  w.si("beforeSend", scrubSpeedEvent);
  const script = document.createElement("script");
  script.src = src;
  script.defer = true;
  script.dataset.sdkn = "@vercel/speed-insights";
  script.dataset.sdkv = "2.0.0";
  script.dataset.sampleRate = "0.5";
  script.dataset.route = speedRouteFor(routerPath);
  document.head.appendChild(script);
}

function onIdle(fn: () => void, timeout: number, fallback: number): void {
  const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void };
  if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(fn, { timeout });
  else window.setTimeout(fn, fallback);
}

/* ------------------------------------------------------------------ the island's page view */

let pageviewSent = false;

/** RouteAnalytics' first effect, for an island document. */
export function startIslandAnalytics(): void {
  if (pageviewSent) return;
  pageviewSent = true;
  const path = routerPathOf(window.location.pathname);
  try {
    rememberVisitSource();
  } catch {
    /* a source is never worth a broken page view */
  }
  try {
    if (analyticsEnabled()) {
      startEngagedVisit();
      // analytics.ts starts the minute counter on idle (timeout 2 s), after loading its chunk.
      onIdle(startEngaged10, 2000, 2000);
    }
  } catch {
    /* analytics must never break the page */
  }
  const clean = normalisePath(path);
  send("pageview", { route: clean, path: clean });
  try {
    if (analyticsEnabled() && !ADMIN_PATH.test(path) && !/^\/u\/[^/]+/.test(path)) onIdle(() => injectSpeedInsights(path), 4000, 2500);
  } catch {
    /* a blocked speed script is never worth a broken page */
  }
}

/* ------------------------------------------------------------------ the hand-over to the app */

/** Stop the island's watches: the minute counter's time is written to storage for the app to resume. */
export function stopIslandWatches(): void {
  try {
    evStop();
    if (e10.started) {
      e10Flush();
      e10StopTicker();
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, e10Activity, LISTEN);
      document.removeEventListener("visibilitychange", e10Visibility);
    }
  } catch {
    /* analytics must never break the page */
  }
}

/**
 * Drop the vendor hits the app repeats when it boots on an island page: one page view (each vendor),
 * every `engaged_visit` if the island already sent it, and `extra` named events (replayed toggles).
 * Wraps `va`, `gtag` and `fbq` in place with a Proxy, so every property (fbq.callMethod, queue) and
 * every other call passes through unchanged.
 */
export function suppressAppRepeats(extra: Record<string, number> = {}): (name: string, count: number) => void {
  const noop = () => undefined;
  if (!pageviewSent) return noop;
  // One counter per vendor and hit: `pageview` (va), `page_view` (GA4), `PageView` (Meta), and
  // `va:<name>` / `ga:<name>` for named events.
  const drops: Record<string, number> = { pageview: 1, page_view: 1, PageView: 1 };
  for (const [name, n] of Object.entries(extra)) {
    drops[`va:${name}`] = n;
    drops[`ga:${name}`] = n;
  }
  if (ev.sent) {
    drops["va:engaged_visit"] = Number.POSITIVE_INFINITY;
    drops["ga:engaged_visit"] = Number.POSITIVE_INFINITY;
  }
  const take = (key: string | undefined): boolean => {
    if (!key || !(drops[key] > 0)) return false;
    drops[key] -= 1;
    return true;
  };
  const wrap = (name: "va" | "gtag" | "fbq", shouldDrop: (args: unknown[]) => boolean): void => {
    const w = win();
    const original = w[name];
    if (typeof original !== "function") return;
    w[name] = new Proxy(original, {
      apply(target, thisArg, args: unknown[]) {
        if (shouldDrop(args)) return undefined;
        return Reflect.apply(target, thisArg, args);
      },
    }) as never;
  };
  wrap("va", (args) => {
    if (args[0] === "pageview") return take("pageview");
    const payload = args[1] as { name?: unknown } | undefined;
    return args[0] === "event" && typeof payload?.name === "string" && take(`va:${payload.name}`);
  });
  wrap("gtag", (args) => args[0] === "event" && typeof args[1] === "string" && take(args[1] === "page_view" ? "page_view" : `ga:${args[1]}`));
  wrap("fbq", (args) => args[0] === "track" && args[1] === "PageView" && take("PageView"));
  return (name: string, count: number) => {
    drops[`va:${name}`] = (drops[`va:${name}`] ?? 0) + count;
    drops[`ga:${name}`] = (drops[`ga:${name}`] ?? 0) + count;
  };
}

/** Tests only: a fresh document. */
export function __resetForTests(): void {
  stopIslandWatches();
  pageviewSent = false;
  Object.assign(ev, { started: false, done: false, sent: false, timeSpent: false, visibleMs: 0, since: null, timer: null, startY: 0 });
  Object.assign(e10, { started: false, interval: null, lastTick: null, memAct: 0, mem: { ...EMPTY }, pending: 0 });
}
