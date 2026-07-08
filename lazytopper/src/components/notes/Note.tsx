import { Fragment, useState } from "react";
import type {
  NoteConcept,
  NoteExample,
  NoteFigure,
  NoteMindmap,
  NoteSource,
  NoteSpec,
  NoteSubject,
  RulesBlock,
  ThirdTabContent,
} from "./noteSpec.types";
import { getNoteAssetUrl } from "./noteSpecRegistry";
import { NoteRichText } from "./NoteRichText";
import { NoteMindmapTree } from "./NoteMindmapTree";
import { NoteGeneratedFigure, hasGeneratedRenderer } from "./NoteGeneratedFigure";
import NcertPageModal, { type NcertPageRef } from "./NcertPageModal";

/**
 * <Note spec={…}/> — renders one note-spec (schema v1.1) inside the app.
 *
 * Visual gold standard: the locked v2 note prototypes in `notes/`
 * (esp. `light_note_ENRICHED_v2_2026-06-21.html`) — 3 tabs
 * (Note / Mindmap / [third]), the 7-part spine (Big Idea → Definitions →
 * Concepts → Worked examples → Strategies → Pitfalls → Formula strip),
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
  --lt-note-ink-faint: #8b94a3;
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
  display: grid; grid-template-columns: auto 1fr; gap: 5px 12px;
  font-size: 13px; margin: 0;
}
.lt-note__keyterms dt { font-weight: 700; color: var(--lt-note-navy); }
.lt-note__keyterms dd { margin: 0; color: var(--lt-note-ink-soft); }

/* concepts */
.lt-note__concepts { display: grid; gap: 10px; }
.lt-note__concept {
  display: grid; grid-template-columns: auto 1fr; gap: 13px; align-items: start;
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
  display: grid; grid-template-columns: auto 1fr auto; gap: 12px;
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
  display: grid; grid-template-columns: auto 1fr; gap: 11px;
  align-items: start; font-size: 14px;
}
.lt-note__strat-arrow { color: var(--lt-note-green); font-weight: 700; margin-top: 1px; }
.lt-note__strat-cue { font-weight: 600; color: var(--lt-note-navy); margin-right: 4px; }

/* pitfalls */
.lt-note__block--pitfalls { background: var(--lt-note-rose-tint); border-color: var(--lt-note-rose-line); }
.lt-note__block--pitfalls .lt-note__sec-label { color: var(--lt-note-rose-ink); }
.lt-note__block--pitfalls .lt-note__sec { color: #7a2f31; }
.lt-note__pit {
  display: grid; grid-template-columns: auto 1fr; gap: 11px; font-size: 14px;
  padding: 9px 0; border-bottom: 1px solid var(--lt-note-rose-line);
}
.lt-note__pit:last-child { border-bottom: none; }
.lt-note__pit-x { color: var(--lt-note-rose-ink); font-weight: 700; }

/* formula strip */
.lt-note__frow { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 6px; }
.lt-note__fitem {
  background: #fcfdfe; border: 1px solid var(--lt-note-green-line);
  border-radius: 11px; padding: 13px 15px;
}
.lt-note__flabel {
  font-size: 11px; font-weight: 700; letter-spacing: 0.05em;
  text-transform: uppercase; color: var(--lt-note-green-deep); margin-bottom: 7px;
}
.lt-note__fval { font-size: 16px; color: var(--lt-note-navy); }

/* third tab */
.lt-note__signtable { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
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
  display: grid; grid-template-columns: auto 1fr; gap: 11px; font-size: 14px;
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
.lt-note__footnote {
  text-align: center; font-size: 12px; color: var(--lt-note-ink-faint);
  font-style: italic; margin: 16px 0 2px;
}

@media (max-width: 560px) {
  .lt-note__frow, .lt-note__signtable { grid-template-columns: 1fr; }
  .lt-note__keyterms dl { grid-template-columns: 1fr; }
  .lt-note__block { padding: 16px 14px; }
}

/* ── tab bar + Download-PDF button (Part 3) ────────────────────────── */
.lt-note__tabbar {
  display: flex; align-items: center; gap: 10px;
  border-bottom: 1px solid var(--lt-note-line); margin-bottom: 18px; flex-wrap: wrap;
}
.lt-note__tabbar .lt-note__tabs { border-bottom: none; margin-bottom: 0; flex: 1 1 auto; }
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

/* ── mindmap: responsive, collapsible vertical tree (v1.2) ──────────── */
.lt-note__mm-scroll {
  overflow-y: auto; overflow-x: hidden; max-height: 560px;
  background: #fcfdfe; border: 1px solid var(--lt-note-line); border-radius: 12px;
  padding: 12px 14px;
}
.lt-note__mm-tree, .lt-note__mm-item { list-style: none; margin: 0; padding: 0; }
/* a parent's children: indented, with a connector rail down the left edge */
.lt-note__mm-kids {
  list-style: none; margin: 3px 0 5px; padding: 3px 0 0 16px;
  border-left: 2px solid var(--lt-note-line); display: grid; gap: 3px;
}
.lt-note__mm-kids--collapsed { display: none; }
.lt-note__mm-node {
  box-sizing: border-box; width: 100%; text-align: left;
  display: flex; align-items: flex-start; gap: 7px;
  padding: 7px 12px; margin: 2px 0; border-radius: 10px;
  background: #fff; border: 1.3px solid #e7ebf0;
  font-family: var(--lt-note-sans); font-weight: 600; font-size: 12.5px;
  line-height: 1.35; color: var(--lt-note-ink-soft);
}
button.lt-note__mm-node { cursor: pointer; }
button.lt-note__mm-node:hover { border-color: var(--lt-note-green-line); background: #fcfdfe; }
.lt-note__mm-node--root {
  background: var(--lt-note-navy); border-color: var(--lt-note-navy); color: #fff;
  font-family: var(--lt-note-serif); font-size: 14px; font-weight: 600;
}
button.lt-note__mm-node--root:hover { background: #16305a; border-color: #16305a; }
.lt-note__mm-node--branch {
  border-left-width: 4px; color: var(--lt-note-navy); font-weight: 700; font-size: 13px;
}
.lt-note__mm-node--leaf { font-weight: 500; }
.lt-note__mm-caret {
  flex: none; font-size: 10px; line-height: 1.7; color: currentColor; opacity: 0.6;
  transition: transform 0.18s ease;
}
.lt-note__mm-caret--open { transform: rotate(90deg); }

/* ── generated figure: parabola triptych (Part 2) ──────────────────── */
.lt-note__fgen { margin: 4px 0; }
.lt-note__triptych {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 0;
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
  .lt-note__triptych { grid-template-columns: 1fr; }
  .lt-note__gcol { border-right: none; border-bottom: 1px solid var(--lt-note-line); }
  .lt-note__gcol:last-child { border-bottom: none; }
}

/* ── print: isolate the note, show every tab, drop app chrome (Part 3) ── */
@media print {
  @page { margin: 14mm; }
  body { background: #fff !important; }
  body * { visibility: hidden !important; }
  .lt-note, .lt-note * { visibility: visible !important; }
  .lt-note {
    position: absolute !important; left: 0; top: 0; width: 100% !important;
    max-width: none !important; margin: 0 !important; padding: 0 !important;
    box-shadow: none !important; border: none !important;
  }
  .lt-note__tabbar, .lt-note__pdf-btn { display: none !important; }
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

function FigureCard({ figure }: { figure: NoteFigure }) {
  const assetUrl = getNoteAssetUrl(figure.asset);
  const generated = hasGeneratedRenderer(figure);
  return (
    <figure className="lt-note__figure">
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
        <img
          className="lt-note__fimg"
          src={assetUrl}
          alt={figure.caption || figure.tag || "Note figure"}
        />
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

function MindmapPanel({ mindmap }: { mindmap: NoteMindmap }) {
  const hasTree =
    !!mindmap && !mindmap._TODO && !!mindmap.root && Array.isArray(mindmap.branches) &&
    mindmap.branches.length > 0;
  return (
    <section className="lt-note__block">
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
        <section className="lt-note__block">
          {intro}
          {content.diagrams.map((ref) =>
            figures[ref] ? <FigureCard key={ref} figure={figures[ref]} /> : null,
          )}
        </section>
      );
  }
}

/* ── the component ─────────────────────────────────────────────────── */

type NoteTab = "note" | "mind" | "third";

export interface NoteProps {
  spec: NoteSpec;
}

export function Note({ spec }: NoteProps) {
  const [tab, setTab] = useState<NoteTab>("note");
  // C4 — the NCERT page-ref whose popup is open (null = closed). Set by any
  // clickable "p.N" cite (CiteLine); rendered by <NcertPageModal> below.
  const [pageRef, setPageRef] = useState<NcertPageRef | null>(null);

  const { meta, figures } = spec;
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
          Mindmap
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

          {spec.formula_strip.length > 0 && (
            <section className="lt-note__block">
              <div className="lt-note__sec-label">Formula strip</div>
              <div className="lt-note__frow">
                {spec.formula_strip.map((item, i) => (
                  <div key={i} className="lt-note__fitem">
                    <div className="lt-note__flabel"><NoteRichText text={item.label} /></div>
                    <div className="lt-note__fval">
                      <NoteRichText text={item.math} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ── Mindmap tab ── */}
      <div className={"lt-note__panel" + (tab === "mind" ? " lt-note__panel--active" : "")}>
        <MindmapPanel mindmap={spec.mindmap} />
      </div>

      {/* ── Third tab (kind-switched) ── */}
      <div className={"lt-note__panel" + (tab === "third" ? " lt-note__panel--active" : "")}>
        <ThirdTabPanel content={spec.third_tab_content} figures={figures} />
      </div>

      {/* ── Source ledger — provenance, visible under every tab ── */}
      {spec.source_ledger.length > 0 && (
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
                    <td className="lt-note__ledger-src"><NoteRichText text={row.source} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
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
