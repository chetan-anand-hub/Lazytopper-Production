/**
 * GST-INVOICE-1 - "Your state" before Pay, on EVERY checkout path (owner rulings 6 Nov 2026).
 *
 * A GST tax invoice must name the buyer's state (CBIC Circular 242/36/2024-GST: the supplier records the recipient's
 * state; it may NOT default to its own). So before an order is created, every order function in the client
 * (checkout.ts createPayOrder / createPackOrder, guestPay.ts createGuestOrder, checkoutWho.ts createWhoOrder,
 * parentPay.ts createParentOrder, parentPayPack.ts createParentPackOrder) calls `gstBuyerForOrder()`:
 *   - flag VITE_GST_STATE_FIELD off (the default) -> undefined at once: no dialog, no network, the order body is
 *     byte-identical to before;
 *   - a SIGNED-IN student whose state the server already has (from their own earlier order) -> that state, no dialog
 *     ("asked once and remembered");
 *   - otherwise a small dialog: the state select, PRE-FILLED from the IP region when the server can tell (else from this
 *     device's last choice, else unselected - there is NO Karnataka default), an optional PIN, and a "Buying for a school
 *     or coaching centre?" link that opens GSTIN + legal name + address. The common case is one tap (Continue).
 *   Cancel -> GstBuyerCancelledError, which every buy function treats exactly like closing Razorpay ("dismissed").
 * ★ The state is REQUIRED before Pay; the PIN is optional (6 digits). A GSTIN must pass its checksum and its first two
 *   digits must be the chosen state's code. The server re-checks all of it and never refuses an order over it.
 * ★ Plain DOM, like priceConfirm.ts: it works over any sheet on any surface, at 360 px and 1280 px.
 */
import "./gstBuyer.css";

export interface GstBusiness {
  gstin: string;
  legalName: string;
  address: string;
}
export interface GstBuyer {
  stateCode: string;
  pin?: string;
  business?: GstBusiness;
}

/** The 36 States / UTs with their GST codes. Mirrors server/services/gstInvoice.cjs GST_STATES (parity-tested). */
export const GST_STATES: ReadonlyArray<{ code: string; name: string }> = Object.freeze([
  { code: "01", name: "Jammu and Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman and Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
]);
const STATE_CODES = new Set(GST_STATES.map((s) => s.code));
export const isGstStateCode = (code: unknown): code is string => typeof code === "string" && STATE_CODES.has(code);

/** The ONE reader of VITE_GST_STATE_FIELD (default off). */
export function isGstStateFieldOn(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_GST_STATE_FIELD;
    return /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return false;
  }
}

/* ── Validation (PURE) ───────────────────────────────────────────────────────── */

const GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const normaliseGstin = (raw: string): string => String(raw || "").replace(/\s+/g, "").toUpperCase();

/** 15 characters, a real state code first, the mod-36 check character right. */
export function isValidGstin(raw: string): boolean {
  const g = normaliseGstin(raw);
  if (!/^[0-9]{2}[A-Z0-9]{12}[A-Z0-9]$/.test(g) || !isGstStateCode(g.slice(0, 2))) return false;
  let sum = 0;
  for (let i = 0; i < 14; i += 1) {
    const v = GSTIN_CHARS.indexOf(g[i]);
    if (v < 0) return false;
    const p = v * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(p / 36) + (p % 36);
  }
  return GSTIN_CHARS[(36 - (sum % 36)) % 36] === g[14];
}
export const isValidPin = (pin: string): boolean => /^[1-9][0-9]{5}$/.test(pin);

/** PURE. The error to show, or null when the form can be submitted. */
export function gstFormError(input: { stateCode: string; pin: string; business: GstBusiness | null }): string | null {
  if (!isGstStateCode(input.stateCode)) return "Choose your state to continue.";
  if (input.pin && !isValidPin(input.pin)) return "PIN code must be 6 digits.";
  const b = input.business;
  if (b) {
    const g = normaliseGstin(b.gstin);
    if (!isValidGstin(g)) return "That GSTIN does not look right. Check all 15 characters.";
    if (g.slice(0, 2) !== input.stateCode) return "The GSTIN's first two digits must match the state you chose.";
    if (b.legalName.trim().length < 2) return "Enter the legal name on the GST registration.";
    if (b.address.trim().length < 5) return "Enter the billing address.";
  }
  return null;
}

/* ── This device's last choice (a per-viewer convenience; the server keeps the signed-in record) ─────────── */

/** localStorage key: `{ stateCode, pin? }` - the state and PIN this device last confirmed. Never a GSTIN. Registered in studentDataMap.ts. */
export const GST_BUYER_KEY = "lazytopper.gstBuyerState";

function readLocal(): { stateCode: string; pin?: string } | null {
  try {
    const v = JSON.parse(localStorage.getItem(GST_BUYER_KEY) || "null") as { stateCode?: unknown; pin?: unknown } | null;
    if (!v || !isGstStateCode(v.stateCode)) return null;
    return { stateCode: v.stateCode, ...(typeof v.pin === "string" && isValidPin(v.pin) ? { pin: v.pin } : {}) };
  } catch {
    return null;
  }
}
function writeLocal(b: GstBuyer): void {
  try {
    localStorage.setItem(GST_BUYER_KEY, JSON.stringify({ stateCode: b.stateCode, ...(b.pin ? { pin: b.pin } : {}) }));
  } catch {
    /* a convenience only */
  }
}

/* ── The server's context: the IP pre-fill and the signed-in student's remembered state ─────────────────── */

export const GST_CHECKOUT_CONTEXT_ENDPOINT = "/api/gst/checkout-context";
const CONTEXT_TIMEOUT_MS = 2500;

export interface GstCheckoutContext {
  ipStateCode: string | null;
  remembered: GstBuyer | null;
}

function cleanBuyer(v: unknown): GstBuyer | null {
  const o = v as { stateCode?: unknown; pin?: unknown; business?: { gstin?: unknown; legalName?: unknown; address?: unknown } } | null;
  if (!o || !isGstStateCode(o.stateCode)) return null;
  const out: GstBuyer = { stateCode: o.stateCode };
  if (typeof o.pin === "string" && isValidPin(o.pin)) out.pin = o.pin;
  const b = o.business;
  if (b && typeof b.gstin === "string" && typeof b.legalName === "string" && typeof b.address === "string" && isValidGstin(b.gstin)) {
    out.business = { gstin: normaliseGstin(b.gstin), legalName: b.legalName, address: b.address };
  }
  return out;
}

/** Never throws and never waits longer than CONTEXT_TIMEOUT_MS: a slow or failed call only means "ask, unselected". */
export async function fetchGstCheckoutContext(headers: Record<string, string> = {}): Promise<GstCheckoutContext> {
  const empty: GstCheckoutContext = { ipStateCode: null, remembered: null };
  try {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = setTimeout(() => ctrl?.abort(), CONTEXT_TIMEOUT_MS);
    try {
      const res = await fetch(GST_CHECKOUT_CONTEXT_ENDPOINT, { method: "GET", headers, ...(ctrl ? { signal: ctrl.signal } : {}) });
      if (!res.ok) return empty;
      const json = (await res.json()) as { ipStateCode?: unknown; remembered?: unknown };
      return { ipStateCode: isGstStateCode(json.ipStateCode) ? json.ipStateCode : null, remembered: cleanBuyer(json.remembered) };
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return empty;
  }
}

/* ── The dialog ──────────────────────────────────────────────────────────────── */

export class GstBuyerCancelledError extends Error {
  constructor() {
    super("gst-buyer-cancelled");
    this.name = "GstBuyerCancelledError";
  }
}
export const isGstBuyerCancelled = (e: unknown): boolean => e instanceof GstBuyerCancelledError;

export const GST_DIALOG_TITLE = "Your state";
export const GST_DIALOG_LEDE = "For your GST invoice. We use it to apply the right tax (CGST + SGST or IGST).";
export const GST_BUSINESS_LINK = "Buying for a school or coaching centre?";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, attrs: Record<string, string> = {}): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

/** Resolves the buyer's details, or null on Cancel / Escape / a tap outside. */
export function askGstBuyer(prefill: GstBuyer | null): Promise<GstBuyer | null> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(null);
      return;
    }
    const overlay = el("div", "lt-gst", { "data-testid": "gst-state-dialog" });
    const panel = el("form", "lt-gst__panel", { role: "dialog", "aria-modal": "true", "aria-labelledby": "lt-gst-title", novalidate: "" });
    const title = el("h2", "lt-gst__title", { id: "lt-gst-title" });
    title.textContent = GST_DIALOG_TITLE;
    const lede = el("p", "lt-gst__lede");
    lede.textContent = GST_DIALOG_LEDE;

    const stateLabel = el("label", "lt-gst__label", { for: "lt-gst-state" });
    stateLabel.textContent = "State or Union Territory";
    const select = el("select", "lt-gst__input", { id: "lt-gst-state", "data-testid": "gst-state-select", required: "" });
    const placeholder = el("option", "", { value: "" });
    placeholder.textContent = "Choose your state";
    select.append(placeholder);
    for (const s of GST_STATES) {
      const o = el("option", "", { value: s.code });
      o.textContent = s.name;
      select.append(o);
    }
    select.value = prefill && isGstStateCode(prefill.stateCode) ? prefill.stateCode : "";

    const pinLabel = el("label", "lt-gst__label", { for: "lt-gst-pin" });
    pinLabel.textContent = "PIN code (optional)";
    const pin = el("input", "lt-gst__input", { id: "lt-gst-pin", "data-testid": "gst-pin", inputmode: "numeric", autocomplete: "postal-code", maxlength: "6" });
    pin.value = prefill?.pin || "";

    const bizToggle = el("button", "lt-gst__link", { type: "button", "aria-expanded": "false", "aria-controls": "lt-gst-biz", "data-testid": "gst-business-toggle" });
    bizToggle.textContent = GST_BUSINESS_LINK;
    const biz = el("div", "lt-gst__biz", { id: "lt-gst-biz", hidden: "" });
    const field = (id: string, label: string, kind: "input" | "textarea", attrs: Record<string, string> = {}) => {
      const l = el("label", "lt-gst__label", { for: id });
      l.textContent = label;
      const f = el(kind, "lt-gst__input", { id, ...attrs });
      biz.append(l, f);
      return f;
    };
    const gstin = field("lt-gst-gstin", "GSTIN", "input", { "data-testid": "gst-gstin", maxlength: "15", autocapitalize: "characters", spellcheck: "false" });
    const legal = field("lt-gst-legal", "Legal name (as on GST registration)", "input", { "data-testid": "gst-legal-name", maxlength: "120", autocomplete: "organization" });
    const address = field("lt-gst-address", "Billing address", "textarea", { "data-testid": "gst-address", maxlength: "300", rows: "3" });
    if (prefill?.business) {
      gstin.value = prefill.business.gstin;
      legal.value = prefill.business.legalName;
      address.value = prefill.business.address;
      biz.hidden = false;
      bizToggle.setAttribute("aria-expanded", "true");
    }
    bizToggle.addEventListener("click", () => {
      biz.hidden = !biz.hidden;
      bizToggle.setAttribute("aria-expanded", biz.hidden ? "false" : "true");
      if (!biz.hidden) gstin.focus();
    });

    const error = el("p", "lt-gst__error", { role: "alert", "data-testid": "gst-error" });
    const go = el("button", "lt-gst__go", { type: "submit", "data-testid": "gst-continue" });
    go.textContent = "Continue";
    const cancel = el("button", "lt-gst__cancel", { type: "button", "data-testid": "gst-cancel" });
    cancel.textContent = "Cancel";

    panel.append(title, lede, stateLabel, select, pinLabel, pin, bizToggle, biz, error, go, cancel);
    overlay.append(panel);

    // Review D3: a real modal. The page behind is `inert` (no focus, no clicks, hidden from screen readers), Tab stays
    // inside the panel, and focus goes back to whatever opened the dialog (the Pay button) when it closes.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const inerted: Array<[Element, string | null]> = [];
    const done = (v: GstBuyer | null) => {
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      for (const [node, prev] of inerted) {
        if (prev === null) node.removeAttribute("inert");
        else node.setAttribute("inert", prev);
      }
      if (opener && opener.isConnected) {
        try {
          opener.focus();
        } catch {
          /* nothing to return to */
        }
      }
      resolve(v);
    };
    const focusables = (): HTMLElement[] =>
      Array.from(panel.querySelectorAll<HTMLElement>("select, input, textarea, button")).filter((n) => !n.closest("[hidden]") && !(n as HTMLButtonElement).disabled);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        done(null);
        return;
      }
      if (e.key !== "Tab") return;
      const list = focusables();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener("submit", (e) => {
      e.preventDefault();
      const business = biz.hidden || (!gstin.value.trim() && !legal.value.trim() && !address.value.trim())
        ? null
        : { gstin: normaliseGstin(gstin.value), legalName: legal.value.trim(), address: address.value.trim() };
      const input = { stateCode: select.value, pin: pin.value.trim(), business };
      const msg = gstFormError(input);
      if (msg) {
        error.textContent = msg;
        return;
      }
      done({ stateCode: input.stateCode, ...(input.pin ? { pin: input.pin } : {}), ...(business ? { business } : {}) });
    });
    cancel.addEventListener("click", () => done(null));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) done(null);
    });
    document.addEventListener("keydown", onKey, true);
    for (const node of Array.from(document.body.children)) {
      inerted.push([node, node.getAttribute("inert")]);
      node.setAttribute("inert", "");
    }
    document.body.append(overlay);
    (select.value ? go : select).focus();
  });
}

/* ── The signed-in buyer's state, shared by the "State: X · Change" line and the order (review D4) ─────────── */

let contextCache: { key: string; promise: Promise<GstCheckoutContext> } | null = null;
/** One context request per signed-in identity per page: the line above Pay and the order both read it. */
export function loadGstContext(
  headers: Record<string, string>,
  fetchContext: (h: Record<string, string>) => Promise<GstCheckoutContext> = fetchGstCheckoutContext,
): Promise<GstCheckoutContext> {
  const key = headers.Authorization || "";
  if (!contextCache || contextCache.key !== key) contextCache = { key, promise: fetchContext(headers) };
  return contextCache.promise;
}

let sessionChoice: GstBuyer | null = null;
const listeners = new Set<(b: GstBuyer | null) => void>();
/** The state the buyer picked with "Change" on this page; it wins over the remembered one for the next order. */
export function setSessionGstBuyer(b: GstBuyer | null): void {
  sessionChoice = b;
  if (b) writeLocal(b);
  for (const fn of listeners) fn(b);
}
export function getSessionGstBuyer(): GstBuyer | null {
  return sessionChoice;
}
export function onSessionGstBuyer(fn: (b: GstBuyer | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
/** Test seam. */
export function resetGstBuyerSessionForTests(): void {
  contextCache = null;
  sessionChoice = null;
  listeners.clear();
}

/** PURE. "State: Karnataka" for the line above Pay, or null. */
export function gstStateLineText(b: GstBuyer | null): string | null {
  const s = b ? GST_STATES.find((x) => x.code === b.stateCode) : null;
  return s ? `State: ${s.name}${b?.business ? ` · GSTIN ${b.business.gstin}` : ""}` : null;
}

/* ── The one entry point the order functions call ─────────────────────────────── */

export interface GstBuyerDeps {
  fetchContext: (headers: Record<string, string>) => Promise<GstCheckoutContext>;
  ask: (prefill: GstBuyer | null) => Promise<GstBuyer | null>;
  enabled: () => boolean;
}
const DEFAULT_DEPS: GstBuyerDeps = { fetchContext: fetchGstCheckoutContext, ask: askGstBuyer, enabled: isGstStateFieldOn };

/**
 * The `gstBuyer` for an order body, or undefined when the field is off. Throws GstBuyerCancelledError on Cancel.
 * `authHeaders` (signed-in callers): lets the server answer with the student's remembered state.
 */
export async function gstBuyerForOrder(authHeaders: Record<string, string> | null = null, deps: GstBuyerDeps = DEFAULT_DEPS): Promise<GstBuyer | undefined> {
  if (!deps.enabled()) return undefined;
  // A state picked with "Change" on this page (signed in): used as is - the buyer just confirmed it.
  if (authHeaders && sessionChoice) return sessionChoice;
  const ctx = await (authHeaders ? loadGstContext(authHeaders, deps.fetchContext) : deps.fetchContext({}));
  // Signed in with a remembered state: no dialog (no extra tap). The surface shows it above Pay as "State: X · Change"
  // (components/gstInvoice/GstStateLine), so it is never applied silently.
  if (authHeaders && ctx.remembered) {
    writeLocal(ctx.remembered);
    return ctx.remembered;
  }
  const local = readLocal();
  const prefill: GstBuyer | null = ctx.remembered || (ctx.ipStateCode ? { stateCode: ctx.ipStateCode, ...(local?.stateCode === ctx.ipStateCode && local.pin ? { pin: local.pin } : {}) } : local);
  const chosen = await deps.ask(prefill);
  if (!chosen) throw new GstBuyerCancelledError();
  writeLocal(chosen);
  return chosen;
}

/** `{ gstBuyer }` for a request body, or {} (byte-identical body) when the field is off. */
export const gstBuyerBody = (b: GstBuyer | undefined): { gstBuyer?: GstBuyer } => (b ? { gstBuyer: b } : {});
