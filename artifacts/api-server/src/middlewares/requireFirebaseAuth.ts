import type { Request, Response, NextFunction } from "express";
import { firebaseAdminApp } from "../lib/firebaseAdmin";
import { logger } from "../lib/logger";

/**
 * Express request augmentation — the verified caller uid resolved by
 * `requireFirebaseAuth` (a Firebase uid). It is the per-uid Firestore document
 * key for that user, so downstream `x-user-id` forwarding is unchanged.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

function extractBearerToken(req: Request): string {
  const header = String(req.headers["authorization"] || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

/**
 * Auth guard for the `/shared-api/*` protected routes (Surface B).
 *
 * Verifies the bearer as a Firebase ID token (`verifyIdToken`) and sets
 * `req.userId = decoded.uid`; responds 401 otherwise. Firebase-only.
 */
export async function requireFirebaseAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ ok: false, error: "Unauthenticated" });
    return;
  }

  if (!firebaseAdminApp) {
    logger.error("[auth] Firebase Admin not configured — cannot verify ID token");
    res.status(503).json({ ok: false, error: "Auth not configured" });
    return;
  }

  try {
    const decoded = await firebaseAdminApp.auth().verifyIdToken(token);
    req.userId = decoded.uid;
    next();
  } catch (err) {
    logger.warn({ err }, "[auth] Firebase ID token verification failed");
    res.status(401).json({ ok: false, error: "Unauthenticated" });
  }
}
