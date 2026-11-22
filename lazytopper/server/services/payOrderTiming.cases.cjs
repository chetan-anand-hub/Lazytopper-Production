// CHECKOUT-FAST-1 - the kept-alive order transport and the kill switches. Run via: node --test lazytopper/server/routes/guestPay.test.cjs (it requires this file)

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { keepAliveFetch, isOrderParallelDisabled, isOrderKeepAliveDisabled, settle } = require('./payOrderTiming.cjs');

async function localServer(handler) {
  let connections = 0;
  const server = http.createServer(handler);
  server.on('connection', () => { connections += 1; });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}`, connections: () => connections, close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r); }) };
}

test('keepAliveFetch: two requests share ONE socket; method, headers and body arrive; the answer is fetch-shaped', async () => {
  const seen = [];
  const srv = await localServer((req, res) => {
    let body = '';
    req.on('data', (d) => { body += d; });
    req.on('end', () => {
      seen.push({ method: req.method, auth: req.headers.authorization, ct: req.headers['content-type'], body });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: 'order_X', amount: 123 }));
    });
  });
  const agent = new http.Agent({ keepAlive: true, maxSockets: 4 });
  try {
    const init = { method: 'POST', headers: { Authorization: 'Basic abc', 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 123 }) };
    const a = await keepAliveFetch(`${srv.url}/v1/orders`, init, { transport: http, agent });
    const b = await keepAliveFetch(`${srv.url}/v1/orders`, init, { transport: http, agent });
    assert.equal(a.ok, true);
    assert.equal(a.status, 200);
    assert.deepEqual(await a.json(), { id: 'order_X', amount: 123 });
    assert.deepEqual(await b.json(), { id: 'order_X', amount: 123 });
    assert.deepEqual(seen[0], { method: 'POST', auth: 'Basic abc', ct: 'application/json', body: '{"amount":123}' });
    assert.equal(srv.connections(), 1, 'the second request reused the first socket');
  } finally {
    agent.destroy();
    await srv.close();
  }
});

test('keepAliveFetch: a non-2xx answer resolves with ok:false (as fetch does); an unreadable body is a rejected json(); an abort rejects', async () => {
  const srv = await localServer((req, res) => {
    if (req.url === '/slow') return; // never answers
    res.writeHead(req.url === '/bad' ? 400 : 502);
    res.end(req.url === '/bad' ? '{"error":{"code":"BAD_REQUEST_ERROR"}}' : 'not json');
  });
  const agent = new http.Agent({ keepAlive: true });
  try {
    const bad = await keepAliveFetch(`${srv.url}/bad`, { method: 'POST', body: '{}' }, { transport: http, agent });
    assert.deepEqual([bad.ok, bad.status], [false, 400]);
    assert.equal((await bad.json()).error.code, 'BAD_REQUEST_ERROR');
    const html = await keepAliveFetch(`${srv.url}/html`, { method: 'GET' }, { transport: http, agent });
    assert.deepEqual([html.ok, html.status], [false, 502]);
    await assert.rejects(() => html.json());
    await assert.rejects(() => keepAliveFetch(`${srv.url}/slow`, { method: 'GET', signal: AbortSignal.timeout(80) }, { transport: http, agent }));
    await assert.rejects(() => keepAliveFetch(`${srv.url}/bad`, { method: 'GET', signal: AbortSignal.abort() }, { transport: http, agent }));
  } finally {
    agent.destroy();
    await srv.close();
  }
});

test('kill switches read PAY_ORDER_PARALLEL_DISABLED / PAY_ORDER_KEEPALIVE_DISABLED; settle never throws', async () => {
  assert.equal(isOrderParallelDisabled({}), false);
  assert.equal(isOrderParallelDisabled({ PAY_ORDER_PARALLEL_DISABLED: '1' }), true);
  assert.equal(isOrderParallelDisabled({ PAY_ORDER_PARALLEL_DISABLED: '0' }), false);
  assert.equal(isOrderKeepAliveDisabled({}), false);
  assert.equal(isOrderKeepAliveDisabled({ PAY_ORDER_KEEPALIVE_DISABLED: 'true' }), true);
  assert.deepEqual(await settle(async () => 5), { ok: true, value: 5 });
  const bad = await settle(() => { throw new Error('x'); });
  assert.equal(bad.ok, false);
  const rej = await settle(() => Promise.reject(new Error('y')));
  assert.equal(rej.ok, false);
});
