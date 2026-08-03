import { AuthDoor } from "./Login";

/**
 * `/sign-up` — the SAME door as `/login`, entered with create framing.
 *
 * ── WHY THIS FILE STILL EXISTS ────────────────────────────────────────────
 * The route is not changed and the file is not deleted. `src/App.tsx` is pinned
 * to a ZERO DIFF by two ops gates — `check_improve_overlay_additive_acceptance`
 * and `quick_practice_overlay_additive_acceptance` — and each keeps its own
 * FORBIDDEN array, so re-pointing the route would need an amendment to BOTH,
 * which is its own reviewed PR and an owner decision.
 *
 * Leaving the route alone costs nothing and buys everything: `/app/sign-up`
 * keeps working for every bookmark, every external link and every gate
 * redirect, and the tabs are gone from both URLs either way.
 *
 * ── WHAT `intent="create"` ACTUALLY CHANGES ───────────────────────────────
 * Only the framing copy and ONE field: the create door still collects the
 * student's NAME. That is deliberate and load-bearing — `signUpWithEmailPassword`
 * holds the only `updateProfile` call in product code, so this form is the sole
 * place a `displayName` is ever captured. See [FU-AUTH-NAME-PROMPT].
 *
 * ⚠ The reCAPTCHA container id is DISTINCT from Login's, and must stay so. The
 * verifier is bound to one DOM element; `AuthContext.initPhoneRecaptcha` reuses
 * it when the requested id matches and is still in the document, so a shared id
 * would let a navigation satisfy both checks while the widget was bound to the
 * old, detached element.
 */
export default function SignUpPage() {
  return <AuthDoor intent="create" recaptchaContainerId="lt-signup-recaptcha" />;
}
