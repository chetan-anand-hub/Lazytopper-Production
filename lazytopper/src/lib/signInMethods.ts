import type { AuthUser } from "../context/AuthContext";

/**
 * Pure predicates over a student's linked sign-in methods.
 *
 * ★ THESE LIVE OUTSIDE `AuthContext` ON PURPOSE, AND THE LOCATION IS
 * LOAD-BEARING — it is not tidiness.
 *
 * Sixteen test files mock `../context/AuthContext` with an explicit `vi.mock`
 * factory that returns only the members they use. Vitest does not merely leave
 * an unlisted export undefined — it THROWS:
 *
 *   [vitest] No "hasPhoneLinked" export is defined on the
 *   "../../context/AuthContext" mock. Did you forget to return it from "vi.mock"?
 *
 * So exporting this helper from `AuthContext` broke every DesktopShell and
 * account-menu suite the moment a component imported it, in files that have
 * nothing to do with linking. Putting it in its own module means mocking the
 * context can never remove it, and no partial mock needs updating.
 *
 * The AuthUser TYPE is still imported from the context — `import type` is
 * erased at build time, so it creates no runtime edge and no mock requirement.
 */

/** Firebase's provider id for a phone credential. */
export const PHONE_PROVIDER_ID = "phone";

/**
 * Is a phone credential linked to this account?
 *
 * Reads the linked CREDENTIALS (`providerIds`), never the profile fields. A
 * Google account can carry a `phoneNumber` with no phone credential linked, and
 * a phone account can carry an `email`; inferring from either gets it wrong in
 * both directions.
 */
export function hasPhoneLinked(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.providerIds?.includes(PHONE_PROVIDER_ID));
}
