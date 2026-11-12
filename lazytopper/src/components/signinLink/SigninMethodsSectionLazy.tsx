/** SigninMethodsSectionLazy - LINK-SIGNIN-1: Settings' lazy mount of "Ways to sign in" (kill switch checked before anything loads). */
import { Suspense } from "react";
import { lazyWithRetry } from "../../lib/lazyWithRetry";
import { Quiet } from "./Quiet";

const SigninMethodsSection = lazyWithRetry(() => import("./SigninMethodsSection"));

function killed(): boolean {
  try {
    return /^(1|true|on|yes)$/i.test(String(import.meta.env.VITE_SIGNIN_LINK_DISABLED ?? "").trim());
  } catch {
    return false;
  }
}

/** A failure here (chunk, auth) renders nothing: it must never close the whole Settings window. */
export default function SigninMethodsSectionLazy({ headingId }: { headingId?: string }) {
  if (killed()) return null;
  return (
    <Quiet>
      <Suspense fallback={null}>
        <SigninMethodsSection {...(headingId ? { headingId } : {})} />
      </Suspense>
    </Quiet>
  );
}
