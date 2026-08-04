import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import http from "http";
import { requireFirebaseAuth } from "../middlewares/requireFirebaseAuth";
import { ADMIN_RATE_LIMIT, createRateLimiter } from "../lib/security";

const router: IRouter = Router();

const GATEWAY_PORT = parseInt(process.env["GATEWAY_PORT"] || "3001", 10);

/**
 * ONE limiter shared by all three admin routes, so the budget is per ADMIN
 * CALLER rather than per endpoint — three separate instances would let a caller
 * spend the whole allowance three times over by rotating between them.
 *
 * Mounted AFTER `requireFirebaseAuth` (so the key is a verified uid) and BEFORE
 * `requireAdminRole` (so a NON-admin probing for admin access is limited too —
 * that caller is the one worth limiting, and a 403 loop is exactly the shape of
 * an enumeration attempt).
 */
const adminRateLimit = createRateLimiter(ADMIN_RATE_LIMIT);

/**
 * Admin role guard.  Requires ADMIN_FIREBASE_UIDS to be set (comma-separated
 * Firebase uids).  In production, returns 503 if the env var is missing so admin
 * endpoints are never accidentally open.  In non-production environments the
 * guard is skipped for developer convenience.
 *
 * The uid is read from `req.userId` (set by `requireFirebaseAuth`), which is a
 * Firebase uid, so `ADMIN_FIREBASE_UIDS` must hold Firebase uids. Bootstrap: the
 * owner signs in once via Firebase, captures that uid, and sets it in
 * `ADMIN_FIREBASE_UIDS` (a Firebase uid does not exist until the first sign-in).
 */
function requireAdminRole(req: Request, res: Response, next: NextFunction): void {
  const rawEnv = process.env["ADMIN_FIREBASE_UIDS"] || "";
  const adminUids = rawEnv.split(",").map((s) => s.trim()).filter(Boolean);
  if (adminUids.length === 0) {
    if (process.env["NODE_ENV"] === "production") {
      res.status(503).json({ ok: false, error: "Admin access not configured" });
      return;
    }
    return next();
  }
  const userId = req.userId;
  if (!userId || !adminUids.includes(userId)) {
    res.status(403).json({ ok: false, error: "Admin access required" });
    return;
  }
  return next();
}

function callGateway(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<{ statusCode: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const bodyStr = body != null ? JSON.stringify(body) : "";
    const opts: http.RequestOptions = {
      hostname: "127.0.0.1",
      port: GATEWAY_PORT,
      path,
      method,
      headers: {
        "x-internal-admin": "1",
        ...(bodyStr
          ? { "content-type": "application/json", "content-length": String(Buffer.byteLength(bodyStr)) }
          : {}),
      },
    };
    const req = http.request(opts, (res) => {
      let raw = "";
      res.on("data", (chunk: Buffer) => { raw += chunk.toString(); });
      res.on("end", () => {
        try { resolve({ statusCode: res.statusCode ?? 502, body: JSON.parse(raw) }); }
        catch { reject(new Error("Invalid JSON from gateway")); }
      });
    });
    req.on("error", reject);
    if (bodyStr) req.end(bodyStr); else req.end();
  });
}

router.get(
  "/admin/cache-stats",
  requireFirebaseAuth,
  adminRateLimit,
  async (_req, res): Promise<void> => {
    try {
      const { statusCode, body } = await callGateway("/api/mentor/cache-stats");
      res.status(statusCode).json(body);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(502).json({ ok: false, error: msg });
    }
  },
);

router.get(
  "/admin/question-reports",
  requireFirebaseAuth,
  adminRateLimit,
  requireAdminRole,
  async (_req, res): Promise<void> => {
    try {
      const { statusCode, body } = await callGateway("/api/admin/question-reports");
      res.status(statusCode).json(body);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(502).json({ ok: false, error: msg });
    }
  },
);

router.patch(
  "/admin/question-reports/:id/resolve",
  requireFirebaseAuth,
  adminRateLimit,
  requireAdminRole,
  async (req: Request, res): Promise<void> => {
    try {
      const { id } = req.params;
      const { statusCode, body } = await callGateway(
        `/api/admin/question-reports/${id}/resolve`,
        "PATCH",
      );
      res.status(statusCode).json(body);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(502).json({ ok: false, error: msg });
    }
  },
);

export default router;
