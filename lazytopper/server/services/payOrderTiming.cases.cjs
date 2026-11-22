// CHECKOUT-FAST-1 - the kill-switch grammar and settle(). Run via: node --test lazytopper/server/routes/guestPay.test.cjs (it requires this file)

const test = require('node:test');
const assert = require('node:assert/strict');

const { isOrderParallelDisabled, settle } = require('./payOrderTiming.cjs');

test('kill switch reads PAY_ORDER_PARALLEL_DISABLED; settle never throws', async () => {
  assert.equal(isOrderParallelDisabled({}), false);
  assert.equal(isOrderParallelDisabled({ PAY_ORDER_PARALLEL_DISABLED: '1' }), true);
  assert.equal(isOrderParallelDisabled({ PAY_ORDER_PARALLEL_DISABLED: '0' }), false);
  assert.deepEqual(await settle(async () => 5), { ok: true, value: 5 });
  const bad = await settle(() => { throw new Error('x'); });
  assert.equal(bad.ok, false);
  const rej = await settle(() => Promise.reject(new Error('y')));
  assert.equal(rej.ok, false);
});
