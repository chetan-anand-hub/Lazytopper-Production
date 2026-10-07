/**
 * GRACEFUL-DEPLOY (owner 2026-10-07): a backend redeploy loses no grading work.
 *
 * This process is the one Railway starts (railway.json `deploy.startCommand`, exec form, so it is
 * PID 1 in the container and the ONLY process Railway's SIGTERM reaches). It serves `/shared-api`
 * itself and proxies `/api/*` to the AI gateway (lazytopper/server/index.cjs), a CHILD process it
 * spawns. Before this file it installed no SIGTERM handler at all — and a PID 1 with no handler
 * ignores SIGTERM — so the gateway never heard of a redeploy and was SIGKILLed mid-grade
 * (FU-JOBS-SIGTERM-NOT-FORWARDED).
 *
 * On SIGTERM:
 *   1. stop accepting new connections (server.close) and stop respawning the gateway;
 *   2. FORWARD SIGTERM to the gateway, which drains itself (refuses new work with a retryable 503,
 *      lets requests and background grading jobs finish, then exits — services/gracefulDrain.cjs);
 *   3. exit 0 once the gateway has exited AND no request is in flight here, or at the deadline
 *      (PARENT_DRAIN_DEADLINE_MS), whichever comes first. Railway's SIGKILL follows
 *      `deploy.drainingSeconds` (120) after the SIGTERM, so the deadline sits inside it.
 *
 * Every timer is injected, so the tests drive time without reading a clock.
 */
import type { IncomingMessage, ServerResponse } from "http";

/** Inside Railway's 120 s draining window; the gateway's own deadline (110 s) comes first. */
export const PARENT_DRAIN_DEADLINE_MS = 115_000;

export interface ShutdownChild {
  kill(signal?: NodeJS.Signals): boolean;
  readonly exitCode: number | null;
  readonly signalCode: NodeJS.Signals | null;
  once(event: "exit", listener: () => void): unknown;
}

export interface ShutdownServer {
  close(callback?: (err?: Error) => void): unknown;
}

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

export interface GracefulShutdownDeps {
  exit: (code: number) => void;
  log?: (line: string) => void;
  deadlineMs?: number;
  setTimeout?: (fn: () => void, ms: number) => unknown;
  clearTimeout?: (handle: unknown) => void;
}

export interface GracefulShutdown {
  /** Wrap the request handler so requests in flight are counted. */
  wrap(handler: Handler): Handler;
  attachServer(server: ShutdownServer): void;
  /** The gateway child currently running (null when none). */
  setChild(child: ShutdownChild | null): void;
  /** False once shutdown began: the gateway must not be respawned. */
  mayRespawn(): boolean;
  begin(signal?: NodeJS.Signals): void;
  isShuttingDown(): boolean;
  inFlight(): number;
}

export function createGracefulShutdown(deps: GracefulShutdownDeps): GracefulShutdown {
  const log = deps.log ?? (() => {});
  const deadlineMs = deps.deadlineMs && deps.deadlineMs > 0 ? deps.deadlineMs : PARENT_DRAIN_DEADLINE_MS;
  const setT = deps.setTimeout ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const clearT = deps.clearTimeout ?? ((h: unknown) => clearTimeout(h as NodeJS.Timeout));

  let shuttingDown = false;
  let exited = false;
  let inFlight = 0;
  let server: ShutdownServer | null = null;
  let child: ShutdownChild | null = null;
  let childGone = true;
  let deadline: unknown = null;

  const childAlive = (c: ShutdownChild | null): boolean =>
    Boolean(c) && c!.exitCode === null && c!.signalCode === null;

  function finish(why: string): void {
    if (exited) return;
    exited = true;
    if (deadline !== null) clearT(deadline);
    log(`[graceful-shutdown] ${why}: exiting`);
    deps.exit(0);
  }

  function check(): void {
    if (!shuttingDown || exited) return;
    if (childGone && inFlight === 0) finish("drained");
  }

  return {
    wrap(handler) {
      return (req, res) => {
        inFlight += 1;
        let counted = true;
        const release = () => {
          if (!counted) return;
          counted = false;
          inFlight -= 1;
          check();
        };
        res.once("finish", release);
        res.once("close", release);
        handler(req, res);
      };
    },
    attachServer(s) {
      server = s;
    },
    setChild(c) {
      child = c;
      childGone = !childAlive(c);
      if (c && !childGone) {
        c.once("exit", () => {
          if (child === c) {
            childGone = true;
            check();
          }
        });
      }
    },
    mayRespawn() {
      return !shuttingDown;
    },
    begin(signal = "SIGTERM") {
      if (shuttingDown) return;
      shuttingDown = true;
      log(`[graceful-shutdown] ${signal}: draining (${inFlight} request(s) in flight, gateway ${childGone ? "not running" : "running"})`);
      try {
        server?.close();
      } catch {
        /* not listening */
      }
      if (child && !childGone) {
        try {
          child.kill("SIGTERM");
        } catch {
          childGone = true;
        }
      }
      deadline = setT(() => finish(`deadline after ${deadlineMs} ms`), deadlineMs);
      check();
    },
    isShuttingDown() {
      return shuttingDown;
    },
    inFlight() {
      return inFlight;
    },
  };
}
