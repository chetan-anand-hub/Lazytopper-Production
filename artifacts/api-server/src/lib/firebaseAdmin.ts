import admin from "firebase-admin";
import { logger } from "./logger";

/**
 * Firebase Admin initialization for the API edge (Surface B).
 *
 * Mirrors the gateway's init in `lazytopper/server/index.cjs`: the project id
 * comes from `VITE_FIREBASE_PROJECT_ID`, an optional explicit service-account
 * credential from `FIREBASE_SERVICE_ACCOUNT_KEY`, otherwise Application Default
 * Credentials (ADC) are used.
 *
 * Consumed by `requireFirebaseAuth` to verify Firebase ID tokens via
 * `verifyIdToken` (the same pattern already used in `server/routes/share.cjs`).
 *
 * If `VITE_FIREBASE_PROJECT_ID` is unset, this exports `null` and the auth
 * middleware rejects requests (it can no longer verify ID tokens).
 */
function initFirebaseAdmin(): admin.app.App | null {
  const projectId = process.env["VITE_FIREBASE_PROJECT_ID"];
  if (!projectId) {
    logger.warn(
      "[firebase-admin] VITE_FIREBASE_PROJECT_ID not set — Firebase ID-token verification disabled",
    );
    return null;
  }

  try {
    if (admin.apps.length > 0) {
      return admin.app();
    }

    const initConfig: admin.AppOptions = { projectId };
    const serviceAccountKey = process.env["FIREBASE_SERVICE_ACCOUNT_KEY"];
    if (serviceAccountKey) {
      try {
        initConfig.credential = admin.credential.cert(
          JSON.parse(serviceAccountKey),
        );
      } catch (err) {
        logger.warn(
          { err },
          "[firebase-admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY — falling back to ADC",
        );
      }
    }

    const app = admin.initializeApp(initConfig);
    logger.info(
      {
        projectId,
        credentials: serviceAccountKey ? "explicit" : "default/ADC",
      },
      "[firebase-admin] initialized",
    );
    return app;
  } catch (err) {
    logger.error({ err }, "[firebase-admin] initialization failed");
    return null;
  }
}

export const firebaseAdminApp: admin.app.App | null = initFirebaseAdmin();
