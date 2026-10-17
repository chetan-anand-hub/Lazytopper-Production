import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { AuthUser } from "../../context/AuthContext";
import { trackOnboardingEvent, type PendingUploadSurface } from "../../analytics/analytics";
import {
  loadPendingPapers,
  PENDING_SURFACE_LABEL,
  pendingPapersUid,
  readPendingPapersLocal,
  type PendingPaper,
  type PendingPaperSurface,
} from "./pendingPapers";

/**
 * PendingPapersCard — HOME-PENDING-1 (owner ruling 17 Oct 2026): Home's "Waiting for your answers"
 * card, in the slot "Jump straight in" used to hold on desktop AND mobile.
 *
 * One row per paper still waiting for an answer upload (Worksheet, Chapter Test, Full Mock, Quick
 * Practice): the paper code, its title, the surface, the subject, the day it was saved, and
 * "Upload answers" (the surface's own deep link — see pendingPapers.ts). At most three rows, then
 * "See all (N)" opens the rest in place.
 *
 * HONEST: signed-in only, and the card does not exist when nothing is waiting (no empty card).
 * It starts from this device's copy (no network, no flash) and fills in other devices' papers from
 * ONE memoised read per tab. Display only — nothing here grades, scores or records.
 */

export const PENDING_CARD_MAX_ROWS = 3;
const SHOWN_KEY = "lazytopper.pendingCardShown";
let shownThisTab = false;

/** `pending_card_shown` at most once per tab (sessionStorage survives a reload of the tab). */
function claimPendingCardShown(): boolean {
  if (shownThisTab) return false;
  shownThisTab = true;
  try {
    if (window.sessionStorage.getItem(SHOWN_KEY) === "1") return false;
    window.sessionStorage.setItem(SHOWN_KEY, "1");
  } catch {
    /* storage blocked: the in-memory flag still limits it to this page load */
  }
  return true;
}

/** Test seam: forget this page load's "shown". */
export function __resetPendingCardShownForTests(): void {
  shownThisTab = false;
}

const ANALYTICS_SURFACE: Record<PendingPaperSurface, PendingUploadSurface> = {
  worksheet: "worksheet",
  "chapter-test": "chapter_test",
  "full-mock": "full_mock",
  "quick-practice": "quick_practice",
};

function formatSavedDay(ms: number): string | null {
  if (!ms || !Number.isFinite(ms)) return null;
  try {
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return null;
  }
}

const CSS = `
  .lt-pend { background: #fff; border: 1px solid hsl(38, 70%, 82%); border-radius: 16px;
    padding: 16px 16px 12px; min-width: 0; max-width: 100%; box-sizing: border-box;
    box-shadow: 0 2px 9px -5px hsla(38, 60%, 30%, 0.25); position: relative; overflow: hidden; }
  .lt-pend::before { content: ""; position: absolute; top: 0; left: 0; width: 5px; height: 100%;
    background: hsl(38, 85%, 52%); }
  .lt-pend--spaced { margin-top: 18px; }
  .lt-pend * { box-sizing: border-box; }
  .lt-pend-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
    margin: 0 0 4px; }
  .lt-pend-k { font-size: 10.5px; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase;
    color: hsl(38, 65%, 32%); margin: 0; }
  .lt-pend-n { font-size: 11.5px; font-weight: 700; color: hsl(220, 15%, 45%); }
  .lt-pend-h { font-family: 'Fraunces', Georgia, serif; font-size: 17px; font-weight: 700;
    color: hsl(222, 47%, 16%); margin: 0 0 2px; }
  .lt-pend-sub { font-size: 12px; color: hsl(220, 15%, 45%); margin: 0 0 8px; line-height: 1.45; }
  .lt-pend-list { list-style: none; margin: 0; padding: 0; }
  .lt-pend-row { display: flex; align-items: center; gap: 12px; padding: 10px 0;
    border-top: 1px solid hsl(215, 25%, 92%); min-width: 0; }
  .lt-pend-main { flex: 1; min-width: 0; }
  .lt-pend-code { display: inline-block; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 11px; font-weight: 700; color: hsl(222, 47%, 24%); background: hsl(222, 45%, 95%);
    border-radius: 6px; padding: 2px 6px; max-width: 100%; overflow: hidden; text-overflow: ellipsis;
    white-space: nowrap; vertical-align: middle; }
  .lt-pend-title { display: block; font-size: 13.5px; font-weight: 700; color: hsl(220, 45%, 14%);
    margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lt-pend-meta { display: block; font-size: 11.5px; color: hsl(220, 15%, 45%); margin-top: 1px; }
  .lt-pend-go { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
    min-height: 44px; min-width: 44px; padding: 0 14px; border-radius: 10px;
    background: hsl(152, 55%, 40%); color: #fff; text-decoration: none; font-size: 12.5px;
    font-weight: 700; white-space: nowrap; }
  .lt-pend-go:hover { background: hsl(152, 57%, 35%); }
  .lt-pend-go:focus-visible, .lt-pend-all:focus-visible { outline: 2px solid hsl(222, 47%, 24%); outline-offset: 2px; }
  .lt-pend-all { display: flex; align-items: center; justify-content: center; width: 100%;
    min-height: 44px; margin-top: 4px; border: 0; border-top: 1px solid hsl(215, 25%, 92%);
    background: transparent; color: hsl(222, 47%, 24%); font: inherit; font-size: 12.5px;
    font-weight: 700; cursor: pointer; }
  @media (max-width: 480px) {
    .lt-pend { padding: 14px 13px 10px; }
    .lt-pend-row { flex-wrap: wrap; gap: 8px; }
    .lt-pend-main { flex-basis: 100%; }
    .lt-pend-go { width: 100%; }
  }
`;

export interface PendingPapersCardProps {
  user: Pick<AuthUser, "uid" | "isLocalSession"> | null | undefined;
  /** Mobile Home's own top rhythm (a prop, not a wrapper: nothing renders when nothing waits). */
  spaced?: boolean;
}

export default function PendingPapersCard({ user, spaced = false }: PendingPapersCardProps) {
  const uid = pendingPapersUid(user);
  const isLocalSession = user?.isLocalSession;
  // This device's copy first: no network, so a returning student sees the card at once.
  const [papers, setPapers] = useState<PendingPaper[]>(() => readPendingPapersLocal(uid));
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setPapers(readPendingPapersLocal(uid));
    setExpanded(false);
    if (!uid) return;
    let live = true;
    void loadPendingPapers({ uid, isLocalSession })
      .then((list) => {
        if (live) setPapers(list);
      })
      .catch(() => {
        /* the device list stays */
      });
    return () => {
      live = false;
    };
  }, [uid, isLocalSession]);

  const visible = useMemo(
    () => (expanded ? papers : papers.slice(0, PENDING_CARD_MAX_ROWS)),
    [papers, expanded],
  );
  const count = papers.length;

  useEffect(() => {
    if (uid && count > 0 && claimPendingCardShown()) {
      trackOnboardingEvent("pending_card_shown", { count });
    }
  }, [uid, count]);

  if (!uid || count === 0) return null;

  return (
    <>
      <style>{CSS}</style>
      <section
        className={spaced ? "lt-pend lt-pend--spaced" : "lt-pend"}
        data-testid="pending-papers-card"
        aria-labelledby="lt-pend-h"
      >
        <div className="lt-pend-head">
          <p className="lt-pend-k">Answers to upload</p>
          <span className="lt-pend-n" data-testid="pending-papers-count">
            {count} waiting
          </span>
        </div>
        <h2 className="lt-pend-h" id="lt-pend-h">
          Waiting for your answers
        </h2>
        <p className="lt-pend-sub">Photograph your answer sheet and upload it to get it checked.</p>
        <ul className="lt-pend-list">
          {visible.map((p) => {
            const day = formatSavedDay(p.savedAt);
            return (
              <li
                key={`${p.surface}::${p.code}`}
                className="lt-pend-row"
                data-testid="pending-paper-row"
                data-surface={p.surface}
              >
                <span className="lt-pend-main">
                  <span className="lt-pend-code" data-testid="pending-paper-code">
                    {p.code}
                  </span>
                  <span className="lt-pend-title">{p.title}</span>
                  <span className="lt-pend-meta">
                    {PENDING_SURFACE_LABEL[p.surface]} · {p.subject === "science" ? "Science" : "Maths"}
                    {day ? ` · Saved ${day}` : ""}
                  </span>
                </span>
                <Link
                  to={p.href}
                  className="lt-pend-go"
                  data-testid="pending-paper-upload"
                  aria-label={`Upload answers for ${p.code}`}
                  onClick={() => trackOnboardingEvent("pending_upload_tap", { surface: ANALYTICS_SURFACE[p.surface] })}
                >
                  Upload answers
                </Link>
              </li>
            );
          })}
        </ul>
        {count > PENDING_CARD_MAX_ROWS ? (
          <button
            type="button"
            className="lt-pend-all"
            data-testid="pending-papers-see-all"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Show fewer" : `See all (${count})`}
          </button>
        ) : null}
      </section>
    </>
  );
}
