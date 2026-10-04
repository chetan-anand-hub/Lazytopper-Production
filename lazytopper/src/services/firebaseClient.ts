import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
  type PopupRedirectResolver,
} from "firebase/auth";
import { initializeFirestore, type Firestore } from "firebase/firestore";

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  messagingSenderId?: string;
  storageBucket?: string;
};

function readFirebaseConfig(): FirebaseConfig {
  const env = import.meta.env;
  return {
    apiKey: String(env.VITE_FIREBASE_API_KEY || ""),
    authDomain: String(env.VITE_FIREBASE_AUTH_DOMAIN || ""),
    projectId: String(env.VITE_FIREBASE_PROJECT_ID || ""),
    appId: String(env.VITE_FIREBASE_APP_ID || ""),
    messagingSenderId: String(env.VITE_FIREBASE_MESSAGING_SENDER_ID || ""),
    storageBucket: String(env.VITE_FIREBASE_STORAGE_BUCKET || ""),
  };
}

function isConfigComplete(config: FirebaseConfig): boolean {
  return Boolean(
    config.apiKey && config.authDomain && config.projectId && config.appId,
  );
}

const firebaseConfig = readFirebaseConfig();
export const firebaseConfigured = isConfigComplete(firebaseConfig);
export const firebaseProjectId = firebaseConfig.projectId;

let app: FirebaseApp | null = null;
let authClient: Auth | null = null;
let firestoreDb: Firestore | null = null;

if (firebaseConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  // LOW-END-1 (L5) — `getAuth(app)` is `initializeAuth` with these three persistences PLUS
  // `browserPopupRedirectResolver`. On a phone, Safari or iOS that resolver initialises
  // PROACTIVELY: Auth start-up awaits a hidden iframe from the auth domain and Google's
  // gapi loader (~134 KB, apis.google.com + firebaseapp.com) before it even reads the
  // signed-in user — on EVERY page, for every mobile visitor, although only the Google
  // button on the login page ever uses it. So start-up gets the persistences only (same
  // order as getAuth, so the stored session is found exactly as before) and the resolver
  // is handed to signInWithPopup alone (getPopupRedirectResolver, below), pre-warmed when
  // the login page mounts. firebaseClient.resolver.test.ts pins both halves.
  authClient = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
  });
  // ignoreUndefinedProperties: the SDK otherwise THROWS on any `undefined` field
  // value, which silently killed every practiceInsights/attempts write (attempt docs
  // carry optional undefined fields like bloomSkill/topicName). Do NOT remove this.
  firestoreDb = initializeFirestore(app, { ignoreUndefinedProperties: true });
}

export { app, authClient, firestoreDb };

/**
 * LOW-END-1 (L5) — THE POPUP RESOLVER, ON DEMAND.
 *
 * Firebase caches one resolver instance per CLASS (`_getInstance`) and creates it lazily
 * inside signInWithPopup, so a warm-up done on some other instance would be thrown away.
 * `SharedPopupResolver` is a subclass whose constructor always yields ONE shared instance:
 * the instance the login page warms is the instance signInWithPopup later receives.
 *
 * Nothing here runs at import. The firebase/auth export is read only inside these
 * functions — which also keeps every test that mocks "firebase/auth" without it working.
 *
 * Note: the resolver's CODE ships in the same chunk as the rest of firebase/auth (the SDK
 * is one module, so a dynamic import() cannot split it out); what moves off start-up is the
 * iframe + gapi network load and the wait for it.
 */
let popupResolverClass: PopupRedirectResolver | null = null;
let popupResolverInstance: object | null = null;

export function getPopupRedirectResolver(): PopupRedirectResolver {
  if (!popupResolverClass) {
    const Base = browserPopupRedirectResolver as unknown as new () => object;
    class SharedPopupResolver extends Base {
      constructor() {
        if (popupResolverInstance) return popupResolverInstance as SharedPopupResolver;
        super();
        popupResolverInstance = this;
      }
    }
    popupResolverClass = SharedPopupResolver as unknown as PopupRedirectResolver;
  }
  return popupResolverClass;
}

/**
 * Start loading the sign-in iframe before the student taps "Continue with Google", so the
 * popup opens as promptly as it did when start-up loaded it (Safari / iOS block a popup
 * opened too long after the tap). Best effort: if the SDK's internal hook ever changes,
 * this does nothing and signInWithPopup initialises the resolver itself, as desktop Chrome
 * always has.
 */
export function prewarmPopupRedirectResolver(): void {
  try {
    if (!authClient) return;
    const Resolver = getPopupRedirectResolver() as unknown as new () => {
      _initialize?: (auth: Auth) => Promise<unknown>;
    };
    const instance = new Resolver();
    void instance._initialize?.(authClient)?.catch(() => {
      /* signInWithPopup retries the initialisation itself */
    });
  } catch {
    /* a warm-up must never break the login page */
  }
}
