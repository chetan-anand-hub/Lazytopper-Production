// src/components/home/pendingPapersUi.ts
//
// HOME-PENDING-1 — the non-component pieces the pending strip, list and bell share (kept out of
// the .tsx files so each of those exports components only).

export const PENDING_LIST_MAX_ROWS = 3;

export function formatSavedDay(ms: number): string | null {
  if (!ms || !Number.isFinite(ms)) return null;
  try {
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return null;
  }
}

export function papersWaitingLabel(count: number): string {
  return `${count} paper${count === 1 ? "" : "s"} waiting for your answers`;
}

/** Shared CSS for the strip, the list and the bell (class names only, §7: no inline styles). */
export const PENDING_CSS = `
  .lt-pstrip, .lt-pstrip *, .lt-pbell, .lt-pbell * { box-sizing: border-box; }
  .lt-pstrip { background: hsl(38, 90%, 96%); border: 1px solid hsl(38, 70%, 80%); border-radius: 14px;
    padding: 6px 8px 6px 12px; min-width: 0; max-width: 100%; }
  .lt-pstrip--spaced { margin-top: 13px; }
  .lt-pstrip-row { display: flex; align-items: center; gap: 10px; min-width: 0; flex-wrap: wrap; }
  .lt-pstrip-ic { flex: 0 0 auto; width: 30px; height: 30px; border-radius: 9px; background: #fff;
    color: hsl(38, 70%, 34%); display: grid; place-items: center; }
  .lt-pstrip-txt { flex: 1 1 220px; min-width: 0; padding: 6px 0; }
  .lt-pstrip-h { display: block; font-size: 13.5px; font-weight: 750; color: hsl(222, 47%, 16%); }
  .lt-pstrip-sub { display: block; font-size: 12px; color: hsl(220, 15%, 40%); margin-top: 1px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lt-pstrip-code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-weight: 700;
    color: hsl(222, 47%, 24%); }
  .lt-pstrip-acts { display: flex; align-items: center; gap: 6px; flex: 0 0 auto; }
  .lt-pstrip-go, .lt-pl-go { display: inline-flex; align-items: center; justify-content: center;
    min-height: 44px; min-width: 44px; padding: 0 14px; border-radius: 10px; background: hsl(152, 55%, 38%);
    color: #fff; text-decoration: none; font-size: 12.5px; font-weight: 700; white-space: nowrap; }
  .lt-pstrip-go:hover, .lt-pl-go:hover { background: hsl(152, 57%, 33%); }
  .lt-pstrip-more { display: inline-flex; align-items: center; justify-content: center; min-height: 44px;
    min-width: 44px; padding: 0 10px; border-radius: 10px; border: 1px solid hsl(38, 60%, 78%);
    background: #fff; color: hsl(222, 47%, 24%); font: inherit; font-size: 12px; font-weight: 700;
    cursor: pointer; gap: 4px; }
  .lt-pstrip-more svg { transition: transform 150ms ease; }
  .lt-pstrip-more[aria-expanded="true"] svg { transform: rotate(180deg); }
  .lt-pstrip-go:focus-visible, .lt-pstrip-more:focus-visible, .lt-pl-go:focus-visible, .lt-pl-all:focus-visible,
  .lt-pbell-btn:focus-visible { outline: 2px solid hsl(222, 47%, 24%); outline-offset: 2px; }
  .lt-pstrip .lt-pl { margin-top: 4px; border-top: 1px solid hsl(38, 60%, 85%); }
  .lt-pl-list { list-style: none; margin: 0; padding: 0; }
  .lt-pl-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; min-width: 0; }
  .lt-pl-row + .lt-pl-row { border-top: 1px solid hsl(215, 25%, 91%); }
  .lt-pl-main { flex: 1; min-width: 0; }
  .lt-pl-code { display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; font-weight: 700;
    color: hsl(222, 47%, 24%); background: hsl(222, 45%, 95%); border-radius: 6px; padding: 2px 6px; }
  .lt-pl-title { display: block; font-size: 13px; font-weight: 700; color: hsl(220, 45%, 14%); margin-top: 3px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lt-pl-meta { display: block; font-size: 11.5px; color: hsl(220, 15%, 42%); margin-top: 1px; }
  .lt-pl-all { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 44px;
    border: 0; border-top: 1px solid hsl(215, 25%, 91%); background: transparent; color: hsl(222, 47%, 24%);
    font: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; }
  .lt-pbell { position: relative; display: inline-flex; }
  .lt-pbell-btn { position: relative; width: 44px; height: 44px; display: grid; place-items: center;
    border-radius: 10px; background: transparent; border: none; color: hsl(220, 15%, 45%); cursor: pointer; padding: 0; }
  .lt-pbell-btn:hover { background: hsl(215, 25%, 95%); }
  .lt-pbell-badge { position: absolute; top: 5px; right: 4px; min-width: 18px; height: 18px; padding: 0 5px;
    border-radius: 999px; background: hsl(0, 72%, 48%); color: #fff; font-size: 10.5px; font-weight: 800;
    line-height: 18px; text-align: center; box-shadow: 0 0 0 2px #fff; }
  .lt-pbell-pop { position: absolute; top: calc(100% + 6px); right: 0; z-index: 50;
    width: min(340px, calc(100vw - 24px)); max-height: min(70vh, 460px); overflow-y: auto;
    background: #fff; border: 1px solid hsl(215, 25%, 88%); border-radius: 14px; padding: 12px 14px 6px;
    box-shadow: 0 16px 36px -12px hsla(222, 40%, 20%, 0.30); text-align: left; }
  .lt-pbell-h { margin: 0 0 4px; font-size: 13.5px; font-weight: 750; color: hsl(222, 47%, 16%); }
  .lt-pbell-empty { margin: 0 0 8px; font-size: 12.5px; color: hsl(220, 15%, 42%); }
  @media (max-width: 480px) {
    /* 390 / 360 px: the bell sits near the bar's right edge, so an absolutely placed 340 px
       popover overflowed to the left. Pin it to the viewport under the brand bar instead. */
    .lt-pbell-pop { position: fixed; left: 12px; right: 12px; top: 58px; width: auto;
      max-height: calc(100vh - 70px); overflow-y: auto; }
    .lt-pstrip { padding: 8px 10px; }
    .lt-pstrip-acts { flex: 1 1 100%; }
    .lt-pstrip-go { flex: 1; }
    .lt-pl-row { flex-wrap: wrap; gap: 6px; }
    .lt-pl-main { flex-basis: 100%; }
    .lt-pl-go { width: 100%; }
  }
`;
