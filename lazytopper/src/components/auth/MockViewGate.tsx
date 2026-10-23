import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { UpgradeModal } from "../UpgradeModal";
import { MONTHLY_INLINE } from "../../config/pricing";
import { ANON_DAILY_MOCK_LIMIT, SIGNED_IN_DAILY_MOCK_LIMIT } from "../../config/mockViewLimits";
import { isResumingSavedPaper, paperRouteKey } from "../../lib/papers/resumablePaper";

/**
 * Per-DAY paper views (AUTH-GATE-MOVE-1). This gate used to allow 1 per WEEK while the
 * route comment in `App.tsx` claimed 1 per day; the code and its own comment disagreed.
 * It is now genuinely per-day, in two tiers.
 *
 * ★ WHY A LIMIT AT ALL, WHEN VIEWING IS FREE TO SERVE. It is fair use, not a paywall.
 * Papers are static bank data, so nobody is charged for a view — but an uncapped
 * generator is worth capping, and a signed-in student is worth more allowance than an
 * anonymous one. Downloading the paper you just opened is part of that free view:
 * `exportWorksheetPdf` is html2canvas + jsPDF, entirely client-side, no network call and
 * no cost. Nothing here gates a download, and a spent daily allowance must never block
 * the download of a paper already on screen.
 *
 * ★ EVERY COUNTER HERE IS CLIENT-SIDE, DELIBERATELY. Counting on the server would mean
 * authenticating a request for free content, which is precisely the wall this lane
 * removed. The consequence is that the limit is soft — clearing storage resets it — and
 * that is the correct trade: see the crawler note on `getDayStamp`.
 */
const MOCK_VIEW_KEY = "lazytopper.dailyMockViews";
// FRICTION-FIX-1 · F2 (R3) — the two limits (anonymous 1/day, signed-in free 3/day) live
// in the import-free config/mockViewLimits.ts, so the Basic plan list can state them
// without importing this module (see that file for the cycle it avoids).
const GUEST_SESSION_KEY = "lazytopper.guestSessionId";

function getGuestSessionId(): string {
  let id = sessionStorage.getItem(GUEST_SESSION_KEY);
  if (!id) {
    id = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(GUEST_SESSION_KEY, id);
  }
  return id;
}

function getScopedKey(uid: string | null): string {
  const scope = uid || getGuestSessionId();
  return `${MOCK_VIEW_KEY}:${scope}`;
}

/**
 * The local calendar day, `YYYY-MM-DD`. Local rather than UTC on purpose: "today" has to
 * mean the student's today, and LazyTopper's students sit at UTC+5:30, where a UTC day
 * boundary would roll the allowance over at 05:30 in the morning.
 *
 * ⚠ CRAWLER SAFETY — THE REASON THE CHAPTER PAGES ARE INDEXED. Googlebot carries no
 * `localStorage`, so `getDailyMockViews` always returns 0 for it and the first view is
 * always granted. That must stay true: a limit that can fire on a FRESH context breaks
 * indexing, and a limit that never fires is not a limit. Both halves are pinned by the
 * guard test, which asserts a fresh context renders AND that the same context walls once
 * the allowance is spent.
 */
function getDayStamp(): string {
  const now = new Date();
  const m = `${now.getMonth() + 1}`.padStart(2, "0");
  const d = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

function getDailyMockViews(uid: string | null): number {
  try {
    const day = getDayStamp();
    const raw = localStorage.getItem(getScopedKey(uid));
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    // A record from another day — or a legacy `{week,count}` record, which has no `day`
    // field at all — reads as zero and is overwritten on the next view.
    if (parsed?.day !== day) return 0;
    return parsed.count || 0;
  } catch {
    return 0;
  }
}

function incrementDailyMockViews(uid: string | null): void {
  const day = getDayStamp();
  const count = getDailyMockViews(uid) + 1;
  try {
    localStorage.setItem(getScopedKey(uid), JSON.stringify({ day, count }));
  } catch {}
}

/**
 * CT-RESUME-2 — a gated route this tab opened WITHOUT counting (a resume of a saved paper). If
 * the student then sets the saved paper aside and starts a NEW one on that same visit, the new
 * paper must be counted then — `claimNewPaperView` does it. Premium never sets the mark (the
 * gate returns before it), so premium stays unlimited.
 */
const UNCOUNTED_KEY = "lazytopper.dailyMockViews.uncounted";

function readUncounted(): string[] {
  try {
    const raw = sessionStorage.getItem(UNCOUNTED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeUncounted(list: string[]): void {
  try {
    if (list.length) sessionStorage.setItem(UNCOUNTED_KEY, JSON.stringify(list));
    else sessionStorage.removeItem(UNCOUNTED_KEY);
  } catch {
    /* best-effort */
  }
}

/**
 * A page calls this when the student starts a NEW paper on a visit the gate let through as a
 * resume (Chapter Test "Start a fresh test instead", a new Full Mock instead of the saved one).
 * Visit not marked → it was already counted → true. Marked → counts it now (true), or, with
 * today's allowance spent, refuses (false: the page keeps the saved paper and says why).
 */
export function claimNewPaperView(pathname: string, uid: string | null): boolean {
  const route = paperRouteKey(pathname);
  const marked = readUncounted();
  if (!marked.includes(route)) return true;
  if (getDailyMockViews(uid) >= dailyLimitFor(!!uid)) return false;
  incrementDailyMockViews(uid);
  writeUncounted(marked.filter((r) => r !== route));
  return true;
}

/** The line a page shows when `claimNewPaperView` refuses. */
export const NEW_PAPER_LIMIT_LINE =
  "You've opened today's papers already — your saved test is still here to finish.";

/** Premium is unlimited and never reaches this. */
function dailyLimitFor(signedIn: boolean): number {
  return signedIn ? SIGNED_IN_DAILY_MOCK_LIMIT : ANON_DAILY_MOCK_LIMIT;
}

export function MockViewGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { isPremium, isTrialExpired } = useSubscription();
  const location = useLocation();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [ready, setReady] = useState(false);
  const incrementedRef = useRef(false);

  const uid = user?.uid || null;

  useEffect(() => {
    if (loading) return;
    if (user && isPremium) {
      setReady(true);
      return;
    }
    /**
     * ★ A TRIAL-EXPIRED STUDENT IS COUNTED, NOT WALLED (AUTH-GATE-MOVE-1).
     *
     * This branch used to return early with no allowance at all, so a student whose
     * 7-day trial had ended got ZERO papers a day. Under the owner's tier table a
     * signed-in free student gets 3/day, and — because a new account's trial makes it
     * premium until it lapses — trial-expired IS how a student becomes signed-in free.
     * Returning early here would have left the entire signed-in free tier unreachable
     * and its allowance untestable. The trial-ended panel is not gone: it now renders
     * when such a student has SPENT the 3, which is the honest moment to show it.
     */
    if (incrementedRef.current) {
      setReady(true);
      return;
    }
    /**
     * CT-RESUME-2 — COUNT ONLY NEW PAPERS. A reload of a Chapter Test / Full Mock the student is
     * part-way through is a RESUME of a paper already counted when it was opened, not a new
     * paper: it neither spends an allowance nor is blocked (a student on their last paper of
     * the day can always get back to it). Decided from the SAME saved in-progress state the
     * page resumes from (lib/papers/resumablePaper). A genuinely new paper has none and is
     * counted below exactly as before; server metering (the paper pass minted at grading) is
     * untouched.
     */
    if (isResumingSavedPaper(location.pathname, uid)) {
      const route = paperRouteKey(location.pathname);
      const marked = readUncounted();
      if (!marked.includes(route)) writeUncounted([...marked, route]);
      setReady(true);
      return;
    }
    const views = getDailyMockViews(uid);
    if (views >= dailyLimitFor(!!user)) {
      setLimitReached(true);
      setReady(true);
    } else {
      incrementDailyMockViews(uid);
      incrementedRef.current = true;
      setReady(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the route is read once per gate mount
  }, [loading, user, isPremium, uid]);

  if (loading || !ready) {
    return (
      <div className="lt-page">
        <div className="card">
          <h3>Loading...</h3>
        </div>
      </div>
    );
  }

  if (user && isPremium) {
    return <>{children}</>;
  }

  if (user && isTrialExpired && limitReached) {
    return (
      <div className="lt-page" style={{ textAlign: "center", paddingTop: 60 }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>⏰</div>
        <h2 style={{ fontWeight: 900, fontSize: "1.3rem", marginBottom: 8, color: "var(--text)" }}>
          Your Free Trial Has Ended
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", marginBottom: 6, lineHeight: 1.5 }}>
          You&rsquo;ve used your {SIGNED_IN_DAILY_MOCK_LIMIT} papers for today.
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 6, lineHeight: 1.6 }}>
          Upgrade now to keep access to:
        </p>
        <div style={{
          display: "inline-flex", flexDirection: "column", gap: 6,
          textAlign: "left", marginBottom: 20,
          background: "var(--bg-card)", borderRadius: 12, padding: "12px 20px",
          border: "1px solid var(--bg-card-border)",
        }}>
          {["Full mock tests, marked like the board exam", "Your mastery progress & streak", "Practice history & weak-area insights"].map(item => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.84rem", color: "var(--text)" }}>
              <span style={{ color: "#22c55e", fontWeight: 800 }}>✓</span>
              {item}
            </div>
          ))}
        </div>
        <div>
          <button
            type="button"
            onClick={() => setShowUpgrade(true)}
            style={{
              border: "none", borderBottom: "4px solid #46a302", borderRadius: 16,
              padding: "14px 28px", background: "#58cc02", color: "var(--text)",
              fontSize: "1rem", fontWeight: 800, cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            Upgrade to Premium
          </button>
        </div>
        <UpgradeModal
          open={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          featureLabel="Premium Mock Tests"
        />
      </div>
    );
  }

  if (!user && limitReached) {
    return (
      <div className="lt-page" style={{ textAlign: "center", paddingTop: 60 }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>📄</div>
        <h2 style={{ fontWeight: 900, fontSize: "1.3rem", marginBottom: 8 }}>
          Sign in to View More
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", marginBottom: 20, lineHeight: 1.5 }}>
          You&rsquo;ve opened your free paper for today. Sign in for {SIGNED_IN_DAILY_MOCK_LIMIT} a
          day — and a new account can start a free 7-day trial with everything unlocked.
        </p>
        <Link
          to={`/login?reason=login&redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`}
          style={{
            display: "inline-block", textDecoration: "none",
            border: "none", borderBottom: "4px solid #46a302", borderRadius: 16,
            padding: "14px 28px", background: "#58cc02", color: "var(--text)",
            fontSize: "1rem", fontWeight: 800, cursor: "pointer",
            textTransform: "uppercase",
          }}
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (user && limitReached) {
    return (
      <div className="lt-page" style={{ textAlign: "center", paddingTop: 60 }}>
        <div style={{ fontSize: "3rem", marginBottom: 12 }}>📄</div>
        <h2 style={{ fontWeight: 900, fontSize: "1.3rem", marginBottom: 8 }}>
          Mock Paper Limit Reached
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", marginBottom: 8, lineHeight: 1.5 }}>
          Free accounts open {SIGNED_IN_DAILY_MOCK_LIMIT} papers a day.
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: 20, lineHeight: 1.5 }}>
          Get full mock tests with Premium at {MONTHLY_INLINE}.
        </p>
        <button
          type="button"
          onClick={() => setShowUpgrade(true)}
          style={{
            border: "none", borderBottom: "4px solid #46a302", borderRadius: 16,
            padding: "14px 28px", background: "#58cc02", color: "var(--text)",
            fontSize: "1rem", fontWeight: 800, cursor: "pointer",
            textTransform: "uppercase",
          }}
        >
          Unlock Premium mocks
        </button>
        <UpgradeModal
          open={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          featureLabel="Premium Mock Tests"
        />
      </div>
    );
  }

  return <>{children}</>;
}
