import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

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
  authClient = getAuth(app);
  firestoreDb = getFirestore(app);
}

export { app, authClient, firestoreDb };
