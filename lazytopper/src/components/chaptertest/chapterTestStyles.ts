// src/components/chaptertest/chapterTestStyles.ts
//
// The ONE scoped stylesheet for the Chapter Test surface (locked design + mockup v4).
// Injected once by ChapterTestPage via <style>{CT_CSS}</style>; every CT component
// styles through these classes — NO inline style={{}} objects (§7). Self-contained
// light-theme tokens (green hsl(152,55%,45%), ink #15233a, Fraunces + Inter) so the
// own-page CT surface renders the locked grammar regardless of app theme vars, exactly
// like the worksheet + scorecard scoped styles. ONE responsive component per surface —
// the desktop→mobile reflow is pure CSS (@media 820px / 720px), no useIsDesktop twin.

export const CT_CSS = `
.lt-ct {
  --ct-green: hsl(152, 55%, 45%);
  --ct-green-d: hsl(152, 55%, 38%);
  --ct-green-t: hsl(152, 55%, 96%);
  --ct-ink: #15233a;
  --ct-ink-2: #4a5568;
  --ct-ink-3: #8794a7;
  --ct-amber: #e0912f;
  --ct-amber-t: #fdf3e5;
  --ct-blue: #3b6fd4;
  --ct-blue-t: #eaf0fb;
  --ct-line: #e7ebf0;
  --ct-bg: #f6f8fa;
  --ct-card: #fff;
  --ct-r: 18px;
  --ct-sh: 0 1px 3px rgba(21,35,58,.06), 0 4px 16px rgba(21,35,58,.05);
  --ct-fd: "Fraunces", Georgia, serif;
  --ct-fb: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  min-height: 100vh;
  background: var(--ct-bg);
  color: var(--ct-ink);
  font-family: var(--ct-fb);
  line-height: 1.5;
}
.lt-ct * { box-sizing: border-box; }
.lt-ct__fr { font-family: var(--ct-fd); }

/* ── Page bar (own page, back button — NOT the product shell) ── */
.lt-ct__pagebar { display: flex; align-items: center; gap: 14px; padding: 12px 18px; background: #fff; border-bottom: 1px solid var(--ct-line); }
.lt-ct__back { display: flex; align-items: center; gap: 7px; font-size: 13.5px; font-weight: 600; color: var(--ct-ink-2); cursor: pointer; background: none; border: 0; font-family: var(--ct-fb); }
.lt-ct__back:hover { color: var(--ct-ink); }
.lt-ct__pagetitle { font-family: var(--ct-fd); font-weight: 600; font-size: 15px; }

/* ── Setup: history rail (left) + setup (right) ── */
.lt-ct__setup { display: flex; gap: 16px; padding: 18px; align-items: flex-start; max-width: 1080px; margin: 0 auto; }
.lt-ct__histrail { width: 270px; flex: none; }
.lt-ct__histrail-h { font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--ct-ink-3); margin: 4px 4px 10px; }
.lt-ct__setup-main { flex: 1; min-width: 0; }
@media (max-width: 820px) { .lt-ct__setup { flex-direction: column; } .lt-ct__histrail { width: auto; order: 2; } .lt-ct__setup-main { order: 1; } }

.lt-ct__card { background: var(--ct-card); border: 1px solid var(--ct-line); border-radius: var(--ct-r); box-shadow: var(--ct-sh); padding: 22px; }
.lt-ct__eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; color: var(--ct-ink-3); margin-bottom: 6px; }
.lt-ct__title { font-family: var(--ct-fd); font-size: 25px; font-weight: 600; letter-spacing: -.02em; margin-bottom: 4px; }
.lt-ct__sub { color: var(--ct-ink-2); font-size: 14px; margin-bottom: 18px; }
.lt-ct__metarow { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
.lt-ct__chip { font-size: 12.5px; font-weight: 600; padding: 7px 12px; border-radius: 10px; background: var(--ct-bg); border: 1px solid var(--ct-line); color: var(--ct-ink-2); }
.lt-ct__chip b { color: var(--ct-ink); }

.lt-ct__blueprint { border: 1px solid var(--ct-line); border-radius: 12px; overflow: hidden; margin: 14px 0; }
.lt-ct__bp-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 11px 14px; font-size: 13.5px; border-bottom: 1px solid var(--ct-line); }
.lt-ct__bp-row:last-child { border-bottom: 0; }
.lt-ct__bp-row--empty { color: var(--ct-ink-3); }
.lt-ct__bp-meta { color: var(--ct-ink-3); font-size: 12.5px; text-align: right; }
.lt-ct__sec-tag { display: inline-block; width: 22px; height: 22px; line-height: 22px; text-align: center; border-radius: 6px; background: var(--ct-green-t); color: var(--ct-green-d); font-weight: 700; font-size: 12px; margin-right: 8px; }

.lt-ct__toggle { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 15px; border: 1px solid var(--ct-line); border-radius: 12px; margin: 6px 0; }
.lt-ct__toggle-lab b { font-size: 14px; }
.lt-ct__toggle-lab p { font-size: 12px; color: var(--ct-ink-2); margin: 2px 0 0; }
.lt-ct__tg { width: 44px; height: 25px; border-radius: 20px; background: var(--ct-green); position: relative; cursor: pointer; flex: none; border: 0; padding: 0; }
.lt-ct__tg--off { background: #cbd3dd; }
.lt-ct__tg::after { content: ""; position: absolute; top: 3px; left: 22px; width: 19px; height: 19px; border-radius: 50%; background: #fff; transition: .15s; }
.lt-ct__tg--off::after { left: 3px; }

.lt-ct__startrow { display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
.lt-ct__startrow .lt-ct__btn { flex: 1; min-width: 150px; }
.lt-ct__btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; font-size: 15px; padding: 13px 22px; border-radius: 12px; border: 0; cursor: pointer; transition: .15s; font-family: var(--ct-fb); }
.lt-ct__btn:disabled { opacity: .55; cursor: not-allowed; }
.lt-ct__btn--primary { background: var(--ct-green); color: #fff; }
.lt-ct__btn--primary:hover:not(:disabled) { background: var(--ct-green-d); }
.lt-ct__btn--ghost { background: var(--ct-bg); color: var(--ct-ink); border: 1px solid var(--ct-line); }
.lt-ct__btn--ghost:hover:not(:disabled) { border-color: var(--ct-ink-3); }
.lt-ct__btn--sm { font-size: 13px; padding: 9px 15px; }
.lt-ct__honest { font-size: 12px; color: var(--ct-ink-3); font-style: italic; margin-top: 14px; display: flex; gap: 7px; align-items: flex-start; }
.lt-ct__empty { text-align: center; padding: 26px 16px; color: var(--ct-ink-2); font-size: 14px; }

/* ── History cards ── */
.lt-ct__hcard { background: #fff; border: 1px solid var(--ct-line); border-radius: 14px; padding: 14px; margin-bottom: 10px; cursor: pointer; transition: .12s; width: 100%; text-align: left; font-family: var(--ct-fb); }
.lt-ct__hcard:hover { border-color: var(--ct-green); box-shadow: var(--ct-sh); }
.lt-ct__hcard--latest { border-color: var(--ct-green); background: linear-gradient(180deg, var(--ct-green-t), #fff); }
.lt-ct__hcard--pending { border-color: rgba(59,111,212,.4); background: var(--ct-blue-t); }
.lt-ct__hcard-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.lt-ct__hcard-name { font-size: 13.5px; font-weight: 600; }
.lt-ct__hcard-code { font-size: 11.5px; color: var(--ct-ink-3); margin-top: 2px; }
.lt-ct__lastlbl { font-size: 10.5px; font-weight: 700; color: var(--ct-green-d); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 6px; }
.lt-ct__ring { width: 44px; height: 44px; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; color: var(--ct-ink); }
.lt-ct__ring span { background: #fff; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.lt-ct__ring-svg { flex: none; }
.lt-ct__ring-txt { font-size: 12px; font-weight: 700; fill: var(--ct-ink); font-family: var(--ct-fb); }
.lt-ct__strip { display: flex; gap: 3px; margin-top: 10px; }
.lt-ct__strip i { height: 5px; border-radius: 3px; flex: 1; background: var(--ct-line); }
.lt-ct__strip i.con { background: #ef4444; }
.lt-ct__strip i.cal { background: #e8930c; }
.lt-ct__strip i.sil { background: #f97316; }
.lt-ct__strip i.pre { background: #3b82f6; }
.lt-ct__vs { font-size: 11.5px; color: var(--ct-ink-2); margin-top: 8px; font-weight: 500; }
.lt-ct__pending-pill { font-size: 11px; font-weight: 700; color: var(--ct-blue); background: #fff; padding: 5px 9px; border-radius: 8px; white-space: nowrap; }

/* ── Full-screen test ── */
.lt-ct__fs { background: var(--ct-bg); min-height: 100vh; }
.lt-ct__fsbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 18px; background: #fff; border-bottom: 1px solid var(--ct-line); position: sticky; top: 0; z-index: 10; }
.lt-ct__fsbar-l { font-size: 13.5px; font-weight: 600; }
.lt-ct__fsbar-l small { color: var(--ct-ink-3); font-weight: 500; display: block; font-size: 11px; }
.lt-ct__timer { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.lt-ct__clock { font-weight: 700; font-size: 15px; font-variant-numeric: tabular-nums; background: var(--ct-ink); color: #fff; padding: 6px 12px; border-radius: 9px; }
.lt-ct__clock--off { background: var(--ct-bg); color: var(--ct-ink-3); border: 1px solid var(--ct-line); }
.lt-ct__clock--low { background: #e0495f; }
.lt-ct__minitg { font-size: 11px; color: var(--ct-ink-2); display: flex; align-items: center; gap: 6px; cursor: pointer; background: none; border: 0; font-family: var(--ct-fb); }
.lt-ct__minitg .d { width: 34px; height: 19px; border-radius: 14px; background: var(--ct-green); position: relative; }
.lt-ct__minitg .d.off { background: #cbd3dd; }
.lt-ct__minitg .d::after { content: ""; position: absolute; top: 2px; left: 17px; width: 15px; height: 15px; border-radius: 50%; background: #fff; transition: .15s; }
.lt-ct__minitg .d.off::after { left: 2px; }
.lt-ct__save { font-size: 11px; color: var(--ct-green-d); display: flex; align-items: center; gap: 5px; }
.lt-ct__exit { background: var(--ct-green); border: 0; border-radius: 9px; padding: 8px 14px; font-size: 12.5px; font-weight: 700; color: #fff; cursor: pointer; font-family: var(--ct-fb); }
.lt-ct__track { display: flex; gap: 2px; height: 4px; }
.lt-ct__seg { flex: 1; background: var(--ct-line); transition: background .2s ease; }
.lt-ct__seg--on { background: var(--ct-green); }

.lt-ct__fsbody { display: flex; max-width: 1080px; margin: 0 auto; }
.lt-ct__fsq { flex: 1; padding: 22px; min-width: 0; }
.lt-ct__sechead { font-size: 11.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--ct-green-d); background: var(--ct-green-t); padding: 6px 12px; border-radius: 8px; display: inline-block; margin-bottom: 14px; }
.lt-ct__qhead { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
.lt-ct__qnum { font-family: var(--ct-fd); font-size: 19px; font-weight: 600; }
.lt-ct__flag { font-size: 11.5px; font-weight: 600; padding: 5px 11px; border-radius: 8px; border: 1px solid var(--ct-line); background: #fff; color: var(--ct-ink-2); cursor: pointer; display: flex; gap: 5px; align-items: center; font-family: var(--ct-fb); }
.lt-ct__flag--on { background: var(--ct-amber-t); color: var(--ct-amber); border-color: transparent; }
.lt-ct__qtag { font-size: 11px; font-weight: 600; padding: 4px 9px; border-radius: 7px; background: var(--ct-blue-t); color: var(--ct-blue); display: inline-block; }
.lt-ct__qtag--sa { background: var(--ct-amber-t); color: var(--ct-amber); }
.lt-ct__qtext { font-size: 15.5px; line-height: 1.55; margin: 10px 0 16px; }
.lt-ct__opt { display: flex; align-items: center; gap: 11px; padding: 13px 15px; border: 1.5px solid var(--ct-line); border-radius: 12px; margin-bottom: 9px; cursor: pointer; font-size: 14.5px; background: #fff; width: 100%; text-align: left; font-family: var(--ct-fb); }
.lt-ct__opt:hover { border-color: var(--ct-green); }
.lt-ct__opt--sel { border-color: var(--ct-green); background: var(--ct-green-t); }
.lt-ct__opt-k { width: 26px; height: 26px; flex: none; border-radius: 7px; background: var(--ct-bg); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; color: var(--ct-ink-2); }
.lt-ct__opt--sel .lt-ct__opt-k { background: var(--ct-green); color: #fff; }
.lt-ct__subjbox { border: 1.5px dashed var(--ct-blue); border-radius: 12px; padding: 16px; text-align: center; color: var(--ct-ink-2); font-size: 13.5px; background: var(--ct-blue-t); }
.lt-ct__subjbox b { color: var(--ct-ink); display: block; margin-bottom: 3px; font-size: 14px; }
.lt-ct__fsactions { display: flex; gap: 10px; margin-top: 18px; }
.lt-ct__fsactions .lt-ct__btn { flex: 1; }

/* ── Navigator ── */
.lt-ct__nav { width: 210px; flex: none; border-left: 1px solid var(--ct-line); background: #fff; padding: 16px 14px; }
.lt-ct__nav-h { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--ct-ink-3); margin-bottom: 12px; }
.lt-ct__qgrid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; margin-bottom: 16px; }
.lt-ct__qn { aspect-ratio: 1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12.5px; font-weight: 700; cursor: pointer; border: 1.5px solid transparent; background: var(--ct-bg); color: var(--ct-ink-3); font-family: var(--ct-fb); }
.lt-ct__qn--ans { background: var(--ct-green); color: #fff; }
.lt-ct__qn--not { background: var(--ct-bg); color: var(--ct-ink-3); border-color: var(--ct-line); }
.lt-ct__qn--flag { background: var(--ct-amber); color: #fff; }
.lt-ct__qn--upl { background: var(--ct-blue); color: #fff; }
.lt-ct__qn--cur { outline: 2.5px solid var(--ct-ink); outline-offset: 1px; }
.lt-ct__legend { font-size: 11.5px; color: var(--ct-ink-2); }
.lt-ct__legend-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.lt-ct__sw { width: 13px; height: 13px; border-radius: 4px; flex: none; }
.lt-ct__sw--ans { background: var(--ct-green); }
.lt-ct__sw--not { background: var(--ct-bg); border: 1px solid var(--ct-line); }
.lt-ct__sw--flag { background: var(--ct-amber); }
.lt-ct__sw--upl { background: var(--ct-blue); }
@media (max-width: 720px) {
  .lt-ct__fsbody { flex-direction: column-reverse; }
  .lt-ct__nav { width: auto; border-left: 0; border-bottom: 1px solid var(--ct-line); }
  .lt-ct__qgrid { grid-template-columns: repeat(8, 1fr); }
  .lt-ct__legend { display: flex; gap: 14px; flex-wrap: wrap; }
  .lt-ct__legend-row { margin-bottom: 0; }
}

/* ── Pre-submit confirm ── */
.lt-ct__confirm { position: fixed; inset: 0; background: rgba(21,35,58,.5); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 1000; }
.lt-ct__confirm-box { background: #fff; border-radius: 16px; padding: 24px; max-width: 400px; width: 100%; }
.lt-ct__confirm-h { font-family: var(--ct-fd); font-size: 19px; margin-bottom: 8px; }
.lt-ct__confirm-p { font-size: 14px; color: var(--ct-ink-2); margin-bottom: 16px; line-height: 1.55; }
.lt-ct__confirm-warn { background: var(--ct-amber-t); color: #8a6516; font-size: 13px; padding: 10px 12px; border-radius: 10px; margin-bottom: 16px; }
.lt-ct__confirm-row { display: flex; gap: 10px; }
.lt-ct__confirm-row .lt-ct__btn { flex: 1; }

/* ── Upload panel (partial → full) ── */
.lt-ct__upload { max-width: 560px; margin: 0 auto; padding: 18px; }
.lt-ct__uploadcard { background: #fff; border: 1px solid var(--ct-line); border-radius: var(--ct-r); box-shadow: var(--ct-sh); padding: 22px; }
.lt-ct__file { display: none; }
.lt-ct__drop { width: 100%; border: 2px dashed var(--ct-green); background: var(--ct-green-t); border-radius: 12px; padding: 22px 16px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; font-family: var(--ct-fb); }
.lt-ct__dropt { font-size: 14px; font-weight: 700; color: var(--ct-green-d); }
.lt-ct__dropd { font-size: 11.5px; color: var(--ct-ink-2); line-height: 1.4; }
.lt-ct__filerow { display: flex; align-items: center; gap: 10px; border: 1px solid var(--ct-line); border-radius: 10px; padding: 11px 14px; background: var(--ct-bg); }
.lt-ct__filenm { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lt-ct__filex { flex: none; width: 24px; height: 24px; border-radius: 50%; border: none; background: rgba(0,0,0,.12); color: var(--ct-ink-2); cursor: pointer; font-size: 12px; }
.lt-ct__grade { width: 100%; margin-top: 12px; border: none; background: var(--ct-green); color: #fff; border-radius: 10px; padding: 13px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: var(--ct-fd); }
.lt-ct__grade:disabled { background: hsl(152, 25%, 72%); cursor: not-allowed; }
.lt-ct__err { margin-top: 10px; font-size: 12.5px; border-radius: 9px; padding: 9px 12px; background: hsl(0,75%,97%); border: 1px solid hsl(0,70%,88%); color: hsl(0,65%,38%); }
.lt-ct__tip { font-size: 11.5px; color: var(--ct-ink-3); margin: 10px 0 0; line-height: 1.5; }
`;
