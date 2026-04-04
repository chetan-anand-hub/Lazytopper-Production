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
  const gatewayPath = path.resolve("lazytopper/server/index.cjs");
  try {
    const child = spawn("node", [gatewayPath], {
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
      logger.warn({ code }, "Gateway process exited, restarting in 2s...");
      setTimeout(startGateway, 2000);
    });

    child.on("error", (err) => {
      logger.error({ err }, "Failed to start gateway");
    });

    logger.info({ port: GATEWAY_PORT }, "AI Gateway started");
  } catch (err) {
    logger.error({ err }, "Failed to spawn gateway");
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
