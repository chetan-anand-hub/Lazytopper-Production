import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";

import {
  PARENT_DRAIN_DEADLINE_MS,
  createGracefulShutdown,
  type ShutdownChild,
} from "./gracefulShutdown";

/**
 * GRACEFUL-DEPLOY: the process Railway starts must DRAIN on SIGTERM and FORWARD it to the AI gateway
 * child. Fake timers only (advance()); no test reads the wall clock.
 */

function fakeTimers() {
  let t = 0;
  const pending = new Set<{ at: number; fn: () => void }>();
  return {
    setTimeout: (fn: () => void, ms: number) => {
      const h = { at: t + ms, fn };
      pending.add(h);
      return h;
    },
    clearTimeout: (h: unknown) => {
      pending.delete(h as { at: number; fn: () => void });
    },
    advance(ms: number) {
      const target = t + ms;
      for (;;) {
        let next: { at: number; fn: () => void } | null = null;
        for (const h of pending) if (h.at <= target && (!next || h.at < next.at)) next = h;
        if (!next) break;
        pending.delete(next);
        t = next.at;
        next.fn();
      }
      t = target;
    },
  };
}

class FakeChild extends EventEmitter implements ShutdownChild {
  exitCode: number | null = null;
  signalCode: NodeJS.Signals | null = null;
  signals: string[] = [];
  kill(signal: NodeJS.Signals = "SIGTERM"): boolean {
    this.signals.push(signal);
    return true;
  }
  /** The gateway finishing its own drain. */
  exitNow(code = 0): void {
    this.exitCode = code;
    this.emit("exit", code);
  }
}

function fakeRes(): ServerResponse {
  return new EventEmitter() as unknown as ServerResponse;
}

function setup() {
  const timers = fakeTimers();
  const exits: number[] = [];
  const shutdown = createGracefulShutdown({
    exit: (code) => exits.push(code),
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
  });
  let closed = 0;
  shutdown.attachServer({ close: () => { closed += 1; } });
  const child = new FakeChild();
  shutdown.setChild(child);
  return { timers, exits, shutdown, child, closed: () => closed };
}

describe("api-server graceful shutdown (GRACEFUL-DEPLOY)", () => {
  it("PIN P1 · SIGTERM is FORWARDED to the gateway child, the listener closes, and the child is not respawned", () => {
    const { shutdown, child, closed } = setup();
    assert.equal(shutdown.mayRespawn(), true);
    shutdown.begin("SIGTERM");
    assert.deepEqual(child.signals, ["SIGTERM"], "the child got SIGTERM exactly once");
    assert.equal(closed(), 1, "no new connections are accepted");
    assert.equal(shutdown.mayRespawn(), false, "a gateway that exits now is not restarted");
    shutdown.begin("SIGTERM");
    assert.deepEqual(child.signals, ["SIGTERM"], "a second SIGTERM is not re-forwarded");
  });

  it("PIN P2 · the exit waits for the gateway to finish its drain, then exits 0", () => {
    const { shutdown, child, exits, timers } = setup();
    shutdown.begin("SIGTERM");
    timers.advance(90_000);
    assert.deepEqual(exits, [], "the gateway is still draining (grading) at 90 s: no exit");
    child.exitNow(0);
    assert.deepEqual(exits, [0]);
  });

  it("PIN P3 · a request in flight here holds the exit until it is done", () => {
    const { shutdown, child, exits } = setup();
    const res = fakeRes();
    let served = 0;
    shutdown.wrap(() => { served += 1; })({} as IncomingMessage, res);
    assert.equal(served, 1);
    assert.equal(shutdown.inFlight(), 1);
    shutdown.begin("SIGTERM");
    child.exitNow(0);
    assert.deepEqual(exits, [], "the proxied request has not finished");
    res.emit("finish");
    res.emit("close");
    assert.equal(shutdown.inFlight(), 0);
    assert.deepEqual(exits, [0]);
  });

  it("PIN P4 · at the deadline the process exits even if the gateway has not, and not a moment before; it fits Railway's 120 s draining window", () => {
    const { shutdown, exits, timers } = setup();
    shutdown.begin("SIGTERM");
    timers.advance(PARENT_DRAIN_DEADLINE_MS - 1);
    assert.deepEqual(exits, []);
    timers.advance(1);
    assert.deepEqual(exits, [0]);
    timers.advance(PARENT_DRAIN_DEADLINE_MS);
    assert.deepEqual(exits, [0], "exactly one exit");
    const railway = JSON.parse(
      fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "railway.json"), "utf8"),
    );
    assert.equal(railway.deploy.drainingSeconds, 120);
    assert.ok(PARENT_DRAIN_DEADLINE_MS < railway.deploy.drainingSeconds * 1000, "the exit comes before Railway's SIGKILL");
  });

  it("PIN P5 · index.ts — the entry Railway starts — installs the SIGTERM handler, registers the spawned child, and refuses to respawn during shutdown", () => {
    const src = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "index.ts"), "utf8");
    assert.match(src, /process\.once\("SIGTERM", \(\) => shutdown\.begin\("SIGTERM"\)\);/);
    assert.match(src, /shutdown\.setChild\(child\);/);
    assert.match(src, /http\.createServer\(shutdown\.wrap\(/);
    assert.match(src, /if \(!shutdown\.mayRespawn\(\)\) \{\s*logger\.info/);
    const railway = JSON.parse(
      fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "railway.json"), "utf8"),
    );
    assert.equal(railway.deploy.startCommand, "node --enable-source-maps artifacts/api-server/dist/index.mjs");
  });
});
