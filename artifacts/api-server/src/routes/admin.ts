import { Router, type IRouter, type Request } from "express";
import { requireAuth } from "@clerk/express";
import http from "http";

const router: IRouter = Router();

const GATEWAY_PORT = parseInt(process.env["GATEWAY_PORT"] || "3001", 10);

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
        ...(bodyStr ? { "content-type": "application/json", "content-length": String(Buffer.byteLength(bodyStr)) } : {}),
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
    if (bodyStr) {
      req.end(bodyStr);
    } else {
      req.end();
    }
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
