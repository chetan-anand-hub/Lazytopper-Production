import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import http from "http";

const router: IRouter = Router();

const GATEWAY_PORT = parseInt(process.env["GATEWAY_PORT"] || "3001", 10);

/**
 * Optional admin guard.  If ADMIN_CLERK_UIDS is set (comma-separated list of
 * Clerk user IDs), only those users may call admin routes.  If the env var is
 * unset, any authenticated user may access (matches legacy behaviour for
 * pre-existing admin pages like /admin/cache-stats).
 */
function requireAdminRole(req: Request, res: Response, next: NextFunction): void {
  const rawEnv = process.env["ADMIN_CLERK_UIDS"] || "";
  const adminUids = rawEnv.split(",").map((s) => s.trim()).filter(Boolean);
  if (adminUids.length === 0) {
    return next();
  }
  const { userId } = getAuth(req);
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
  requireAuth(),
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
  requireAuth(),
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
  requireAuth(),
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
