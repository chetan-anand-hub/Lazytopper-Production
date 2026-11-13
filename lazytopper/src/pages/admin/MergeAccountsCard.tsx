/**
 * MergeAccountsCard - ADMIN-MERGE-REAL-1: merge TWO REAL accounts (keep one, remove the other) on /admin/students. Collapsed until
 * opened. Step 1: type the account to KEEP and the one to REMOVE (an email, an Indian mobile or an account id). Step 2: the server
 * describes both (masked logins, plan, packs, paid orders) and says what would stop it. Step 3: type MERGE, then the button works.
 * What happens: the removed account's packs, Board Pass and orders move to the kept account, and its logins are freed (the account is
 * deleted from sign-in, never its study data) so the student can add them to the kept account. Not undoable. The server decides everything.
 */
import { useState } from "react";

export const MERGE_REAL_URL = "/api/admin/accounts/merge-real";

interface Side {
  uid: string;
  email: string;
  phone: string;
  providers: string[];
  disabled: boolean;
  plan: { tier: string; passType: string; passEndMs: number | null };
  packs: string[];
  paidOrders: number;
  hasStudyData: boolean;
}
type Step =
  | { s: "closed" }
  | { s: "form"; error?: string }
  | { s: "busy" }
  | { s: "review"; keep: Side; remove: Side; blocker?: string; warning?: string }
  | { s: "done"; message: string };

const loginLine = (a: Side) => [a.email, a.phone].filter(Boolean).join(" · ") || "no email or phone";
const planLine = (a: Side) => (a.plan.passType ? `Board Pass (${a.plan.passType})` : a.plan.tier ? a.plan.tier : "no plan");

function SideView({ title, a, id }: { title: string; a: Side; id: string }) {
  return (
    <div className="mac-side" data-testid={id}>
      <strong>{title}</strong>
      <div>Logins: {loginLine(a)}</div>
      <div>Sign-in methods: {a.providers.length ? a.providers.join(", ") : "none"}</div>
      <div>Plan: {planLine(a)}</div>
      <div>Packs: {a.packs.length ? a.packs.join(", ") : "none"}</div>
      <div>Paid orders: {a.paidOrders}</div>
      <div>Study data: {a.hasStudyData ? "yes" : "none"}</div>
      <div className="sa-muted">Account …{a.uid.slice(-6)}</div>
    </div>
  );
}

export default function MergeAccountsCard({ getToken }: { getToken: () => Promise<string | null> }) {
  const [st, setSt] = useState<Step>({ s: "closed" });
  const [keep, setKeep] = useState("");
  const [remove, setRemove] = useState("");
  const [typed, setTyped] = useState("");

  const post = async (body: Record<string, unknown>) => {
    const token = await getToken();
    if (!token) throw new Error("no token");
    const res = await fetch(MERGE_REAL_URL, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    return { res, json };
  };
  const review = async () => {
    if (!keep.trim() || !remove.trim()) return setSt({ s: "form", error: "Enter both accounts." });
    setSt({ s: "busy" });
    try {
      const { res, json } = await post({ preview: true, keep: keep.trim(), remove: remove.trim() });
      if (res.ok && json?.ok) {
        setTyped("");
        return setSt({ s: "review", keep: json.keep as Side, remove: json.remove as Side, ...(typeof json.blocker === "string" ? { blocker: json.blocker } : {}), ...(typeof json.warning === "string" ? { warning: json.warning } : {}) });
      }
      setSt({ s: "form", error: typeof json?.error === "string" ? json.error : "Could not look those accounts up." });
    } catch {
      setSt({ s: "form", error: "Could not look those accounts up." });
    }
  };
  const run = async (k: Side, r: Side) => {
    setSt({ s: "busy" });
    let message = "The merge failed. Run it again; nothing is lost.";
    try {
      const { res, json } = await post({ keepUid: k.uid, removeUid: r.uid, confirm: "MERGE" });
      if (res.ok && json?.ok) message = json.merged === false ? "Already merged. Nothing changed." : "Merged. Its purchases are on the kept account and the removed account's logins are free to add there.";
      else if (typeof json?.error === "string") message = json.error;
    } catch {
      /* keep the generic message */
    }
    setSt({ s: "done", message });
  };

  return (
    <section className="sa-card" data-testid="merge-accounts-card" aria-label="Merge accounts">
      {st.s === "closed" ? (
        <button type="button" className="sa-btn sa-btn-small" data-testid="mac-open" onClick={() => setSt({ s: "form" })}>
          Merge accounts…
        </button>
      ) : (
        <>
          <h3>Merge two accounts</h3>
          {(st.s === "form" || st.s === "busy") && (
            <>
              <p className="sa-muted">Packs, Board Pass and orders move from the REMOVED account to the KEPT one; the removed account&apos;s logins are freed. This cannot be undone.</p>
              <input className="pu-move-input" aria-label="Account to keep" placeholder="Keep: email, mobile or account id" value={keep} onChange={(e) => setKeep(e.target.value)} data-testid="mac-keep" />
              <input className="pu-move-input" aria-label="Account to remove" placeholder="Remove: email, mobile or account id" value={remove} onChange={(e) => setRemove(e.target.value)} data-testid="mac-remove" />
              <button type="button" className="sa-btn sa-btn-small" disabled={st.s === "busy"} data-testid="mac-review" onClick={() => void review()}>
                Review
              </button>
              <button type="button" className="sa-btn sa-btn-small" onClick={() => setSt({ s: "closed" })}>
                Cancel
              </button>
              {st.s === "form" && st.error && (
                <span className="sa-note sa-warn" role="alert" data-testid="mac-error">
                  {st.error}
                </span>
              )}
            </>
          )}
          {st.s === "review" && (
            <>
              <div className="mac-sides">
                <SideView title="KEEP" a={st.keep} id="mac-keep-view" />
                <SideView title="REMOVE" a={st.remove} id="mac-remove-view" />
              </div>
              {st.remove.hasStudyData && <p className="sa-muted">The removed account&apos;s study data is not merged; it stays on its old id.</p>}
              {st.warning && (
                <p className="sa-note sa-warn" role="alert" data-testid="mac-warning">
                  {st.warning}
                </p>
              )}
              {st.blocker ? (
                <p className="sa-note sa-warn" role="alert" data-testid="mac-blocker">
                  Cannot merge: {st.blocker}
                </p>
              ) : (
                <>
                  <label>
                    Type MERGE to confirm
                    <input className="pu-move-input" value={typed} onChange={(e) => setTyped(e.target.value)} data-testid="mac-typed" autoComplete="off" />
                  </label>
                  <button type="button" className="sa-btn sa-btn-small" disabled={typed !== "MERGE"} data-testid="mac-go" onClick={() => void run(st.keep, st.remove)}>
                    Merge accounts
                  </button>
                </>
              )}
              <button type="button" className="sa-btn sa-btn-small" onClick={() => setSt({ s: "form" })}>
                Back
              </button>
            </>
          )}
          {st.s === "done" && (
            <p role="status" data-testid="mac-result">
              {st.message}
            </p>
          )}
        </>
      )}
    </section>
  );
}
