'use strict';

/**
 * CHECKOUT-FAST-1 - the order routes' timing helpers. TIMING ONLY: nothing here prices, stores, signs or grants.
 *  - PAY_ORDER_PARALLEL_DISABLED=1 -> the order routes run their independent reads in the OLD sequence (one after another).
 */

const truthy = (v) => /^(1|true|on|yes)$/i.test(String(v === undefined || v === null ? '' : v).trim());

function isOrderParallelDisabled(env = process.env) {
  return truthy(env && env.PAY_ORDER_PARALLEL_DISABLED);
}

/** Run `fn` and never throw: { ok: true, value } | { ok: false, error }. Lets reads start together and be judged in the OLD order. */
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

module.exports = { isOrderParallelDisabled, settle };
