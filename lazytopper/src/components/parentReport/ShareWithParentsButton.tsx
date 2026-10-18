import { Suspense, lazy, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../context/AuthContext";
import type { ParentReportPlacement } from "../../analytics/analytics";

/**
 * PARENT-REPORT-1 — "Share with parents". Mounted on Me/Progress, on Home (desktop and mobile)
 * and after a graded Check & Improve scorecard. It renders NOTHING unless a real signed-in
 * account is present (no local / browse session: there is no synced data to report), and the
 * sheet — the read, the card, html-to-image — is imported only on the tap.
 */
const ParentReportModal = lazy(() => import("./ParentReportModal"));

export const SHARE_WITH_PARENTS_LABEL = "Share with parents";
export const CHECK_IMPROVE_PARENTS_LABEL = "Show my parents where I lose marks";

/** The signed-in user, or null outside an AuthProvider (a host rendered alone, e.g. in a test):
 *  useAuth throws AFTER its one useContext call, so catching keeps the hook order fixed. */
function useOptionalUser() {
  try {
    return useAuth().user;
  } catch {
    return null;
  }
}

export default function ShareWithParentsButton({
  placement,
  label = SHARE_WITH_PARENTS_LABEL,
}: {
  placement: ParentReportPlacement;
  label?: string;
}) {
  const user = useOptionalUser();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const uid = user && !user.isLocalSession ? user.uid : null;
  if (!uid) return null;

  return (
    <div className="lt-swp">
      <style>{SWP_CSS}</style>
      <button
        type="button"
        className="lt-swp__btn"
        onClick={() => setOpen(true)}
        data-testid={`share-with-parents-${placement}`}
      >
        <svg className="lt-swp__ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05A4.22 4.22 0 0 1 17 16.5V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z" />
        </svg>
        {label}
      </button>
      {/* Portalled to <body>: a host may be a fixed, transformed overlay (the scorecard). */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <Suspense fallback={null}>
            <ParentReportModal uid={uid} displayName={user?.displayName ?? null} placement={placement} onClose={close} />
          </Suspense>,
          document.body,
        )}
    </div>
  );
}

const SWP_CSS = `
.lt-swp { margin: 0; }
.lt-swp__btn {
  display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
  font-family: "Inter", ui-sans-serif, system-ui, sans-serif; font-weight: 700; font-size: 13px;
  padding: 9px 15px; border-radius: 999px; color: hsl(152, 55%, 28%);
  background: hsla(152, 55%, 45%, 0.10); border: 1.5px solid hsl(152, 55%, 42%);
}
.lt-swp__btn:hover { background: hsla(152, 55%, 45%, 0.18); }
.lt-swp__ic { width: 16px; height: 16px; fill: currentColor; flex-shrink: 0; }
.lt-sc__card .lt-swp { margin: 0 0 22px; }
@media (max-width: 1023px) {
  .lt-sc__card .lt-swp__btn { width: 100%; justify-content: center; padding: 12px 16px; }
}
`;
