import { lazy, Suspense, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { isBrowseCardDismissed, likelySignedIn, writeSignedInHint } from "./browseVisitorCardModel";
import "./browseVisitorCardSlot.css";

const loadCard = () => import("./BrowseVisitorCard");
const BrowseVisitorCard = lazy(loadCard);

/**
 * BROWSE-VISITOR-CARD-1 - the ONE mount point for /browse (phone MobileHome and desktop DesktopHome).
 * Never shows the CARD while auth is loading or for any signed-in user, or once the visitor has dismissed it this session; the
 * card itself is a separate lazy chunk.
 *
 * PREEXIST-FIX-1 (7 Nov 2026): while auth loads for a LIKELY visitor (no sign-in hint, no Firebase storage record), an empty
 * slot of the card's measured height holds its place (and its chunk starts loading), so the card lands without pushing the page
 * down (CLS ~0.23 at 360 px before). A likely signed-in device gets nothing while loading, as before.
 */
export default function BrowseVisitorCardMount() {
  const { user, loading } = useAuth();
  const dismissed = isBrowseCardDismissed();
  const holdSlot = loading && !dismissed && !likelySignedIn();

  useEffect(() => {
    if (!loading) writeSignedInHint(Boolean(user));
  }, [loading, user]);
  useEffect(() => {
    if (holdSlot) void loadCard().catch(() => undefined);
  }, [holdSlot]);

  if (holdSlot) return <div className="lt-bvc-slot" aria-hidden="true" data-testid="browse-visitor-card-slot" />;
  if (loading || user) return null;
  if (dismissed) return null;
  return (
    <Suspense fallback={<div className="lt-bvc-slot" aria-hidden="true" data-testid="browse-visitor-card-slot" />}>
      <BrowseVisitorCard />
    </Suspense>
  );
}
