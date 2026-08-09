/**
 * AccountDataControls — the student-facing half of LazyTopper's DPDP obligations.
 *
 * ★★ THIS COMPONENT IS THE REACHABILITY. `POST /api/account/erase` and
 * `GET /api/account/export` were merged (#638) and drafted (#645) as authenticated
 * routes with NO CALLER. A student could not download their data and could not delete
 * their account, because nothing in the product asked. This renders inside
 * MeProgressPage at `/me`, which is routed under `RequireAuth` and reachable from the
 * mobile BottomNav profile icon and the desktop header avatar.
 *
 * ★★ THE CONFIRMATION IS PROPORTIONATE TO AN IRREVERSIBLE ACT ON A MINOR'S ACCOUNT.
 * Three separate things gate it, because a 15-year-old on a phone can tap a button by
 * accident and cannot un-delete an account:
 *   1. the destructive action is behind a second screen, not on the resting page;
 *   2. that screen states in plain words exactly what goes;
 *   3. the student must TYPE a word. A stray tap cannot satisfy a text input.
 *
 * ★★ AND IT STATES WHAT WE CANNOT DELETE. `THIRD_PARTY_RETENTION_DISCLOSURE` is shown
 * on the confirmation screen, BEFORE the student commits, not in a receipt afterwards.
 * A deletion screen that lists what goes and stays silent about what remains lies by
 * structure. It is pinned verbatim by a copy assertion so it cannot be quietly softened.
 *
 * ★ NO INLINE STYLE OBJECTS (CLAUDE.md section 7). One injected stylesheet, the pattern
 * MeProgressPage already uses.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  ERASE_CONFIRM_PHRASE,
  ERASE_SCOPE_LINES,
  THIRD_PARTY_RETENTION_DISCLOSURE,
  clearLocalStudentData,
  downloadMyDataFromServer,
  eraseMyAccountOnServer,
  type AccountActionOutcome,
  type RemainingLocation,
} from "../../services/accountDataService";

type Phase = "idle" | "confirming" | "working" | "done" | "failed";

/**
 * ★ Narrowed to the only two outcomes that can reach the receipt. Typing this as the
 * full `AccountActionOutcome` union would let a future edit render a receipt over an
 * `unavailable` result — the fake-success failure this surface exists to avoid — and
 * the compiler would allow it.
 */
interface DoneState {
  outcome: Extract<AccountActionOutcome, { status: "ok" | "partial" }>;
  localKeysCleared: number;
}

export default function AccountDataControls() {
  const navigate = useNavigate();
  // ★ ~25 suites replace AuthContext with a vi.mock factory that is a FULL replacement
  // and most of them omit `logout`. Read it defensively and call it optionally: a
  // missing logout must never throw mid-erasure, when the account is already gone.
  const auth = useAuth() as { logout?: () => Promise<void> };

  const [phase, setPhase] = useState<Phase>("idle");
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState<DoneState | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const [exportBusy, setExportBusy] = useState(false);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const [exportFailed, setExportFailed] = useState(false);

  const confirmInputRef = useRef<HTMLInputElement | null>(null);

  const armed = useMemo(
    () => typed.trim().toUpperCase() === ERASE_CONFIRM_PHRASE,
    [typed]
  );

  /* ── download ─────────────────────────────────────────────────────────── */

  const onDownload = useCallback(async () => {
    setExportBusy(true);
    setExportNote(null);
    setExportFailed(false);
    const result = await downloadMyDataFromServer();
    setExportBusy(false);

    if (result.status !== "ok") {
      setExportFailed(true);
      setExportNote(result.message);
      return;
    }

    try {
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportFailed(true);
      setExportNote("We built your file but this browser would not save it. Please try again.");
      return;
    }

    setExportFailed(false);
    setExportNote(
      result.partial
        ? "Your file has been saved, but some parts could not be read. The file itself says which."
        : "Your file has been saved. It also lists what we could not include, and why."
    );
  }, []);

  /* ── erase ────────────────────────────────────────────────────────────── */

  const onOpenConfirm = useCallback(() => {
    setTyped("");
    setFailure(null);
    setPhase("confirming");
    window.setTimeout(() => confirmInputRef.current?.focus(), 0);
  }, []);

  const onCancel = useCallback(() => {
    // ★ A cancelled flow deletes NOTHING. No storage call is reachable from here.
    setTyped("");
    setFailure(null);
    setPhase("idle");
  }, []);

  const onConfirmErase = useCallback(async () => {
    if (!armed) return; // ★ belt-and-braces: the button is also disabled
    setPhase("working");
    setFailure(null);

    const outcome = await eraseMyAccountOnServer();

    if (outcome.status !== "ok" && outcome.status !== "partial") {
      // ★ THE DEVICE IS NOT CLEARED ON A FAILED SERVER RUN. Clearing local data after
      // the server refused would sign the student out of an account that still exists
      // and destroy their offline record for nothing.
      setFailure(outcome.message);
      setPhase("failed");
      return;
    }

    // ★ The server cannot reach this device — `local-storage` is `client-local` in
    // STUDENT_DATA_MAP. This is the only code path that clears it.
    const cleared = clearLocalStudentData();

    setDone({ outcome, localKeysCleared: cleared.length });
    setPhase("done");

    // ★ The student must not be able to re-enter a half-deleted account.
    try {
      await auth.logout?.();
    } catch {
      /* the account is already gone; a failed sign-out must not surface as an error */
    }
    navigate("/login", { replace: true });
  }, [armed, auth, navigate]);

  /* ── render ───────────────────────────────────────────────────────────── */

  return (
    <section className="lt-acct" aria-label="Your data and your account">
      <style>{ACCOUNT_CSS}</style>

      <h2 className="lt-acct__title">Your data</h2>
      <p className="lt-acct__lede">
        This is your data and you decide what happens to it. You can take a copy with
        you, or remove it from LazyTopper completely.
      </p>

      {/* ── download ── */}
      <div className="lt-acct__row">
        <div className="lt-acct__rowtext">
          <h3 className="lt-acct__rowtitle">Download my data</h3>
          <p className="lt-acct__rowbody">
            A file with everything LazyTopper has saved about you &mdash; your attempts,
            your answers and your progress. It also names anything we could not include.
          </p>
        </div>
        <button
          type="button"
          className="lt-acct__btn"
          onClick={onDownload}
          disabled={exportBusy}
        >
          {exportBusy ? "Preparing…" : "Download"}
        </button>
      </div>

      {exportNote ? (
        <p
          className={`lt-acct__note${exportFailed ? " lt-acct__note--bad" : " lt-acct__note--good"}`}
          role="status"
        >
          {exportNote}
        </p>
      ) : null}

      {/* ── delete ── */}
      <div className="lt-acct__row lt-acct__row--danger">
        <div className="lt-acct__rowtext">
          <h3 className="lt-acct__rowtitle">Delete my account</h3>
          <p className="lt-acct__rowbody">
            Removes your account and your work from LazyTopper. This cannot be undone,
            so we will show you exactly what happens before anything is deleted.
          </p>
        </div>
        <button type="button" className="lt-acct__btn lt-acct__btn--danger" onClick={onOpenConfirm}>
          Delete my account
        </button>
      </div>

      {/* ★★ PORTALLED TO document.body, AND THAT IS LOAD-BEARING, NOT TIDINESS.
          The app renders this page inside <main class="animate-float-up">, which carries
          a `transform`. A transformed ancestor becomes the CONTAINING BLOCK for every
          `position: fixed` descendant and creates its own stacking context — so in the
          tree the scrim covered <main>, not the viewport, and its z-index was scoped
          INSIDE <main>. The app's BottomNav is a sibling further up, so it painted over
          the dialog and covered the confirm input and both buttons: the confirmation was
          unreachable on a phone while every assertion passed.
          ★ Raising z-index cannot fix this — 60 and 9999 behaved identically, which is
          the evidence that the number was never what was wrong. A portal escapes the
          transformed ancestor, which is the actual mechanism.
          Caught by a 360px screenshot, not by a test. */}
      {phase === "confirming" || phase === "working" || phase === "failed"
        ? createPortal(
        <div className="lt-acct__scrim" role="presentation">
          <style>{ACCOUNT_CSS}</style>
          <div
            className="lt-acct__sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lt-acct-confirm-title"
          >
            <h3 className="lt-acct__sheettitle" id="lt-acct-confirm-title">
              Delete your account?
            </h3>

            <p className="lt-acct__sheetlede">
              This cannot be undone. Once it is done, nobody at LazyTopper can bring it
              back.
            </p>

            <p className="lt-acct__sheetheading">What gets deleted</p>
            <ul className="lt-acct__list">
              {ERASE_SCOPE_LINES.map((line) => (
                <li key={line} className="lt-acct__listitem">
                  {line}
                </li>
              ))}
            </ul>

            {/* ★★ THE DISCLOSURE. Shown BEFORE the student commits. Verbatim, pinned by
                a copy assertion. Styled as a plain notice, NOT as an error: it is a
                true fact the student is owed, and rendering it in alarm-red would make
                an honest sentence read like a malfunction. */}
            <div className="lt-acct__disclosure">
              <p className="lt-acct__disclosuretitle">What we cannot delete</p>
              <p className="lt-acct__disclosurebody">{THIRD_PARTY_RETENTION_DISCLOSURE}</p>
            </div>

            <label className="lt-acct__label" htmlFor="lt-acct-confirm">
              Type {ERASE_CONFIRM_PHRASE} to confirm
            </label>
            <input
              id="lt-acct-confirm"
              ref={confirmInputRef}
              className="lt-acct__input"
              type="text"
              value={typed}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={phase === "working"}
              onChange={(e) => setTyped(e.target.value)}
            />

            {failure ? (
              <p className="lt-acct__error" role="alert">
                {failure}
              </p>
            ) : null}

            <div className="lt-acct__actions">
              <button
                type="button"
                className="lt-acct__btn lt-acct__btn--ghost"
                onClick={onCancel}
                disabled={phase === "working"}
              >
                Cancel
              </button>
              <button
                type="button"
                className="lt-acct__btn lt-acct__btn--danger"
                onClick={onConfirmErase}
                disabled={!armed || phase === "working"}
              >
                {phase === "working" ? "Deleting…" : "Delete my account"}
              </button>
            </div>
          </div>
        </div>,
        document.body
          )
        : null}

      {phase === "done" && done ? (
        <div className="lt-acct__receipt" role="status">
          <p className="lt-acct__receipttitle">
            {done.outcome.status === "ok"
              ? "Your account has been deleted."
              : "Your account was partly deleted."}
          </p>
          {done.outcome.status === "partial" ? (
            <p className="lt-acct__receiptbody">{done.outcome.message}</p>
          ) : null}
          <p className="lt-acct__receiptbody">
            {done.localKeysCleared} item
            {done.localKeysCleared === 1 ? "" : "s"} were also removed from this device.
          </p>
          <p className="lt-acct__receiptbody">{THIRD_PARTY_RETENTION_DISCLOSURE}</p>
          <RemainingList remaining={done.outcome.remaining} />
        </div>
      ) : null}
    </section>
  );
}

/**
 * ★ The server's `remaining` list, shown rather than swallowed.
 *
 * `local-storage` and `third-party.gemini` are in `remaining` on EVERY successful run
 * by design, so this is the normal case, not an error case. The device half is reported
 * separately above (we just cleared it), and Gemini has its own disclosure, so those two
 * ids are filtered out here to avoid telling the student the same thing three times.
 */
function RemainingList({ remaining }: { remaining: RemainingLocation[] }) {
  const notable = remaining.filter(
    (r) => r.id !== "local-storage" && r.id !== "third-party.gemini"
  );
  if (notable.length === 0) return null;
  return (
    <>
      <p className="lt-acct__receiptbody">Still held, and why:</p>
      <ul className="lt-acct__list">
        {notable.map((r) => (
          <li key={r.id} className="lt-acct__listitem">
            {r.id}
            {r.reason ? ` — ${r.reason}` : ""}
          </li>
        ))}
      </ul>
    </>
  );
}

/* ────────────────── styles ──────────────────
   Class-driven (CLAUDE.md section 7). Mobile-first: the sheet is a full-width bottom
   sheet at 360px, which is where most students are.
   NOTE - no backtick may appear anywhere in this template literal, including in a
   comment, or the build dies. */

const ACCOUNT_CSS = `
/* ★ THE TOKENS ARE DECLARED ON BOTH ROOTS, AND THE SECOND ONE IS LOAD-BEARING.
   The confirmation dialog is PORTALLED to document.body, so it is NOT a descendant of
   .lt-acct and inherits none of its custom properties. With the tokens on .lt-acct
   alone, var(--acct-danger) resolved to nothing inside the dialog and the confirm
   button rendered white-on-white - INVISIBLE - while the disclosure lost its amber
   panel entirely. Caught by a 360px screenshot after the portal fix; no assertion in
   this lane could see it. */
.lt-acct,
.lt-acct__scrim {
  --acct-card: #ffffff;
  --acct-border: hsl(215, 25%, 90%);
  --acct-fg: hsl(220, 45%, 14%);
  --acct-muted: hsl(220, 15%, 45%);
  --acct-danger: hsl(0, 65%, 45%);
  --acct-danger-soft: hsl(0, 70%, 97%);
  --acct-notice: hsl(38, 92%, 97%);
  --acct-notice-edge: hsl(38, 60%, 80%);
}
.lt-acct {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--acct-card);
  border: 1px solid var(--acct-border);
  border-radius: 16px;
  padding: 18px 16px;
  color: var(--acct-fg);
}
.lt-acct__title {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.01em;
}
.lt-acct__lede {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--acct-muted);
}
.lt-acct__row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--acct-border);
  border-radius: 12px;
}
.lt-acct__row--danger {
  border-color: hsl(0, 40%, 88%);
  background: var(--acct-danger-soft);
}
.lt-acct__rowtext { display: flex; flex-direction: column; gap: 4px; }
.lt-acct__rowtitle { margin: 0; font-size: 14.5px; font-weight: 750; }
.lt-acct__rowbody {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--acct-muted);
}
.lt-acct__btn {
  flex-shrink: 0;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 10px;
  border: 1px solid var(--acct-border);
  background: #fff;
  color: var(--acct-fg);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.lt-acct__btn:disabled { opacity: 0.55; cursor: default; }
.lt-acct__btn--danger {
  background: var(--acct-danger);
  border-color: var(--acct-danger);
  color: #fff;
}
.lt-acct__btn--ghost { background: #fff; }
.lt-acct__note {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  padding: 10px 12px;
  border-radius: 10px;
}
.lt-acct__note--good { background: hsl(152, 55%, 96%); color: hsl(152, 45%, 25%); }
.lt-acct__note--bad { background: var(--acct-danger-soft); color: var(--acct-danger); }

/* z-index 9999 matches UpgradeSheet, the product's other modal. A 360px screenshot
   caught the first attempt at 60: the app's BottomNav is fixed at z-index 20 and was
   still painted OVER the scrim, covering the confirm input and BOTH buttons. The
   confirmation was literally unreachable on a phone while every assertion passed. */
.lt-acct__scrim {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: hsla(220, 45%, 12%, 0.55);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
}
.lt-acct__sheet {
  width: 100%;
  max-width: 520px;
  max-height: 92vh;
  overflow-y: auto;
  background: #fff;
  /* explicit: the portalled dialog does not inherit .lt-acct's colour either */
  color: var(--acct-fg);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  border-radius: 18px 18px 0 0;
  padding: 20px 16px calc(20px + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.lt-acct__sheettitle { margin: 0; font-size: 18px; font-weight: 800; }
.lt-acct__sheetlede {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--acct-muted);
}
.lt-acct__sheetheading {
  margin: 6px 0 0;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--acct-muted);
}
.lt-acct__list { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 5px; }
.lt-acct__listitem { font-size: 13px; line-height: 1.45; }
.lt-acct__disclosure {
  background: var(--acct-notice);
  border: 1px solid var(--acct-notice-edge);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.lt-acct__disclosuretitle { margin: 0; font-size: 13px; font-weight: 800; }
.lt-acct__disclosurebody { margin: 0; font-size: 13px; line-height: 1.5; }
.lt-acct__label { font-size: 13px; font-weight: 700; margin-top: 6px; }
.lt-acct__input {
  min-height: 46px;
  border: 1.5px solid var(--acct-border);
  border-radius: 10px;
  padding: 0 12px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.08em;
}
.lt-acct__error {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--acct-danger);
  background: var(--acct-danger-soft);
  border-radius: 10px;
  padding: 10px 12px;
}
.lt-acct__actions { display: flex; gap: 10px; margin-top: 6px; }
.lt-acct__actions .lt-acct__btn { flex: 1; }
.lt-acct__receipt {
  border: 1px solid var(--acct-border);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.lt-acct__receipttitle { margin: 0; font-size: 14.5px; font-weight: 800; }
.lt-acct__receiptbody { margin: 0; font-size: 13px; line-height: 1.5; color: var(--acct-muted); }

@media (min-width: 640px) {
  .lt-acct__row { flex-direction: row; align-items: center; justify-content: space-between; }
  .lt-acct__scrim { align-items: center; padding: 24px; }
  .lt-acct__sheet { border-radius: 18px; }
}
`;
