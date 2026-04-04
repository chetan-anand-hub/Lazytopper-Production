import express, { type Express } from "express";
import path from "path";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/shared-api", router);

const publicDir = path.resolve(__dirname, "public");
app.use(express.static(publicDir));
app.get("/{*splat}", (req, res) => {
  if (req.path.startsWith("/shared-api")) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.sendFile(path.join(publicDir, "index.html"));
});

export default app;
