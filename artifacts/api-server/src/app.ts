import express, { type Express } from "express";
import http from "http";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { applySecurityMiddleware } from "./lib/security";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// CORS allowlist + helmet. Replaces a bare `app.use(cors())` that allowed every
// origin. Applied at this exact position because it already sits in front of
// BOTH entry points below — the `/shared-api` router and the `/api` gateway
// proxy — so nothing needs reordering. See ./lib/security.ts for why a missing
// Origin is allowed and why a refusal must not be an Error.
applySecurityMiddleware(app, process.env, (message) => logger.warn(message));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/shared-api", router);

const GATEWAY_PORT = parseInt(process.env["GATEWAY_PORT"] || "3001", 10);

// Headers that are set server-side by privileged code paths and must never
// be forwarded from external (browser) requests to the gateway.
const STRIPPED_PROXY_HEADERS = new Set([
  "x-internal-auth",
  "x-internal-admin",
  "x-user-id",
]);

app.use("/api", (req, res) => {
  const bodyData = req.body ? JSON.stringify(req.body) : "";
  const fwdHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (k === "host" || k === "connection" || k === "content-length") continue;
    if (STRIPPED_PROXY_HEADERS.has(k.toLowerCase())) continue;
    if (typeof v === "string") fwdHeaders[k] = v;
  }
  if (bodyData) {
    fwdHeaders["content-type"] = "application/json";
    fwdHeaders["content-length"] = String(Buffer.byteLength(bodyData));
  }
  fwdHeaders["host"] = `127.0.0.1:${GATEWAY_PORT}`;

  const options: http.RequestOptions = {
    hostname: "127.0.0.1",
    port: GATEWAY_PORT,
    path: `/api${req.url}`,
    method: req.method,
    headers: fwdHeaders,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", (err) => {
    logger.error({ err }, "Gateway proxy error");
    if (!res.headersSent) {
      res.status(502).json({ error: "AI Gateway unavailable" });
    }
  });

  if (bodyData) {
    proxyReq.end(bodyData);
  } else {
    req.pipe(proxyReq, { end: true });
  }
});


export default app;
