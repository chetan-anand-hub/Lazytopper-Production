/**
 * SecondLoginPromptHost - SECOND-LOGIN-PROMPT-1. Tiny and always mounted (inside AuthProvider, beside SaveStatusToast): it only
 * listens for "a purchase just landed on this account" (PURCHASE_LANDED_EVENT) and, when the switch is on and this account has not
 * been asked yet, loads the prompt's own lazy chunk. Nothing else happens on any other path.
 */
import { lazy, Suspense, useEffect, useState } from "react";
import { PURCHASE_LANDED_EVENT, isSecondLoginPromptEnabled } from "../../services/secondLoginPrompt";

const SecondLoginPrompt = lazy(() => import("./SecondLoginPrompt"));

export default function SecondLoginPromptHost() {
  const [armed, setArmed] = useState(0);
  useEffect(() => {
    if (!isSecondLoginPromptEnabled()) return undefined;
    const onClaimed = (e: Event) => {
      const count = (e as CustomEvent<{ count?: number } | undefined>).detail?.count;
      if (typeof count === "number" && count > 0) setArmed((n) => n + 1);
    };
    window.addEventListener(PURCHASE_LANDED_EVENT, onClaimed);
    return () => window.removeEventListener(PURCHASE_LANDED_EVENT, onClaimed);
  }, []);
  if (armed === 0) return null;
  return (
    <Suspense fallback={null}>
      <SecondLoginPrompt />
    </Suspense>
  );
}
