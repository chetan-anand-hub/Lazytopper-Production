import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { trackWhatsAppContactTap } from "../../analytics/analytics";
import {
  WHATSAPP_FAB_LABEL,
  isOverlayOpen,
  shouldShowWhatsAppFab,
  whatsAppHref,
  whatsAppMessageFor,
} from "./whatsappContact";
import "./whatsAppFab.css";

/**
 * WA-CONTACT-1 — the floating "message the founder on WhatsApp" button.
 *
 * Mounted ONCE in App.tsx next to `<BottomNav />`; it decides for itself where it shows
 * (`shouldShowWhatsAppFab`, an allow-list of browse pages) and hides while any overlay is
 * open (`isOverlayOpen`), so it never sits on a scorecard, sheet or modal. Its z-index
 * (18, `whatsAppFab.css`) is below the mobile bottom nav (20), toasts (60) and modals.
 *
 * A plain `<a target="_blank">` to `wa.me`: works without JavaScript handlers, opens the
 * WhatsApp app on a phone and WhatsApp Web on a laptop.
 */

function useOverlayOpen(): boolean {
  const [open, setOpen] = useState(() => (typeof document === "undefined" ? false : isOverlayOpen(document)));
  useEffect(() => {
    if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;
    let frame = 0;
    const check = () => {
      frame = 0;
      setOpen(isOverlayOpen(document));
    };
    const schedule = () => {
      if (frame) return;
      frame = typeof requestAnimationFrame === "function" ? requestAnimationFrame(check) : (setTimeout(check, 16) as unknown as number);
    };
    // Overlays mount/unmount nodes or flip aria-modal / open anywhere in the tree;
    // the scroll-lock is an inline style on <body> itself.
    const tree = new MutationObserver(schedule);
    tree.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-modal", "open"] });
    const body = new MutationObserver(schedule);
    body.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    check();
    return () => {
      tree.disconnect();
      body.disconnect();
      if (frame && typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
    };
  }, []);
  return open;
}

function WhatsAppIcon() {
  return (
    <svg className="lt-wa-fab__icon" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 2.2A9.7 9.7 0 0 0 3.6 16.8L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.1-.2-.2-.5-.3Z"
      />
    </svg>
  );
}

export default function WhatsAppFab() {
  const { pathname } = useLocation();
  const overlayOpen = useOverlayOpen();
  if (overlayOpen || !shouldShowWhatsAppFab(pathname)) return null;
  const href = whatsAppHref(whatsAppMessageFor(pathname));
  return (
    <a
      className="lt-wa-fab"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={WHATSAPP_FAB_LABEL}
      title={WHATSAPP_FAB_LABEL}
      data-testid="whatsapp-fab"
      onClick={() => trackWhatsAppContactTap("fab")}
    >
      <WhatsAppIcon />
    </a>
  );
}
