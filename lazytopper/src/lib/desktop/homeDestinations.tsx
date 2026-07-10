import type { ReactElement } from "react";

/**
 * homeDestinations — the single, firebase-free source of truth for the Home
 * cockpit's four primary destinations and the reason-aware login-URL helper.
 *
 * Extracted from DesktopHome so the mobile Home variant (MobileHome) reuses the
 * EXACT same routes, labels, and login contract without importing DesktopHome
 * (which pulls firebase via the mistake-log service). This module has zero data
 * or firebase dependencies — only presentational icons + route constants — so it
 * is safe to import from both the desktop and mobile Home layouts and from tests.
 *
 * The render output is identical to DesktopHome's previous inline definitions.
 */

// Source attribution param appended to same-app navigation from Home.
const HOME_QS_LEAD = "?source=home&returnTo=%2F";

type IconProps = { size?: number };

function LayersIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
function ClipboardListIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
    </svg>
  );
}
function TrendingUpIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
function ClipboardCheckIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

export type IconCmp = (props: IconProps) => ReactElement;

export interface QuickCard {
  to: string;
  icon: IconCmp;
  label: string;
  sub: string;
}

// ── REASON-AWARE LOGIN URL HELPER (PR-LANDING contract) ─────────
export function loginUrl(reason: string, redirect: string): string {
  const p = new URLSearchParams();
  p.set("reason", reason);
  p.set("redirect", redirect);
  return `/login?${p.toString()}`;
}

// ── PRIMARY ACTION CARDS (4) ────────────────────────────────────
export const PRIMARY_CARDS: QuickCard[] = [
  { to: `/exam-trends${HOME_QS_LEAD}`, icon: TrendingUpIcon,
    label: "Exam Trends", sub: "Tier-ranked topics with one-click actions." },
  { to: `/practice-hub${HOME_QS_LEAD}`, icon: LayersIcon,
    label: "Practice", sub: "Quick practice or full mock." },
  // D1 (FIX-1) — the Home Worksheets card lands on the Practice hub, where the student
  // picks subject + topic; the hub's worksheet action then opens the builder autofiltered
  // (subject/topics in the URL). The builder never invents a topic, so this card must NOT
  // deep-link straight into the builder without a chosen topic (it would redirect to the
  // hub anyway). Destination change only — Home keeps its existing design.
  { to: `/practice-hub${HOME_QS_LEAD}`, icon: ClipboardListIcon,
    label: "Worksheets", sub: "Build a worksheet by topic or subject." },
  { to: `/check-improve${HOME_QS_LEAD}`, icon: ClipboardCheckIcon,
    label: "Check & Improve", sub: "Get feedback on your answer." },
];
