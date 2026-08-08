/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  linkWithPhoneNumber,
  type User as FirebaseUser,
  type ConfirmationResult,
} from "firebase/auth";
import {
  hydrateLocalProgressFromCloud,
  ensureLearnerProgressBaseline,
  setActiveProgressUser,
} from "../services/studentProgressStore";
import { ensureLearnerCloudBaseline } from "../services/studentCloudStore";
import { hydrateSubscriptionFromCloud } from "../services/subscriptionService";
import { hydrateMistakeLogsFromCloud } from "../services/mistakeLogService";
import { authClient, firebaseConfigured } from "../services/firebaseClient";
import { restoreFromDB } from "../services/dbSyncService";

export type AuthUser = {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  /**
   * Which sign-in methods are linked to THIS uid, e.g. ["google.com", "phone"].
   *
   * Derived from `FirebaseUser.providerData`, not the raw array: `AuthUser` is
   * serialised to localStorage for the local dev session, so it has to stay
   * plain JSON. Provider ids are the only part any surface needs.
   *
   * ★ READ THIS, never infer from `email`/`phoneNumber`. Those reflect the
   * PROFILE, not the credentials: a phone-linked account can carry an email
   * from Google, and a Google account can have a null phoneNumber while a phone
   * credential is linked. Inferring gets both directions wrong.
   */
  providerIds: string[];
  /**
   * Whether Firebase considers this account's email address proven.
   *
   * ★ OPTIONAL ON PURPOSE, and the optionality is load-bearing in two places.
   *
   * 1. `AuthUser` is serialised to localStorage for the local dev session, so a
   *    session written before this field existed reads back `undefined`.
   * 2. Twenty-five test files replace this module with a `vi.mock` factory that
   *    hand-builds a user; none of them know about this field.
   *
   * Every consumer must therefore treat `undefined` as UNKNOWN and must not act
   * as though it were `false` — see `needsEmailVerification` in Login.tsx, which
   * tests `!== false` rather than `=== true` for exactly this reason. The real
   * path always populates it, because `mapFirebaseUser` always does.
   *
   * ★ Adding it here rather than as a context key is also deliberate:
   * `AuthContext.passwordReset.test.tsx` pins the context key set by EXACT
   * EQUALITY and would go red on any addition, and all 25 mock factories are
   * FULL replacements. A field on the user object changes neither.
   */
  emailVerified?: boolean;
  isLocalSession?: boolean;
};

export type PhoneRecaptchaStatus = "idle" | "ready" | "solved" | "expired" | "error";

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  firebaseReady: boolean;
  phoneRecaptchaStatus: PhoneRecaptchaStatus;
  mistakeLogsHydrated: number;
  getToken: () => Promise<string | null>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<void>;
  signUpWithEmailPassword: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  initPhoneRecaptcha: (recaptchaContainerId: string) => Promise<void>;
  sendPhoneOtp: (phoneE164: string, recaptchaContainerId: string) => Promise<void>;
  /**
   * ★ `displayName` is a PARAMETER, not a new context key, and the distinction
   * is what makes this safe. `AuthContext.passwordReset.test.tsx` pins the
   * context key set by EXACT EQUALITY, and ~25 suites replace this module with
   * a `vi.mock` factory that is a FULL replacement. An extra argument leaves
   * `Object.keys(ctx)` identical and a `vi.fn()` does not care how many
   * arguments it receives — an extra KEY or export fails both.
   *
   * Same seam `signUpWithEmailPassword(email, password, displayName?)` already
   * occupies. Optional, because the RETURNING phone branch has no name to give.
   */
  verifyPhoneOtp: (code: string, displayName?: string) => Promise<void>;
  sendLinkPhoneOtp: (phoneE164: string, recaptchaContainerId: string) => Promise<void>;
  confirmLinkPhoneOtp: (code: string) => Promise<void>;
  continueLocalSession: () => void;
  logout: () => Promise<void>;
};

const LOCAL_AUTH_KEY = "lazytopper.auth.local.v1";
const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readLocalSession(): AuthUser | null {
  try {
    const raw = window.localStorage.getItem(LOCAL_AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed || typeof parsed.uid !== "string") return null;
    // Sessions written before `providerIds` existed have no such field; default
    // it rather than letting every `providerIds.includes(...)` read throw.
    return { ...parsed, providerIds: parsed.providerIds ?? [] };
  } catch {
    return null;
  }
}

function writeLocalSession(user: AuthUser | null): void {
  try {
    if (!user) {
      window.localStorage.removeItem(LOCAL_AUTH_KEY);
      return;
    }
    window.localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

function createLocalDevUser(): AuthUser {
  return {
    uid: "local-dev-user",
    email: null,
    phoneNumber: null,
    displayName: "Local Student",
    providerIds: [],
    isLocalSession: true,
  };
}

function shouldUseDeterministicE2EAuth(): boolean {
  const explicit = String(import.meta.env.VITE_E2E_AUTO_ANON_AUTH || "").trim().toLowerCase();
  return explicit === "1" || explicit === "true" || explicit === "yes";
}

function shouldAutoAnonBootstrap(): boolean {
  if (shouldUseDeterministicE2EAuth()) return true;
  const isAutomation =
    typeof navigator !== "undefined" &&
    typeof navigator.webdriver === "boolean" &&
    navigator.webdriver;
  return Boolean(import.meta.env.DEV) && isAutomation;
}

function mapFirebaseUser(fbUser: FirebaseUser): AuthUser {
  return {
    uid: fbUser.uid,
    email: fbUser.email,
    phoneNumber: fbUser.phoneNumber,
    displayName: fbUser.displayName,
    providerIds: (fbUser.providerData || []).map(p => p.providerId),
    // Google sign-in reports TRUE (Google has already proven the address);
    // a phone-only account reports FALSE because it has no email at all,
    // which is why the verification gate keys on the `password` provider and
    // not on this flag alone.
    emailVerified: Boolean(fbUser.emailVerified),
  };
}

// NOTE: `hasPhoneLinked` / `PHONE_PROVIDER_ID` deliberately live in
// `src/lib/signInMethods.ts`, NOT here. Sixteen test files mock this module with
// an explicit vi.mock factory, and vitest THROWS on any export a factory omits
// ("No <name> export is defined on the mock"). A helper exported from here is
// therefore un-importable by any component those suites render.

async function signOutOfFirebase(): Promise<void> {
  if (!authClient) return;
  try {
    await firebaseSignOut(authClient);
  } catch {
    // ignore sign-out errors
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<AuthUser | null>(null);
  const [firebaseLoaded, setFirebaseLoaded] = useState(false);
  const [localUser, setLocalUser] = useState<AuthUser | null>(() => readLocalSession());
  const [mistakeLogsHydrated, setMistakeLogsHydrated] = useState(0);
  const [phoneRecaptchaStatus, setPhoneRecaptchaStatus] =
    useState<PhoneRecaptchaStatus>("idle");

  // Phone (SMS OTP) is reCAPTCHA-gated. The verifier and the pending
  // confirmation live in refs, not state: they must survive re-renders without
  // triggering one. The invisible reCAPTCHA verifier is rendered ONCE and reused
  // for the initial send AND any resend — signInWithPhoneNumber resets it
  // internally after each call. It must NOT be rebuilt in the same container:
  // RecaptchaVerifier.clear() does not free the element, so a second render()
  // throws "reCAPTCHA has already been rendered in this element". We therefore
  // only clear() it when the flow is truly done (logout / unmount / verify-success).
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const phoneConfirmationRef = useRef<ConfirmationResult | null>(null);

  // LINKING keeps its OWN pending confirmation, separate from the sign-in one.
  // They are different operations on different users: `signInWithPhoneNumber`
  // authenticates somebody new, `linkWithPhoneNumber` attaches a credential to
  // the CURRENT user. Sharing one ref would let a stale sign-in confirmation be
  // confirmed by the link flow, or the reverse — silently switching accounts
  // instead of linking, which is the exact failure this lane exists to prevent.
  const linkConfirmationRef = useRef<ConfirmationResult | null>(null);

  // WHICH container the live verifier was actually rendered into.
  //
  // The verifier is bound to one specific DOM element. Now that phone sign-in is
  // reachable from TWO pages (/login and /sign-up), the ref can outlive the
  // element it points at: `resetPhone` runs only on verify-success, logout and
  // provider unmount — never on navigation — so walking from /login to /sign-up
  // leaves a live verifier attached to a container that has since unmounted.
  //
  // Tracking the id is what lets `initPhoneRecaptcha` distinguish genuine reuse
  // (same container, still on screen — which must NOT rebuild) from a stale
  // widget (which must). Without it the container-id argument is inert: the
  // early-return below ignored it entirely, so passing a different id from a
  // second page silently did nothing at all.
  const recaptchaContainerIdRef = useRef<string | null>(null);

  // Tear down the verifier widget only; leaves any pending confirmation intact.
  const teardownRecaptcha = useCallback(() => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch {
        // ignore teardown errors — the widget may already be gone
      }
      recaptchaVerifierRef.current = null;
    }
    recaptchaContainerIdRef.current = null;
    setPhoneRecaptchaStatus("idle");
  }, []);

  // Full reset: tear down the widget AND drop the pending confirmation.
  const resetPhone = useCallback(() => {
    teardownRecaptcha();
    phoneConfirmationRef.current = null;
    // A half-finished LINK must not survive a logout: the confirmation is bound
    // to the user who requested it, and confirming it after a different student
    // signs in on the same browser would attach their number to the wrong uid.
    linkConfirmationRef.current = null;
  }, [teardownRecaptcha]);

  // Track Firebase Auth state directly: the signed-in Firebase user (Google,
  // email/password, or — from PR-4 — phone) is the source of identity.
  useEffect(() => {
    if (!firebaseConfigured || !authClient) {
      setFirebaseLoaded(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(authClient, (fbUser) => {
      setFirebaseUser(fbUser ? mapFirebaseUser(fbUser) : null);
      setFirebaseLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  const user = firebaseUser || localUser;
  const loading = !firebaseLoaded;

  // Local-dev / E2E anonymous-session bootstrap (automation/dev only; never a
  // user-facing guest mode).
  useEffect(() => {
    if (shouldAutoAnonBootstrap() && firebaseLoaded && !firebaseUser && !localUser) {
      const devUser = createLocalDevUser();
      setLocalUser(devUser);
      writeLocalSession(devUser);
    }
  }, [firebaseLoaded, firebaseUser, localUser]);

  useEffect(() => {
    const uid = user?.uid || null;
    setActiveProgressUser(uid);
    if (!user || !uid || user.isLocalSession) return;

    let cancelled = false;

    void (async () => {
      if (cancelled) return;

      await Promise.allSettled([
        restoreFromDB(uid),
        // ★ ensureLearnerAccountMetadata(...) was HERE and is gone on purpose. It mirrored
        // the child's DIRECT IDENTIFIERS (email, phoneNumber, displayName, authProvider)
        // into a Firestore `users/{uid}` doc on every login. `users` has never been
        // declared in firestore.rules, so the read preceding that write was denied and
        // threw, an empty catch swallowed it and this Promise.allSettled swallowed it
        // again — the write was never issued in ~85 days, and nothing was ever built to
        // read the collection. Do NOT restore this call, and do NOT add a `users` rules
        // block to make it work: every field it carried already lives in Firebase Auth's
        // own account record. See learnerAccountService.ts. [USERS-1, wave DPDP-A]
        ensureLearnerCloudBaseline(uid),
        ensureLearnerProgressBaseline(uid),
        hydrateLocalProgressFromCloud(uid),
        hydrateMistakeLogsFromCloud(uid).then(() => {
          if (!cancelled) setMistakeLogsHydrated((n) => n + 1);
        }),
        // Hydrate subscription status into the local cache on login. Do NOT activate a
        // trial here — this unconditional activateTrial(uid) silently started every
        // student's 7-day trial on login, before they did anything. Trial activation is
        // user-initiated only (useSubscription.startTrial). The read stays; the write
        // goes. [FU-SUBSCRIPTION-AUTOTRIAL-ONMOUNT]
        hydrateSubscriptionFromCloud(uid),
      ]);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, user?.email, user?.phoneNumber, user?.displayName, user?.isLocalSession]);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!authClient?.currentUser) return null;
    try {
      return await authClient.currentUser.getIdToken();
    } catch {
      return null;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!authClient) throw new Error("Firebase Auth is not configured");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(authClient, provider);
  }, []);

  const signInWithEmailPassword = useCallback(async (email: string, password: string) => {
    if (!authClient) throw new Error("Firebase Auth is not configured");
    await signInWithEmailAndPassword(authClient, email, password);
  }, []);

  const signUpWithEmailPassword = useCallback(
    async (email: string, password: string, displayName?: string) => {
      if (!authClient) throw new Error("Firebase Auth is not configured");
      const credential = await createUserWithEmailAndPassword(authClient, email, password);
      const trimmedName = (displayName || "").trim();
      if (trimmedName && credential.user) {
        try {
          await updateProfile(credential.user, { displayName: trimmedName });
          // RE-SYNC, and it is load-bearing — [FU-DISPLAYNAME-NOT-VISIBLE-UNTIL-RELOAD].
          //
          // `createUserWithEmailAndPassword` already fired `onAuthStateChanged`
          // with `displayName: null`, and `updateProfile` mutates `currentUser`
          // IN PLACE without re-emitting an auth-state event. Without this line
          // the context keeps the null it was handed, every shell surface falls
          // back to `displayName || email`, and the student sees their raw email
          // as their name for the whole first session — the exact defect the
          // sign-up name field was added to fix, surviving the fix.
          //
          // `credential.user` is the object updateProfile just mutated, so
          // re-mapping it needs no reload and no new firebase/auth import. It
          // also adds no key to the context value, which matters:
          // AuthContext.passwordReset.test.tsx pins the key set by EXACT
          // equality and would go red on an addition.
          setFirebaseUser(mapFirebaseUser(credential.user));
        } catch {
          // Non-blocking: account is created even if the display name fails to set.
        }
      }
    },
    [],
  );

  // Password recovery for email/password accounts. A student who forgets their
  // password had no way back in at all before this — a new account discards their
  // progress and Mistake Intelligence evidence.
  //
  // This is a THIN wrapper by design: it reports the real Firebase outcome, errors
  // included. The ACCOUNT-ENUMERATION policy (an unregistered address must be
  // indistinguishable from a registered one) belongs to the surface that renders the
  // message — see Login.tsx `handleResetSubmit`. Keeping the swallow in exactly one
  // place means the branch that protects students is the branch that actually runs in
  // production, and can be tested there.
  const sendPasswordReset = useCallback(async (email: string) => {
    if (!authClient) throw new Error("Firebase Auth is not configured");
    await sendPasswordResetEmail(authClient, email);
  }, []);

  const initPhoneRecaptcha = useCallback(async (recaptchaContainerId: string) => {
    if (!authClient) throw new Error("Firebase Auth is not configured");

    // Reuse the live widget ONLY when it is genuinely reusable — same container,
    // and that container is still in the document. Both conditions matter:
    //
    //  • same container: rebuilding into the SAME element throws "reCAPTCHA has
    //    already been rendered in this element" (clear() does not free it), so
    //    the resend path must keep reusing.
    //  • still attached: after navigating away the element is gone, and the
    //    verifier bound to it can no longer solve. Reusing it there fails at
    //    send time with an error that points at the wrong thing.
    //
    // Anything else is stale — tear it down and render a fresh one into the
    // container the caller actually asked for.
    const live = recaptchaVerifierRef.current;
    if (live) {
      const renderedInto = recaptchaContainerIdRef.current;
      const stillAttached =
        renderedInto !== null && document.getElementById(renderedInto) !== null;
      if (renderedInto === recaptchaContainerId && stillAttached) return;
      teardownRecaptcha();
    }

    // Firebase v12 argument order: auth FIRST, then container, then params.
    const verifier = new RecaptchaVerifier(authClient, recaptchaContainerId, {
      size: "invisible",
      callback: () => setPhoneRecaptchaStatus("solved"),
      "expired-callback": () => setPhoneRecaptchaStatus("expired"),
    });
    try {
      await verifier.render();
      recaptchaVerifierRef.current = verifier;
      recaptchaContainerIdRef.current = recaptchaContainerId;
      setPhoneRecaptchaStatus("ready");
    } catch (err) {
      try {
        verifier.clear();
      } catch {
        // ignore
      }
      setPhoneRecaptchaStatus("error");
      throw err;
    }
    // `teardownRecaptcha` is itself stable (useCallback with no deps), so listing
    // it keeps this callback's identity stable too — `sendPhoneOtp` depends on it.
  }, [teardownRecaptcha]);

  const sendPhoneOtp = useCallback(
    async (phoneE164: string, recaptchaContainerId: string) => {
      if (!authClient) throw new Error("Firebase Auth is not configured");
      // Render the verifier once (idempotent) and REUSE it for the initial send
      // and any resend — signInWithPhoneNumber resets it internally each call.
      // Do not teardown+rebuild here: re-rendering into the same container throws
      // "reCAPTCHA has already been rendered in this element".
      await initPhoneRecaptcha(recaptchaContainerId);
      const verifier = recaptchaVerifierRef.current;
      if (!verifier) throw new Error("reCAPTCHA is not ready");
      phoneConfirmationRef.current = await signInWithPhoneNumber(
        authClient,
        phoneE164,
        verifier,
      );
    },
    [initPhoneRecaptcha],
  );

  const verifyPhoneOtp = useCallback(async (code: string, displayName?: string) => {
    const confirmation = phoneConfirmationRef.current;
    if (!confirmation) throw new Error("Request an OTP before verifying");
    const credential = await confirmation.confirm(code);

    // ── THE NAME ────────────────────────────────────────────────────────────
    // `mapFirebaseUser` only ever READS `displayName`. Google supplies one and
    // `signUpWithEmailPassword` sets one; PHONE supplies nothing, so before
    // this a phone-first student's raw number rendered wherever their name
    // belongs, for the life of the account.
    // [FU-AUTH-PHONE-DISPLAYNAME-NEVER-SET]
    const trimmedName = (displayName || "").trim();
    const fbUser = credential?.user;
    // ⚠ ONLY WHEN THERE IS NONE. A returning student signing in by phone must
    // never have the name they already chose overwritten by whatever this door
    // happened to collect.
    if (trimmedName && fbUser && !fbUser.displayName) {
      try {
        await updateProfile(fbUser, { displayName: trimmedName });
        // RE-SYNC — the same trap as the email path: `updateProfile` mutates
        // `currentUser` IN PLACE and re-emits no auth-state event, so the
        // context would keep the null `onAuthStateChanged` already delivered
        // and the student would see their phone number as their name for the
        // whole first session. [FU-DISPLAYNAME-NOT-VISIBLE-UNTIL-RELOAD]
        setFirebaseUser(mapFirebaseUser(fbUser));
      } catch {
        // Non-blocking: the account exists even if the name fails to set.
      }
    }

    // onAuthStateChanged picks up the phone user; the hydration effect tags it
    // authProvider "firebase-phone". Drop the one-shot confirmation + any widget.
    resetPhone();
  }, [resetPhone]);

  /**
   * LINK a phone credential to the CURRENT account (does not sign anybody in).
   *
   * Reuses `initPhoneRecaptcha` exactly as it exists after PR-B3 — reuse is
   * conditional on the container being both the one requested AND still
   * attached — so the modal passes its own container id and gets a verifier
   * bound to the element actually on screen. There is deliberately no second
   * verifier lifecycle here: the ref is single-owner, and a competing manager
   * is the bug class B3 removed.
   */
  const sendLinkPhoneOtp = useCallback(
    async (phoneE164: string, recaptchaContainerId: string) => {
      if (!authClient) throw new Error("Firebase Auth is not configured");
      const current = authClient.currentUser;
      // Linking is only meaningful for a real signed-in Firebase account.
      if (!current) throw new Error("Sign in before linking a phone number");
      await initPhoneRecaptcha(recaptchaContainerId);
      const verifier = recaptchaVerifierRef.current;
      if (!verifier) throw new Error("reCAPTCHA is not ready");
      linkConfirmationRef.current = await linkWithPhoneNumber(
        current,
        phoneE164,
        verifier,
      );
    },
    [initPhoneRecaptcha],
  );

  /**
   * Confirm the OTP and attach the credential to the CURRENT uid.
   *
   * ★ THE UID MUST NOT CHANGE. That is the whole difference between linking and
   * silently switching accounts, and it is asserted in the tests. `confirm()`
   * resolves with the same user when linking; if this ever calls a sign-in API
   * instead, the student is moved to a different account and their work
   * disappears from their point of view.
   *
   * `linkWithPhoneNumber().confirm()` mutates `currentUser` in place and does
   * NOT re-emit an auth-state event — the same trap as `updateProfile` in
   * PR-B2/B3 — so the context is re-synced explicitly or `providerIds` stays
   * stale and the modal keeps offering a link that already succeeded.
   */
  const confirmLinkPhoneOtp = useCallback(async (code: string) => {
    const confirmation = linkConfirmationRef.current;
    if (!confirmation) throw new Error("Request a code before confirming");
    await confirmation.confirm(code);
    linkConfirmationRef.current = null;
    teardownRecaptcha();
    if (authClient?.currentUser) {
      setFirebaseUser(mapFirebaseUser(authClient.currentUser));
    }
  }, [teardownRecaptcha]);

  const continueLocalSession = () => {
    const devUser = createLocalDevUser();
    setLocalUser(devUser);
    setActiveProgressUser(devUser.uid);
    writeLocalSession(devUser);
  };

  const logout = useCallback(async () => {
    await signOutOfFirebase();
    resetPhone();
    writeLocalSession(null);
    setActiveProgressUser(null);
    setLocalUser(null);
    setFirebaseUser(null);
  }, [resetPhone]);

  // Tear down any live reCAPTCHA widget when the provider unmounts.
  useEffect(() => resetPhone, [resetPhone]);

  const value: AuthContextType = {
    user,
    loading,
    firebaseReady: firebaseConfigured,
    phoneRecaptchaStatus,
    mistakeLogsHydrated,
    getToken,
    signInWithGoogle,
    signInWithEmailPassword,
    signUpWithEmailPassword,
    sendPasswordReset,
    initPhoneRecaptcha,
    sendPhoneOtp,
    verifyPhoneOtp,
    sendLinkPhoneOtp,
    confirmLinkPhoneOtp,
    continueLocalSession,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
