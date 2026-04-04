import { spawn } from "child_process";
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

function startGateway() {
  const candidates = [
    path.join(process.cwd(), "lazytopper", "server", "index.cjs"),
    path.resolve(__dirname, "..", "..", "..", "lazytopper", "server", "index.cjs"),
    path.resolve(__dirname, "..", "lazytopper", "server", "index.cjs"),
  ];

  const fs = require("fs") as typeof import("fs");
  const gatewayPath = candidates.find((p) => fs.existsSync(p));
  const workspaceRoot = gatewayPath ? path.resolve(gatewayPath, "..", "..", "..") : process.cwd();

  if (!gatewayPath) {
    logger.warn({ candidates }, "Gateway file not found, AI features disabled");
    return;
  }

  const net = require("net") as typeof import("net");
  const checkPort = new (net.Socket)();
  checkPort.setTimeout(1000);
  checkPort.once("connect", () => {
    checkPort.destroy();
    logger.info({ port: GATEWAY_PORT }, "Gateway already running on port, skipping spawn");
  });
  checkPort.once("error", () => {
    checkPort.destroy();
    logger.info("No existing gateway, spawning child process...");
    spawnGatewayProcess();
  });
  checkPort.once("timeout", () => {
    checkPort.destroy();
    spawnGatewayProcess();
  });
  checkPort.connect(parseInt(GATEWAY_PORT, 10), "127.0.0.1");

  let restarts = 0;
  const MAX_RESTARTS = 5;

  function spawnGatewayProcess() {
    try {
      const child = spawn("node", [gatewayPath], {
        cwd: workspaceRoot,
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

      child.on("exit", (code) => {
        restarts++;
        if (restarts <= MAX_RESTARTS) {
          logger.warn({ code, restarts }, "Gateway exited, restarting in 3s...");
          setTimeout(spawnGatewayProcess, 3000);
        } else {
          logger.error({ code, restarts }, "Gateway exceeded max restarts, giving up");
        }
      });

      child.on("error", (err) => {
        logger.error({ err }, "Failed to start gateway");
      });

      logger.info({ port: GATEWAY_PORT, gatewayPath }, "AI Gateway started");
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
