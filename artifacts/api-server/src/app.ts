import express, { type Express } from "express";
import path from "path";
import http from "http";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(clerkMiddleware());

app.use("/shared-api", router);

const GATEWAY_PORT = parseInt(process.env["GATEWAY_PORT"] || "3001", 10);

app.use("/api", (req, res) => {
  const bodyData = req.body ? JSON.stringify(req.body) : "";
  const fwdHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (k === "host" || k === "connection" || k === "content-length") continue;
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

const publicDir = path.resolve(__dirname, "public");
app.use("/app", express.static(publicDir));
app.get("/app/{*splat}", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

export default app;
