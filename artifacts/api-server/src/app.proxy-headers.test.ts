import assert from "node:assert/strict";
import http from "node:http";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import type { Express } from "express";

/**
 * THE `/api` PROXY BOUNDARY — privileged-header stripping.
 *
 * ★★ WHY THIS FILE EXISTS. `app.ts` already strips `x-user-id`,
 * `x-internal-auth` and `x-internal-admin` from every browser request before
 * proxying it to the gateway. That strip had NO TEST ANYWHERE. Deleting an
 * entry from `STRIPPED_PROXY_HEADERS` turned nothing red on any gate, on either
 * process — the only things referring to it were PROSE:
 *   - `lazytopper/src/ai/paidCallHeaders.ts` (a doc comment)
 *   - `lazytopper/src/ai/paidCallHeaders.test.ts` (asserts the CLIENT does not
 *     SEND the header — a different property on a different process; it cannot
 *     observe what the proxy does with one that arrives anyway)
 * A comment is a claim, not a fact, and a guard that cannot be shown to have
 * fired is not present. [FU-XUSERID-PROXY-STRIP]
 *
 * ★ WHAT MAKES THIS A REAL BOUNDARY. The gateway trusts these headers as
 * PROOF OF IDENTITY AND PRIVILEGE — `server/routes/questionReport.cjs` gates on
 * `req.headers['x-internal-auth'] === '1'` and then takes `x-user-id` as the
 * acting user, and the admin routes gate on `x-internal-admin === '1'`. The
 * gateway binds loopback and is reachable ONLY through this proxy, so this
 * `continue` is the entire thing standing between a browser and a forged
 * identity. The verified value has one legitimate source:
 * `requireFirebaseAuth` -> `req.userId`, forwarded server-side in
 * `routes/questions.ts`.
 *
 * ★ BEHAVIOURAL, NEVER CONFIG-SHAPED. Every assertion is made against the
 * headers a real listening stub gateway actually RECEIVED from the real
 * `app.ts` middleware stack. Asserting the contents of the `Set` would pass
 * just as happily if the `continue` were deleted.
 *
 * ★ EVERY "NOT FORWARDED" ASSERTION CARRIES A CONTROL. `x-lazytopper-uid` is
 * sent alongside and asserted PRESENT downstream. Without it, a proxy that
 * dropped every header — or never reached the gateway at all — would satisfy
 * every absence assertion in this file.
 */

interface CapturedRequest {
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
  body: string;
}

const captured: CapturedRequest[] = [];
let gatewayStatus = 200;
let gatewayBody: unknown = { ok: true };

let gateway: Server;
let appServer: Server;
let appBase: string;

before(async () => {
  // The stand-in for the AI gateway, on the loopback port the proxy targets.
  // It records what it was sent and replies with whatever the current test set.
  gateway = await new Promise<Server>((resolve) => {
    const s = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (chunk: Buffer) => {
        raw += chunk.toString();
      });
      req.on("end", () => {
        captured.push({
          method: req.method ?? "",
          url: req.url ?? "",
          headers: req.headers,
          body: raw,
        });
        res.writeHead(gatewayStatus, { "content-type": "application/json" });
        res.end(JSON.stringify(gatewayBody));
      });
    });
    s.listen(0, "127.0.0.1", () => resolve(s));
  });

  // ★ ALL THREE ENV VARS MUST BE SET BEFORE THE IMPORT, hence the dynamic one.
  //   - GATEWAY_PORT is read at MODULE SCOPE in app.ts, so a later assignment
  //     would be ignored and every request would go to the default 3001.
  //   - NODE_ENV/LOG_LEVEL: logger.ts attaches a `pino-pretty` TRANSPORT outside
  //     production, which is a WORKER THREAD that keeps the event loop alive —
  //     `node --test` then hangs after the last assertion instead of exiting.
  process.env["GATEWAY_PORT"] = String((gateway.address() as AddressInfo).port);
  process.env["NODE_ENV"] = "production";
  process.env["LOG_LEVEL"] = "silent";

  const mod: { default: Express } = await import("./app");
  appServer = await new Promise<Server>((resolve) => {
    const s = mod.default.listen(0, "127.0.0.1", () => resolve(s));
  });
  appBase = `http://127.0.0.1:${(appServer.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise<void>((resolve) => appServer.close(() => resolve()));
  await new Promise<void>((resolve) => gateway.close(() => resolve()));
});

/** Sends one request through the real `/api` proxy and returns what the gateway saw. */
async function throughProxy(
  headers: Record<string, string>,
  init: RequestInit = {},
): Promise<{ seen: CapturedRequest; status: number; bodyText: string }> {
  const before_ = captured.length;
  const response = await fetch(`${appBase}/api/check-solution`, {
    method: "GET",
    ...init,
    headers,
  });
  // Read the body ONCE, here, and hand the text back: draining it and then
  // letting a caller re-read it throws "Body has already been read".
  const bodyText = await response.text();
  assert.equal(
    captured.length,
    before_ + 1,
    "the request never reached the gateway — every absence assertion below would be vacuous",
  );
  const seen = captured[captured.length - 1];
  assert.ok(seen, "captured request missing");
  return { seen, status: response.status, bodyText };
}

describe("the /api proxy strips client-supplied privileged headers", () => {
  it("★ a client-supplied x-user-id is NOT forwarded — and the CONTROL header is", async () => {
    const { seen } = await throughProxy({
      "x-user-id": "attacker-supplied-uid",
      "x-lazytopper-uid": "control-uid",
    });

    // THE CONTROL, asserted FIRST and positively: an unprivileged header sent on
    // the very same request DID survive. This is what separates "the proxy
    // stripped x-user-id" from "the proxy forwarded nothing".
    assert.equal(
      seen.headers["x-lazytopper-uid"],
      "control-uid",
      "CONTROL FAILED: the proxy forwarded no headers at all, so the strip below proves nothing",
    );

    assert.equal(
      seen.headers["x-user-id"],
      undefined,
      "a client-supplied x-user-id reached the gateway — an identity the server never verified",
    );
  });

  it("★ mixed-case X-User-ID is stripped too (the Set is matched lower-cased)", async () => {
    const { seen } = await throughProxy({
      "X-User-ID": "attacker-supplied-uid",
      "x-lazytopper-uid": "control-uid",
    });

    assert.equal(seen.headers["x-lazytopper-uid"], "control-uid", "CONTROL FAILED");
    assert.equal(seen.headers["x-user-id"], undefined);
  });

  it("★ x-internal-auth and x-internal-admin are stripped — the gateway's privilege gates", async () => {
    const { seen } = await throughProxy({
      "x-internal-auth": "1",
      "x-internal-admin": "1",
      "x-lazytopper-uid": "control-uid",
    });

    assert.equal(seen.headers["x-lazytopper-uid"], "control-uid", "CONTROL FAILED");
    // questionReport.cjs treats these EXACT values as proof of privilege.
    assert.equal(seen.headers["x-internal-auth"], undefined);
    assert.equal(seen.headers["x-internal-admin"], undefined);
  });

  it("★ a request carrying NO privileged header is unaffected", async () => {
    const { seen } = await throughProxy({
      "x-lazytopper-uid": "control-uid",
      authorization: "Bearer some-id-token",
    });

    // The two headers a real paid client call carries (paidCallHeaders.ts) both
    // survive untouched: the strip is targeted, not a blanket allowlist.
    assert.equal(seen.headers["x-lazytopper-uid"], "control-uid");
    assert.equal(seen.headers["authorization"], "Bearer some-id-token");
    assert.equal(seen.headers["x-user-id"], undefined);
  });

  it("★ the gateway's response shape is preserved verbatim — a 402 still carries premium_required", async () => {
    gatewayStatus = 402;
    gatewayBody = {
      error: "premium_required",
      message: "Your free trial has ended. Upgrade to keep grading.",
    };
    try {
      const { status, bodyText } = await throughProxy({ "x-user-id": "attacker-supplied-uid" });

      assert.equal(status, 402, "the paywall status must survive the proxy");
      const body = JSON.parse(bodyText) as { error?: string; message?: string };
      assert.equal(
        body.error,
        "premium_required",
        "the client branches on `error`; stripping it turns the paywall into an unexplained failure",
      );
      assert.equal(
        body.message,
        "Your free trial has ended. Upgrade to keep grading.",
        "the student-facing message must reach the client unaltered",
      );
    } finally {
      gatewayStatus = 200;
      gatewayBody = { ok: true };
    }
  });
});
