/**
 * PurchasesCard - ADMIN-PURCHASES-1. "Purchases" on /admin/students: who bought what, from paid orders only
 * (status "paid" with a payment id, written only by the server-verified grant). Read-only; grants nothing.
 * Test purchases by admin accounts, and by owner test accounts listed in the server env TEST_ACCOUNT_EMAILS (TEST-ACCOUNTS-1; same
 * isAdminAccount flag), carry an "ADMIN / TEST" pill and are left out of the totals.
 *
 * CHECKOUT-1: below the purchases, "Abandoned checkouts" lists orders opened but never paid (older than 30 minutes, last 30
 * days, newest first). Read-only.
 *
 * GUEST-ABANDON-1: abandoned checkouts also list SIGNED-OUT guest checkouts ("Who will use it?" or phone), recipient MASKED
 * by the server; the totals carry "Guest paid, not yet on an account" as its own labelled figure (counted once).
 *
 * Loads on request, only once the admin API has answered OK (the parent decides). An unreadable list says so.
 */
import { useState } from "react";
import { packChapterLabel, BUNDLE_NAME } from "../../lib/packs/packLabels";
import { fetchAdmin, formatIstDateTime } from "./studentsAdminModel";
import { adSourceLines, type AdSourceFields } from "./adSourceNames";

export const PURCHASES_URL = "/api/admin/purchases";
export const MOVE_URL = "/api/admin/purchases/move";
export const MERGE_URL = "/api/admin/accounts/merge";

/** ADMIN-MOVE-1 - `pr••••@gmail.com`: first two characters of the local part, then the domain. Not an email -> "". */
export function maskEmailLocal(raw: string): string {
  const e = raw.trim().toLowerCase();
  const at = e.indexOf("@");
  return at < 1 ? "" : `${e.slice(0, Math.min(2, at))}••••${e.slice(at)}`;
}
/** ADMIN-MOVE-1 - `+91 96•••••555`: the first two and last three digits of an Indian mobile. Anything else -> "". */
export function maskPhoneLocal(raw: string): string {
  let d = raw.replace(/[\s-]/g, "");
  if (d.startsWith("+91")) d = d.slice(3);
  else if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9][0-9]{9}$/.test(d) ? `+91 ${d.slice(0, 2)}•••••${d.slice(7)}` : "";
}
/** ADMIN-MOVE-1 - the current holder, masked: the account's email when known, else its uid tail. */
export function maskHolder(p: Pick<PurchaseItem, "email" | "uid">): string {
  return (p.email && maskEmailLocal(p.email)) || `account …${p.uid.slice(-6)}`;
}

type MoveState =
  | { step: "closed" }
  | { step: "form"; error?: string }
  | { step: "confirm"; target: string; masked: string; kind: "email" | "phone" }
  | { step: "busy" }
  | { step: "done"; message: string };

/**
 * ADMIN-MOVE-1 - "Move to another account…" on a paid PDF-pack row: inline form (email or phone) -> a confirm step
 * ("Move <item> from <masked current> to <masked target>?") -> result line. The server decides everything (admin only).
 */
export function MoveControl({ p, getToken, mode = "move" }: { p: PurchaseItem; getToken: () => Promise<string | null>; mode?: "move" | "merge" }) {
  const merge = mode === "merge";
  const [st, setSt] = useState<MoveState>({ step: "closed" });
  const [value, setValue] = useState("");
  const tid = (k: string) => `pu-${merge ? "merge" : "move"}-${k}-${p.orderId}`;

  const review = () => {
    const v = value.trim();
    const isEmail = v.includes("@");
    const masked = isEmail ? maskEmailLocal(v) : maskPhoneLocal(v);
    if (!masked) return setSt({ step: "form", error: "Enter a valid email address or an Indian mobile number." });
    setSt({ step: "confirm", target: v, masked, kind: isEmail ? "email" : "phone" });
  };
  const run = async (c: { target: string; kind: "email" | "phone" }) => {
    setSt({ step: "busy" });
    let message = "The move failed. Nothing was changed.";
    try {
      const token = await getToken();
      if (!token) throw new Error("no token");
      const res = await fetch(merge ? MERGE_URL : MOVE_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...(merge ? { fromUid: p.uid } : { orderId: p.orderId }), ...(c.kind === "email" ? { toEmail: c.target } : { toPhone: c.target }) }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; moved?: boolean; merged?: boolean; error?: string } | null;
      if (res.ok && json?.ok) {
        message = merge
          ? json.merged === false ? "Already merged. Nothing changed." : "Merged. Her purchases and phone number are now on that account; this account is disabled."
          : json.moved === false ? "Already on that account. Nothing changed." : "Moved. The pack is now on that account.";
      } else if (json?.error) message = json.error;
    } catch {
      /* keep the generic message */
    }
    setSt({ step: "done", message });
  };

  return (
    <span className="pu-move" data-testid={`pu-${merge ? "merge" : "move"}-${p.orderId}`}>
      {st.step === "closed" && (
        <button type="button" className="sa-btn sa-btn-small" data-testid={tid("open")} onClick={() => setSt({ step: "form" })}>
          {merge ? "Merge into another account…" : "Move to another account…"}
        </button>
      )}
      {st.step === "form" && (
        <>
          <input className="pu-move-input" type="text" aria-label="New account email or phone" placeholder="Email or mobile of the account" value={value} onChange={(e) => setValue(e.target.value)} data-testid={tid("input")} />
          <button type="button" className="sa-btn sa-btn-small" data-testid={tid("review")} onClick={review}>Review</button>
          <button type="button" className="sa-btn sa-btn-small" onClick={() => setSt({ step: "closed" })}>Cancel</button>
          {st.error && <span className="sa-note sa-warn" role="alert" data-testid={tid("error")}>{st.error}</span>}
        </>
      )}
      {st.step === "confirm" && (
        <>
          <span data-testid={tid("confirm")}>{merge
              ? `Merge ${maskHolder(p)} into ${st.masked}? All its purchases and its phone number move to that account, and this account is disabled.`
              : `Move ${productLabel(p)} from ${maskHolder(p)} to ${st.masked}?`}</span>
          <button type="button" className="sa-btn sa-btn-small" data-testid={tid("yes")} onClick={() => void run(st)}>Yes, move it</button>
          <button type="button" className="sa-btn sa-btn-small" onClick={() => setSt({ step: "form" })}>Back</button>
        </>
      )}
      {st.step === "busy" && <span className="sa-muted">Moving…</span>}
      {st.step === "done" && <span className="pu-reason sa-muted" role="status" data-testid={tid("result")}>{st.message}</span>}
    </span>
  );
}

/**
 * CHECKOUT-WHO-1 - present only on an order bought through "Who will use it?": the recipient as the payer typed it
 * (MASKED), who paid, the uid it landed on (and how), and the note when phone and email were two different accounts.
 */
export interface WhoFields {
  recipient?: { phoneMasked?: string; emailMasked?: string };
  payerType?: "signed_out" | "signed_in_other" | string | null;
  claimedBy?: string | null;
  claimedVia?: string | null;
  adminNote?: string | null;
}

export function whoLine(w: WhoFields): string {
  if (!w.recipient) return "";
  const ids = [w.recipient.phoneMasked, w.recipient.emailMasked].filter(Boolean).join(" / ");
  const payer = w.payerType === "signed_in_other" ? "paid by a signed-in account for someone else" : "paid signed out";
  // PAY-ACCOUNT-1: "account created at payment" vs "existing account" vs "account not created (waiting)".
  const how =
    w.claimedVia === "account_created"
      ? " (account created at payment)"
      : w.claimedVia === "existing_account"
        ? " (existing account)"
        : w.claimedVia === "claim"
          ? " (claimed at sign-in)"
          : "";
  const landed = w.claimedBy ? ` · on ${w.claimedBy}${how}` : "";
  const note =
    w.adminNote === "phone_and_email_on_different_accounts"
      ? " · NOTE: phone and email are two different accounts; the first-entered one got it"
      : w.adminNote === "second_identifier_not_linked"
        ? " · NOTE: only one of phone / email had an account; the other was NOT linked to it (the student can link it after verifying)"
        : w.adminNote === "self_pay_no_usable_contact" && !w.claimedBy
          ? " · NOTE: paid via Buy for yourself, but Razorpay's record had no Indian mobile and no email - attach it to the student by hand"
        : w.adminNote === "self_pay_contact_read_failed" && !w.claimedBy
          ? " · NOTE: paid via Buy for yourself, but Razorpay's payment record could not be read yet (retried automatically; if it stays, attach by hand)"
        : w.adminNote === "account_not_created" && !w.claimedBy
          ? " · account not created (waiting for the student's sign-in)"
          : "";
  return `For ${ids || "(no contact on the payment)"} · ${payer}${landed}${note}`;
}

function WhoRow({ w, id }: { w: WhoFields; id: string }) {
  const line = whoLine(w);
  return line ? <span className="pu-reason sa-muted" data-testid={`pu-who-${id}`}>{line}</span> : null;
}

/** ORDER-SOURCE-1 - the visit source stored on an order (server-sanitised; absent on an older order). SOURCE-3 adds utm_content / utm_term and the click-id flags. */
export type OrderSourceInfo = AdSourceFields;

function SourceRow({ source, id }: { source?: OrderSourceInfo; id: string }) {
  if (!source) return null;
  const { main, detail } = adSourceLines(source);
  return (
    <span className="pu-reason sa-muted pu-source" data-testid={`pu-source-${id}`}>
      <span className="pu-source-main">Source: {main}</span>
      {detail ? <span className="pu-source-detail">{detail}</span> : null}
    </span>
  );
}

export interface PurchaseItem extends WhoFields {
  orderId: string;
  paidAtMs: number;
  uid: string;
  email: string | null;
  name: string | null;
  passType: string;
  packTarget: string | null;
  kind: "premium" | "pack" | "topup" | "other";
  amountInr: number | null;
  /** GST-EXCL-1: present for an order created at/after 7 Nov 2026 (base + GST = amountInr before any pack credit). */
  baseInr?: number;
  gstInr?: number;
  channel: "student" | "parent";
  isAdminAccount: boolean;
  /** RECEIPT-EMAIL-1: when the receipt email was sent; absent when none went out. */
  receiptEmailedAtMs?: number;
  /** WHATSAPP-OPTIN-1: the buyer's WhatsApp opt-in on this paid order (masked + full for Reveal); absent when none. */
  waOptIn?: { phoneMasked: string; phone: string; consentAtMs: number | null; source: string };
  /** ORDER-SOURCE-1: where the buyer came from; absent for an order made before this existed. */
  source?: OrderSourceInfo;
}
/** CHECKOUT-1 - an order that was opened ("created") and never paid, older than 30 minutes. */
export interface AbandonedItem {
  orderId: string;
  createdAtMs: number;
  /** GUEST-ABANDON-1: null for a signed-out (guest) checkout. */
  uid: string | null;
  email: string | null;
  name: string | null;
  passType: string;
  packTarget: string | null;
  kind: "premium" | "pack" | "topup" | "other";
  amountInr: number | null;
  /** GST-EXCL-1: present for an order created at/after 7 Nov 2026 (base + GST = amountInr before any pack credit). */
  baseInr?: number;
  gstInr?: number;
  /** GUEST-ABANDON-1: "who" = signed out via "Who will use it?", "guest" = signed out with a phone number. */
  channel: "student" | "parent" | "who" | "guest";
  isAdminAccount: boolean;
  /** GUEST-ABANDON-1: a guest checkout's recipient, MASKED by the server. */
  recipient?: { phoneMasked?: string; emailMasked?: string };
  payerType?: string | null;
  /** WHATSAPP-OPTIN-1: the buyer typed a WhatsApp number AND ticked the consent. `phoneMasked` is shown; `phone` only after a per-row Reveal. */
  waOptIn?: { phoneMasked: string; phone: string; consentAtMs: number | null; source: string };
  /** ORDER-SOURCE-1: where the buyer came from; absent for an order made before this existed. */
  source?: OrderSourceInfo;
  /** PAY-RESCUE-1: absent on an older server. True only when Razorpay's `payment.failed` left a note on the order. */
  attempted?: boolean;
  lastFailure?: { code: string; reason: string; source: string; step: string; atMs: number | null } | null;
}
interface Bucket {
  count: number;
  inr: number;
}
interface WindowTotals {
  premium: Bucket;
  packs: Bucket;
  topups: Bucket;
  /** GUEST-ABANDON-1: guest money received but not (yet) on an account. Absent on an older server. */
  guestUnclaimed?: Bucket;
}
export interface PurchasesResponse {
  ok: true;
  items: PurchaseItem[];
  totals: { last7: WindowTotals; last30: WindowTotals; excludesAdminAccounts: boolean; complete: boolean; guestUnclaimedKnown?: boolean; guestTruncated?: boolean };
  truncated?: boolean;
  /** CHECKOUT-1: absent on an older server, null when that read failed. */
  abandoned?: { items: AbandonedItem[]; truncated?: boolean } | null;
  /** PAY-PHONE-1: absent on an older server, null when that read failed. */
  unclaimedGuest?: { items: UnclaimedGuestItem[]; truncated?: boolean; overdue?: number } | null;
  /** PAY-PHONE-1 review: guest payments the owner should know about (grant failed / duplicate / erased before sign-in). */
  guestAttention?: { items: GuestAttentionItem[]; truncated?: boolean } | null;
  /** WHATSAPP-OPTIN-1: free-sample WhatsApp opt-ins, last 30 days. Absent on an older server, null when that read failed. */
  waSampleOptIns?: { items: WaSampleOptInItem[]; truncated?: boolean } | null;
}

export interface WaSampleOptInItem {
  phoneMasked: string;
  phone: string;
  packIds: string[];
  lastAtMs: number;
  firstAtMs: number | null;
}

export interface GuestAttentionItem extends UnclaimedGuestItem {
  /** "claimed, grant failed" | "Paid again for something the account already has" | "Paid, account erased before sign-in". */
  state: string;
  reason: string | null;
}

export function GuestAttentionList({ attention }: { attention: PurchasesResponse["guestAttention"] }) {
  if (attention === undefined) return null;
  return (
    <div className="pu-abandoned" data-testid="pu-attention">
      <h3 className="gh-title">Phone payments that need you</h3>
      <p className="sa-muted gh-note">A grant that failed after sign-in, a payment for something the account already had, or a payment whose account was erased before sign-in. Look a payment up by its id.</p>
      {attention === null ? (
        <p className="sa-muted" data-testid="pu-attention-unavailable">These could not be read.</p>
      ) : attention.items.length === 0 ? (
        <p className="sa-empty" data-testid="pu-attention-empty">Nothing needs you.</p>
      ) : (
        <ul className="pu-list" data-testid="pu-attention-list">
          {attention.items.map((u) => (
            <li key={u.orderId} className="pu-row" data-testid={`pu-at-row-${u.orderId}`}>
              <span className="pu-date">{u.state}</span>
              <span className="pu-who">{u.phoneMasked || u.recipient?.emailMasked || "number erased"}</span>
              <span className="pu-product">{productLabel(u)}</span>
              <span className="pu-amount">{amountWithGst(u)}</span>
              <span className="pu-channel sa-muted">{u.paymentId || ""}</span>
              <span className="pu-reason sa-muted">{u.reason || ""}</span>
              <WhoRow w={u} id={u.orderId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** PAY-PHONE-1 - a payment made with a phone number that no sign-in has claimed yet. The phone arrives MASKED. */
export interface UnclaimedGuestItem extends WhoFields {
  orderId: string;
  paymentId: string | null;
  phoneMasked: string;
  passType: string;
  packTarget: string | null;
  kind: "premium" | "pack" | "topup" | "other";
  amountInr: number | null;
  /** GST-EXCL-1: present for an order created at/after 7 Nov 2026 (base + GST = amountInr before any pack credit). */
  baseInr?: number;
  gstInr?: number;
  paidAtMs: number | null;
  ageHours: number | null;
}

/** "3 h" / "2 d" — how long a guest payment has waited. */
export function ageLabel(hours: number | null): string {
  if (hours === null || !Number.isFinite(hours)) return "";
  return hours < 48 ? `${hours} h` : `${Math.floor(hours / 24)} d`;
}

export function UnclaimedGuestList({ unclaimed }: { unclaimed: PurchasesResponse["unclaimedGuest"] }) {
  if (unclaimed === undefined) return null;
  return (
    <div className="pu-abandoned" data-testid="pu-unclaimed">
      <h3 className="gh-title">
        Paid with a phone number, not yet claimed
        {typeof unclaimed?.overdue === "number" && unclaimed.overdue > 0 && (
          <span className="pu-badge" data-testid="pu-unclaimed-badge" title="Waiting 15 minutes or more">
            {unclaimed.overdue}
          </span>
        )}
      </h3>
      <p className="sa-muted gh-note">
        Paid before signing in. It attaches when someone signs in with the same number. Oldest first. If a student typed a wrong number, find the payment here.
      </p>
      {unclaimed === null ? (
        <p className="sa-muted" data-testid="pu-unclaimed-unavailable">Unclaimed payments could not be read.</p>
      ) : unclaimed.items.length === 0 ? (
        <p className="sa-empty" data-testid="pu-unclaimed-empty">No unclaimed payments.</p>
      ) : (
        <ul className="pu-list" data-testid="pu-unclaimed-list">
          {unclaimed.items.map((u) => (
            <li key={u.orderId} className="pu-row" data-testid={`pu-uc-row-${u.orderId}`}>
              <span className="pu-date">{ageLabel(u.ageHours)}</span>
              <span className="pu-who">{u.phoneMasked || u.recipient?.emailMasked || ""}</span>
              <span className="pu-product">{productLabel(u)}</span>
              <span className="pu-amount">{amountWithGst(u)}</span>
              <span className="pu-channel sa-muted">{u.paymentId || ""}</span>
              <WhoRow w={u} id={u.orderId} />
            </li>
          ))}
        </ul>
      )}
      {unclaimed?.truncated && <p className="sa-muted">Showing the oldest 50 only.</p>}
    </div>
  );
}

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: PurchasesResponse }
  | { status: "failed" };

const titleCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function productLabel(p: Pick<PurchaseItem, "passType" | "packTarget">): string {
  const t = p.packTarget;
  switch (p.passType) {
    case "month":
      return "Premium · 1 month";
    case "till_boards":
      return "Premium · till boards";
    case "pack_chapter":
      return `Chapter Pack · ${t ? packChapterLabel(t) : "chapter"}`;
    case "pack_mock":
      return `Mock Pack · ${t ? titleCase(t) : "subject"}`;
    case "pack_subject":
      return `Subject Pack · ${t ? titleCase(t) : "subject"}`;
    case "pack_cbq":
      return `CBQ Pack · ${t ? titleCase(t) : "subject"}`;
    case "pack_bundle":
      return BUNDLE_NAME;
    case "test_series":
      return "Test Series Pack";
    case "topup_49":
    case "topup_149":
      return `Top-up ₹${p.passType.slice(6)}`;
    default:
      return p.passType || "Unknown product";
  }
}

const inr = (n: number | null) => (n === null ? "—" : `₹${n.toLocaleString("en-IN")}`);
/** GST-EXCL-1: the total charged, with "(₹1,917 base + ₹345 GST)" for an order that stored its breakup. */
const amountWithGst = (r: { amountInr: number | null; baseInr?: number; gstInr?: number }): string =>
  typeof r.baseInr === "number" && typeof r.gstInr === "number" && r.gstInr > 0
    ? `${inr(r.amountInr)} (${inr(r.baseInr)} base + ${inr(r.gstInr)} GST)`
    : inr(r.amountInr);
const line = (w: WindowTotals) =>
  `Premium ${w.premium.count} (${inr(w.premium.inr)}) · Packs ${w.packs.count} (${inr(w.packs.inr)})` +
  (w.topups.count ? ` · Top-ups ${w.topups.count} (${inr(w.topups.inr)})` : "") +
  (w.guestUnclaimed && w.guestUnclaimed.count ? ` · Guest paid, not yet on an account ${w.guestUnclaimed.count} (${inr(w.guestUnclaimed.inr)})` : "");

/** GUEST-ABANDON-1 - who an abandoned checkout belongs to: the account, or a guest's MASKED recipient. */
export function abandonedWho(a: Pick<AbandonedItem, "uid" | "email" | "name" | "recipient">): string {
  if (a.uid) return a.email || a.name || a.uid;
  const ids = [a.recipient?.phoneMasked, a.recipient?.emailMasked].filter(Boolean).join(" / ");
  return ids || "Signed out";
}

/** GUEST-ABANDON-1 - the checkout's channel, in words. */
export function abandonedChannel(channel: AbandonedItem["channel"]): string {
  switch (channel) {
    case "parent":
      return "Parent pay link";
    case "who":
      return "Signed out · Who will use it?";
    case "guest":
      return "Signed out · phone number";
    default:
      return "Student checkout";
  }
}

/** PAY-RESCUE-1 - why this order was never paid, from Razorpay's own failure note; else "no payment attempted". */
export function abandonedReason(a: Pick<AbandonedItem, "attempted" | "lastFailure">): string {
  const f = a.lastFailure;
  if (!f) return "No payment attempted";
  const why = f.reason || f.code || f.step;
  return why ? `Payment failed: ${why}` : "Payment failed";
}

/** WHATSAPP-OPTIN-1 - "WhatsApp ✓ +91 98•••••948" with a per-row Reveal / Hide (the Students list's pattern). Masked until pressed. */
export function WaNumber({ masked, full, testId }: { masked: string; full: string; testId: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span className="pu-wa sa-contact" data-testid={testId}>
      <span className="sa-contact-text" data-testid={`${testId}-text`}>WhatsApp ✓ {revealed ? full : masked}</span>
      <button type="button" className="sa-btn sa-btn-small" onClick={() => setRevealed((r) => !r)} aria-label={revealed ? "Hide WhatsApp number" : "Reveal WhatsApp number"} data-testid={`${testId}-toggle`}>
        {revealed ? "Hide" : "Reveal"}
      </button>
    </span>
  );
}

/** WHATSAPP-OPTIN-1 - read-only list of free-sample opt-ins (last 30 days), masked + Reveal. */
export function WaSampleOptInList({ list }: { list: PurchasesResponse["waSampleOptIns"] }) {
  if (list === undefined) return null;
  return (
    <div className="pu-abandoned" data-testid="pu-wa-samples">
      <h3 className="gh-title">Sample WhatsApp opt-ins</h3>
      <p className="sa-muted gh-note">Numbers given with the tick on a free sample, last 30 days, newest first (shown masked).</p>
      {list === null ? (
        <p className="sa-muted" data-testid="pu-wa-samples-unavailable">Sample opt-ins could not be read.</p>
      ) : list.items.length === 0 ? (
        <p className="sa-empty" data-testid="pu-wa-samples-empty">No sample opt-ins.</p>
      ) : (
        <ul className="pu-list" data-testid="pu-wa-samples-list">
          {list.items.map((w, i) => (
            <li key={`${w.lastAtMs}-${i}`} className="pu-row" data-testid={`pu-wa-row-${i}`}>
              <span className="pu-date">{formatIstDateTime(w.lastAtMs)}</span>
              <WaNumber masked={w.phoneMasked} full={w.phone} testId={`pu-wa-num-${i}`} />
              <span className="pu-product sa-muted">{w.packIds.join(", ")}</span>
            </li>
          ))}
        </ul>
      )}
      {list?.truncated && <p className="sa-muted">Showing the latest 50 only.</p>}
    </div>
  );
}

export function AbandonedList({ abandoned }: { abandoned: PurchasesResponse["abandoned"] }) {
  return (
    <div className="pu-abandoned" data-testid="pu-abandoned">
      <h3 className="gh-title">Abandoned checkouts</h3>
      <p className="sa-muted gh-note">
        Orders opened but never paid, older than 30 minutes, last 30 days, newest first, including signed-out checkouts (shown masked). A student may have paid on a later order.
      </p>
      {abandoned == null ? (
        <p className="sa-muted" data-testid="pu-abandoned-unavailable">
          Abandoned checkouts could not be read.
        </p>
      ) : abandoned.items.length === 0 ? (
        <p className="sa-empty" data-testid="pu-abandoned-empty">
          No abandoned checkouts.
        </p>
      ) : (
        <ul className="pu-list" data-testid="pu-abandoned-list">
          {abandoned.items.map((a) => (
            <li key={a.orderId} className="pu-row" data-testid={`pu-ab-row-${a.orderId}`}>
              <span className="pu-date">{formatIstDateTime(a.createdAtMs)}</span>
              <span className="pu-who" data-testid={`pu-ab-who-${a.orderId}`}>{abandonedWho(a)}</span>
              <span className="pu-product">{productLabel(a)}</span>
              <span className="pu-amount">{amountWithGst(a)}</span>
              <span className="pu-channel sa-muted" data-testid={`pu-ab-channel-${a.orderId}`}>{abandonedChannel(a.channel)}</span>
              <span className="pu-flag">
                {a.isAdminAccount && (
                  <span className="pu-pill" data-testid={`pu-ab-admin-${a.orderId}`}>
                    ADMIN / TEST
                  </span>
                )}
              </span>
              <span className="pu-reason sa-muted" data-testid={`pu-ab-reason-${a.orderId}`}>
                {abandonedReason(a)}
              </span>
              {a.waOptIn && <WaNumber masked={a.waOptIn.phoneMasked} full={a.waOptIn.phone} testId={`pu-ab-wa-${a.orderId}`} />}
              <SourceRow source={a.source} id={`ab-${a.orderId}`} />
            </li>
          ))}
        </ul>
      )}
      {abandoned?.truncated && <p className="sa-muted">Showing the latest 50 only.</p>}
    </div>
  );
}

export default function PurchasesCard({ getToken }: { getToken: () => Promise<string | null> }) {
  const [state, setState] = useState<State>({ status: "idle" });

  const load = () => {
    setState({ status: "loading" });
    void fetchAdmin<PurchasesResponse>(PURCHASES_URL, getToken).then((r) => {
      setState(r.ok && r.data && Array.isArray(r.data.items) ? { status: "ok", data: r.data } : { status: "failed" });
    });
  };

  return (
    <section className="gh-card" aria-labelledby="pu-title" data-testid="purchases">
      <h2 id="pu-title" className="gh-title">
        Purchases
      </h2>
      <p className="sa-muted gh-note">Paid orders only (server-verified payment). Admin-account purchases are marked and not counted in the totals.</p>
      {state.status === "idle" && (
        <button type="button" className="sa-btn" data-testid="pu-load" onClick={load}>
          Load purchases
        </button>
      )}
      {state.status === "loading" && <p className="sa-muted">Loading purchases…</p>}
      {state.status === "failed" && (
        <p className="sa-note sa-warn" role="alert" data-testid="pu-failed">
          The purchases could not be loaded.{" "}
          <button type="button" className="sa-btn sa-btn-small" onClick={load}>
            Try again
          </button>
        </p>
      )}
      {state.status === "ok" && (
        <>
          <div className="pu-totals" data-testid="pu-totals">
            <p>
              <strong>Last 7 days:</strong> {line(state.data.totals.last7)}
            </p>
            <p>
              <strong>Last 30 days:</strong> {line(state.data.totals.last30)}
            </p>
            <p className="sa-muted">Excludes admin / test accounts.{state.data.totals.complete ? "" : " May be incomplete: only the latest 300 paid orders were read."}</p>
            {state.data.totals.guestUnclaimedKnown !== undefined && (
              <p className="sa-muted" data-testid="pu-guest-note">
                {state.data.totals.guestUnclaimedKnown
                  ? "\"Guest paid, not yet on an account\" is money received from a signed-out checkout that no account holds yet; once it lands on an account it counts under Premium or Packs instead, never both." +
                    (state.data.totals.guestTruncated ? " May be incomplete: only the first 300 guest orders of a status were read." : "")
                  : "Guest payments not yet on an account could not be read, so they are not in these totals."}
              </p>
            )}
            <p className="sa-muted" data-testid="pu-note">Every paid order counts as paid; LazyTopper gives no refunds. Top-ups are counted separately.</p>
          </div>
          {state.data.items.length === 0 ? (
            <p className="sa-empty" data-testid="pu-empty">
              No purchases yet.
            </p>
          ) : (
            <ul className="pu-list" data-testid="pu-list">
              {state.data.items.map((p) => (
                <li key={p.orderId} className="pu-row" data-testid={`pu-row-${p.orderId}`}>
                  <span className="pu-date">{formatIstDateTime(p.paidAtMs)}</span>
                  <span className="pu-who">{p.email || p.name || p.uid}</span>
                  <span className="pu-product">{productLabel(p)}</span>
                  <span className="pu-amount">{amountWithGst(p)}</span>
                  <span className="pu-channel sa-muted">{p.channel === "parent" ? "Parent pay link" : "Student checkout"}</span>
                  <span className="pu-flag">
                    {p.isAdminAccount && (
                      <span className="pu-pill" data-testid={`pu-admin-${p.orderId}`}>
                        ADMIN / TEST
                      </span>
                    )}
                  </span>
                  <WhoRow w={p} id={p.orderId} />
                  <SourceRow source={p.source} id={p.orderId} />
                  {p.waOptIn && <WaNumber masked={p.waOptIn.phoneMasked} full={p.waOptIn.phone} testId={`pu-wa-${p.orderId}`} />}
                  {typeof p.receiptEmailedAtMs === "number" && (
                    <span className="pu-reason sa-muted" data-testid={`pu-receipt-${p.orderId}`}>
                      Receipt emailed {formatIstDateTime(p.receiptEmailedAtMs)}
                    </span>
                  )}
                  {p.kind === "pack" && <MoveControl p={p} getToken={getToken} />}
                  {/* ADMIN-MOVE-1: only an account the server created at payment (uid pay-...) can be merged */}
                  {p.uid.startsWith("pay-") && <MoveControl p={p} getToken={getToken} mode="merge" />}
                </li>
              ))}
            </ul>
          )}
          {state.data.truncated && <p className="sa-muted">Showing the latest 100 only.</p>}
          <AbandonedList abandoned={state.data.abandoned} />
          <UnclaimedGuestList unclaimed={state.data.unclaimedGuest} />
          <GuestAttentionList attention={state.data.guestAttention} />
          <WaSampleOptInList list={state.data.waSampleOptIns} />
        </>
      )}
    </section>
  );
}
