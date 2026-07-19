// src/components/practice/quickPracticeEntryStyles.ts
//
// The ONE scoped stylesheet for the Quick Practice progressive-disclosure entry
// (owner-approved prototype v4: LazyTopper_QuickPractice_A1_prototype_v4.0). Injected
// once by PracticePage via <style>{QP_ENTRY_CSS}</style>; the preset picker
// (QuickPracticePresets) and the runner clock style through these classes — NO inline
// style={{}} objects (§7). Self-contained light-theme tokens (product green
// hsl(152,55%,45%), deep-navy ink, Fraunces + Inter) so the entry renders the locked
// cockpit grammar on PracticePage's existing light surface.
//
// PRESENTATION-ONLY. Nothing here touches the reshuffle engine, the five-dimension
// filter wiring, persistQuickPracticeSession, the grader or MI — the presets are a
// bundle of the existing setCommitted* setters (see PracticePage.applyPreset) and this
// file only dresses that entry. ONE responsive component — the desktop 2-col grid
// becomes a mobile swipe carousel in PURE CSS (@media 640px + scroll-snap), no
// useIsDesktop, no JS width branch (matching the prototype's carousel).

export const QP_ENTRY_CSS = `
.qp-entry {
  --qp-green: hsl(152, 55%, 45%);
  --qp-green-d: hsl(152, 55%, 35%);
  --qp-green-fg: hsl(152, 55%, 26%);
  --qp-green-tint: hsl(152, 55%, 95%);
  --qp-green-line: hsl(152, 50%, 82%);
  --qp-ink: hsl(220, 25%, 12%);
  --qp-muted: hsl(220, 15%, 42%);
  --qp-border: hsl(220, 18%, 88%);
  --qp-page: hsl(220, 20%, 97%);
  --qp-amber: hsl(35, 80%, 55%);
  --qp-amber-tint: hsl(38, 90%, 94%);
  --qp-violet: hsl(255, 50%, 60%);
  --qp-violet-tint: hsl(255, 60%, 96%);
  --qp-sky: hsl(205, 70%, 55%);
  --qp-sky-tint: hsl(205, 70%, 95%);
  --qp-rose: hsl(340, 65%, 60%);
  --qp-rose-tint: hsl(340, 70%, 96%);
  --qp-display: "Fraunces", Georgia, serif;
  --qp-sans: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  margin-bottom: 18px;
}
.qp-entry * { box-sizing: border-box; }

.qp-entry .qp-eyebrow {
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--qp-green-fg);
  font-weight: 700;
}
.qp-entry .qp-title {
  font-family: var(--qp-display);
  font-weight: 600;
  font-size: clamp(21px, 3vw, 28px);
  letter-spacing: -0.01em;
  color: var(--qp-ink);
  margin: 4px 0;
}
.qp-entry .qp-lede {
  font-size: 0.82rem;
  color: var(--qp-muted);
  line-height: 1.5;
  margin-bottom: 18px;
  max-width: 62ch;
}

/* --- preset grid --- */
.qp-entry .qp-presets {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.qp-entry .qp-preset {
  position: relative;
  text-align: left;
  width: 100%;
  background: #fff;
  border: 1px solid var(--qp-border);
  border-radius: 16px;
  padding: 18px 18px 16px;
  cursor: pointer;
  overflow: hidden;
  font-family: var(--qp-sans);
  transition: transform .16s ease, border-color .16s, box-shadow .16s;
}
.qp-entry .qp-preset::before {
  content: "";
  position: absolute;
  top: 0; left: 0;
  width: 4px; height: 100%;
  background: var(--qp-accent, var(--qp-green));
  opacity: 0.85;
}
.qp-entry .qp-preset:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(20, 40, 80, 0.09);
  border-color: var(--qp-accent, var(--qp-green-line));
}
.qp-entry .qp-preset:focus-visible {
  outline: 2px solid var(--qp-accent, var(--qp-green));
  outline-offset: 2px;
}
.qp-entry .qp-preset.sel {
  border-color: var(--qp-accent, var(--qp-green));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--qp-accent, var(--qp-green)) 16%, transparent), 0 8px 22px rgba(20, 40, 80, 0.08);
}
.qp-entry .qp-p-top {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 9px;
}
.qp-entry .qp-p-ic {
  width: 38px; height: 38px;
  border-radius: 11px;
  background: var(--qp-accent-tint, var(--qp-green-tint));
  color: var(--qp-accent, var(--qp-green-d));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  flex: 0 0 auto;
}
.qp-entry .qp-p-name {
  font-family: var(--qp-display);
  font-size: 17px;
  font-weight: 600;
  color: var(--qp-ink);
}
.qp-entry .qp-p-desc {
  font-size: 0.78rem;
  color: var(--qp-muted);
  line-height: 1.5;
  margin: 0;
}
.qp-entry .qp-p-meta {
  margin-top: 11px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.qp-entry .qp-chip {
  font-size: 0.64rem;
  font-weight: 500;
  padding: 4px 9px;
  border-radius: 7px;
  background: var(--qp-page);
  color: var(--qp-muted);
  border: 1px solid var(--qp-border);
  white-space: nowrap;
}
.qp-entry .qp-chip.a {
  background: var(--qp-accent-tint, var(--qp-green-tint));
  color: var(--qp-accent-fg, var(--qp-green-fg));
  border-color: transparent;
}
.qp-entry .qp-cbse {
  margin-top: 10px;
  font-size: 0.64rem;
  color: var(--qp-accent-fg, var(--qp-green-fg));
  font-style: italic;
  line-height: 1.45;
  opacity: 0.92;
}
.qp-entry .qp-sel-check {
  position: absolute;
  top: 14px; right: 14px;
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--qp-accent, var(--qp-green));
  color: #fff;
  display: none;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  line-height: 1;
}
.qp-entry .qp-preset.sel .qp-sel-check { display: flex; }

/* per-preset accent */
.qp-entry .qp-preset.qp-quick { --qp-accent: var(--qp-amber); --qp-accent-tint: var(--qp-amber-tint); --qp-accent-fg: hsl(35, 70%, 34%); }
.qp-entry .qp-preset.qp-board { --qp-accent: var(--qp-green); --qp-accent-tint: var(--qp-green-tint); --qp-accent-fg: var(--qp-green-fg); }
.qp-entry .qp-preset.qp-comp  { --qp-accent: var(--qp-violet); --qp-accent-tint: var(--qp-violet-tint); --qp-accent-fg: hsl(255, 45%, 45%); }
.qp-entry .qp-preset.qp-high  { --qp-accent: var(--qp-rose); --qp-accent-tint: var(--qp-rose-tint); --qp-accent-fg: hsl(340, 55%, 42%); }

/* gated (disabled) preset — dashed + striped, non-interactive */
.qp-entry .qp-preset.gated {
  cursor: not-allowed;
  opacity: 0.72;
  border-style: dashed;
  background: repeating-linear-gradient(135deg, #fff, #fff 9px, hsl(220, 20%, 98.5%) 9px, hsl(220, 20%, 98.5%) 18px);
  --qp-accent: var(--qp-sky);
  --qp-accent-tint: var(--qp-sky-tint);
  --qp-accent-fg: hsl(205, 55%, 38%);
}
.qp-entry .qp-preset.gated:hover { transform: none; box-shadow: none; }
.qp-entry .qp-soon-tag {
  position: absolute;
  top: 14px; right: 14px;
  font-size: 0.56rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--qp-accent-fg, var(--qp-sky));
  background: var(--qp-accent-tint, var(--qp-sky-tint));
  padding: 3px 8px;
  border-radius: 6px;
}

/* --- mobile swipe carousel (PURE CSS, no useIsDesktop) --- */
.qp-entry .qp-dots { display: none; justify-content: center; gap: 6px; margin-top: 10px; }
.qp-entry .qp-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--qp-border); transition: background .2s, width .2s; }
.qp-entry .qp-dot.on { background: var(--qp-green); width: 16px; border-radius: 3px; }
.qp-entry .qp-swipe-hint { display: none; text-align: center; font-size: 0.68rem; color: var(--qp-muted); margin-top: 8px; }

@media (max-width: 640px) {
  .qp-entry .qp-presets {
    display: flex;
    grid-template-columns: none;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    gap: 12px;
    padding: 2px 2px 4px;
    margin: 0 -4px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .qp-entry .qp-presets::-webkit-scrollbar { height: 0; }
  .qp-entry .qp-preset { scroll-snap-align: center; flex: 0 0 84%; }
  .qp-entry .qp-dots { display: flex; }
  .qp-entry .qp-swipe-hint { display: block; }
}

/* --- option row: Customise + Timer --- */
.qp-entry .qp-optrow {
  margin-top: 18px;
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.qp-entry .qp-customise,
.qp-entry .qp-timer-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid var(--qp-border);
  border-radius: 10px;
  padding: 10px 15px;
  font-size: 0.78rem;
  font-family: var(--qp-sans);
  color: var(--qp-ink);
  cursor: pointer;
  transition: border-color .15s;
}
.qp-entry .qp-customise:hover,
.qp-entry .qp-timer-toggle:hover { border-color: var(--qp-green-line); }
.qp-entry .qp-customise .qp-cv { color: var(--qp-muted); }
.qp-entry .qp-switch {
  width: 36px; height: 20px;
  border-radius: 20px;
  background: var(--qp-border);
  position: relative;
  transition: background .2s;
  flex: 0 0 auto;
}
.qp-entry .qp-switch.on { background: var(--qp-green); }
.qp-entry .qp-switch::after {
  content: "";
  position: absolute;
  top: 2px; left: 2px;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform .2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
.qp-entry .qp-switch.on::after { transform: translateX(16px); }
.qp-entry .qp-timer-muted { color: var(--qp-muted); }

/* --- start CTA --- */
.qp-entry .qp-start {
  margin-top: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.qp-entry .qp-start-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, var(--qp-green), var(--qp-green-d));
  color: #fff;
  border: none;
  font-family: var(--qp-sans);
  font-size: 0.9rem;
  font-weight: 700;
  padding: 13px 24px;
  border-radius: 11px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(30, 160, 90, 0.3);
  transition: transform .14s, box-shadow .14s;
}
.qp-entry .qp-start-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(30, 160, 90, 0.36); }
.qp-entry .qp-start-note { font-size: 0.78rem; color: var(--qp-muted); }

/* --- custom-mode top row: back link + the (shared) timer toggle --- */
.qp-entry .qp-custom-toprow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.qp-entry .qp-back-picks {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--qp-green-fg);
  font-family: var(--qp-sans);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}
.qp-entry .qp-back-picks:hover { text-decoration: underline; text-underline-offset: 2px; }

/* --- runner countdown clock (rendered by PracticePage, outside the picker) --- */
.qp-run-clock {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: "Inter", ui-sans-serif, system-ui, sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  color: hsl(152, 55%, 26%);
  background: hsl(152, 55%, 95%);
  border: 1px solid hsl(152, 55%, 80%);
  border-radius: 999px;
  padding: 5px 12px;
  white-space: nowrap;
}
.qp-run-clock.low {
  color: hsl(0, 65%, 42%);
  background: hsl(0, 78%, 96%);
  border-color: hsl(0, 70%, 85%);
}
`;
