import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useHref, useLocation } from "react-router-dom";
import type {
  NoteConcept,
  NoteExample,
  NoteFigure,
  NoteMindmap,
  NoteSource,
  NoteShortcut,
  NoteSpec,
  NoteSubject,
  RulesBlock,
  ThirdTabContent,
} from "./noteSpec.types";
import { getNoteAssetSize, getNoteAssetUrl } from "./noteSpecRegistry";
import { NoteRichText } from "./NoteRichText";
import { NoteMindmapTree } from "./NoteMindmapTree";
import {
  SECTION_ANCHORS,
  anchorFromHash,
  anchorTabs,
  hasTricks,
  memoryTricksOf,
  shortcutsOf,
} from "./noteAnchors";
import { NoteGeneratedFigure, hasGeneratedRenderer } from "./NoteGeneratedFigure";
import NcertPageModal, { type NcertPageRef } from "./NcertPageModal";
import { NoteFigureLightbox } from "./NoteFigureLightbox";
import { BOARD_QUESTIONS } from "../../lib/boardQuestions/boardQuestions";
import { ncertPdfHref, ncertPdfLinkText, tryNcertFileCode } from "../../lib/ncertFileCode";
import { ncertReadPath, ncertRowsForSlug } from "../../config/ncertBooks";

/**
 * <Note spec={…}/> — renders one note-spec (schema v1.1) inside the app.
 *
 * Visual gold standard: the locked v2 note prototypes in `notes/`
 * (esp. `light_note_ENRICHED_v2_2026-06-21.html`) — 3 tabs
 * (Note / Mindmap / [third]), the 7-part spine (Big Idea → Definitions →
 * Concepts → Worked examples → Strategies → Pitfalls; the Formulae card (NOTES-FORMULA-1) follows Big Idea and heads the Mindmap tab),
 * Fraunces + Inter, brand green hsl(152,55%,45%), KaTeX math. This component
 * reproduces that grammar; it does NOT redesign it.
 *
 * Subject-adaptivity is driven ONLY by the two spec discriminators
 * (`meta.third_tab.kind`, `examples[].kind`) — no per-subject logic here.
 *
 * Honest degradation (no fake data, ever):
 *   - big_idea null → section omitted.
 *   - mindmap `_TODO` / no tree → honest "being distilled" state (the D3
 *     stage arrives once the kit lifts a real tree into the spec).
 *   - figure asset not yet extracted into notes/assets/ → the prototype's
 *     own pending-frame (tag + caption + source note), never a broken image.
 *
 * Styling is class-driven via one scoped <style> block (same pattern as
 * ConceptSpine; no inline style objects) with a pure-CSS reflow to 360px.
 */

const SUBJECT_LABEL: Record<NoteSubject, string> = {
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
  maths: "Maths",
};

const WEIGHTAGE_LABEL: Record<NoteSpec["meta"]["weightage"], string> = {
  high: "High weightage",
  medium: "Medium weightage",
  low: "Low weightage",
};

const NOTE_CSS = `
.lt-note {
  --lt-note-green: hsl(152, 55%, 45%);
  --lt-note-green-deep: hsl(152, 60%, 30%);
  --lt-note-green-tint: hsl(152, 50%, 96%);
  --lt-note-green-line: hsl(152, 40%, 84%);
  --lt-note-navy: #0f2444;
  --lt-note-ink: #1a2433;
  --lt-note-ink-soft: #566173;
  --lt-note-ink-faint: #5f6b7d;
  --lt-note-bg: #f6f8fa;
  --lt-note-line: #e7ebf0;
  --lt-note-amber-tint: #fdf6e9;
  --lt-note-amber-line: #f0e0bf;
  --lt-note-amber-ink: #8a6d2f;
  --lt-note-rose-tint: #fdf0f0;
  --lt-note-rose-line: #f3d4d4;
  --lt-note-rose-ink: #a8484a;
  --lt-note-serif: var(--font-display, "Fraunces", Georgia, serif);
  --lt-note-sans: var(--font-body, "Inter", system-ui, sans-serif);
  font-family: var(--lt-note-sans);
  color: var(--lt-note-ink);
  line-height: 1.6;
  background: var(--lt-note-bg);
  border: 1px solid var(--lt-note-line);
  border-radius: 16px;
  padding: clamp(14px, 3vw, 24px);
}
.lt-note .katex { font-size: 1.04em; }

.lt-note__eyebrow { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 13px; }
.lt-note__chip {
  font-size: 12px; font-weight: 600; padding: 5px 11px; border-radius: 999px;
  background: #eef1f5; color: var(--lt-note-ink-soft); white-space: nowrap;
}
.lt-note__chip--unit { background: var(--lt-note-green-tint); color: var(--lt-note-green-deep); }
.lt-note__title {
  margin: 0 0 10px;
  font-family: var(--lt-note-serif);
  font-weight: 600; font-size: clamp(24px, 4.5vw, 34px);
  line-height: 1.08; letter-spacing: -0.02em; color: var(--lt-note-navy);
}
.lt-note__board-asks {
  display: flex; gap: 12px; align-items: flex-start;
  background: var(--lt-note-green-tint);
  border: 1px solid var(--lt-note-green-line);
  border-radius: 12px; padding: 14px 16px; margin-bottom: 14px;
}
.lt-note__board-asks-ic {
  flex: none; width: 26px; height: 26px; border-radius: 7px;
  background: var(--lt-note-green); color: #fff;
  display: grid; place-items: center; font-size: 14px; margin-top: 1px;
}
.lt-note__board-asks p { font-size: 14px; margin: 0; }
.lt-note__board-asks b { color: var(--lt-note-green-deep); }
.lt-note__prov-legend {
  display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px;
  font-size: 12px; color: var(--lt-note-ink-soft);
}
.lt-note__prov-legend span {
  display: inline-flex; align-items: center; gap: 6px;
  background: #fff; border: 1px solid var(--lt-note-line);
  border-radius: 999px; padding: 4px 11px;
}
.lt-note__tag-src, .lt-note__tag-auth {
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em;
  padding: 1px 7px; border-radius: 6px; white-space: nowrap;
}
.lt-note__tag-src {
  color: var(--lt-note-green-deep); background: var(--lt-note-green-tint);
  border: 1px solid var(--lt-note-green-line);
}
.lt-note__tag-auth {
  color: var(--lt-note-amber-ink); background: var(--lt-note-amber-tint);
  border: 1px solid var(--lt-note-amber-line);
}

.lt-note__tabs {
  display: flex; gap: 4px; background: #eceff3; padding: 4px;
  border-radius: 12px; margin-bottom: 20px;
}
.lt-note__tab {
  flex: 1; text-align: center; font-size: 14px; font-weight: 600;
  padding: 9px 12px; border-radius: 9px; border: none; background: transparent;
  color: var(--lt-note-ink-soft); cursor: pointer;
  font-family: var(--lt-note-sans); transition: 0.15s;
}
.lt-note__tab--active {
  background: #fff; color: var(--lt-note-navy);
  box-shadow: 0 1px 3px rgba(15, 36, 68, 0.1);
}

.lt-note__block {
  background: #fff; border: 1px solid var(--lt-note-line); border-radius: 16px;
  padding: 20px 22px; margin-bottom: 14px;
  box-shadow: 0 1px 2px rgba(15, 36, 68, 0.04), 0 8px 24px rgba(15, 36, 68, 0.05);
}
.lt-note__sec-label {
  font-size: 11.5px; font-weight: 700; letter-spacing: 0.09em;
  text-transform: uppercase; color: var(--lt-note-green-deep); margin-bottom: 10px;
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.lt-note__sec-label .lt-note__tag-src,
.lt-note__sec-label .lt-note__tag-auth { text-transform: none; letter-spacing: 0.02em; }
.lt-note__sec {
  margin: 0 0 12px;
  font-family: var(--lt-note-serif); font-weight: 600; font-size: 21px;
  color: var(--lt-note-navy); letter-spacing: -0.01em;
}
.lt-note__body-text { font-size: 15px; margin: 0 0 10px; }
.lt-note__body-text:last-child { margin-bottom: 0; }
.lt-note__hint {
  font-size: 13px; color: var(--lt-note-ink-faint); font-style: italic;
  margin: 0 0 12px;
}

/* definitions */
.lt-note__defs { display: grid; gap: 10px; margin-top: 6px; }
.lt-note__def {
  border: 1px solid var(--lt-note-line); border-left: 3px solid var(--lt-note-green);
  border-radius: 10px; padding: 13px 15px; background: #fcfdfe;
}
.lt-note__def-name { font-weight: 700; color: var(--lt-note-navy); font-size: 14.5px; margin-bottom: 3px; }
.lt-note__vbtag {
  display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap;
  font-size: 11px; font-weight: 700; color: var(--lt-note-green-deep); margin-bottom: 7px;
}
.lt-note__cite { font-weight: 600; color: var(--lt-note-ink-faint); font-size: 10.5px; }
.lt-note__quote {
  font-family: var(--lt-note-serif); font-size: 14.5px; color: var(--lt-note-navy);
  line-height: 1.5; border-left: 2px solid var(--lt-note-green-line);
  padding-left: 11px; margin-bottom: 8px;
}
.lt-note__means { font-size: 13px; color: var(--lt-note-ink-soft); }
.lt-note__means b { color: var(--lt-note-navy); }
.lt-note__keyterms {
  margin-top: 10px; border: 1px solid var(--lt-note-line);
  border-left: 3px solid var(--lt-note-green); border-radius: 10px;
  padding: 13px 15px; background: #fcfdfe;
}
.lt-note__keyterms dl {
  display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 5px 12px;
  font-size: 13px; margin: 0;
}
.lt-note__keyterms dt { font-weight: 700; color: var(--lt-note-navy); }
.lt-note__keyterms dd { margin: 0; color: var(--lt-note-ink-soft); }

/* concepts */
.lt-note__concepts { display: grid; gap: 10px; }
.lt-note__concept {
  display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 13px; align-items: start;
  padding: 13px 15px; border: 1px solid var(--lt-note-line);
  border-radius: 11px; background: #fcfdfe;
}
.lt-note__concept-dot {
  flex: none; width: 28px; height: 28px; border-radius: 8px;
  background: var(--lt-note-green-tint); color: var(--lt-note-green-deep);
  display: grid; place-items: center; font-weight: 700; font-size: 13px; margin-top: 1px;
}
.lt-note__concept-title { font-weight: 600; color: var(--lt-note-navy); font-size: 14.5px; }
.lt-note__concept-body { font-size: 13.5px; color: var(--lt-note-ink-soft); margin-top: 3px; }
.lt-note__tested {
  display: inline-block; margin-top: 8px; font-size: 12px; font-weight: 600;
  color: var(--lt-note-green-deep); background: var(--lt-note-green-tint);
  padding: 3px 9px; border-radius: 999px;
}

/* figures */
.lt-note__figure {
  margin-top: 12px; border: 1px solid var(--lt-note-line); border-radius: 13px;
  overflow: hidden; background: #fcfdfe;
}
.lt-note__fcap {
  padding: 9px 14px; font-size: 12px; font-weight: 600;
  color: var(--lt-note-ink-soft); border-bottom: 1px solid var(--lt-note-line);
}
.lt-note__ft {
  font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--lt-note-green-deep); margin-right: 6px;
}
.lt-note__fimg { display: block; width: 100%; height: auto; background: #fff; }
/* tap-to-enlarge: the image is the button (QUICK-FIXES-1 owner follow-up) */
.lt-note__fzoom {
  position: relative; display: block; width: 100%; padding: 0; margin: 0;
  border: 0; background: #fff; cursor: zoom-in; font: inherit; line-height: 0;
}
.lt-note__fzoom:focus-visible { outline: 3px solid var(--lt-note-green); outline-offset: -3px; }
/* the hint sits UNDER the image, never over it (an overlay hid figure labels) */
.lt-note__fzoom-badge {
  display: block; text-align: right; line-height: 1.2;
  font-size: 11px; font-weight: 600; color: var(--lt-note-green-deep);
  padding: 2px 12px 7px;
}
.lt-note__flegend {
  padding: 9px 14px; border-top: 1px solid var(--lt-note-line);
  font-size: 12.5px; color: var(--lt-note-ink-soft);
}
.lt-note__fpending {
  min-height: 130px; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 7px;
  background: repeating-linear-gradient(45deg, #fff, #fff 10px, #fcfaf3 10px, #fcfaf3 20px);
  color: var(--lt-note-ink-faint); font-size: 12.5px; text-align: center; padding: 18px;
}
.lt-note__fpending-ic { font-size: 22px; opacity: 0.4; }
.lt-note__fpending code {
  font-size: 10.5px; background: #f0e9d8; color: var(--lt-note-amber-ink);
  padding: 2px 7px; border-radius: 6px;
}

/* worked examples */
.lt-note__ex {
  border: 1px solid var(--lt-note-line); border-radius: 13px;
  margin-bottom: 13px; overflow: hidden; background: #fff;
}
.lt-note__ex:last-child { margin-bottom: 0; }
.lt-note__ex-head {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 13px 16px; background: var(--lt-note-navy); color: #eaf0f8;
  cursor: pointer; user-select: none; border: none; text-align: left;
  font-family: var(--lt-note-sans);
}
.lt-note__ex-shape {
  font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; color: #7fd6ab;
}
.lt-note__ex-total {
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.03em; white-space: nowrap;
  padding: 2px 9px; border-radius: 999px;
  color: #dff3e8; background: rgba(127, 214, 171, 0.18); border: 1px solid rgba(127, 214, 171, 0.4);
}
.lt-note__ex-caret { margin-left: auto; transition: 0.2s; color: #9fb3cf; }
.lt-note__ex--open .lt-note__ex-caret { transform: rotate(90deg); }
/* cite / source strip under the head — dark-on-light, holds the clickable page ref */
.lt-note__ex-cite {
  display: block; padding: 8px 16px; font-size: 11.5px; font-weight: 600;
  color: var(--lt-note-ink-faint); background: #fbfdff;
  border-bottom: 1px solid var(--lt-note-line);
}
/* clickable NCERT page reference (opens the page popup) — inline link inside a cite */
.lt-note__pageref {
  font: inherit; color: var(--lt-note-green-deep); background: none; border: none;
  padding: 0; cursor: pointer; text-decoration: underline dotted var(--lt-note-green-line);
  text-underline-offset: 2px;
}
.lt-note__pageref:hover { text-decoration: underline solid var(--lt-note-green); color: var(--lt-note-green); }
.lt-note__ex-q {
  padding: 14px 16px; font-family: var(--lt-note-serif); font-style: italic;
  font-size: 15px; color: var(--lt-note-navy); background: #fbfdff;
  border-bottom: 1px solid var(--lt-note-line);
}
.lt-note__ex-body { padding: 14px 16px; }
.lt-note__steps { display: grid; gap: 9px; }
.lt-note__step {
  display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 12px;
  padding: 11px 13px; border: 1px solid var(--lt-note-line); border-radius: 10px;
}
.lt-note__step-n {
  flex: none; width: 24px; height: 24px; border-radius: 50%;
  background: var(--lt-note-green); color: #fff;
  display: grid; place-items: center; font-weight: 700; font-size: 12px;
}
/* per-step mark chip (v1.2) — shows where each mark is earned; chips sum to the total */
.lt-note__step-mark {
  grid-column: 3; align-self: start; white-space: nowrap;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.02em;
  padding: 2px 8px; border-radius: 999px;
  color: var(--lt-note-green-deep); background: var(--lt-note-green-tint);
  border: 1px solid var(--lt-note-green-line);
}
.lt-note__step-body { font-size: 14px; }
.lt-note__step-lead { font-weight: 600; color: var(--lt-note-navy); margin-right: 4px; }
.lt-note__step-ctag {
  display: inline-block; margin-top: 5px; font-size: 11.5px; font-weight: 600;
  color: var(--lt-note-ink-soft); background: #eef1f5; padding: 2px 8px; border-radius: 6px;
}
.lt-note__marklogic {
  margin-top: 13px; border: 1px dashed var(--lt-note-green-line);
  background: var(--lt-note-green-tint); border-radius: 10px;
  padding: 11px 13px; font-size: 13px; color: var(--lt-note-green-deep);
}

/* strategies */
.lt-note__strat { display: grid; gap: 9px; }
.lt-note__strat-row {
  display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 11px;
  align-items: start; font-size: 14px;
}
.lt-note__strat-arrow { color: var(--lt-note-green); font-weight: 700; margin-top: 1px; }
.lt-note__strat-cue { font-weight: 600; color: var(--lt-note-navy); margin-right: 4px; }

/* pitfalls */
.lt-note__block--pitfalls { background: var(--lt-note-rose-tint); border-color: var(--lt-note-rose-line); }
.lt-note__block--pitfalls .lt-note__sec-label { color: var(--lt-note-rose-ink); }
.lt-note__block--pitfalls .lt-note__sec { color: #7a2f31; }
.lt-note__pit {
  display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 11px; font-size: 14px;
  padding: 9px 0; border-bottom: 1px solid var(--lt-note-rose-line);
}
.lt-note__pit:last-child { border-bottom: none; }
.lt-note__pit-x { color: var(--lt-note-rose-ink); font-weight: 700; }

/* formula strip */
.lt-note__frow { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; margin-top: 6px; }
.lt-note__fitem {
  background: #fcfdfe; border: 1px solid var(--lt-note-green-line);
  border-radius: 11px; padding: 13px 15px;
}
.lt-note__flabel {
  font-size: 11px; font-weight: 700; letter-spacing: 0.05em;
  text-transform: uppercase; color: var(--lt-note-green-deep); margin-bottom: 7px;
}
.lt-note__flabel .katex { text-transform: none; }
/* MOBILE-FIT-1: a formula wider than its card scrolls INSIDE its own box — never
   pushes the card past the screen, never clipped silently by an ancestor. The 3 px
   padding / -3 px margin pair keeps KaTeX glyph ink that pokes past the line box
   inside the scroll box without moving anything on desktop. */
.lt-note__fval {
  font-size: 16px; color: var(--lt-note-navy);
  max-width: 100%; overflow-x: auto; overflow-y: hidden;
  padding: 3px 0; margin: -3px 0;
}

/* third tab */
.lt-note__signtable { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; margin-top: 10px; }
.lt-note__signcard {
  border: 1px solid var(--lt-note-line); border-radius: 11px;
  padding: 13px 15px; background: #fcfdfe;
}
.lt-note__signcard h4 {
  font-size: 13px; color: var(--lt-note-navy); margin: 0 0 7px; font-weight: 700;
}
.lt-note__signcard ul { list-style: none; margin: 0; padding: 0; font-size: 13px; color: var(--lt-note-ink-soft); }
.lt-note__signcard li { padding: 3px 0; display: flex; gap: 7px; }
.lt-note__sign { font-weight: 700; min-width: 20px; }
.lt-note__rulelist { display: grid; gap: 9px; margin-top: 8px; }
.lt-note__rulei {
  display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 11px; font-size: 14px;
  padding: 10px 13px; border: 1px solid var(--lt-note-line);
  border-radius: 10px; background: #fcfdfe;
}
.lt-note__rulei-n {
  flex: none; width: 22px; height: 22px; border-radius: 6px;
  background: var(--lt-note-green-tint); color: var(--lt-note-green-deep);
  display: grid; place-items: center; font-weight: 700; font-size: 12px;
}
.lt-note__proof-just { font-size: 12.5px; color: var(--lt-note-ink-soft); margin-top: 3px; }
.lt-note__reaction-cond { font-size: 12.5px; color: var(--lt-note-ink-soft); margin-top: 3px; }

/* pending / empty states */
.lt-note__pending {
  border: 1px dashed var(--lt-note-line); border-radius: 12px;
  padding: 16px; font-size: 13px; color: var(--lt-note-ink-soft);
  background: #fcfdfe; font-style: italic;
}

/* source ledger */
.lt-note__ledger { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-top: 6px; }
.lt-note__ledger th {
  text-align: left; color: var(--lt-note-ink-faint); font-weight: 700;
  font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;
  padding: 6px 8px; border-bottom: 1px solid var(--lt-note-line);
}
.lt-note__ledger td {
  padding: 7px 8px; border-bottom: 1px solid var(--lt-note-line);
  color: var(--lt-note-ink-soft); vertical-align: top;
}
.lt-note__ledger td b { color: var(--lt-note-navy); }
.lt-note__ledger-src { white-space: nowrap; color: var(--lt-note-green-deep); font-weight: 600; }
.lt-note__ledger-wrap { overflow-x: auto; }
.lt-note__ledger-details { margin-top: 14px; }
.lt-note__ncert-pdf { margin: 14px 0 0; font-size: 12.5px; font-weight: 600; }
.lt-note__ncert-pdf a { color: var(--lt-note-green-deep); text-decoration: underline; }
.lt-note__ncert-read { margin: 14px 0 0; font-size: 13.5px; font-weight: 700; display: flex; flex-wrap: wrap; gap: 4px 14px; }
.lt-note__ncert-read a { color: var(--lt-note-green-deep); text-decoration: underline; }
.lt-note__ncert-read + .lt-note__ncert-pdf { margin-top: 6px; font-weight: 500; }
.lt-note__ledger-summary {
  cursor: pointer; font-size: 12.5px; font-weight: 600; color: var(--lt-note-green-deep);
  padding: 8px 0; list-style-position: inside;
}
.lt-note__footnote {
  text-align: center; font-size: 12px; color: var(--lt-note-ink-faint);
  font-style: italic; margin: 16px 0 2px;
}

@media (max-width: 560px) {
  .lt-note__frow, .lt-note__signtable { grid-template-columns: minmax(0, 1fr); }
  /* Phones: a figure fills the FULL content width of the card that holds it,
     edge to edge inside that card's border — never past it, never over its
     edge (QUICK-FIXES-1 owner follow-up: "fit the screen width, never cut
     off"). In a concept row it also reclaims the number column (28 px) + gap
     (13 px): 183 -> 256 px at 390. A third-tab figure spans its block's padding
     (14 px each side). Aspect ratio is kept (img height: auto); tap to enlarge
     gives the full-screen view. The figure card drops its side borders and
     radius because the holding card's border now frames it. */
  .lt-note__figure { border-left: 0; border-right: 0; border-radius: 0; }
  .lt-note__concept .lt-note__figure { margin-left: -56px; margin-right: -15px; }
  .lt-note__block > .lt-note__figure { margin-left: -14px; margin-right: -14px; }
  .lt-note__keyterms dl { grid-template-columns: minmax(0, 1fr); }
  .lt-note__block { padding: 16px 14px; }
}

/* ── tab bar + Download-PDF button (Part 3) ────────────────────────── */
.lt-note__tabbar {
  display: flex; align-items: center; gap: 10px;
  border-bottom: 1px solid var(--lt-note-line); margin-bottom: 18px; flex-wrap: wrap;
}
.lt-note__tabbar .lt-note__tabs { border-bottom: none; margin-bottom: 0; flex: 1 1 auto; min-width: 0; max-width: 100%; }
/* MOBILE-FIT-1: on a phone the four tabs sit as a 2 x 2 block instead of running
   past the right edge (their combined min-content is ~390 px; a 360 px phone has ~290).
   Every tab stays fully visible; a long label wraps inside its own tab. */
@media (max-width: 560px) {
  .lt-note__tabs { flex-wrap: wrap; }
  .lt-note__tab { flex: 1 1 calc(50% - 4px); min-width: 0; padding: 8px 10px; line-height: 1.3; }
}
.lt-note__pdf-btn {
  flex: 0 0 auto; font-family: var(--lt-note-sans); font-size: 12.5px; font-weight: 600;
  padding: 8px 12px; border-radius: 9px; border: 1px solid var(--lt-note-green-line);
  background: #fff; color: var(--lt-note-green-deep); cursor: pointer;
  display: inline-flex; align-items: center; gap: 5px; white-space: nowrap;
}
.lt-note__pdf-btn:hover { background: var(--lt-note-green-tint); }

/* tab panels — all rendered; only the active shows on screen (print shows all) */
.lt-note__panel { display: none; }
.lt-note__panel--active { display: block; }

/* board questions (CBQ-TAB-1) — published so a crawler can read the question AND
   its step-marked solution. No control here hides the solution: see the panel. */
.lt-note__bq-intro { font-size: 0.84rem; color: var(--lt-note-ink-soft); margin: 0 0 14px; }
.lt-note__bq-item {
  border: 1px solid var(--lt-note-line); border-radius: 12px;
  padding: 14px 16px; margin: 0 0 14px; background: #fff;
}
.lt-note__bq-head {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 8px;
}
.lt-note__bq-chip {
  font-size: 0.68rem; font-weight: 700; letter-spacing: 0.02em;
  padding: 3px 8px; border-radius: 999px;
  background: var(--lt-note-green-tint); color: var(--lt-note-green-deep);
}
.lt-note__bq-q { font-size: 0.95rem; line-height: 1.55; margin: 0 0 10px; white-space: pre-wrap; }
.lt-note__bq-figs { margin: 0 0 10px; }
.lt-note__bq-fig { margin: 0 0 8px; text-align: center; }
.lt-note__bq-img { max-width: 100%; max-height: 260px; width: auto; height: auto; border: 1px solid var(--lt-note-line); border-radius: 8px; background: #fff; }
.lt-note__bq-opts { list-style: none; margin: 0 0 10px; padding: 0; }
.lt-note__bq-opts li { font-size: 0.9rem; line-height: 1.5; margin-bottom: 4px; white-space: pre-wrap; }
.lt-note__bq-optl { font-weight: 700; color: var(--lt-note-green-deep); }
.lt-note__bq-sol-label {
  font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.04em; color: var(--lt-note-green-deep); margin-bottom: 6px;
}
.lt-note__bq-steps { margin: 0; padding-left: 20px; }
.lt-note__bq-steps li {
  font-size: 0.88rem; line-height: 1.55; margin-bottom: 6px; white-space: pre-wrap;
}
.lt-note__bq-cta {
  display: inline-flex; align-items: center; gap: 6px; margin-top: 4px;
  font-size: 0.85rem; font-weight: 700; text-decoration: none;
  padding: 9px 15px; border-radius: 10px;
  background: var(--lt-note-green-deep); color: #fff;
}
.lt-note__bq-cta:hover { filter: brightness(1.08); }

/* ── mindmap: responsive, collapsible tree that READS as a tree (v1.3) ── */
.lt-note__mm-scroll {
  overflow-y: auto; overflow-x: hidden; max-height: 560px;
  background: #fcfdfe; border: 1px solid var(--lt-note-line); border-radius: 12px;
  padding: 14px 16px;
}
.lt-note__mm-tree, .lt-note__mm-item { list-style: none; margin: 0; padding: 0; }
.lt-note__mm-item { position: relative; }
/* a parent's children: indented under a vertical accent rail (the "trunk"),
   each child tied back to the rail by a short horizontal elbow — so the
   parent > child branching is legible, not a flat stack of cards. The rail and
   elbow colour come from the branch's --mm-accent (neutral fallback for the
   root's own group, which has no single accent). */
.lt-note__mm-kids {
  list-style: none; margin: 2px 0 6px; padding: 4px 0 2px 22px;
  border-left: 2px solid var(--mm-accent, var(--lt-note-line));
  display: grid; gap: 4px;
}
.lt-note__mm-kids--collapsed { display: none; }
.lt-note__mm-kids > .lt-note__mm-item::before {
  content: ""; position: absolute; left: -22px; top: 16px; width: 20px; height: 0;
  border-top: 2px solid var(--mm-accent, var(--lt-note-line));
}
.lt-note__mm-node {
  box-sizing: border-box; width: 100%; text-align: left;
  display: flex; align-items: flex-start; gap: 8px;
  padding: 7px 12px; margin: 2px 0; border-radius: 10px;
  background: #fff; border: 1.3px solid var(--lt-note-line);
  font-family: var(--lt-note-sans); font-weight: 600; font-size: 12.5px;
  line-height: 1.35; color: var(--lt-note-ink-soft);
}
button.lt-note__mm-node { cursor: pointer; }
button.lt-note__mm-node:hover { border-color: var(--lt-note-green-line); background: #fcfdfe; }
.lt-note__mm-node--root {
  background: var(--lt-note-navy); border-color: var(--lt-note-navy); color: #fff;
  font-family: var(--lt-note-serif); font-size: 14.5px; font-weight: 600;
}
button.lt-note__mm-node--root:hover { background: #16305a; border-color: #16305a; }
.lt-note__mm-node--branch {
  border-left: 4px solid var(--mm-accent, var(--lt-note-navy));
  color: var(--lt-note-navy); font-weight: 700; font-size: 13px;
}
/* leaf: visibly subordinate to its branch — lighter, smaller, no hard card edge */
.lt-note__mm-node--leaf {
  font-weight: 500; font-size: 12px; color: var(--lt-note-ink-soft);
  background: var(--lt-note-bg); border-color: transparent; padding: 6px 11px;
}
.lt-note__mm-caret {
  flex: none; font-size: 10px; line-height: 1.7; color: currentColor; opacity: 0.55;
  transition: transform 0.18s ease;
}
.lt-note__mm-caret--open { transform: rotate(90deg); }
/* mobile: cap indentation so deep nodes never run off-screen; labels wrap */
@media (max-width: 380px) {
  .lt-note__mm-scroll { padding: 11px 12px; }
  .lt-note__mm-kids { padding-left: 16px; }
  .lt-note__mm-kids > .lt-note__mm-item::before { left: -16px; width: 14px; }
  .lt-note__mm-node { font-size: 12px; padding: 6px 10px; gap: 6px; }
  .lt-note__mm-node--leaf { padding: 5px 9px; }
}

/* ── generated figure: parabola triptych (Part 2) ──────────────────── */
.lt-note__fgen { margin: 4px 0; }
.lt-note__triptych {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0;
  border: 1px solid var(--lt-note-line); border-radius: 12px; overflow: hidden; background: #fff;
}
.lt-note__gcol { border-right: 1px solid var(--lt-note-line); }
.lt-note__gcol:last-child { border-right: none; }
.lt-note__gh { padding: 9px 11px; text-align: center; }
.lt-note__badge {
  display: inline-block; font-size: 10.5px; font-weight: 700;
  padding: 2px 8px; border-radius: 999px; margin-bottom: 4px;
}
.lt-note__badge--distinct { background: var(--lt-note-green-tint); color: var(--lt-note-green-deep); }
.lt-note__badge--equal { background: var(--lt-note-amber-tint); color: var(--lt-note-amber-ink); }
.lt-note__badge--none { background: #fbe9e7; color: #c0392b; }
.lt-note__gt { font-size: 12px; font-weight: 600; color: var(--lt-note-navy); line-height: 1.3; }
.lt-note__gsvg { display: block; width: 100%; height: auto; }
@media (max-width: 560px) {
  .lt-note__triptych { grid-template-columns: minmax(0, 1fr); }
  .lt-note__gcol { border-right: none; border-bottom: 1px solid var(--lt-note-line); }
  .lt-note__gcol:last-child { border-bottom: none; }
}

/* ── NOTES-FORMULA-3a: headings, tips, shortcuts, anchors ───────────── */
.lt-note__block, .lt-note__fitem, .lt-note__tcard, .lt-note__figure { scroll-margin-top: 72px; }
.lt-note__h3 { margin: 0 0 6px; font-family: var(--font-display); font-size: 15px; font-weight: 700; color: var(--lt-note-navy, #0b1f3a); }
.lt-note__ftip { margin-top: 6px; font-size: 13px; line-height: 1.45; color: #2a3b52; }
.lt-note__ftip-k { font-weight: 700; color: #1d7a4c; }
.lt-note__tcard { padding: 10px 12px; margin-top: 8px; border: 1px solid #d3eadf; border-radius: 12px; background: #fbfdfc; }
.lt-note__ttext { font-size: 15px; line-height: 1.5; }
.lt-note__tgloss { margin-top: 4px; font-size: 13px; line-height: 1.45; color: #4a5b72; font-style: italic; }
.lt-note__tmeta { display: flex; flex-wrap: wrap; gap: 6px 10px; margin-top: 8px; font-size: 12px; color: #4a5b72; }
.lt-note__tuse { padding: 1px 8px; border-radius: 999px; font-weight: 600; background: #e8f4ee; color: #1d6a43; }
.lt-note__tuse--mcq-check { background: #fff4dd; color: #7a5200; }
.lt-note__tricks-link { margin: 10px 0 0; font-size: 14px; font-weight: 600; }
.lt-note__tricks-link a { color: #1d7a4c; text-decoration: none; }

/* ── print: isolate the note, show every tab, drop app chrome (Part 3) ── */
@media print {
  .lt-note__fcard--second, .lt-note__tricks-link { display: none !important; }
  @page { margin: 14mm; }
  body { background: #fff !important; }
  body * { visibility: hidden !important; }
  .lt-note, .lt-note * { visibility: visible !important; }
  .lt-note {
    position: absolute !important; left: 0; top: 0; width: 100% !important;
    max-width: none !important; margin: 0 !important; padding: 0 !important;
    box-shadow: none !important; border: none !important;
  }
  .lt-note__tabbar, .lt-note__pdf-btn, .lt-note__fzoom-badge { display: none !important; }
  .lt-note__panel { display: block !important; }
  .lt-note__mm-scroll { overflow: visible !important; max-height: none !important; }
  .lt-note__mm-kids--collapsed { display: grid !important; }
  .lt-note__figure img, .lt-note__gsvg { max-height: 235mm; }
  .lt-note__block, .lt-note__figure, .lt-note__def, .lt-note__concept,
  .lt-note__ex, .lt-note__pit, .lt-note__signcard, .lt-note__gcol { break-inside: avoid; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
`;

/* ── small building blocks ─────────────────────────────────────────── */

/** Format a CBSE mark count for a chip: 0.5 → "½ mark", 1 → "1 mark", 1.5 → "1½ marks". */
function formatMark(m: number): string {
  const whole = Math.floor(m + 1e-9);
  const hasHalf = m - whole >= 0.5 - 1e-9;
  let num = "";
  if (whole > 0) num += String(whole);
  if (hasHalf) num += "½";
  if (num === "") num = "0";
  return `${num} ${m > 1 ? "marks" : "mark"}`;
}

/**
 * CiteLine — renders a source citation ("Ch 9, Example 9.2, p.144") in which the
 * PAGE ref ("p.144") is a clickable button that opens the NCERT page popup
 * (C4). The non-page bits stay plain text. Renders nothing when the source has
 * no citable field. `subject` comes from meta; `chapterFallback` is meta's
 * chapter_no, used when the source itself omits `chapter` (per-chapter note).
 */
function CiteLine({
  source,
  subject,
  chapterFallback,
  onOpenPage,
  className,
  prefix,
  suffix,
}: {
  source: NoteSource | null | undefined;
  subject: NoteSubject;
  chapterFallback: number;
  onOpenPage: (ref: NcertPageRef) => void;
  className?: string;
  prefix?: string;
  suffix?: string;
}) {
  if (!source || typeof source === "string") return null;
  const bits: string[] = [];
  if (source.chapter != null) bits.push(`Ch ${source.chapter}`);
  if (source.ncert_example) bits.push(`Example ${source.ncert_example}`);
  if (source.ncert_fig) bits.push(`Fig ${source.ncert_fig}`);
  const page = source.ncert_page;
  const hasText = bits.length > 0;
  if (!hasText && page == null) return null;
  return (
    <span className={className}>
      {prefix}
      {bits.join(", ")}
      {page != null && (
        <>
          {hasText ? ", " : ""}
          <button
            type="button"
            className="lt-note__pageref"
            onClick={() =>
              onOpenPage({ subject, chapter: source.chapter ?? chapterFallback, page })
            }
            title={`Open NCERT page ${page}`}
          >
            p.{page}
          </button>
        </>
      )}
      {suffix}
    </span>
  );
}

/**
 * LedgerSource — renders one Source-Ledger provenance string
 * ("NCERT 2026-27 Ch11 Fig 11.1 p.172") with its trailing page ref made
 * clickable, opening the SAME NCERT-page popup the inline body cites use
 * (shared onOpenPage -> NcertPageModal; ncertPdfOffsets handles the #page). The
 * full string is displayed unchanged — only the "p.N" token becomes a button.
 *
 * Anti-fabrication: the page is clickable ONLY when the row is a real NCERT
 * citation whose chapter is THIS note's chapter, so it maps to a real
 * {subject, chapter, page}. Anything else — a non-NCERT PYQ, a figure ref with
 * no page, a cross-chapter ref whose subject we cannot know — renders plain and
 * byte-unchanged, never a dead or guessed link. A page RANGE ("pp.8-9") links
 * to the first page while the range stays visible.
 */
const LEDGER_PAGE_RE = /\bpp?\.?\s*(\d+)/;
const LEDGER_CH_RE = /\bCh\.?\s*(\d+)/;

function LedgerSource({
  source,
  subject,
  chapterFallback,
  onOpenPage,
}: {
  source: string;
  subject: NoteSubject;
  chapterFallback: number;
  onOpenPage: (ref: NcertPageRef) => void;
}) {
  const pageMatch = /^\s*NCERT/i.test(source) ? LEDGER_PAGE_RE.exec(source) : null;
  const chMatch = LEDGER_CH_RE.exec(source);
  const chapter = chMatch ? Number(chMatch[1]) : chapterFallback;
  // Only an in-this-chapter NCERT page resolves to a real Storage PDF page.
  if (!pageMatch || chapter !== chapterFallback) {
    return <NoteRichText text={source} />;
  }
  const page = Number(pageMatch[1]);
  const start = pageMatch.index;
  const end = start + pageMatch[0].length;
  const before = source.slice(0, start);
  const label = source.slice(start, end); // exact "p.172" / "pp.8" — display preserved
  const after = source.slice(end);
  return (
    <>
      {before && <NoteRichText text={before} />}
      <button
        type="button"
        className="lt-note__pageref"
        onClick={() => onOpenPage({ subject, chapter, page })}
        title={`Open NCERT page ${page}`}
      >
        {label}
      </button>
      {after && <NoteRichText text={after} />}
    </>
  );
}

/** `canonical` = the diagrams-tab copy: it alone carries the anchor id and the heading (a concept in the Note tab may reuse the same figure). */
function FigureCard({ figure, canonical = false }: { figure: NoteFigure; canonical?: boolean }) {
  const assetUrl = getNoteAssetUrl(figure.asset);
  const size = getNoteAssetSize(figure.asset);
  const generated = hasGeneratedRenderer(figure);
  const [enlarged, setEnlarged] = useState(false);
  const alt = figure.alt || figure.caption || figure.tag || "Note figure";
  return (
    <figure id={canonical ? figure.id : undefined} className="lt-note__figure">
      {canonical && figure.heading && <h3 className="lt-note__h3"><NoteRichText text={figure.heading} /></h3>}
      {(figure.tag || figure.caption) && (
        <figcaption className="lt-note__fcap">
          {figure.tag && <span className="lt-note__ft"><NoteRichText text={figure.tag} /></span>}
          {figure.caption && <NoteRichText text={figure.caption} />}
        </figcaption>
      )}
      {generated ? (
        <div className="lt-note__fgen">
          <NoteGeneratedFigure figure={figure} />
        </div>
      ) : assetUrl ? (
        <button
          type="button"
          className="lt-note__fzoom"
          aria-label={`Tap to enlarge figure: ${figure.tag || alt}`}
          onClick={() => setEnlarged(true)}
        >
          <img
            className="lt-note__fimg"
            src={assetUrl}
            alt={alt}
            width={size?.width}
            height={size?.height}
            loading="lazy"
            decoding="async"
          />
          <span className="lt-note__fzoom-badge" aria-hidden="true">Tap to enlarge</span>
        </button>
      ) : (
        <div className="lt-note__fpending">
          <span className="lt-note__fpending-ic" aria-hidden="true">◫</span>
          <span>
            Figure asset pending extraction — the sourced original is
            {figure.tag ? <> <code><NoteRichText text={figure.tag} /></code></> : " recorded in the spec"}.
          </span>
        </div>
      )}
      {figure.legend && (
        <div className="lt-note__flegend">
          <NoteRichText text={figure.legend} />
        </div>
      )}
      {enlarged && assetUrl && (
        <NoteFigureLightbox
          src={assetUrl}
          alt={alt}
          label={figure.tag || alt}
          onClose={() => setEnlarged(false)}
        />
      )}
    </figure>
  );
}

function ConceptRow({
  concept,
  index,
  figures,
}: {
  concept: NoteConcept;
  index: number;
  figures: Record<string, NoteFigure>;
}) {
  const figure = concept.figure_ref ? figures[concept.figure_ref] : undefined;
  return (
    <div className="lt-note__concept">
      <div className="lt-note__concept-dot" aria-hidden="true">{index + 1}</div>
      <div>
        <div className="lt-note__concept-title">
          <NoteRichText text={concept.title} />
        </div>
        <div className="lt-note__concept-body">
          <NoteRichText text={concept.body} />
        </div>
        {figure && <FigureCard figure={figure} />}
        {concept.tested && (
          <span className="lt-note__tested">
            <NoteRichText text={concept.tested} />
          </span>
        )}
      </div>
    </div>
  );
}

function ExampleCard({
  example,
  defaultOpen,
  subject,
  chapterNo,
  onOpenPage,
}: {
  example: NoteExample;
  defaultOpen: boolean;
  subject: NoteSubject;
  chapterNo: number;
  onOpenPage: (ref: NcertPageRef) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`lt-note__ex${open ? " lt-note__ex--open" : ""}`}>
      <button
        type="button"
        className="lt-note__ex-head"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="lt-note__ex-shape"><NoteRichText text={example.shape} /></span>
        {example.marks_total != null && (
          <span className="lt-note__ex-total">{formatMark(example.marks_total)}</span>
        )}
        <span className="lt-note__ex-caret" aria-hidden="true">▸</span>
      </button>
      {/* cite strip sits OUTSIDE the head button so the clickable page ref is
          never a <button> nested inside the head <button> (invalid HTML). */}
      <CiteLine
        source={example.source}
        subject={subject}
        chapterFallback={chapterNo}
        onOpenPage={onOpenPage}
        className="lt-note__ex-cite"
      />
      <div className="lt-note__ex-q">
        &ldquo;<NoteRichText text={example.problem_verbatim} />&rdquo;
      </div>
      {open && (
        <div className="lt-note__ex-body">
          <div className="lt-note__steps">
            {example.solution_steps.map((step, i) => (
              <div key={i} className="lt-note__step">
                <div className="lt-note__step-n" aria-hidden="true">{i + 1}</div>
                <div className="lt-note__step-body">
                  {step.lead && <span className="lt-note__step-lead"><NoteRichText text={step.lead} /></span>}
                  <NoteRichText text={step.text} />
                  {step.equation && (
                    <div>
                      <NoteRichText text={step.equation} />
                    </div>
                  )}
                  {step.math && !step.text.includes(step.math) && (
                    <div>
                      <NoteRichText text={step.math} />
                    </div>
                  )}
                  {step.concept_tag && (
                    <span className="lt-note__step-ctag">Concept: <NoteRichText text={step.concept_tag} /></span>
                  )}
                </div>
                {step.mark != null && step.mark > 0 && (
                  <span className="lt-note__step-mark">{formatMark(step.mark)}</span>
                )}
              </div>
            ))}
          </div>
          {example.mark_logic && (
            <div className="lt-note__marklogic">
              <b>Mark-scheme logic (authored):</b>{" "}
              <NoteRichText text={example.mark_logic} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * NOTES-FORMULA-1 — the formula strip as ONE card, rendered in two places (owner: "keep in both"):
 * directly after "The Big Idea" in the Note tab, and at the top of the Mindmap tab. Both panels are
 * always in the DOM (and the prerendered HTML), so the text is present twice. An empty strip renders
 * nothing — no empty card.
 */
/**
 * `canonical` = the copy in the second tab ("Formulae & Tricks"). It alone carries the anchors (`#formulae`
 * and each item's `#<id>`): the same card is also shown after The Big Idea in the Note tab, and a duplicate
 * id would make an anchor ambiguous. The canonical copy is hidden in print (the Note-tab copy prints), so
 * the PDF no longer shows the card twice ([FU-NOTES-FORMULA-PRINT-DUPLICATE]).
 */
function FormulaeCard({ items, canonical = false }: { items: NoteSpec["formula_strip"]; canonical?: boolean }) {
  if (!items || items.length === 0) return null;
  return (
    <section
      id={canonical ? SECTION_ANCHORS.formulae : undefined}
      className={"lt-note__block" + (canonical ? " lt-note__fcard--second" : "")}
    >
      <div className="lt-note__sec-label">Formulae</div>
      <div className="lt-note__frow">
        {items.map((item, i) => (
          <div key={i} id={canonical ? item.id : undefined} className="lt-note__fitem">
            {item.heading && <h3 className="lt-note__h3"><NoteRichText text={item.heading} /></h3>}
            <div className="lt-note__flabel"><NoteRichText text={item.label} /></div>
            <div className="lt-note__fval">
              <NoteRichText text={item.math} />
            </div>
            {item.tip && (
              <div className="lt-note__ftip">
                <span className="lt-note__ftip-k">Tip: </span>
                <NoteRichText text={item.tip} />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

const USE_LABEL: Record<NoteShortcut["use"], string | null> = {
  "mcq-check": "MCQ / check only: don't write this as working",
  "written-ok": "Safe in written answers",
  "memory-aid": null,
};

/**
 * NOTES-FORMULA-3a — the "Shortcuts & Tricks" card (mcq-check / written-ok) and the "Memory Tricks" card
 * (memory-aid). Nothing renders when the chapter has none (honest empty state).
 *
 * STANDING BUILD RULE (D221): only heading / body (`text`) / `gloss` / `tip` and the safe-use tag render. `source` (and any
 * mapping column) is INTERNAL provenance and must never reach the student DOM; `Note.anchors.test.tsx` pins it.
 */
function ShortcutsCard({ items, section, label }: { items: NoteShortcut[]; section: string; label: string }) {
  if (items.length === 0) return null;
  return (
    <section id={section} className="lt-note__block">
      <div className="lt-note__sec-label">{label}</div>
      {items.map((s) => (
        <div key={s.id} id={s.id} className="lt-note__tcard">
          {s.heading && <h3 className="lt-note__h3"><NoteRichText text={s.heading} /></h3>}
          <div className="lt-note__ttext"><NoteRichText text={s.text} /></div>
          {s.gloss && <div className="lt-note__tgloss"><NoteRichText text={s.gloss} /></div>}
          {USE_LABEL[s.use] && (
            <div className="lt-note__tmeta">
              <span className={"lt-note__tuse lt-note__tuse--" + s.use}>{USE_LABEL[s.use]}</span>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

function MindmapPanel({ mindmap }: { mindmap: NoteMindmap }) {
  const hasTree =
    !!mindmap && !mindmap._TODO && !!mindmap.root && Array.isArray(mindmap.branches) &&
    mindmap.branches.length > 0;
  return (
    <section id={SECTION_ANCHORS.mindmap} className="lt-note__block">
      <div className="lt-note__sec-label">Mindmap</div>
      {hasTree ? (
        <NoteMindmapTree mindmap={mindmap} />
      ) : (
        <p className="lt-note__pending">
          The mind-map for this chapter is still being distilled from the note
          — it will appear here once it lands in the spec. Nothing is invented
          in the meantime.
        </p>
      )}
    </section>
  );
}

function ThirdTabPanel({
  content,
  figures,
}: {
  content: ThirdTabContent;
  figures: Record<string, NoteFigure>;
}) {
  const headerFigure =
    "figure_ref" in content && content.figure_ref
      ? figures[content.figure_ref]
      : undefined;

  const intro = content.intro ? (
    <p className="lt-note__hint">
      <NoteRichText text={content.intro} />
    </p>
  ) : null;

  switch (content.kind) {
    case "rules": {
      // Consecutive sign-tables share one 2-up grid (the prototype's layout);
      // rule-lists break the run and render full-width.
      const runs: Array<
        | { type: "sign-tables"; blocks: Extract<RulesBlock, { type: "sign-table" }>[] }
        | { type: "rule-list"; block: Extract<RulesBlock, { type: "rule-list" }> }
      > = [];
      for (const block of content.blocks) {
        const last = runs[runs.length - 1];
        if (block.type === "sign-table") {
          if (last && last.type === "sign-tables") last.blocks.push(block);
          else runs.push({ type: "sign-tables", blocks: [block] });
        } else {
          runs.push({ type: "rule-list", block });
        }
      }
      return (
        <section className="lt-note__block">
          {intro}
          {headerFigure && <FigureCard figure={headerFigure} />}
          {runs.map((run, i) =>
            run.type === "sign-tables" ? (
              <div key={i} className="lt-note__signtable">
                {run.blocks.map((block, j) => (
                  <div key={j} className="lt-note__signcard">
                    <h4><NoteRichText text={block.heading} /></h4>
                    <ul>
                      {block.rows.map((row, k) => (
                        <li key={k}>
                          <span className="lt-note__sign"><NoteRichText text={row.sign} /></span>
                          <NoteRichText text={row.text} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div key={i}>
                <div className="lt-note__sec-label"><NoteRichText text={run.block.heading} /></div>
                <div className="lt-note__rulelist">
                  {run.block.items.map((item, j) => (
                    <div key={j} className="lt-note__rulei">
                      <div className="lt-note__rulei-n" aria-hidden="true">{j + 1}</div>
                      <div>
                        <NoteRichText text={item} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ),
          )}
        </section>
      );
    }
    case "proof":
      return (
        <section className="lt-note__block">
          {content.name && <h2 className="lt-note__sec"><NoteRichText text={content.name} /></h2>}
          {intro}
          {headerFigure && <FigureCard figure={headerFigure} />}
          <div className="lt-note__steps">
            {content.steps.map((step, i) => (
              <div key={i} className="lt-note__step">
                <div className="lt-note__step-n" aria-hidden="true">{i + 1}</div>
                <div className="lt-note__step-body">
                  <NoteRichText text={step.claim} />
                  {step.math && (
                    <div>
                      <NoteRichText text={step.math} />
                    </div>
                  )}
                  {step.justification && (
                    <div className="lt-note__proof-just">
                      <NoteRichText text={step.justification} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    case "derivations":
      return (
        <section className="lt-note__block">
          {intro}
          {headerFigure && <FigureCard figure={headerFigure} />}
          {content.derivations.map((derivation, i) => (
            <div key={i}>
              <h2 className="lt-note__sec"><NoteRichText text={derivation.name} /></h2>
              <div className="lt-note__steps">
                {derivation.steps.map((step, j) => (
                  <div key={j} className="lt-note__step">
                    <div className="lt-note__step-n" aria-hidden="true">{j + 1}</div>
                    <div className="lt-note__step-body">
                      <NoteRichText text={step.claim} />
                      {step.math && (
                        <div>
                          <NoteRichText text={step.math} />
                        </div>
                      )}
                      {step.justification && (
                        <div className="lt-note__proof-just">
                          <NoteRichText text={step.justification} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      );
    case "reactions":
      return (
        <section className="lt-note__block">
          {intro}
          {headerFigure && <FigureCard figure={headerFigure} />}
          <div className="lt-note__rulelist">
            {content.reactions.map((reaction, i) => (
              <div key={i} className="lt-note__rulei">
                <div className="lt-note__rulei-n" aria-hidden="true">{i + 1}</div>
                <div>
                  <b><NoteRichText text={reaction.name} /></b>
                  <div>
                    <NoteRichText text={reaction.equation} />
                  </div>
                  {reaction.conditions && (
                    <div className="lt-note__reaction-cond">
                      <NoteRichText text={reaction.conditions} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    case "diagrams":
      return (
        <section id={SECTION_ANCHORS.diagrams} className="lt-note__block">
          {intro}
          {content.diagrams.map((ref) =>
            figures[ref] ? <FigureCard key={ref} figure={figures[ref]} canonical /> : null,
          )}
        </section>
      );
  }
}

/* ── the component ─────────────────────────────────────────────────── */

/** Some bank rows store their options already lettered ("A. 6"). The panel adds its own (A)-(D), so when EVERY option carries
 *  its own sequential label the label is dropped for display; any other option text is shown untouched. */
export function stripOwnOptionLabels(options: readonly string[]): string[] {
  const own = options.every((o, i) => new RegExp("^\\s*\\(?" + String.fromCharCode(65 + i) + "[.)]\\s+", "i").test(o));
  return own ? options.map((o) => o.replace(/^\s*\(?[A-Da-d][.)]\s+/, "")) : [...options];
}

/** The registry's generic title tells a screen-reader user nothing; describe the figure by its question instead. */
export function boardFigureAlt(alt: string, questionText: string): string {
  return alt === "Source figure" ? `Figure from the question paper for: ${questionText.slice(0, 90).trim()}` : alt;
}

/** The app's base path, for the public figure files a board question can carry. */
const BQ_BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

/**
 * BoardQuestionsPanel — the published board questions for this topic (CBQ-TAB-1).
 *
 * ★★ THE SOLUTION IS NEVER BEHIND A CLICK. Every step renders into the DOM on load,
 * with the tab INACTIVE, hidden only by the `.lt-note__panel` CSS the other three
 * panels use. There is deliberately no "show solution" toggle: a control that
 * unmounts the solution would make this whole lane pointless, because the one asset
 * worth publishing — the step-marked working — would never reach a crawler.
 *
 * Content comes from the GENERATED artifact, never the live bank. See
 * `lib/boardQuestions/selectionRule.ts` for why (PERF-1: 11 MB of question banks).
 */
function BoardQuestionsPanel({ topicKey, title }: { topicKey: string; title: string }) {
  const entry = BOARD_QUESTIONS[topicKey];

  // The competency preset, expressed in the URL: `marks=4&style=case&count=5` is the
  // shipped "Competency" preset's own filter block (QuickPracticePresets.tsx:106), read
  // by PracticePage at :710 (marks), :711 (style) and :701 (count). `topic=` alone makes
  // the arrival TARGETED (:597 -> deriveArrivedTargeted :319), so the student lands in a
  // built competency set rather than the preset picker.
  //
  // WARNING — DO NOT ADD `source=practice`. deriveArrivedTargeted checks it at :318,
  // BEFORE the topic check at :319, and returns false, which would send every student to
  // the picker with a perfectly valid `topic=` in hand, and the CTA would still look
  // right in the URL bar. `returnTo` alone carries the student home: practiceBackTo
  // (:663-668) prefers it over everything and consults `source` only for "trends".
  //
  // WARNING — `subject` comes from the artifact (bank-derived), NOT from meta.subject.
  // NoteMeta.subject is physics|chemistry|biology|maths, and normaliseSubject silently
  // defaults anything that is not "science"/"sci" to Maths, which would serve maths
  // questions on a physics note with no error at all.
  const practicePath = entry
    ? `/practice/10/${entry.subject}?topic=${encodeURIComponent(topicKey)}` +
      `&marks=4&style=case&count=5` +
      `&returnTo=${encodeURIComponent(`/notes/${topicKey}`)}` +
      `&backLabel=${encodeURIComponent(`Back to ${title} notes`)}`
    : "/practice-hub";
  // Resolved through the router so the basename is applied here, never hardcoded.
  const practiceHref = useHref(practicePath);

  // Honest empty state. <Note> is shared, and a note spec can exist for a topic the
  // artifact does not cover. Never invent a question to fill the panel.
  if (!entry || entry.questions.length === 0) {
    return (
      <p className="lt-note__hint">
        Competency-based questions for this chapter are not published yet.
      </p>
    );
  }

  return (
    <section>
      <p className="lt-note__bq-intro">
        {entry.questions.length} competency questions from the CBSE board pattern, with the
        full step-marked solution for each — the marks are shown per step, as the official
        scheme awards them.
      </p>

      {entry.questions.map((q) => (
        <article className="lt-note__bq-item" key={q.id}>
          <div className="lt-note__bq-head">
            <span className="lt-note__bq-chip">
              {q.marks} {q.marks === 1 ? "mark" : "marks"}
            </span>
            <span className="lt-note__bq-chip">Section {q.section}</span>
            {q.pyqYear ? <span className="lt-note__bq-chip">CBSE {q.pyqYear}</span> : null}
          </div>

          <p className="lt-note__bq-q">{q.questionText}</p>

          {q.figures && q.figures.length > 0 ? (
            <div className="lt-note__bq-figs">
              {q.figures.map((f) => (
                <figure className="lt-note__bq-fig" key={f.src}>
                  <img className="lt-note__bq-img" src={`${BQ_BASE}${f.src}`} alt={boardFigureAlt(f.alt, q.questionText)} loading="lazy" decoding="async" />
                </figure>
              ))}
            </div>
          ) : null}

          {q.options && q.options.length > 0 ? (
            <ol className="lt-note__bq-opts">
              {stripOwnOptionLabels(q.options).map((opt, oi) => (
                <li key={oi}>
                  <span className="lt-note__bq-optl">({String.fromCharCode(65 + oi)})</span> {opt}
                </li>
              ))}
            </ol>
          ) : null}

          <div className="lt-note__bq-sol-label">Step-marked solution</div>
          <ol className="lt-note__bq-steps">
            {q.solutionSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </article>
      ))}

      <a className="lt-note__bq-cta" href={practiceHref}>
        Practise {title} competency questions
      </a>
    </section>
  );
}

type NoteTab = "note" | "mind" | "third" | "questions";

/**
 * ★ THE ONE TAB A CALLER MAY OPEN ON, AND THE TYPE IS THE ALLOW-LIST
 * (LANDING-FOLLOWUP-1). Deliberately not `NoteTab`: only the questions tab has a
 * deep link today, and a wider type would invite callers to pass whatever a URL
 * happened to carry.
 */
export type NoteInitialTab = "questions";

export interface NoteProps {
  spec: NoteSpec;
  /**
   * ⚠ <Note> NEVER READS THE URL ITSELF, and that is load-bearing. `NoteModal`
   * mounts this component inside the Topic Hub, whose URLs already carry
   * `?tab=learn|grind|revision` for the HUB's tabs. A <Note> reading `?tab=`
   * would collide with them. The standalone notes page reads its own URL and
   * passes the result here; every other mount passes nothing and opens on Note.
   *
   * Used ONLY as the initial state. Absent — as it is for the prerender capture,
   * which loads the bare path — the first render is identical to before.
   */
  initialTab?: NoteInitialTab;
}

export function Note({ spec, initialTab }: NoteProps) {
  // NOTES-FORMULA-3a: a hash link (`#shortcuts`, `#<id>`) names an anchor on one of the tabs; it wins over `?tab=`.
  const anchors = useMemo(() => anchorTabs(spec), [spec]);
  const [tab, setTab] = useState<NoteTab>(() => {
    const fromHash = typeof window !== "undefined" ? anchors.get(anchorFromHash(window.location.hash)) : undefined;
    return fromHash ?? initialTab ?? "note";
  });
  const [scrollTo, setScrollTo] = useState<string | null>(() =>
    typeof window !== "undefined" && anchors.has(anchorFromHash(window.location.hash)) ? anchorFromHash(window.location.hash) : null,
  );
  /** Open the tab that holds `anchor` and scroll to it (a no-op for an anchor this page does not have). */
  const openAnchor = (anchor: string) => {
    const t = anchors.get(anchor);
    if (!t) return;
    setTab(t);
    setScrollTo(anchor);
  };
  useEffect(() => {
    const onHash = () => openAnchor(anchorFromHash(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchors]);
  useEffect(() => {
    if (!scrollTo) return;
    const el = document.getElementById(scrollTo);
    if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "start" });
    setScrollTo(null);
  }, [scrollTo, tab]);
  // C4 — the NCERT page-ref whose popup is open (null = closed). Set by any
  // clickable "p.N" cite (CiteLine); rendered by <NcertPageModal> below.
  const [pageRef, setPageRef] = useState<NcertPageRef | null>(null);

  const { meta, figures } = spec;
  // SEO-LLM-1 — null when the spec resolves no NCERT file code (no link is then shown).
  const ncertCode = useMemo(() => tryNcertFileCode(spec, `notes/specs/${spec.meta.topic_key}.json`), [spec]);
  // NCERT-ENTRY-1 — the chapter(s) this note covers, read ON LazyTopper (Maths Ch 8 + 9 share one note).
  const ncertRows = useMemo(() => ncertRowsForSlug(spec.meta.topic_key), [spec]);
  const { pathname: herePath } = useLocation();
  const headlineDefs = spec.definitions.filter((d) => d.tier !== "key-term");
  const keyTerms = spec.definitions.filter((d) => d.tier === "key-term");
  const hasBigIdea = !!(spec.big_idea?.tagline || spec.big_idea?.body);

  return (
    <div className="lt-note">
      <style>{NOTE_CSS}</style>

      {/* header */}
      <div className="lt-note__eyebrow">
        <span className="lt-note__chip lt-note__chip--unit">
          {SUBJECT_LABEL[meta.subject]} · Ch {meta.chapter_no}
        </span>
        <span className="lt-note__chip">Class 10 · CBSE 2026–27</span>
        <span className="lt-note__chip">{WEIGHTAGE_LABEL[meta.weightage]}</span>
      </div>
      <h2 className="lt-note__title"><NoteRichText text={meta.title} /></h2>
      {spec.board_asks && (
        <div className="lt-note__board-asks">
          <div className="lt-note__board-asks-ic" aria-hidden="true">★</div>
          <p>
            <b>What the board actually asks:</b>{" "}
            <NoteRichText text={spec.board_asks} />
          </p>
        </div>
      )}
      <div className="lt-note__prov-legend">
        <span>
          <span className="lt-note__tag-src">NCERT VERBATIM</span> sourced, word-for-word
        </span>
        <span>
          <span className="lt-note__tag-auth">AUTHORED</span> LazyTopper teaching scaffolding
        </span>
      </div>

      {/* tabs + Download-PDF */}
      <div className="lt-note__tabbar">
        <div className="lt-note__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "note"}
          className={`lt-note__tab${tab === "note" ? " lt-note__tab--active" : ""}`}
          onClick={() => setTab("note")}
        >
          Note
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "mind"}
          className={`lt-note__tab${tab === "mind" ? " lt-note__tab--active" : ""}`}
          onClick={() => setTab("mind")}
        >
          {hasTricks(spec) ? "Formulae & Tricks" : spec.formula_strip.length > 0 ? "Formulae & Mindmap" : "Mindmap"}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "third"}
          className={`lt-note__tab${tab === "third" ? " lt-note__tab--active" : ""}`}
          onClick={() => setTab("third")}
        >
          <NoteRichText text={meta.third_tab.label} />
        </button>
        {/* CBQ-TAB-1 — labelled for what a student searches for, not an internal term.
            LANDING-FOLLOWUP-1 — renamed from its earlier board-questions label (owner ruling): every row
            the selection rule publishes is `isCompetencyBased === true`
            (selectionRule.ts), and only 3 of 78 carry a board year, so the new label is
            the accurate one. */}
        <button
          type="button"
          role="tab"
          aria-selected={tab === "questions"}
          className={`lt-note__tab${tab === "questions" ? " lt-note__tab--active" : ""}`}
          onClick={() => setTab("questions")}
        >
          Competency-based questions
        </button>
        </div>
        <button
          type="button"
          className="lt-note__pdf-btn"
          onClick={() => window.print()}
          title="Save this note as PDF / print"
        >
          {"⤓"} Download PDF
        </button>
      </div>

      {/* ── Note tab — the 7-part spine ── */}
      <div className={"lt-note__panel" + (tab === "note" ? " lt-note__panel--active" : "")}>
        <div>
          {hasBigIdea && (
            <section className="lt-note__block">
              <div className="lt-note__sec-label">
                The Big Idea <span className="lt-note__tag-auth">AUTHORED</span>
              </div>
              {spec.big_idea.tagline && (
                <h3 className="lt-note__sec"><NoteRichText text={spec.big_idea.tagline} /></h3>
              )}
              {spec.big_idea.body && (
                <p className="lt-note__body-text">
                  <NoteRichText text={spec.big_idea.body} />
                </p>
              )}
            </section>
          )}

          <FormulaeCard items={spec.formula_strip} />
          {hasTricks(spec) && (
            <p className="lt-note__tricks-link">
              <a
                href={"#" + (shortcutsOf(spec).length > 0 ? SECTION_ANCHORS.shortcuts : SECTION_ANCHORS.memoryTricks)}
                onClick={(e) => {
                  e.preventDefault();
                  const id = shortcutsOf(spec).length > 0 ? SECTION_ANCHORS.shortcuts : SECTION_ANCHORS.memoryTricks;
                  // no URL write: pushState left Back on a stale tab and polluted the Topic Hub URL when <Note> is in NoteModal
                  openAnchor(id);
                }}
              >
                Shortcuts &amp; memory tricks &rarr;
              </a>
            </p>
          )}

          {spec.definitions.length > 0 && (
            <section className="lt-note__block">
              <div className="lt-note__sec-label">
                Definitions the board rewards{" "}
                <span className="lt-note__tag-src">NCERT VERBATIM</span>
              </div>
              <h3 className="lt-note__sec">State these in NCERT&rsquo;s exact words</h3>
              <div className="lt-note__defs">
                {headlineDefs.map((def) => (
                  <div key={def.id} className="lt-note__def">
                    <div className="lt-note__def-name">
                      <NoteRichText text={def.term} />
                    </div>
                    <div className="lt-note__vbtag">
                      <span aria-hidden="true">📖</span>
                      <span>NCERT verbatim — memorise this exact wording</span>
                      <CiteLine
                        source={def.source}
                        subject={meta.subject}
                        chapterFallback={meta.chapter_no}
                        onOpenPage={setPageRef}
                        className="lt-note__cite"
                        prefix="· "
                      />
                    </div>
                    <div className="lt-note__quote">
                      &ldquo;<NoteRichText text={def.verbatim} />&rdquo;
                    </div>
                    {def.plain && (
                      <div className="lt-note__means">
                        <b>What it means:</b> <NoteRichText text={def.plain} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {keyTerms.length > 0 && (
                <div className="lt-note__keyterms">
                  <div className="lt-note__vbtag">
                    <span aria-hidden="true">📖</span>
                    <span>Key terms — NCERT verbatim (state word-for-word)</span>
                  </div>
                  <dl>
                    {keyTerms.map((def) => (
                      <Fragment key={def.id}>
                        <dt>
                          <NoteRichText text={def.term} />
                        </dt>
                        <dd>
                          <NoteRichText text={def.verbatim} />
                          <CiteLine
                            source={def.source}
                            subject={meta.subject}
                            chapterFallback={meta.chapter_no}
                            onOpenPage={setPageRef}
                            className="lt-note__cite"
                            prefix=" ("
                            suffix=")"
                          />
                        </dd>
                      </Fragment>
                    ))}
                  </dl>
                </div>
              )}
            </section>
          )}

          {spec.concepts.length > 0 && (
            <section className="lt-note__block">
              <div className="lt-note__sec-label">
                Must-know concepts <span className="lt-note__tag-auth">AUTHORED FRAMING</span>
              </div>
              <h3 className="lt-note__sec">…and where they&rsquo;re tested</h3>
              <div className="lt-note__concepts">
                {spec.concepts.map((concept, i) => (
                  <ConceptRow
                    key={concept.id}
                    concept={concept}
                    index={i}
                    figures={figures}
                  />
                ))}
              </div>
            </section>
          )}

          {spec.examples.length > 0 && (
            <section className="lt-note__block">
              <div className="lt-note__sec-label">
                Worked examples — real solved problems{" "}
                <span className="lt-note__tag-src">NCERT VERBATIM</span>
              </div>
              <h3 className="lt-note__sec">Solved exactly as the source does them</h3>
              <p className="lt-note__hint">
                Every problem is a real sourced item, quoted verbatim with its
                page; the step-by-step decoding and mark-logic are
                LazyTopper-authored coaching.
              </p>
              {spec.examples.map((example, i) => (
                <ExampleCard
                  key={example.id}
                  example={example}
                  defaultOpen={i === 0}
                  subject={meta.subject}
                  chapterNo={meta.chapter_no}
                  onOpenPage={setPageRef}
                />
              ))}
            </section>
          )}

          {spec.strategies.length > 0 && (
            <section className="lt-note__block">
              <div className="lt-note__sec-label">
                Problem-solving strategies <span className="lt-note__tag-auth">AUTHORED</span>
              </div>
              <div className="lt-note__strat">
                {spec.strategies.map((strategy, i) => (
                  <div key={i} className="lt-note__strat-row">
                    <span className="lt-note__strat-arrow" aria-hidden="true">→</span>
                    <div>
                      {strategy.cue && (
                        <span className="lt-note__strat-cue"><NoteRichText text={strategy.cue} /></span>
                      )}
                      <NoteRichText text={strategy.text} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {spec.pitfalls.length > 0 && (
            <section className="lt-note__block lt-note__block--pitfalls">
              <div className="lt-note__sec-label">Common mistakes that cost marks</div>
              <h3 className="lt-note__sec">Where students lose easy marks</h3>
              {spec.pitfalls.map((pitfall, i) => (
                <div key={i} className="lt-note__pit">
                  <span className="lt-note__pit-x" aria-hidden="true">✕</span>
                  <div>
                    <NoteRichText text={pitfall.text.replace(/^✕\s*/, "")} />
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>

      {/* ── Mindmap tab ── */}
      <div className={"lt-note__panel" + (tab === "mind" ? " lt-note__panel--active" : "")}>
        <FormulaeCard items={spec.formula_strip} canonical />
        <ShortcutsCard items={shortcutsOf(spec)} section={SECTION_ANCHORS.shortcuts} label="Shortcuts & Tricks" />
        <ShortcutsCard items={memoryTricksOf(spec)} section={SECTION_ANCHORS.memoryTricks} label="Memory Tricks" />
        <MindmapPanel mindmap={spec.mindmap} />
      </div>

      {/* ── Third tab (kind-switched) ── */}
      <div className={"lt-note__panel" + (tab === "third" ? " lt-note__panel--active" : "")}>
        <ThirdTabPanel content={spec.third_tab_content} figures={figures} />
      </div>

      {/* ── Competency-based questions tab (CBQ-TAB-1) ──
          ★ Renders into the DOM unconditionally and hides via .lt-note__panel, exactly
          as the three panels above do. That is the whole point of this lane: a panel that
          unmounts when inactive is invisible to a crawler, and invisible is the state this
          lane exists to end. Do NOT convert this to `tab === "questions" && (...)`. */}
      <div className={"lt-note__panel" + (tab === "questions" ? " lt-note__panel--active" : "")}>
        <BoardQuestionsPanel topicKey={meta.topic_key} title={meta.title} />
      </div>

      {/* ── Source ledger — provenance, under every tab, CLOSED by default (NOTES-LEDGER-COLLAPSE-1).
          A native <details>: the table stays in the DOM and in the prerendered HTML (crawlable, the
          trust signal survives); only its visibility changes. No JS, same on mobile and desktop. ── */}
      {/* SEO-LLM-1 — the official NCERT chapter file, visible WITHOUT opening the ledger below
          and in the prerendered HTML. The code is resolved from this note's own spec by the
          same module the page <title>/<meta description> use (src/lib/ncertFileCode.ts);
          a spec that resolves no code gets no link — never a guessed one. */}
      {/* NCERT-ENTRY-1 (owner 14 Oct) — read the chapter here, in the /ncert-class-10 reader, with a
          return ticket back to this page. Internal links: the notes pages now point students (and link
          equity) at our own NCERT page; the official ncert.nic.in link below stays as the credit. */}
      {ncertCode && ncertRows.length > 0 && (
        <p className="lt-note__ncert-read" data-testid="note-ncert-read">
          {ncertRows.map((r, i) => (
            <Link key={r.chapter} to={ncertReadPath(r, herePath)}>
              {i === 0 ? `Read NCERT Chapter ${r.chapter} on LazyTopper (${ncertCode})` : `Chapter ${r.chapter}`}
            </Link>
          ))}
        </p>
      )}
      {ncertCode && (
        <p className="lt-note__ncert-pdf">
          <a href={ncertPdfHref(ncertCode)} target="_blank" rel="noopener">
            {ncertPdfLinkText(ncertCode)}
          </a>
        </p>
      )}

      {spec.source_ledger.length > 0 && (
        <details className="lt-note__ledger-details">
          <summary className="lt-note__ledger-summary">Sources: NCERT 2026-27 (tap to view)</summary>
        <section className="lt-note__block">
          <div className="lt-note__sec-label">
            Source ledger <span className="lt-note__tag-src">PROVENANCE</span>
          </div>
          <p className="lt-note__hint">
            Source edition: <NoteRichText text={meta.source_edition} />. One row per sourced item —
            every verbatim, example and NCERT figure traces to its page.
          </p>
          <div className="lt-note__ledger-wrap">
            <table className="lt-note__ledger">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {spec.source_ledger.map((row, i) => (
                  <tr key={i}>
                    <td>
                      <b>
                        <NoteRichText text={row.item} />
                      </b>
                    </td>
                    <td><NoteRichText text={row.type} /></td>
                    <td className="lt-note__ledger-src">
                      <LedgerSource
                        source={row.source}
                        subject={meta.subject}
                        chapterFallback={meta.chapter_no}
                        onOpenPage={setPageRef}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        </details>
      )}

      <p className="lt-note__footnote">
        <NoteRichText text={meta.title} /> · spec-rendered note · <NoteRichText text={meta.source_edition} />
      </p>

      {/* C4 — NCERT page popup, opened by any clickable "p.N" cite above. A
          per-page `key` remounts it fresh each open, so its probe/status never
          paints a stale frame carried over from a previously-opened page. */}
      <NcertPageModal
        key={pageRef ? `${pageRef.subject}-${pageRef.chapter}-${pageRef.page}` : "closed"}
        pageRef={pageRef}
        onClose={() => setPageRef(null)}
      />
    </div>
  );
}

export default Note;
