import { lazy, Suspense } from "react";
import { useAuth } from "../../context/AuthContext";
import { isBrowseCardDismissed } from "./browseVisitorCardModel";

const BrowseVisitorCard = lazy(() => import("./BrowseVisitorCard"));

/**
 * BROWSE-VISITOR-CARD-1 - the ONE mount point for /browse (phone MobileHome and desktop DesktopHome).
 * Renders and LOADS nothing while auth is loading (so no flash), for any signed-in user, or once the visitor has
 * dismissed the card this session; the card itself is a separate lazy chunk.
 */
export default function BrowseVisitorCardMount() {
  const { user, loading } = useAuth();
  if (loading || user) return null;
  if (isBrowseCardDismissed()) return null;
  return (
    <Suspense fallback={null}>
      <BrowseVisitorCard />
    </Suspense>
  );
}
