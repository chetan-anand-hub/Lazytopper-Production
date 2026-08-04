import { Router, type IRouter } from "express";
import http from "http";
import { requireFirebaseAuth } from "../middlewares/requireFirebaseAuth";
import { REPORT_RATE_LIMIT, createRateLimiter } from "../lib/security";

const router: IRouter = Router();
const GATEWAY_PORT = parseInt(process.env["GATEWAY_PORT"] || "3001", 10);

/**
 * Report-a-question is STUDENT-FACING, so the budget is deliberately generous:
 * a real student reports a handful of bad questions in a sitting, never twelve
 * in a minute. The limit exists so a stuck retry loop cannot flood the reports
 * table, not to ration a student's ability to flag a mistake.
 */
const reportRateLimit = createRateLimiter(REPORT_RATE_LIMIT);

function proxyToGateway(
  path: string,
  method: string,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<{ statusCode: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const bodyStr = body != null ? JSON.stringify(body) : "";
    const opts: http.RequestOptions = {
      hostname: "127.0.0.1",
      port: GATEWAY_PORT,
      path,
      method,
      headers: {
        "content-type": "application/json",
        ...(bodyStr ? { "content-length": String(Buffer.byteLength(bodyStr)) } : {}),
        ...extraHeaders,
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

router.post(
  "/questions/report",
  requireFirebaseAuth,
  reportRateLimit,
  async (req, res): Promise<void> => {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ ok: false, error: "Unauthenticated" });
      return;
    }
    try {
      const { statusCode, body } = await proxyToGateway(
        "/api/questions/report",
        "POST",
        req.body,
        {
          "x-user-id": userId,
          "x-internal-auth": "1",
        },
      );
      res.status(statusCode).json(body);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(502).json({ ok: false, error: msg });
    }
  },
);

export default router;
