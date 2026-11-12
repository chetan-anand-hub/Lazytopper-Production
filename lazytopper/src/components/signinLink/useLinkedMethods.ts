import { useCallback, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { authClient } from "../../services/firebaseClient";
import { entriesFromAuthUser, listLinkedMethods, type LinkedMethod, type ProviderEntry } from "./signinLinkModel";

/**
 * The signed-in account's REAL linked credentials, masked. Firebase's own providerData is read first (a Google link does not
 * re-emit the auth state, so the context's providerIds can lag); the context's user is the fallback.
 */
export function useLinkedMethods(): { uid: string; methods: LinkedMethod[]; refresh: () => void; signedIn: boolean } {
  const { user } = useAuth();
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);
  if (!user || user.isLocalSession || !user.uid || user.uid === "anonymous") return { uid: "", methods: [], refresh, signedIn: false };
  const live = authClient?.currentUser;
  const entries: ProviderEntry[] =
    live && live.uid === user.uid && Array.isArray(live.providerData) && live.providerData.length > 0
      ? live.providerData.map((p) => ({ providerId: p.providerId, email: p.email, phoneNumber: p.phoneNumber }))
      : entriesFromAuthUser(user);
  return { uid: user.uid, methods: listLinkedMethods(entries), refresh, signedIn: true };
}
