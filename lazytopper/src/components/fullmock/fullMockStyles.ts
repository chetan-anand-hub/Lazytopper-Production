// src/components/fullmock/fullMockStyles.ts
//
// The Full Mock DELTA stylesheet. The page renders inside `.lt-ct.lt-fm` and
// injects CT_CSS + FM_CSS: the locked test-taking grammar (page bar, cards,
// chips, blueprint rows, full-screen shell, navigator, confirm, upload panel)
// comes from the SHARED chapterTestStyles byte-unchanged; this file adds only
// what the Full Mock mockup adds — the history header control + OVERLAY PANEL
// (worksheet pattern) with subject tabs, the chapter WEIGHTAGE bar/legend, the
// pending banner, the resume strip, and the pause overlay. Class-driven only
// (§7): the weightage segments use quantised flex-grow classes, no inline
// style objects. Mobile-first reflow (360px verified) via pure CSS.

export const FM_CSS = `
/* ── Setup layout: no left rail (history is an overlay), single column ── */
.lt-fm .lt-ct__setup { max-width: 760px; }
.lt-fm__headrow { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin: 0 0 14px; flex-wrap: wrap; }
.lt-fm__headrow h1 { font-size: 24px; font-weight: 600; letter-spacing: -.02em; margin: 0; }

/* ── History header control — "Your mocks · 7 · 1 awaiting ⌄" ── */
.lt-fm__hctl { display: inline-flex; align-items: center; gap: 8px; background: #fff; border: 1px solid var(--ct-line); border-radius: 11px; padding: 9px 12px; font-size: 12.5px; font-weight: 600; cursor: pointer; box-shadow: var(--ct-sh); white-space: nowrap; color: var(--ct-ink); font-family: var(--ct-fb); }
.lt-fm__hctl:hover { border-color: var(--ct-green); }
.lt-fm__hctl-cnt { color: var(--ct-ink-3); font-weight: 500; }
.lt-fm__hctl-await { font-size: 10px; font-weight: 700; color: var(--ct-blue); background: var(--ct-blue-t); padding: 2px 6px; border-radius: 5px; }
.lt-fm__hctl-caret { color: var(--ct-ink-3); font-size: 10px; }

/* ── Chapter weightage bar + legend (quantised flex classes — §7) ── */
.lt-fm__wbar { display: flex; height: 10px; border-radius: 6px; overflow: hidden; margin: 9px 0 8px; background: var(--ct-line); }
.lt-fm__wseg { display: block; min-width: 3px; }
.lt-fm__g1 { flex-grow: 1; } .lt-fm__g2 { flex-grow: 2; } .lt-fm__g3 { flex-grow: 3; }
.lt-fm__g4 { flex-grow: 4; } .lt-fm__g5 { flex-grow: 5; } .lt-fm__g6 { flex-grow: 6; }
.lt-fm__g7 { flex-grow: 7; } .lt-fm__g8 { flex-grow: 8; } .lt-fm__g9 { flex-grow: 9; }
.lt-fm__g10 { flex-grow: 10; } .lt-fm__g11 { flex-grow: 11; } .lt-fm__g12 { flex-grow: 12; }
.lt-fm__g13 { flex-grow: 13; } .lt-fm__g14 { flex-grow: 14; } .lt-fm__g15 { flex-grow: 15; }
.lt-fm__g16 { flex-grow: 16; } .lt-fm__g17 { flex-grow: 17; } .lt-fm__g18 { flex-grow: 18; }
.lt-fm__g19 { flex-grow: 19; } .lt-fm__g20 { flex-grow: 20; }
.lt-fm__c0 { background: #3b6fd4; } .lt-fm__c1 { background: #34c78a; }
.lt-fm__c2 { background: #e0912f; } .lt-fm__c3 { background: #e0495f; }
.lt-fm__c4 { background: #8b5cf6; } .lt-fm__c5 { background: #0ea5e9; }
.lt-fm__c6 { background: #f0913a; } .lt-fm__c7 { background: #94a3b8; }
.lt-fm__wlegend { display: flex; flex-wrap: wrap; gap: 9px 12px; font-size: 11px; color: var(--ct-ink-2); }
.lt-fm__wlegend-item { display: flex; align-items: center; gap: 5px; }
.lt-fm__wlegend-sw { width: 9px; height: 9px; border-radius: 3px; flex: none; }
.lt-fm__lbl-soft { font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--ct-ink-3); }

/* ── Mix line — the REAL PYQ/fresh split of this draw ── */
.lt-fm__mix { font-size: 12px; color: var(--ct-ink-2); margin-top: 10px; }
.lt-fm__mix b { color: var(--ct-ink); }

/* ── Pending banner (worksheet pattern, FM copy) ── */
.lt-fm__banner { display: flex; align-items: center; gap: 10px; background: var(--ct-blue-t); border: 1px solid rgba(59,111,212,.35); border-radius: 12px; padding: 10px 13px; margin: 0 0 14px; font-size: 12.5px; color: var(--ct-ink-2); flex-wrap: wrap; }
.lt-fm__banner b { color: var(--ct-ink); }
.lt-fm__banner-act { margin-left: auto; background: var(--ct-blue); color: #fff; border: 0; border-radius: 9px; padding: 7px 12px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: var(--ct-fb); white-space: nowrap; }
.lt-fm__banner-x { background: none; border: 0; color: var(--ct-ink-3); font-size: 14px; cursor: pointer; padding: 2px 4px; }

/* ── Resume strip (an in-progress mock is never silently lost — §8a) ── */
.lt-fm__resume { display: flex; align-items: center; gap: 10px; background: var(--ct-green-t); border: 1px solid var(--ct-green); border-radius: 12px; padding: 11px 13px; margin: 0 0 14px; font-size: 12.5px; color: var(--ct-ink-2); flex-wrap: wrap; }
.lt-fm__resume b { color: var(--ct-ink); }
.lt-fm__resume-act { margin-left: auto; background: var(--ct-green); color: #fff; border: 0; border-radius: 9px; padding: 7px 12px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: var(--ct-fb); white-space: nowrap; }

/* ── Away-return notice (one neutral line — §8b.3) ── */
.lt-fm__away { display: flex; align-items: center; gap: 10px; background: var(--ct-amber-t); border: 1px solid rgba(224,145,47,.4); border-radius: 10px; padding: 8px 12px; margin: 10px 18px 0; font-size: 12.5px; color: #8a6516; }
.lt-fm__away button { margin-left: auto; background: none; border: 0; color: #8a6516; font-size: 13px; cursor: pointer; }

/* ── Pause overlay (§8b.7 — records intent; the exam clock keeps running) ── */
.lt-fm__pausebtn { font-size: 11.5px; font-weight: 600; padding: 5px 11px; border-radius: 8px; border: 1px solid var(--ct-line); background: #fff; color: var(--ct-ink-2); cursor: pointer; font-family: var(--ct-fb); }
.lt-fm__pause { position: fixed; inset: 0; background: rgba(21,35,58,.72); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 999; }
.lt-fm__pause-box { background: #fff; border-radius: 16px; padding: 26px; max-width: 380px; width: 100%; text-align: center; }
.lt-fm__pause-h { font-family: var(--ct-fd); font-size: 20px; margin-bottom: 8px; }
.lt-fm__pause-p { font-size: 13.5px; color: var(--ct-ink-2); margin-bottom: 16px; line-height: 1.55; }
.lt-fm__pause-clock { font-weight: 700; font-size: 17px; font-variant-numeric: tabular-nums; margin-bottom: 16px; }

/* ── History OVERLAY PANEL (locked worksheet pattern; anchored fixed) ── */
.lt-fm__dim { position: fixed; inset: 0; z-index: 900; background: rgba(21,35,58,.45); -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px); display: flex; align-items: flex-start; justify-content: center; padding: 36px 16px; font-family: var(--ct-fb); }
.lt-fm__panel { background: #fff; border: 1px solid var(--ct-line); border-radius: var(--ct-r); box-shadow: 0 12px 40px rgba(21,35,58,.2); width: 100%; max-width: 520px; max-height: 86vh; display: flex; flex-direction: column; overflow: hidden; color: var(--ct-ink); }
.lt-fm__panel-h { display: flex; justify-content: space-between; align-items: center; padding: 15px 17px; border-bottom: 1px solid var(--ct-line); }
.lt-fm__panel-t { font-family: var(--ct-fd); font-size: 16px; font-weight: 600; }
.lt-fm__panel-sub { color: var(--ct-ink-3); font-size: 11.5px; font-weight: 400; margin-top: 2px; }
.lt-fm__panel-x { background: none; border: 0; font-size: 19px; color: var(--ct-ink-3); cursor: pointer; }
.lt-fm__tabs { display: flex; gap: 6px; padding: 11px 15px 4px; }
.lt-fm__tab { font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 18px; border: 1px solid var(--ct-line); background: #fff; color: var(--ct-ink-2); cursor: pointer; font-family: var(--ct-fb); }
.lt-fm__tab--on { background: var(--ct-ink); color: #fff; border-color: var(--ct-ink); }
.lt-fm__panel-b { overflow-y: auto; padding: 10px 14px 14px; }

/* Panel cards reuse the LOCKED CT card classes (lt-ct__hcard…). Delta: the
   objective-scored line on a pending card. */
.lt-fm__objline { font-size: 11.5px; color: var(--ct-blue); margin-top: 8px; font-weight: 500; }

/* ── Mobile 360px reflow ── */
@media (max-width: 480px) {
  .lt-fm__headrow { flex-direction: column; }
  .lt-fm__hctl { align-self: stretch; justify-content: center; }
  .lt-fm .lt-ct__startrow .lt-ct__btn { flex-basis: 100%; }
  .lt-fm__banner-act, .lt-fm__resume-act { margin-left: 0; width: 100%; }
  .lt-fm__dim { padding: 16px 8px; }
  .lt-fm__wlegend { gap: 7px 10px; }
}
`;
