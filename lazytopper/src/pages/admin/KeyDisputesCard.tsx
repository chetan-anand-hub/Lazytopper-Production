/**
 * KeyDisputesCard - TUTOR-KEY-TRUST-1. "Disputed answer keys" on /admin/students: the questions where the tutor
 * saw the row contradict itself (mismatch), the model's view differed (opinion), or a student challenged the key
 * (challenge). READ-ONLY apart from one "Mark resolved" action; fixing the bank is a data lane.
 *
 * Loads on request, only once the admin API has answered OK (the parent decides). Every number is the server's;
 * an unreadable queue says so, never "none".
 */
import { useState } from "react";
import { fetchAdmin, formatIstDateTime } from "./studentsAdminModel";

export const KEY_DISPUTES_URL = "/api/admin/key-disputes";
export const KEY_DISPUTES_RESOLVE_URL = "/api/admin/key-disputes/resolve";

export interface KeyDisputeItem {
  questionId: string;
  source: string;
  fileHint: string;
  counts: { mismatch: number; opinion: number; challenge: number };
  total: number;
  lastAtMs: number | null;
  firstAtMs: number | null;
  resolved: boolean;
  latest: { kind: string; reason: string; studentChallenge: string; atMs: number | null }[];
}
export interface KeyDisputesResponse {
  ok: true;
  items: KeyDisputeItem[];
  truncated?: boolean;
}

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; items: KeyDisputeItem[]; truncated: boolean }
  | { status: "failed" };

export async function postResolve(
  questionId: string,
  resolved: boolean,
  getToken: () => Promise<string | null>,
): Promise<boolean> {
  try {
    const token = await getToken();
    if (!token) return false;
    const res = await fetch(KEY_DISPUTES_RESOLVE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, resolved }),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default function KeyDisputesCard({ getToken }: { getToken: () => Promise<string | null> }) {
  const [state, setState] = useState<State>({ status: "idle" });
  const [showResolved, setShowResolved] = useState(false);

  const load = () => {
    setState({ status: "loading" });
    void fetchAdmin<KeyDisputesResponse>(KEY_DISPUTES_URL, getToken).then((r) => {
      setState(r.ok ? { status: "ok", items: r.data.items || [], truncated: r.data.truncated === true } : { status: "failed" });
    });
  };
  const resolve = async (it: KeyDisputeItem, resolved: boolean) => {
    if (await postResolve(it.questionId, resolved, getToken)) {
      setState((s) => (s.status === "ok" ? { ...s, items: s.items.map((x) => (x.questionId === it.questionId ? { ...x, resolved } : x)) } : s));
    }
  };

  return (
    <section className="gh-card" aria-labelledby="kd-title" data-testid="key-disputes">
      <h2 id="kd-title" className="gh-title">
        Disputed answer keys
      </h2>
      <p className="sa-muted gh-note">
        Mismatch = the row&apos;s own steps disagree with its key. Opinion = the tutor&apos;s view differed. Challenge = a student
        said the key is wrong. Resolving only hides it here; fix the key in the bank first.
      </p>
      {state.status === "idle" && (
        <button type="button" className="sa-btn" data-testid="kd-load" onClick={load}>
          Load disputed keys
        </button>
      )}
      {state.status === "loading" && <p className="sa-muted">Loading disputed keys…</p>}
      {state.status === "failed" && (
        <p className="sa-note sa-warn" role="alert" data-testid="kd-failed">
          The disputed keys could not be loaded.{" "}
          <button type="button" className="sa-btn sa-btn-small" onClick={load}>
            Try again
          </button>
        </p>
      )}
      {state.status === "ok" && (
        <>
          <label className="sa-muted sa-check">
            <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} /> Show resolved
          </label>
          {(() => {
            const rows = state.items.filter((i) => showResolved || !i.resolved);
            if (rows.length === 0) {
              return (
                <p className="sa-empty" data-testid="kd-empty">
                  No disputed keys yet.
                </p>
              );
            }
            return (
              <ul className="sa-list" data-testid="kd-list">
                {rows.map((it) => (
                  <li key={it.questionId} data-testid={`kd-item-${it.questionId}`}>
                    <p>
                      <strong>{it.questionId}</strong> · {it.source || "source unknown"} · <span className="sa-muted">{it.fileHint}</span>
                    </p>
                    <p data-testid={`kd-counts-${it.questionId}`}>
                      mismatch {it.counts.mismatch} · opinion {it.counts.opinion} · challenge {it.counts.challenge}
                    </p>
                    <p className="sa-muted">
                      First {formatIstDateTime(it.firstAtMs)} · last {formatIstDateTime(it.lastAtMs)}
                    </p>
                    <ul>
                      {it.latest.map((l, i) => (
                        <li key={i}>
                          [{l.kind}] {l.reason}
                          {l.studentChallenge ? ` - student: "${l.studentChallenge}"` : ""}
                        </li>
                      ))}
                    </ul>
                    <button type="button" className="sa-btn sa-btn-small" onClick={() => void resolve(it, !it.resolved)}>
                      {it.resolved ? "Reopen" : "Mark resolved"}
                    </button>
                  </li>
                ))}
              </ul>
            );
          })()}
          {state.truncated && <p className="sa-muted">Showing the top 100 only.</p>}
        </>
      )}
    </section>
  );
}
