import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import http from "http";
import { requireFirebaseAuth } from "../middlewares/requireFirebaseAuth";

const router: IRouter = Router();

const GATEWAY_PORT = parseInt(process.env["GATEWAY_PORT"] || "3001", 10);

/**
 * Admin role guard.  Requires ADMIN_FIREBASE_UIDS to be set (comma-separated
 * Firebase uids).  In production, returns 503 if the env var is missing so admin
 * endpoints are never accidentally open.  In non-production environments the
 * guard is skipped for developer convenience.
 *
 * The uid is read from `req.userId` (set by `requireFirebaseAuth`). As of PR-2
 * the frontend sends Firebase ID tokens, so `req.userId` is a Firebase uid — the
 * allowlist env was renamed ADMIN_CLERK_UIDS → ADMIN_FIREBASE_UIDS and its values
 * must be Firebase uids. Bootstrap: the owner signs in once via Firebase, captures
 * that uid, and sets it in ADMIN_FIREBASE_UIDS (a Firebase uid does not exist until
 * the first Firebase sign-in).
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
