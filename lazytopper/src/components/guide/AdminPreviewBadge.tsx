import { useState } from "react";
import { guidePreviewActive } from "./guideVariant";

/**
 * PREVIEW-BADGE-1 — the same "Admin preview" pill Byte's panel and Ziggy's strip carry (guide.css
 * `.lt-guide__admin`, PREVIEW-1), for the EAGER onboarding surfaces that are not drawn by the guide
 * chunk (the plain Start-here card and its focus view, the Home "First session" card). It renders only
 * while the owner's per-browser admin preview is on - no student ever sees it - and changes nothing else.
 * The CSS is inlined here (like those cards' own) so no lazy chunk is pulled in just for a pill.
 */
const ADMIN_BADGE_CSS = `
  .lt-admin-badge { display: inline-block; margin: 0 0 8px; font-size: 10.5px; font-weight: 800; letter-spacing: .06em;
    text-transform: uppercase; line-height: 1; padding: 5px 8px; border-radius: 999px; background: #14213d; color: #fff;
    white-space: nowrap; pointer-events: none; border: 1px solid rgba(255,255,255,.28); }
`;

export default function AdminPreviewBadge() {
  const [preview] = useState(() => guidePreviewActive());
  if (!preview) return null;
  return (
    <>
      <style>{ADMIN_BADGE_CSS}</style>
      <span className="lt-admin-badge" data-testid="guide-admin-preview">
        Admin preview
      </span>
    </>
  );
}
