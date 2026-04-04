import { spawn, type ChildProcess } from "child_process";
import fs from "fs";
import net from "net";
import path from "path";
import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const GATEWAY_PORT = process.env["GATEWAY_PORT"] || "3001";

function startGateway(): void {
  const candidates = [
    path.join(process.cwd(), "lazytopper", "server", "index.cjs"),
    path.resolve(__dirname, "..", "..", "..", "lazytopper", "server", "index.cjs"),
    path.resolve(__dirname, "..", "lazytopper", "server", "index.cjs"),
  ];

  const resolved = candidates.find((p) => fs.existsSync(p));
  if (!resolved) {
    logger.warn({ candidates }, "Gateway file not found, AI features disabled");
    return;
  }

  const gwPath: string = resolved;
  const wsRoot: string = path.resolve(gwPath, "..", "..", "..");

  const sock = new net.Socket();
  sock.setTimeout(1000);
  sock.once("connect", () => {
    sock.destroy();
    logger.info({ port: GATEWAY_PORT }, "Gateway already running on port, skipping spawn");
  });
  sock.once("error", () => {
    sock.destroy();
    logger.info("No existing gateway, spawning child process...");
    doSpawn();
  });
  sock.once("timeout", () => {
    sock.destroy();
    doSpawn();
  });
  sock.connect(parseInt(GATEWAY_PORT, 10), "127.0.0.1");

  let restarts = 0;
  const MAX_RESTARTS = 5;

  function doSpawn(): void {
    try {
      const child: ChildProcess = spawn("node", [gwPath], {
        cwd: wsRoot,
        env: {
          ...process.env,
          PORT: GATEWAY_PORT,
          NODE_ENV: process.env["NODE_ENV"] || "production",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });

      child.stdout?.on("data", (data: Buffer) => {
        logger.info({ gateway: true }, data.toString().trim());
      });

      child.stderr?.on("data", (data: Buffer) => {
        logger.warn({ gateway: true }, data.toString().trim());
      });

      child.on("exit", (code: number | null) => {
        restarts++;
        if (restarts <= MAX_RESTARTS) {
          logger.warn({ code, restarts }, "Gateway exited, restarting in 3s...");
          setTimeout(doSpawn, 3000);
        } else {
          logger.error({ code, restarts }, "Gateway exceeded max restarts, giving up");
        }
      });

      child.on("error", (err: Error) => {
        logger.error({ err }, "Failed to start gateway");
      });

      logger.info({ port: GATEWAY_PORT, gatewayPath: gwPath }, "AI Gateway started");
    } catch (err) {
      logger.error({ err }, "Failed to spawn gateway");
    }
  }
}

startGateway();

app.listen(port, "0.0.0.0", (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
