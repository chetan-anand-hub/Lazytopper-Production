// src/components/navigation/ReturnTicket.tsx
//
// The RETURN-TICKET convention — one shared reader + one shared strip, so any surface
// a student is sent INTO can offer them a way back without re-implementing it.
//
// ── The convention (deliberately NOT a new param) ────────────────────────────
// `?returnTo=<internal path>` + optional `?backLabel=<text>`. These are already the
// app's de-facto convention (returnTo has 9 readers) and Quick Practice already honours
// both, so this module ADOPTS that convention rather than minting a rival one. In
// particular it does NOT reuse `source`: PracticePage reads `source` for its
// pyq/ncert/all question filter, and a second meaning on the same key is how the two
// disjoint `source` vocabularies in this codebase already came about.
//
// ── The rules (owner design) ─────────────────────────────────────────────────
//   · CONTEXTUAL BY CONSTRUCTION — no ticket, no change. C&I and Quick Practice are
//     first-class surfaces most students reach straight from the nav; a direct visit
//     must render EXACTLY as before. The ticket is purely additive.
//   · OFFER, NEVER AUTO (D-TUT-5) — returning is always the student's tap. Nothing
//     here navigates on its own.
//   · ONE HOP — the ticket is consumed on arrival and never propagated onward.
//   · SAFE REDIRECTS ALWAYS — a returnTo that isn't a plain internal path renders
//     NOTHING: no strip, no row. Never a broken or dangerous link.

import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { safeInternalReturnTo } from "../../pages/tutor/tutorPath";

export interface ReturnTicket {
  /** A validated, same-origin, relative in-app path. */
  path: string;
  /** What the back affordance says, e.g. "Back to your tutor". */
  label: string;
}

/** The generic fallback when a caller sends `returnTo` but no `backLabel`. Honest and
 *  destination-agnostic — we never guess WHERE they came from. */
const DEFAULT_LABEL = "Back";

/**
 * Read the return ticket off the current URL, or null when there isn't a valid one.
 *
 * Validation is delegated to the app's existing exported `safeInternalReturnTo` rather
 * than adding a ninth copy of the same guard — see [FU-SAFE-PATH-VALIDATOR-DUPLICATION]
 * for the consolidation of the eight that already exist. It rejects absolute URLs,
 * protocol-relative (`//evil.com`), and any scheme (`javascript:`).
 *
 * The value is decoded before validation (URLSearchParams.get already decodes once) and
 * NEVER decoded twice — a second pass would let `%252f%252fevil.com` through as
 * `//evil.com` after the check had already blessed it.
 */
export function useReturnTicket(): ReturnTicket | null {
  const [params] = useSearchParams();
  const rawReturnTo = params.get("returnTo");
  const rawLabel = params.get("backLabel");
  return useMemo(() => {
    const path = safeInternalReturnTo(rawReturnTo);
    if (!path) return null;
    const label = String(rawLabel || "").trim() || DEFAULT_LABEL;
    return { path, label };
  }, [rawReturnTo, rawLabel]);
}

/**
 * The contextual strip: one quiet line at the TOP of the destination with a back link.
 * Never a modal, never blocking — the student came here to work, and the work is the
 * point. Renders nothing without a ticket.
 */
export function ReturnTicketStrip({
  ticket,
  onNavigate,
}: {
  ticket: ReturnTicket | null;
  onNavigate: (path: string) => void;
}) {
  if (!ticket) return null;
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
        padding: "8px 12px", marginBottom: 12,
        borderRadius: 10, border: "1px solid hsl(220, 18%, 90%)",
        background: "hsl(220, 20%, 97%)",
      }}
    >
      <span style={{ fontSize: "0.75rem", color: "hsl(220, 15%, 42%)" }}>
        You can head back when you’re done.
      </span>
      <button
        type="button"
        onClick={() => onNavigate(ticket.path)}
        style={{
          background: "none", border: "none", padding: 0, cursor: "pointer",
          fontSize: "0.75rem", fontWeight: 600, color: "hsl(152, 55%, 35%)",
        }}
      >
        {ticket.label} →
      </button>
    </div>
  );
}
