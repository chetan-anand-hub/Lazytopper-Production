/**
 * PARENT-REPORT-1 — the parent's read-only page for ONE result the student chose to share.
 * Route: `/u/report#r=<token>` — the existing `/u/:token` route (QrAnswerUploadPage hands the
 * literal segment `report` to this page, lazily). `/u/*` is a bare full-screen route (no navbar,
 * shell or bottom nav), is served from the noindex shell, and never appears in a sitemap.
 *
 * ★ PUBLIC, NO LOGIN, READ-ONLY. The token in the FRAGMENT is the only credential; the page sends
 * it to `/api/parent-report/view` and renders the stored snapshot it gets back — the child's
 * first name, subject and chapter, date, score, marks lost by mistake type (the scorecard's own
 * words, from lib/mistakeDisplay) and up to three "where marks slipped" lines. Nothing else exists
 * to render: the response carries no uid, email, phone, answer text or other result.
 *
 * ★ MUMMY. One Mummy moment in the existing Mummy style: her figure from the lazily loaded mummy
 * chunk (the rig never enters this page's chunk), drawn after idle, never in an automated browser,
 * a still pose under reduced motion (the rig's own rule), and NOT drawn when "Hide mascots" is on
 * for this device. Her line is plain text either way.
 */
import { lazy, Suspense, useEffect, useRef, useState, type ComponentType } from "react";
import { trackParentReportViewed } from "../../analytics/analytics";
import {
  MARKS_HEADING,
  MISTAKES_BY_KIND_HEADING,
  NOT_ATTEMPTED,
  UNTYPED_MARKS_LABEL,
  countWithUnit,
  groupRows,
  marksGroupRows,
  marksWithUnit,
  mistakeTypeLabel,
  totalCount,
} from "../../lib/mistakeDisplay";
import { desktopTopicForWeakAreaKey } from "../../lib/desktop/topics";
import { shouldDrawMummy } from "../guide/mummy/mummyModel";
import type { MummyFigureProps } from "../guide/mummy/mummyChunk";
import {
  PARENT_RESULT_CTA_HREF,
  PARENT_RESULT_CTA_LABEL,
  mascotsHiddenOnThisDevice,
  mummyLineFor,
  resultDateLabel,
} from "./parentResultCopy";
import {
  ParentResultError,
  readParentResultToken,
  viewParentResult,
  type ParentResultView,
} from "./parentResultLink";
import "./parentResultPage.css";

const NoFigure: ComponentType<MummyFigureProps> = () => null;
/** The ONLY door into the mummy chunk; a failed load draws nothing (the page still works). */
const LazyMummyFigure = lazy(() =>
  import("../guide/mummy/mummyChunk").then(
    (m) => ({ default: m.MummyFigure }),
    () => ({ default: NoFigure }),
  ),
);

type Phase = "loading" | "ready" | "invalid" | "expired" | "failed";

export interface ParentResultPageProps {
  /** Test seam: the fragment (default: window.location.hash). */
  hash?: string;
  /** Test seam: the read (default: POST /api/parent-report/view). */
  view?: (token: string) => Promise<ParentResultView>;
  /** Test seam: draw Mummy's figure (default: after idle, real visitors only). */
  drawFigure?: boolean;
}

/** Keep the page out of every index, whatever shell served it (the /u shell already says noindex). */
function useNoindex(): void {
  useEffect(() => {
    if (typeof document === "undefined") return;
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const created = !meta;
    const previous = meta ? meta.getAttribute("content") : null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "noindex,nofollow");
    return () => {
      if (!meta) return;
      if (created) meta.remove();
      else if (previous !== null) meta.setAttribute("content", previous);
    };
  }, []);
}

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
  cancelIdleCallback?: (h: number) => void;
};

function useDrawAfterIdle(forced: boolean | undefined): boolean {
  const [draw, setDraw] = useState(false);
  useEffect(() => {
    if (forced !== undefined) return;
    if (!shouldDrawMummy() || mascotsHiddenOnThisDevice()) return;
    const w = window as IdleWindow;
    if (typeof w.requestIdleCallback === "function") {
      const h = w.requestIdleCallback(() => setDraw(true), { timeout: 1500 });
      return () => w.cancelIdleCallback?.(h);
    }
    const t = setTimeout(() => setDraw(true), 1);
    return () => clearTimeout(t);
  }, [forced]);
  if (forced !== undefined) return forced && !mascotsHiddenOnThisDevice();
  return draw;
}

function chapterNames(slugs: string[]): string[] {
  const out: string[] = [];
  for (const s of slugs) {
    const name = desktopTopicForWeakAreaKey(s)?.name;
    if (name && !out.includes(name)) out.push(name);
  }
  return out;
}

function MarksLostBlock({ r }: { r: ParentResultView }) {
  if (r.marksLost) {
    const m = r.marksLost;
    return (
      <section className="lt-pr__sec" data-testid="pr-marks">
        <h2 className="lt-pr__h2">{MARKS_HEADING}</h2>
        {marksGroupRows(m).map(({ group, marks, types }) => (
          <div key={group.key} className={`lt-pr__grp lt-pr__grp--${group.colorKey}`} data-group={group.key}>
            <div className="lt-pr__gh">{group.heading}</div>
            <div className="lt-pr__gsub">
              {group.label} · {marksWithUnit(marks)}
            </div>
            {types.map((t) => (
              <div key={t.type} className="lt-pr__row">
                <span>{t.label}</span>
                <span>{marksWithUnit(t.marks)}</span>
              </div>
            ))}
          </div>
        ))}
        {m.unattempted > 0 && (
          <div className="lt-pr__row lt-pr__row--na">
            <span>{NOT_ATTEMPTED.label} — not counted as a mistake</span>
            <span>{marksWithUnit(m.unattempted)}</span>
          </div>
        )}
        {m.untyped > 0 && (
          <div className="lt-pr__row lt-pr__row--na">
            <span>{UNTYPED_MARKS_LABEL}</span>
            <span>{marksWithUnit(m.untyped)}</span>
          </div>
        )}
      </section>
    );
  }
  if (totalCount(r.fourType) <= 0) return null;
  return (
    <section className="lt-pr__sec" data-testid="pr-counts">
      <h2 className="lt-pr__h2">{MISTAKES_BY_KIND_HEADING}</h2>
      {groupRows(r.fourType).map(({ group, count, types }) => (
        <div key={group.key} className={`lt-pr__grp lt-pr__grp--${group.colorKey}`} data-group={group.key}>
          <div className="lt-pr__gh">{group.heading}</div>
          <div className="lt-pr__gsub">
            {group.label} · {countWithUnit(count)}
          </div>
          {types.map((t) => (
            <div key={t.type} className="lt-pr__row">
              <span>{t.label}</span>
              <span>{countWithUnit(t.count)}</span>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

function SlipsBlock({ r }: { r: ParentResultView }) {
  if (r.slips.length === 0) return null;
  return (
    <section className="lt-pr__sec" data-testid="pr-slips">
      <h2 className="lt-pr__h2">Where marks slipped</h2>
      <ul className="lt-pr__slips">
        {r.slips.map((s) => {
          const label = mistakeTypeLabel(s.type);
          return (
            <li key={s.q} className="lt-pr__slip" data-testid="pr-slip">
              <span className="lt-pr__slip-q">Question {s.q}</span>
              <span className="lt-pr__slip-m">
                {s.awarded} / {s.available}
              </span>
              {label && <span className="lt-pr__slip-t">{label}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MummyMoment({ kind, drawFigure }: { kind: ParentResultView["kind"]; drawFigure?: boolean }) {
  const draw = useDrawAfterIdle(drawFigure);
  const pose = kind === "objective" ? "mhappy" : "mproud";
  return (
    <section className="lt-pr__mummy" data-testid="pr-mummy" data-kind={kind}>
      <div className="lt-pr__fig" data-testid="pr-mummy-slot" data-draw={draw ? "1" : "0"} aria-hidden="true">
        {draw ? (
          <Suspense fallback={null}>
            <LazyMummyFigure pose={pose} onTap={() => {}} />
          </Suspense>
        ) : null}
      </div>
      <p className="lt-pr__say" data-testid="pr-mummy-line">
        {mummyLineFor(kind)}
      </p>
    </section>
  );
}

export default function ParentResultPage({ hash, view = viewParentResult, drawFigure }: ParentResultPageProps) {
  useNoindex();
  const [phase, setPhase] = useState<Phase>("loading");
  const [result, setResult] = useState<ParentResultView | null>(null);
  const viewedSent = useRef(false);

  useEffect(() => {
    const token = readParentResultToken(hash ?? (typeof window !== "undefined" ? window.location.hash : ""));
    if (!token) {
      setPhase("invalid");
      return;
    }
    let alive = true;
    view(token)
      .then((r) => {
        if (!alive) return;
        setResult(r);
        setPhase("ready");
      })
      .catch((e) => {
        if (!alive) return;
        setPhase(e instanceof ParentResultError && e.reason !== "failed" ? e.reason : "failed");
      });
    return () => {
      alive = false;
    };
  }, [hash, view]);

  useEffect(() => {
    if (phase !== "ready" || !result || viewedSent.current) return;
    viewedSent.current = true;
    trackParentReportViewed(result.kind);
  }, [phase, result]);

  useEffect(() => {
    if (typeof document !== "undefined") document.title = "Your child's result · LazyTopper";
  }, []);

  const cta = (
    <a className="lt-pr__cta" href={PARENT_RESULT_CTA_HREF} data-testid="pr-cta">
      {PARENT_RESULT_CTA_LABEL}
    </a>
  );

  if (phase !== "ready" || !result) {
    const message =
      phase === "loading"
        ? "Opening the result…"
        : phase === "expired"
          ? "This link has expired. Links to a result work for 30 days — your child can send a new one."
          : phase === "invalid"
            ? "This link isn't working. Your child can send a new one from LazyTopper."
            : "We couldn't open this result just now. Please try again in a minute.";
    return (
      <main className="lt-pr" data-testid="parent-result-page" data-phase={phase}>
        <div className="lt-pr__card">
          <div className="lt-pr__brand">LazyTopper</div>
          <p className="lt-pr__state" role="status" data-testid="pr-state">
            {message}
          </p>
          {phase !== "loading" && cta}
        </div>
      </main>
    );
  }

  const who = result.firstName ? `${result.firstName}'s` : "Your child's";
  const subject = result.subject === "science" ? "Science" : "Maths";
  const chapters = chapterNames(result.chapters);
  const date = resultDateLabel(result.gradedAt);
  const meta = [subject, chapters.length ? chapters.join(", ") : null, date || null].filter(Boolean).join(" · ");

  return (
    <main className="lt-pr" data-testid="parent-result-page" data-phase="ready">
      <div className="lt-pr__card">
        <div className="lt-pr__brand">LazyTopper</div>
        <h1 className="lt-pr__h1" data-testid="pr-title">
          {who} result
        </h1>
        <p className="lt-pr__meta" data-testid="pr-meta">
          {meta}
        </p>
        <div className="lt-pr__score" data-testid="pr-score">
          <span className="lt-pr__big">{result.awarded}</span>
          <span className="lt-pr__of"> / {result.total} marks</span>
        </div>
        <MarksLostBlock r={result} />
        <SlipsBlock r={result} />
        <MummyMoment kind={result.kind} drawFigure={drawFigure} />
        {cta}
        <p className="lt-pr__foot">Shared from LazyTopper by your child. This page shows this one result only.</p>
      </div>
    </main>
  );
}
