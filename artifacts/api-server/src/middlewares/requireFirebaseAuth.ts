import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { firebaseAdminApp } from "../lib/firebaseAdmin";
import { logger } from "../lib/logger";

/**
 * Express request augmentation — the verified caller uid resolved by
 * `requireFirebaseAuth`.
 *
 * During the Clerk→Firebase migration window this is a Firebase uid (preferred
 * path) or, via the temporary Clerk fallback, a Clerk user id. In both cases it
 * is the per-uid Firestore document key for that user, so downstream
 * `x-user-id` forwarding is unchanged.
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
 * Dual-accept transition (Option B, owner-confirmed for PR-1):
 *   1. Verify the bearer as a Firebase ID token (`verifyIdToken`).
 *   2. On failure, fall back to the still-mounted `@clerk/express` session
 *      (`getAuth(req)`), so the existing Clerk-token client keeps working until
 *      PR-2 switches it to send Firebase ID tokens.
 *
 * The Clerk fallback and `@clerk/express` are removed together in PR-3, leaving
 * Firebase-only verification.
 *
 * Sets `req.userId` to the verified uid on success; responds 401 otherwise.
 */
export async function requireFirebaseAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);

  // 1. Firebase ID token (preferred path).
  if (token && firebaseAdminApp) {
    try {
      const decoded = await firebaseAdminApp.auth().verifyIdToken(token);
      req.userId = decoded.uid;
      next();
      return;
    } catch {
      // Not a valid Firebase token — fall through to the Clerk fallback below.
    }
  }

  // 2. Clerk session fallback (TEMPORARY — removed in PR-3).
  try {
    const { userId } = getAuth(req);
    if (userId) {
      req.userId = userId;
      next();
      return;
    }
  } catch (err) {
    logger.warn({ err }, "[auth] Clerk fallback verification error");
  }

  res.status(401).json({ ok: false, error: "Unauthenticated" });
}
