'use strict';

/**
 * CHECKOUT-FAST-1 - the order routes' speed helpers. TIMING ONLY: nothing here prices, stores, signs or grants.
 *
 *  - PAY_ORDER_PARALLEL_DISABLED=1  -> the order routes run their independent reads in the OLD sequence (one after another).
 *  - PAY_ORDER_KEEPALIVE_DISABLED=1 -> the Razorpay order call goes through the platform fetch again (no kept-alive socket).
 *
 * `keepAliveFetch` is a minimal fetch-shaped call ({ ok, status, json() }) over a module-level keep-alive https.Agent, so the
 * order POST can reuse a warm socket / cached TLS session to api.razorpay.com instead of paying a fresh handshake each time.
 * It is used for the order-creation POST only, and only when the route's fetch is the platform default (an injected fetch,
 * as in the tests, is always used as given).
 */

const https = require('node:https');

const truthy = (v) => /^(1|true|on|yes)$/i.test(String(v === undefined || v === null ? '' : v).trim());

function isOrderParallelDisabled(env = process.env) {
  return truthy(env && env.PAY_ORDER_PARALLEL_DISABLED);
}

function isOrderKeepAliveDisabled(env = process.env) {
  return truthy(env && env.PAY_ORDER_KEEPALIVE_DISABLED);
}

let sharedAgent = null;
function razorpayAgent() {
  if (!sharedAgent) sharedAgent = new https.Agent({ keepAlive: true, keepAliveMsecs: 15_000, maxSockets: 32, maxFreeSockets: 8 });
  return sharedAgent;
}

/**
 * fetch-shaped POST/GET over a keep-alive agent. `init`: { method, headers, body?, signal? } (the shape razorpay() builds).
 * `opts.transport` / `opts.agent` are test seams. Rejects on a network error / abort (as fetch does); a non-2xx answer resolves.
 */
function keepAliveFetch(url, init = {}, opts = {}) {
  const transport = opts.transport || https;
  const agent = opts.agent === undefined ? (transport === https ? razorpayAgent() : undefined) : opts.agent;
  return new Promise((resolve, reject) => {
    const signal = init.signal;
    if (signal && signal.aborted) {
      reject(signal.reason || new Error('aborted'));
      return;
    }
    const target = new URL(url);
    const body = init.body === undefined ? null : Buffer.from(String(init.body));
    const headers = { ...(init.headers || {}) };
    if (body) headers['Content-Length'] = String(body.length);
    const req = transport.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || undefined,
        path: `${target.pathname}${target.search}`,
        method: init.method || 'GET',
        headers,
        ...(agent ? { agent } : {}),
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('error', reject);
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          const status = res.statusCode || 0;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            json: async () => JSON.parse(text),
          });
        });
      },
    );
    const onAbort = () => req.destroy(signal.reason || new Error('aborted'));
    if (signal && typeof signal.addEventListener === 'function') signal.addEventListener('abort', onAbort, { once: true });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

/** Run `fn` and never throw: { ok: true, value } | { ok: false, error }. Lets two reads start together and be judged in the OLD order. */
function settle(fn) {
  try {
    return Promise.resolve(fn()).then(
      (value) => ({ ok: true, value }),
      (error) => ({ ok: false, error }),
    );
  } catch (error) {
    return Promise.resolve({ ok: false, error });
  }
}

module.exports = { isOrderParallelDisabled, isOrderKeepAliveDisabled, keepAliveFetch, settle, razorpayAgent };
