import { Router, type IRouter } from "express";
import { requireAuth } from "@clerk/express";
import http from "http";

const router: IRouter = Router();

const GATEWAY_PORT = parseInt(process.env["GATEWAY_PORT"] || "3001", 10);

function callGateway(path: string): Promise<{ statusCode: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const opts: http.RequestOptions = {
      hostname: "127.0.0.1",
      port: GATEWAY_PORT,
      path,
      method: "GET",
      headers: {
        "x-internal-admin": "1",
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
    req.end();
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

export default router;
