import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useReturnTicket } from "../components/navigation/ReturnTicket";

import {
  CBSE_CIRCULARS,
  CBSE_CIRCULARS_CHECKED_ON,
  CBSE_SUBJECTS,
  CBSE_THEORY_MARKS,
  CBSE_TIMELINE,
  CBSE_TRAPS,
  daysUntilMainExam,
  type CbseSubjectKey,
} from "./cbse2027Sources";

/**
 * Cbse2027Page — the public CBSE boards page at `/cbse/class-10` (CBSE-PAGE-1, Lane A).
 *
 * ★ THE YEAR IS IN THE CONTENT, NOT THE URL. Owner ruling, 2026-09-18: `/cbse-2027`
 * would force an annual migration and a fresh indexing cycle on a page whose entire
 * value is accumulated authority, and it makes Classes 11-12 a second page built from
 * scratch rather than a data addition. `/cbse/class-10` is stable across sessions.
 *
 * ★ ONE COMPONENT AT EVERY SCREEN SIZE, AND NO WIDTH HOOK. Owner ruling (a):
 * this page is responsive by CSS alone. There is no `useIsDesktop()` here and
 * there must never be one — three breakpoints (560 / 760 / 980) do all of it, and
 * the same element tree renders at 390px and 1440px. The precedent is
 * `components/topichub/ConceptSpine.tsx`, which reflows desktop to 360px through
 * pure CSS with zero hook uses.
 *
 * ⚠ THE ROUTER'S OWN COMMENT (App.tsx:103) POINTS AT THE WRONG EXEMPLAR FOR THIS
 * PAGE. It records `MeProgressPage` and `WorksheetGenerator` as the one-component
 * pattern, and both reach it *via* `useIsDesktop()` — which ruling (a) forbids
 * here. The pattern is right; those two instances are not the ones to copy.
 * Owner adopted this correction on 2026-09-18.
 *
 * ★ EVERY SELECTOR BELOW IS SCOPED UNDER `.lt-cbse`, AND THAT IS LOAD-BEARING.
 * The prototype is a standalone document, so it styles bare `body`, `a`,
 * `section`, `h1,h2,h3`, `details` and `summary`. A `<style>` element rendered
 * inside a SPA is GLOBAL — shipping those selectors unscoped would restyle every
 * page in the product, not just this one. `body{background:var(--bg)}` alone
 * would repaint the whole app. The token block is scoped for the same reason:
 * the prototype's `--bg` / `--card` / `--ink` names are generic enough to collide.
 *
 * ★ LINKS OPEN, THEY DO NOT DOWNLOAD. Owner ruling (b): CBSE serves
 * `Content-Disposition: inline` and the `download` attribute is ignored
 * cross-origin, so a control that says "Download" describes something that does
 * not happen. Every row reads "Open", carries no down-arrow and no `download`
 * attribute. The prototype predates the ruling and contradicts it on all 15 rows;
 * the ruling governs. Lane B makes these real downloads through a Firebase
 * mirror, and the labels change when the behaviour does.
 *
 * ★ EVERY ENTRY POINT MUST HAVE AN EXIT. This page renders no app chrome — that is
 * deliberate, because it is a public landing-style route reachable signed-out and
 * wrapping it in the shell would change what a crawler sees on a page this lane just
 * got prerendered. Chrome is NOT the fix; a back link is. Without one, all eight
 * inbound links are dead ends, which the owner hit from both the chapter test and the
 * full mock.
 *
 * ★ IT USES THE APP'S EXISTING RETURN-TICKET CONVENTION, NOT A NEW ONE.
 * `?returnTo=<internal path>` + optional `?backLabel=<text>`, read through
 * `useReturnTicket()`, which delegates validation to the app's exported
 * `safeInternalReturnTo` — so an attacker-supplied `returnTo` cannot send a student
 * off-site (absolute URLs, protocol-relative `//evil.com` and any `scheme:` are all
 * rejected, and the value is never decoded twice).
 *
 * ⚠ THE READER IS REUSED, THE STRIP IS NOT. `ReturnTicketStrip` renders NOTHING
 * without a ticket ("no ticket, no change") — correct for the surfaces it was built
 * for, wrong here: a crawler, a shared link and a footer click all arrive with no
 * ticket, and an absent back link on a page with no chrome is the very defect being
 * fixed. So the ticket is READ through the shared hook and rendered as this page's own
 * `<Link>`, with "← Home" as the honest default. A `<Link>` rather than the strip's
 * button also keeps the exit crawlable.
 *
 * ★ THE SIX TRAP CARDS ARE `<details>`, NEVER A CONDITIONAL RENDER. Content stays
 * in the DOM when closed, so a crawler with no JavaScript reads all six answers.
 * That is this page's entire SEO purpose; a card that unmounts its answer looks
 * identical to a user and is invisible to Google.
 */

const CBSE_CSS = `
.lt-cbse{
  --bg:#f4f7fb; --card:#fff; --ink:#0f2038; --ink2:#4d647e; --ink3:#71879f;
  --line:#dde5ef; --line2:#eef3f8;
  --g:#0b8f50; --gt:#06663a; --gw:#e6f4ec; --gl:#bfe3ce;
  --am:#9a5800; --amw:#fdf1e0; --aml:#f0d8ae;
  --navy:#132c4d;
  --c1:#2f7fd4; --c2:#0d8a7a; --c3:#7a5bbd; --c4:#c2622e;
  --serif:Fraunces,Georgia,serif; --sans:Inter,system-ui,-apple-system,sans-serif;
  --sh:0 1px 2px rgba(15,32,56,.05),0 6px 18px rgba(15,32,56,.045);
  --pad:16px;
  background:var(--bg); color:var(--ink); font-family:var(--sans);
  font-size:15px; line-height:1.55; -webkit-font-smoothing:antialiased;
  display:block;
}
.lt-cbse *{box-sizing:border-box}
.lt-cbse img{max-width:100%}
.lt-cbse a{color:var(--gt)}
.lt-cbse :focus-visible{outline:2px solid var(--g);outline-offset:2px;border-radius:4px}
.lt-cbse h1,.lt-cbse h2,.lt-cbse h3{font-family:var(--serif);letter-spacing:-.015em;margin:0}
.lt-cbse__w{padding:0 var(--pad) 72px}

/* BACK LINK — the exit every entry point needs. Same shape as
   .lt-notes-page__back: an arrow, then the destination named where we know it. */
.lt-cbse__back{display:inline-flex;align-items:center;gap:6px;
  margin:14px 0 4px;font-size:13px;font-weight:600;color:var(--ink2);
  text-decoration:none;min-height:44px}
.lt-cbse__back:hover{color:var(--ink)}

/* HERO */
.lt-cbse__hero{background:var(--navy);color:#eaf2fb;margin:0 calc(var(--pad)*-1) 22px;
  padding:24px var(--pad) 22px}
.lt-cbse__eyebrow{font-size:12px;color:#8fb3d9;margin:0 0 9px}
.lt-cbse__hero h1{font-size:clamp(25px,7vw,40px);line-height:1.1;font-weight:700;color:#fff;
  margin-bottom:9px;max-width:16ch}
.lt-cbse__hero-sub{color:#b9d0e8;font-size:14.5px;margin:0;max-width:52ch}
.lt-cbse__count{display:flex;align-items:baseline;gap:11px;margin:18px 0 0}
.lt-cbse__count b{font-family:var(--serif);font-size:clamp(38px,11vw,52px);font-weight:700;
  color:#7ee2ab;line-height:.95;font-variant-numeric:tabular-nums}
.lt-cbse__count span{font-size:13px;color:#a8c6e4;line-height:1.35}
.lt-cbse__bar{height:5px;background:rgba(255,255,255,.14);border-radius:3px;overflow:hidden;margin-top:13px}
.lt-cbse__bar i{display:block;height:100%;background:linear-gradient(90deg,#4fc98a,#7ee2ab);border-radius:3px}

/* STATUS PILLS — scroll on phone, wrap on tablet+ */
.lt-cbse__pills{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;
  margin:0 calc(var(--pad)*-1) 30px;padding:2px var(--pad) 8px}
.lt-cbse__pills::-webkit-scrollbar{display:none}
.lt-cbse__pill{flex:0 0 auto;background:var(--card);border:1px solid var(--line);
  border-radius:999px;padding:9px 15px;font-size:13px;font-weight:500;color:var(--ink2);
  white-space:nowrap;text-decoration:none;display:flex;align-items:center;gap:7px;min-height:38px}
.lt-cbse__pill i{width:7px;height:7px;border-radius:50%;flex:0 0 auto}
.lt-cbse__pill--ok i{background:var(--g)}
.lt-cbse__pill--wait i{background:var(--am)}
.lt-cbse__pill b{color:var(--ink);font-weight:600}

/* SECTION FURNITURE */
.lt-cbse section{margin-bottom:42px;scroll-margin-top:12px}
.lt-cbse__sh{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:5px}
.lt-cbse h2{font-size:clamp(21px,5vw,26px);font-weight:600;line-height:1.2}
.lt-cbse__sh em{font-style:normal;font-size:12px;color:var(--ink3);white-space:nowrap}
.lt-cbse__lede{color:var(--ink2);font-size:14.5px;margin:0 0 16px;max-width:58ch}

/* SUBJECT SWITCHER */
.lt-cbse__subs{display:flex;gap:7px;margin-bottom:15px}
.lt-cbse__sub{flex:1 1 0;border:1px solid var(--line);background:var(--card);border-radius:10px;
  padding:11px 10px;font:inherit;font-size:14px;font-weight:600;color:var(--ink2);
  cursor:pointer;min-height:44px}
.lt-cbse__sub[aria-selected="true"]{background:var(--ink);color:var(--card);border-color:var(--ink)}
.lt-cbse__panel[hidden]{display:none}

/* SOURCE ROWS — every control reads "Open" (ruling b) */
.lt-cbse__dl{display:grid;gap:9px}
.lt-cbse__dl a{display:flex;align-items:center;gap:12px;background:var(--card);
  border:1px solid var(--line);border-radius:12px;padding:12px 13px;
  text-decoration:none;color:inherit;box-shadow:var(--sh);min-height:62px}
.lt-cbse__dl a:hover,.lt-cbse__dl a:focus-visible{border-color:var(--g)}
.lt-cbse__ico{flex:0 0 auto;width:38px;height:38px;border-radius:9px;display:grid;place-items:center;
  font-size:10px;font-weight:700;color:#fff;letter-spacing:.03em}
.lt-cbse__ico--pdf{background:#c0392b}
.lt-cbse__ico--zip{background:#64758a}
.lt-cbse__dlt{flex:1;min-width:0}
.lt-cbse__dlt b{display:block;font-size:14.5px;font-weight:600;line-height:1.3}
.lt-cbse__dlt span{display:block;font-size:12.7px;color:var(--ink2);margin-top:2px;line-height:1.4}
.lt-cbse__open{color:var(--gt);font-size:13px;font-weight:600;flex:0 0 auto;padding-left:2px}

/* MARKS CHART — hand-rolled CSS bars, no chart library (ruling c) */
.lt-cbse__marks{background:var(--card);border:1px solid var(--line);border-radius:14px;
  padding:16px 16px 12px;box-shadow:var(--sh)}
.lt-cbse__marks-head{font-family:var(--serif);font-size:16px;font-weight:700;
  display:block;margin-bottom:12px}
.lt-cbse__mrow{margin-bottom:12px}
.lt-cbse__mtop{display:flex;justify-content:space-between;gap:10px;font-size:13.5px;margin-bottom:5px}
.lt-cbse__mtop b{font-weight:600;min-width:0}
.lt-cbse__mtop span{color:var(--ink2);font-variant-numeric:tabular-nums;flex:0 0 auto}
.lt-cbse__mbar{height:9px;background:var(--line2);border-radius:5px;overflow:hidden}
.lt-cbse__mbar i{display:block;height:100%;border-radius:5px;background:var(--ink3)}
.lt-cbse__mbar i.is-c1{background:var(--c1)}
.lt-cbse__mbar i.is-c2{background:var(--c2)}
.lt-cbse__mbar i.is-c3{background:var(--c3)}
.lt-cbse__mbar i.is-c4{background:var(--c4)}
.lt-cbse__mbar i.is-am{background:var(--am)}
.lt-cbse__mbar i.is-mute{background:var(--ink3)}
.lt-cbse__mnote{font-size:12.5px;color:var(--ink3);border-top:1px solid var(--line2);
  padding-top:11px;margin:2px 0 0;line-height:1.5}

/* TIMELINE */
.lt-cbse__tl{position:relative;padding-left:27px}
.lt-cbse__tl::before{content:"";position:absolute;left:8px;top:8px;bottom:14px;width:2px;background:var(--line)}
.lt-cbse__ti{position:relative;padding-bottom:19px}
.lt-cbse__ti:last-child{padding-bottom:0}
.lt-cbse__ti::before{content:"";position:absolute;left:-24px;top:4px;width:14px;height:14px;
  border-radius:50%;background:var(--card);border:2px solid var(--line)}
.lt-cbse__ti--exam::before{background:var(--g);border-color:var(--g)}
.lt-cbse__td{font-size:11px;color:var(--ink3);font-weight:700;letter-spacing:.04em;
  text-transform:uppercase}
.lt-cbse__th{font-family:var(--serif);font-size:17px;font-weight:600;margin:1px 0 3px;line-height:1.25}
.lt-cbse__tp{font-size:14px;color:var(--ink2);margin:0;max-width:52ch}
.lt-cbse__chip{display:inline-block;font-size:10.5px;font-weight:700;padding:2px 8px;
  border-radius:5px;margin-left:7px;vertical-align:2px;white-space:nowrap}
.lt-cbse__chip--must{background:var(--gw);color:var(--gt);border:1px solid var(--gl)}
.lt-cbse__chip--optional{background:var(--line2);color:var(--ink2);border:1px solid var(--line)}

/* TRAPS — <details> keeps the answer in the DOM when closed */
.lt-cbse details{background:var(--card);border:1px solid var(--line);border-radius:12px;
  margin-bottom:8px;box-shadow:var(--sh)}
.lt-cbse summary{cursor:pointer;list-style:none;padding:15px 42px 15px 15px;position:relative;
  font-weight:600;font-size:14.8px;line-height:1.4;min-height:44px}
.lt-cbse summary::-webkit-details-marker{display:none}
.lt-cbse summary::after{content:"";position:absolute;right:17px;top:21px;width:8px;height:8px;
  border-right:2px solid var(--ink3);border-bottom:2px solid var(--ink3);
  transform:rotate(45deg);transition:transform .18s ease}
.lt-cbse details[open] summary::after{transform:rotate(-135deg);top:24px}
@media(prefers-reduced-motion:reduce){.lt-cbse summary::after{transition:none}}
.lt-cbse__ans{padding:0 15px 15px;max-width:58ch}
.lt-cbse__ans p{margin:0 0 9px;color:var(--ink2);font-size:14.2px}
.lt-cbse__ans p:last-child{margin-bottom:0}
.lt-cbse__warn{background:var(--amw);border:1px solid var(--aml);border-radius:9px;
  padding:11px 12px;margin-top:11px}
.lt-cbse__warn p{color:var(--ink);margin:0;font-size:13.8px}

/* CIRCULARS */
.lt-cbse__fi{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--line2);align-items:baseline}
.lt-cbse__fi:first-of-type{border-top:1px solid var(--line)}
.lt-cbse__fd{font-size:11.5px;color:var(--ink3);min-width:56px;font-weight:600;white-space:nowrap}
.lt-cbse__ft{font-size:14.2px;margin:0;line-height:1.45}
.lt-cbse__ft a{text-decoration:none}
.lt-cbse__ft a:hover{text-decoration:underline}
.lt-cbse__onindex{font-size:11.5px;color:var(--ink3);margin-left:6px;white-space:nowrap}
.lt-cbse__auto{font-size:12.3px;color:var(--ink3);margin-top:13px;max-width:56ch;line-height:1.5}

/* HELP + CTA */
.lt-cbse__help{background:var(--gw);border:1px solid var(--gl);border-radius:14px;padding:17px}
.lt-cbse__help h3{font-size:17px;margin-bottom:5px;color:var(--gt)}
.lt-cbse__help p{font-size:14px;color:var(--ink2);margin:0 0 11px;max-width:52ch}
.lt-cbse__help a{font-weight:700;font-size:15.5px;text-decoration:none;display:inline-block;
  min-height:44px;line-height:44px}
.lt-cbse__cta{background:var(--navy);border-radius:14px;padding:19px 18px;color:#eaf2fb}
.lt-cbse__cta h3{color:#fff;font-size:19px;margin-bottom:10px}
.lt-cbse__cta ul{list-style:none;margin:0;padding:0}
.lt-cbse__cta li{border-top:1px solid rgba(255,255,255,.1);padding:13px 0}
.lt-cbse__cta li:first-child{border-top:none;padding-top:2px}
.lt-cbse__cta li a{color:#7ee2ab;font-weight:600;text-decoration:none;font-size:15px}
.lt-cbse__cta li a:hover{text-decoration:underline}
.lt-cbse__cta li span{display:block;font-size:13px;color:#a8c6e4;margin-top:2px}
.lt-cbse__foot{margin-top:32px;padding-top:16px;border-top:1px solid var(--line);
  font-size:12.3px;color:var(--ink3);max-width:64ch;line-height:1.55}

/* >=560px */
@media(min-width:560px){
  .lt-cbse{--pad:22px}
  .lt-cbse__pills{flex-wrap:wrap;overflow:visible;margin-bottom:32px}
  .lt-cbse__subs{max-width:340px}
  .lt-cbse__dl a{padding:13px 15px}
}
/* >=760px : marks beside the source list */
@media(min-width:760px){
  .lt-cbse__split{display:grid;grid-template-columns:1fr 300px;gap:22px;align-items:start}
  .lt-cbse__split .lt-cbse__marks{position:sticky;top:16px}
  .lt-cbse__hero{border-radius:0 0 22px 22px}
}
/* >=980px : cap and centre */
@media(min-width:980px){
  .lt-cbse__w{max-width:900px;margin:0 auto;padding-left:0;padding-right:0}
  .lt-cbse__hero{margin-left:0;margin-right:0;border-radius:18px;padding:32px 30px 28px;margin-top:18px}
  .lt-cbse__pills{margin-left:0;margin-right:0;padding-left:0;padding-right:0}
  .lt-cbse__split{grid-template-columns:1fr 330px}
}
`;

/** The session this page covers, used only for the hero's elapsed-time bar. */
const SESSION_START = new Date(2026, 3, 1);

/** How far through the session we are, 0-100 — derived, never a decorative constant. */
function sessionProgressPct(now: Date, examDate: Date): number {
  const total = examDate.getTime() - SESSION_START.getTime();
  const done = now.getTime() - SESSION_START.getTime();
  if (total <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

export default function Cbse2027Page() {
  const [subjectKey, setSubjectKey] = useState<CbseSubjectKey>("science");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // The return ticket, if the entry point supplied a safe one. When it did not —
  // a crawler, a shared link, a footer click from a page that passed nothing — fall
  // back to Home rather than to nothing. `/` serves the landing at every width.
  const ticket = useReturnTicket();
  const backHref = ticket?.path ?? "/";
  const backLabel = ticket?.label ?? "Home";

  // Read the clock once per mount. A value that changed between renders would
  // make the countdown flicker and would defeat memoisation for no benefit.
  const [now] = useState(() => new Date());
  const daysLeft = daysUntilMainExam(now);
  const examDate = new Date(2027, 1, 17);
  const progress = sessionProgressPct(now, examDate);

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const index = CBSE_SUBJECTS.findIndex((s) => s.key === subjectKey);
    const step = event.key === "ArrowRight" ? 1 : CBSE_SUBJECTS.length - 1;
    const next = CBSE_SUBJECTS[(index + step) % CBSE_SUBJECTS.length];
    setSubjectKey(next.key);
    tabRefs.current[next.key]?.focus();
  };

  return (
    <main className="lt-cbse" aria-label="CBSE Class 10 boards 2027">
      <style>{CBSE_CSS}</style>

      <div className="lt-cbse__w">
        <Link to={backHref} className="lt-cbse__back">
          <span aria-hidden="true">←</span>
          <span>{backLabel}</span>
        </Link>

        <div className="lt-cbse__hero">
          <p className="lt-cbse__eyebrow">LazyTopper &middot; CBSE Class 10</p>
          <h1>Your 2027 boards, in one place</h1>
          <p className="lt-cbse__hero-sub">
            Every official paper CBSE gives you free, and what the new two-exam rule actually
            means. Checked against cbse.gov.in on {CBSE_CIRCULARS_CHECKED_ON}.
          </p>
          {daysLeft !== null && (
            <div className="lt-cbse__count">
              <b>{daysLeft}</b>
              <span>
                days until the main exam,
                <br />
                if it starts mid-February like last year
              </span>
            </div>
          )}
          <div className="lt-cbse__bar">
            <i style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="lt-cbse__pills">
          <a className="lt-cbse__pill lt-cbse__pill--wait" href="#papers">
            <i aria-hidden="true" />
            Date sheet <b>not out</b>
          </a>
          <a className="lt-cbse__pill lt-cbse__pill--ok" href="#papers">
            <i aria-hidden="true" />
            Syllabus <b>released</b>
          </a>
          <a className="lt-cbse__pill lt-cbse__pill--wait" href="#papers">
            <i aria-hidden="true" />
            Sample papers <b>awaited</b>
          </a>
          <a className="lt-cbse__pill lt-cbse__pill--ok" href="#exams">
            <i aria-hidden="true" />
            Two exams <b>confirmed</b>
          </a>
        </div>

        <section id="papers">
          <div className="lt-cbse__sh">
            <h2>Free papers from CBSE</h2>
            <em>all official</em>
          </div>
          <p className="lt-cbse__lede">
            CBSE publishes these and almost nobody opens them. Pick your subject &mdash; the marks
            breakdown changes with it. Every link opens the original file on CBSE&rsquo;s own site,
            in a new tab.
          </p>

          <div className="lt-cbse__subs" role="tablist" aria-label="Subject">
            {CBSE_SUBJECTS.map((subject) => (
              <button
                key={subject.key}
                type="button"
                role="tab"
                id={`lt-cbse-tab-${subject.key}`}
                className="lt-cbse__sub"
                aria-selected={subject.key === subjectKey}
                aria-controls={`lt-cbse-panel-${subject.key}`}
                ref={(node) => {
                  tabRefs.current[subject.key] = node;
                }}
                tabIndex={subject.key === subjectKey ? 0 : -1}
                onClick={() => setSubjectKey(subject.key)}
                onKeyDown={onTabKeyDown}
              >
                {subject.label}
              </button>
            ))}
          </div>

          <div className="lt-cbse__split">
            <div>
              {/* Both panels stay mounted and toggle `hidden`: a crawler reads
                  every source link for BOTH subjects, not just the open one. */}
              {CBSE_SUBJECTS.map((subject) => (
                <div
                  key={subject.key}
                  className="lt-cbse__dl lt-cbse__panel"
                  id={`lt-cbse-panel-${subject.key}`}
                  role="tabpanel"
                  aria-labelledby={`lt-cbse-tab-${subject.key}`}
                  hidden={subject.key !== subjectKey}
                >
                  {subject.papers.map((paper) => (
                    <a
                      key={paper.href}
                      href={paper.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className={`lt-cbse__ico lt-cbse__ico--${paper.kind}`}>
                        {paper.kind.toUpperCase()}
                      </span>
                      <span className="lt-cbse__dlt">
                        <b>{paper.title}</b>
                        <span>{paper.blurb}</span>
                      </span>
                      <span className="lt-cbse__open">Open</span>
                    </a>
                  ))}
                </div>
              ))}
            </div>

            <div className="lt-cbse__marks" aria-live="polite">
              <b className="lt-cbse__marks-head">Where the {CBSE_THEORY_MARKS} marks sit</b>
              {CBSE_SUBJECTS.map((subject) => {
                const top = Math.max(...subject.units.map((u) => u.marks));
                return (
                  <div key={subject.key} hidden={subject.key !== subjectKey}>
                    {subject.units.map((unit) => (
                      <div className="lt-cbse__mrow" key={unit.unit}>
                        <div className="lt-cbse__mtop">
                          <b>{unit.unit}</b>
                          <span>{unit.marks}</span>
                        </div>
                        <div className="lt-cbse__mbar">
                          <i
                            className={`is-${unit.tone}`}
                            style={{ width: `${Math.round((unit.marks / top) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
              <p className="lt-cbse__mnote">
                From the official syllabus. CBSE publishes this by unit, not by chapter. Plus 20
                internal marks, done at school before February.
              </p>
            </div>
          </div>
        </section>

        <section id="exams">
          <div className="lt-cbse__sh">
            <h2>Two exams, one year</h2>
          </div>
          <p className="lt-cbse__lede">
            February is compulsory. May is yours to choose, and you can only gain from it.
          </p>
          <div className="lt-cbse__tl">
            {CBSE_TIMELINE.map((stop) => (
              <div
                key={stop.when}
                className={`lt-cbse__ti${stop.isExam ? " lt-cbse__ti--exam" : ""}`}
              >
                <span className="lt-cbse__td">{stop.when}</span>
                <h3 className="lt-cbse__th">
                  {stop.title}
                  {stop.chip && (
                    <span className={`lt-cbse__chip lt-cbse__chip--${stop.chip.tone}`}>
                      {stop.chip.label}
                    </span>
                  )}
                </h3>
                <p className="lt-cbse__tp">{stop.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="traps">
          <div className="lt-cbse__sh">
            <h2>What catches people out</h2>
          </div>
          <p className="lt-cbse__lede">Each of these costs marks or a whole year.</p>

          {CBSE_TRAPS.map((trap) => (
            <details key={trap.question}>
              <summary>{trap.question}</summary>
              <div className="lt-cbse__ans">
                {trap.answer.map((para) => (
                  <p key={para}>{para}</p>
                ))}
                {trap.warning && (
                  <div className="lt-cbse__warn">
                    <p>{trap.warning}</p>
                  </div>
                )}
              </div>
            </details>
          ))}
        </section>

        <section id="latest">
          <div className="lt-cbse__sh">
            <h2>Latest from CBSE</h2>
          </div>
          {CBSE_CIRCULARS.map((circular) => (
            <div className="lt-cbse__fi" key={circular.href + circular.date}>
              <span className="lt-cbse__fd">{circular.date}</span>
              <p className="lt-cbse__ft">
                <a href={circular.href} target="_blank" rel="noopener noreferrer">
                  {circular.title}
                </a>
                {circular.source === "index" && (
                  <span className="lt-cbse__onindex">on CBSE&rsquo;s circulars index</span>
                )}
              </p>
            </div>
          ))}
          <p className="lt-cbse__auto">
            Checked against CBSE&rsquo;s circulars pages on {CBSE_CIRCULARS_CHECKED_ON}.
          </p>
        </section>

        <section>
          <div className="lt-cbse__help">
            <h3>If it&rsquo;s getting too much</h3>
            <p>
              CBSE runs free tele-counselling for board students and parents, with trained
              counsellors. It&rsquo;s confidential and it costs nothing.
            </p>
            <a href="tel:18001180004">1800-11-8004 &mdash; 24&times;7, toll free</a>
          </div>
        </section>

        <div className="lt-cbse__cta">
          <h3>Now put it to work</h3>
          <ul>
            <li>
              <Link to="/exam-trends">See which chapters carry the most marks</Link>
              <span>Ten years of real papers, chapter by chapter</span>
            </li>
            <li>
              <Link to="/practice-hub">Practise competency questions</Link>
              <span>The 40 marks students lose most of</span>
            </li>
            <li>
              <Link to="/topic-hub">Open a chapter and start</Link>
              <span>Notes, board questions, step-marked solutions</span>
            </li>
          </ul>
        </div>

        <p className="lt-cbse__foot">
          LazyTopper is not affiliated with CBSE. Every link above opens the original file on
          cbse.gov.in or cbseacademic.nic.in. Where our reading and the official document differ,
          the official document is right.
        </p>
      </div>
    </main>
  );
}
