/** SigninMethodsSectionLazy - LINK-SIGNIN-1: Settings' lazy mount of "Ways to sign in" (kill switch checked before anything loads). */
import { lazy, Suspense } from "react";

const SigninMethodsSection = lazy(() => import("./SigninMethodsSection"));

function killed(): boolean {
  try {
    return /^(1|true|on|yes)$/i.test(String(import.meta.env.VITE_SIGNIN_LINK_DISABLED ?? "").trim());
  } catch {
    return false;
  }
}

export default function SigninMethodsSectionLazy({ headingId }: { headingId?: string }) {
  if (killed()) return null;
  return (
    <Suspense fallback={null}>
      <SigninMethodsSection {...(headingId ? { headingId } : {})} />
    </Suspense>
  );
}
