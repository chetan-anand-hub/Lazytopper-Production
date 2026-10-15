import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSessionRecordsFromCloud } from "../../services/sessionRecords";
import { trackOnboardingEvent, type StartHereSurface } from "../../analytics/analytics";
import { desktopTopicsBySubject } from "../../lib/desktop/topics";
import type { DesktopSubject } from "../../lib/desktop/navigation";
import {
  START_HERE_COPY,
  START_HERE_QTYPE_LABEL,
  analyticsSubject,
  dismissForSession,
  isDismissedThisSession,
  readSubjectHint,
  startHerePracticePath,
  type StartHereQType,
} from "./startHereModel";

/**
 * StartHereCard — START-HERE-1. A brand-new student's ONE graded result in about two minutes.
 *
 * ── WHO SEES IT ─────────────────────────────────────────────────────────────────────────
 * A signed-in account with ZERO graded results, and nobody else: a signed-out visitor, a
 * student with any graded result, or a student who tapped "Not now" this session sees nothing.
 *
 * ★ THE ZERO SIGNAL IS FirstSession's, AND SO IS ITS HAZARD. `getSessionRecordsFromCloud` is
 * the one store that means "graded activity" across every surface and every device
 * (local-first, then cloud-merged). On a fresh device a returning student has no local rows
 * until the cloud read lands, so the state is TRI-state and the card can only appear AFTER a
 * completed read that returned zero rows — never during hydration, never on a failed read.
 *
 * ── THE PICKER ──────────────────────────────────────────────────────────────────────────
 * Three taps, decisions pre-made: subject (pre-picked from the ad when known), chapter (the
 * chapters that have CBQ MCQs; the rest read "coming soon"), question type (only the types the
 * chapter really has; "Quick 5" is the default). The bank is reached with `import()` only
 * once the picker opens, so Home / Practice Hub / Check & Improve stay bank-free.
 *
 * Honest copy: no invented numbers, no promised score.
 */

type Tri = "loading" | "none" | "some";
type Availability = Record<string, Record<StartHereQType, number>>;

const CSS = `
  .lt-sh { background: linear-gradient(160deg, hsl(222,47%,24%) 0%, hsl(222,47%,16%) 100%); color: #fff;
    border-radius: 15px; padding: 23px 25px; min-width: 0; max-width: 100%; box-sizing: border-box;
    box-shadow: 0 6px 18px -10px hsla(222, 47%, 20%, 0.55); margin-bottom: 14px; }
  .lt-sh--spaced { margin-top: 13px; }
  .lt-sh .lt-sh-k { font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase;
    color: hsl(152, 55%, 60%); font-weight: 700; margin: 0 0 8px; }
  .lt-sh .lt-sh-h { font-family: 'Fraunces', Georgia, serif; font-size: 21px; line-height: 1.25;
    font-weight: 600; margin: 0 0 14px; color: #fff; }
  .lt-sh .lt-sh-ctas { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .lt-sh .lt-sh-go { display: inline-flex; align-items: center; justify-content: center;
    background: hsl(152, 55%, 45%); color: #fff; border: 0; border-radius: 10px; padding: 11px 22px;
    font-size: 14px; font-weight: 700; cursor: pointer; }
  .lt-sh .lt-sh-go:hover { background: hsl(152, 57%, 40%); }
  .lt-sh .lt-sh-go:disabled { opacity: 0.55; cursor: default; }
  .lt-sh .lt-sh-later { background: none; border: 0; color: rgba(255,255,255,0.78); font-size: 13.5px;
    font-weight: 600; text-decoration: underline; cursor: pointer; padding: 6px 2px; }
  .lt-sh .lt-sh-step { margin: 0 0 14px; }
  .lt-sh .lt-sh-lbl { display: block; font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.7);
    margin: 0 0 6px; letter-spacing: 0.02em; }
  .lt-sh .lt-sh-chips { display: flex; gap: 8px; flex-wrap: wrap; }
  .lt-sh .lt-sh-chip { border: 1px solid rgba(255,255,255,0.34); background: transparent; color: #fff;
    border-radius: 999px; padding: 9px 18px; font-size: 13.5px; font-weight: 700; cursor: pointer; }
  .lt-sh .lt-sh-chip[aria-pressed="true"] { background: hsl(152, 55%, 45%); border-color: hsl(152, 55%, 45%); }
  .lt-sh .lt-sh-select { width: 100%; box-sizing: border-box; border-radius: 10px; padding: 11px 12px;
    font-size: 14px; border: 1px solid rgba(255,255,255,0.34); background: hsl(222,47%,14%); color: #fff; }
  .lt-sh .lt-sh-radio { display: flex; align-items: center; gap: 9px; font-size: 14px; margin: 0 0 7px; }
  .lt-sh .lt-sh-note { font-size: 12.5px; color: rgba(255,255,255,0.72); margin: 0 0 12px; line-height: 1.5; }
  @media (max-width: 480px) {
    .lt-sh { padding: 19px 17px; border-radius: 14px; }
    .lt-sh .lt-sh-h { font-size: 18.5px; }
    .lt-sh .lt-sh-ctas { flex-direction: column; align-items: stretch; gap: 9px; }
    .lt-sh .lt-sh-go { width: 100%; }
    .lt-sh .lt-sh-later { align-self: center; }
  }
`;

export interface StartHereState {
  /** True only for a signed-in account with zero graded results that has not tapped "Not now". */
  visible: boolean;
  /** "Not now": hide for the rest of this session. */
  dismiss: () => void;
}

/**
 * Whether the card shows. Split out so Home can ask ONCE and also stand the older
 * FirstSession card down while this one is up (two start cards on one screen is noise).
 */
export function useStartHere(uid?: string | null): StartHereState {
  const [graded, setGraded] = useState<Tri>("loading");
  const [dismissed, setDismissed] = useState<boolean>(() => isDismissedThisSession());

  useEffect(() => {
    // Re-enter "loading" on a uid change so a sign-in can never inherit the previous verdict.
    setGraded("loading");
    if (!uid) return;
    let cancelled = false;
    void (async () => {
      try {
        const records = await getSessionRecordsFromCloud(uid);
        if (cancelled) return;
        setGraded(Array.isArray(records) && records.length > 0 ? "some" : "none");
      } catch {
        // An unreadable history is NOT evidence of a first session: stay silent.
        if (!cancelled) setGraded("some");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  return {
    visible: !!uid && graded === "none" && !dismissed,
    dismiss: () => {
      dismissForSession();
      setDismissed(true);
    },
  };
}

export interface StartHereCardProps {
  /** The signed-in account uid. Falsy → the card never renders (signed-out pages are unchanged). */
  uid?: string | null;
  /** Which page the card is on: the `start_here_shown` / `start_here_dismissed` param. */
  surface: StartHereSurface;
  /** Where the practice set's back link returns to: the page the card is on. */
  returnTo: string;
  spaced?: boolean;
}

/** The card with its own eligibility read (Practice Hub, Check & Improve). */
export default function StartHereCard({ uid, ...rest }: StartHereCardProps) {
  const state = useStartHere(uid);
  return <StartHereView {...rest} state={state} />;
}

/** The card, given an eligibility read the caller already made (Home). */
export function StartHereView({
  surface,
  returnTo,
  spaced = false,
  state,
}: Omit<StartHereCardProps, "uid"> & { state: StartHereState }) {
  const navigate = useNavigate();
  const visible = state.visible;
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState<DesktopSubject | null>(() => readSubjectHint());
  const [chapter, setChapter] = useState("");
  const [qtype, setQtype] = useState<StartHereQType>("mcq");
  const [availability, setAvailability] = useState<Record<string, Availability>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    if (!visible || shownRef.current) return;
    shownRef.current = true;
    trackOnboardingEvent("start_here_shown", { surface });
  }, [visible, surface]);

  // Which chapters have CBQ MCQs — loaded with import() only once the picker is open.
  const topics = useMemo(() => (subject ? desktopTopicsBySubject(subject) : []), [subject]);
  useEffect(() => {
    if (!visible || !open || !subject || availability[subject]) return;
    let live = true;
    import("./startHereBank")
      .then((m) => m.startHereAvailability(subject, topics.map((t) => t.slug)))
      .then((found) => {
        if (live) setAvailability((prev) => ({ ...prev, [subject]: found }));
      })
      .catch(() => {
        if (live) setAvailability((prev) => ({ ...prev, [subject]: {} }));
      });
    return () => {
      live = false;
    };
  }, [visible, open, subject, topics, availability]);

  if (!visible) return null;

  const subjectAvail = subject ? availability[subject] : undefined;
  const checking = !!subject && !subjectAvail;
  const offered = (slug: string, t: StartHereQType): boolean => !!subjectAvail && (subjectAvail[slug]?.[t] ?? 0) >= 5;
  const chapterOk = (slug: string): boolean => offered(slug, "mcq") || offered(slug, "ar");
  const selected = chapter && chapterOk(chapter) ? chapter : (topics.find((t) => chapterOk(t.slug))?.slug ?? "");
  const types = (["mcq", "ar"] as const).filter((t) => selected && offered(selected, t));
  const activeType: StartHereQType = types.includes(qtype) ? qtype : (types[0] ?? "mcq");

  const onNotNow = () => {
    trackOnboardingEvent("start_here_dismissed", { surface });
    state.dismiss();
  };

  const onGo = async () => {
    if (!subject || !selected || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const bank = await import("./startHereBank");
      const ids = await bank.pickStartHereSet({ subject, chapter: selected, qtype: activeType, rotation: Date.now() });
      if (ids.length < 5) {
        setFailed(true);
        setBusy(false);
        return;
      }
      trackOnboardingEvent("start_here_start", { subject: analyticsSubject(subject), chapter: selected, qtype: activeType });
      navigate(startHerePracticePath({ subject, chapter: selected, ids, qtype: activeType, returnTo }));
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <section className={spaced ? "lt-sh lt-sh--spaced" : "lt-sh"} data-testid="start-here-card">
        <p className="lt-sh-k">{START_HERE_COPY.kicker}</p>
        <h2 className="lt-sh-h">{START_HERE_COPY.body}</h2>
        {!open ? (
          <div className="lt-sh-ctas">
            <button type="button" className="lt-sh-go" data-testid="start-here-start" onClick={() => setOpen(true)}>
              {START_HERE_COPY.start}
            </button>
            <button type="button" className="lt-sh-later" data-testid="start-here-not-now" onClick={onNotNow}>
              {START_HERE_COPY.notNow}
            </button>
          </div>
        ) : (
          <>
            <div className="lt-sh-step">
              <span className="lt-sh-lbl">1 · Subject</span>
              <div className="lt-sh-chips">
                {(["Maths", "Science"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="lt-sh-chip"
                    aria-pressed={subject === s}
                    data-testid={`start-here-subject-${s.toLowerCase()}`}
                    onClick={() => {
                      setSubject(s);
                      setChapter("");
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {subject && (
              <div className="lt-sh-step">
                <label className="lt-sh-lbl" htmlFor="lt-sh-chapter">2 · Chapter</label>
                {checking ? (
                  <p className="lt-sh-note">Checking which chapters have questions ready…</p>
                ) : (
                  <select
                    id="lt-sh-chapter"
                    className="lt-sh-select"
                    data-testid="start-here-chapter"
                    value={selected}
                    onChange={(e) => setChapter(e.target.value)}
                  >
                    {topics.map((t) => (
                      <option key={t.slug} value={t.slug} disabled={!chapterOk(t.slug)}>
                        {chapterOk(t.slug) ? t.name : `${t.name} — coming soon`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
            {subject && !checking && types.length > 0 && (
              <div className="lt-sh-step">
                <span className="lt-sh-lbl">3 · Question type</span>
                {types.map((t) => (
                  <label key={t} className="lt-sh-radio">
                    <input
                      type="radio"
                      name="lt-sh-qtype"
                      checked={activeType === t}
                      data-testid={`start-here-qtype-${t}`}
                      onChange={() => setQtype(t)}
                    />
                    {START_HERE_QTYPE_LABEL[t]}
                  </label>
                ))}
              </div>
            )}
            {failed && (
              <p className="lt-sh-note" role="alert">
                We couldn&apos;t line up five questions for that chapter just now. Try another chapter.
              </p>
            )}
            <div className="lt-sh-ctas">
              <button
                type="button"
                className="lt-sh-go"
                data-testid="start-here-go"
                disabled={!subject || checking || !selected || busy}
                onClick={() => void onGo()}
              >
                {busy ? "Getting your questions…" : "Start 5 questions"}
              </button>
              <button type="button" className="lt-sh-later" data-testid="start-here-not-now" onClick={onNotNow}>
                {START_HERE_COPY.notNow}
              </button>
            </div>
          </>
        )}
      </section>
    </>
  );
}
