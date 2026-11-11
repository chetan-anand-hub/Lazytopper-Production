/** URGENCY-1 v2 stylesheet as a string rendered in a <style> inside the slot: /pricing and /packs are prerendered and their route CSS is not inlined, so a .css import would arrive after the static body paints (layout shift). */
export const BOARDS_COUNTDOWN_CSS = `
/* URGENCY-1 v2: navy card, amber figures. Slot height is reserved so the static HTML and the client render match. */
.lt-boards-slot { min-height: 96px; margin: 12px 0; }
@media (min-width: 768px) { .lt-boards-slot { min-height: 104px; } }
@media (min-width: 1024px) { .lt-boards-slot { min-height: 84px; } }
.lt-boards-strip { box-sizing: border-box; display: flex; align-items: center; gap: 14px; width: 100%; min-height: 96px; padding: 12px 16px; border-radius: 14px; background: #15233a; border: 1px solid rgba(245, 158, 11, 0.45); color: #fff; font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif; text-align: left; }
@media (min-width: 768px) { .lt-boards-strip { min-height: 104px; padding: 14px 20px; gap: 18px; } }
@media (min-width: 1024px) { .lt-boards-strip { min-height: 84px; gap: 20px; } }
.lt-boards-strip__count { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; min-width: 84px; }
@media (min-width: 1024px) { .lt-boards-strip__count { padding-right: 20px; border-right: 1px solid rgba(245, 158, 11, 0.45); } }
.lt-boards-strip__num { font-family: Fraunces, Georgia, serif; font-weight: 700; font-size: 34px; line-height: 1.05; color: #f59e0b; font-variant-numeric: tabular-nums; }
@media (min-width: 768px) { .lt-boards-strip__num { font-size: 40px; } }
.lt-boards-strip__lbl { margin-top: 2px; font-weight: 700; font-size: 11px; letter-spacing: 0.08em; line-height: 1.2; color: rgba(245, 158, 11, 0.85); text-transform: uppercase; white-space: nowrap; }
.lt-boards-strip__txt { min-width: 0; flex: 1 1 auto; }
.lt-boards-strip__txt p { margin: 0; overflow-wrap: anywhere; }
.lt-boards-strip__l1 { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 15px; line-height: 1.3; color: #fff; }
@media (min-width: 768px) { .lt-boards-strip__l1 { font-size: 16px; } }
.lt-boards-strip__l2 { margin-top: 3px; font-weight: 500; font-size: 13px; line-height: 1.4; color: rgba(255, 255, 255, 0.8); }
@media (min-width: 768px) { .lt-boards-strip__l2 { font-size: 14px; } }
.lt-boards-strip__dot { flex: 0 0 auto; width: 8px; height: 8px; border-radius: 50%; background: #f59e0b; }
@media (prefers-reduced-motion: no-preference) { .lt-boards-strip__dot { animation: lt-boards-pulse 2s ease-in-out infinite; } }
@keyframes lt-boards-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
.lt-boards-note { margin: 6px 0 0; font-size: 13px; font-weight: 600; line-height: 1.4; text-align: center; color: #0f2547; overflow-wrap: anywhere; }
.lt-boards-note--dark { color: #1a1a2e; }
`;
