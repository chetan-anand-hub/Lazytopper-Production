// RECEIPT-EMAIL-1 - the ONE live receipt email (PAY-PHONE-1 emailer, extended): every address held for the purchase, the
// masked sign-in of the account it landed on, after the attach decision, once per order, exempt from the one-a-day ledgers.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createPaymentReceiptEmailer } = require('./paymentReceiptEmail.cjs');

const NOW = Date.parse('2030-06-15T04:30:00.000Z');
const ENV = { PAYMENT_EMAIL_ENABLED: '1', RESEND_API_KEY: 're_test_key' };

function makeDb(seed = {}) {
  const docs = new Map(Object.entries(seed));
  const writes = [];
  const ref = (col, id) => ({
    async get() {
      const d = docs.get(`${col}/${id}`);
      return { exists: d !== undefined, data: () => (d ? { ...d } : undefined) };
    },
    async set(data) {
      writes.push(`${col}/${id}`);
      docs.set(`${col}/${id}`, { ...(docs.get(`${col}/${id}`) || {}), ...data });
    },
  });
  return {
    docs,
    writes,
    collection: (col) => ({
      doc: (id) => ref(col, id),
      where(field, _op, value, filters = []) {
        const all = [...filters, [field, value]];
        return {
          where: (f2, op2, v2) => this.where(f2, op2, v2, all),
          limit: () => ({
            async get() {
              const rows = [...docs].filter(([k, v]) => k.startsWith(`${col}/`) && all.every(([f, x]) => v[f] === x));
              return { forEach: (fn) => rows.forEach(([k, v]) => fn({ id: k.split('/')[1], data: () => v })) };
            },
          }),
        };
      },
    }),
    chain: Promise.resolve(),
    runTransaction(fn) {
      const tx = { get: (r) => r.get(), set: (r, d) => r.set(d) };
      const next = this.chain.then(() => fn(tx));
      this.chain = next.catch(() => null);
      return next;
    },
  };
}

function makeFetch(status = 200) {
  const sent = [];
  const impl = async (url, init) => {
    const body = JSON.parse(init.body);
    sent.push({ to: body.to[0], subject: body.subject, text: body.text, html: body.html, key: init.headers['Idempotency-Key'] });
    return { ok: status < 400, status, json: async () => ({ id: `em_${sent.length}` }) };
  };
  impl.sent = sent;
  return impl;
}

const PASS = { status: 'paid', paymentId: 'pay_ABC123', passType: 'till_boards', amountPaise: 59900, uid: 'u1', paidAt: new Date(NOW) };
const ACCOUNT = { email: 'chetan@gmail.com', phoneNumber: '+919876543210', providerIds: ['google.com'] };

function make({ order = PASS, account = ACCOUNT, env = ENV, status, extra = {}, seed = {} } = {}) {
  const db = makeDb({ 'payOrders/order_X1': order, ...seed });
  const fetchImpl = makeFetch(status);
  const events = [];
  const emailer = createPaymentReceiptEmailer({
    adminFirestore: db,
    telemetry: { increment: (e) => events.push(e) },
    env,
    fetchImpl,
    now: () => NOW,
    getAuthUser: async () => account,
    ...extra,
  });
  return { db, fetchImpl, emailer, events };
}
const input = (extra = {}) => ({ orderId: 'order_X1', paymentId: 'pay_ABC123', email: 'parent@example.com', ...extra });

test('goes to the payer AND the account email when different; names the masked sign-ins, Board Pass, no "Premium"', async () => {
  const { emailer, fetchImpl, db } = make();
  await emailer.sendForPayment(input());
  assert.deepEqual(fetchImpl.sent.map((s) => s.to).sort(), ['chetan@gmail.com', 'parent@example.com']);
  const m = fetchImpl.sent[0];
  assert.match(m.text, /Sign in at lazytopper\.com with phone 98•••••210 \/ Google ch•••@gmail\.com to use it\./);
  assert.match(m.text, /Everything is unlocked till the Feb 2027 boards\./);
  assert.match(m.text, /Item: Board Pass\n/);
  assert.match(m.text, /Razorpay payment ID: pay_ABC123/);
  for (const s of fetchImpl.sent) assert.doesNotMatch(s.subject + s.text + s.html, /Premium/);
  assert.equal(db.docs.get('payOrders/order_X1').receiptEmail.status, 'sent');
});

test('SIGNED-IN-MOVE-1 - a MOVED order: the receipt names the account it now sits on (order.uid), says it was moved, never the old sign-ins', async () => {
  const OLD = { email: 'oldbuyer@gmail.com', phoneNumber: '+919000000001', providerIds: ['google.com'] };
  const NEW = { phoneNumber: '+919876543210', providerIds: ['phone'] };
  const { emailer, fetchImpl } = make({
    order: { ...PASS, uid: 'child', movedToOtherAt: new Date(NOW), movedFromUid: 'buyer' },
    extra: { getAuthUser: async (uid) => (uid === 'child' ? NEW : OLD) },
  });
  await emailer.sendForPayment(input());
  const body = fetchImpl.sent.map((s) => s.text).join('\n');
  assert.match(body, /moved to the account you chose/i);
  assert.match(body, /98•••••210/);
  assert.doesNotMatch(body, /ol•••@gmail|oldbuyer|90•••••001|9000000001/);
  const plain = make();
  await plain.emailer.sendForPayment(input());
  assert.doesNotMatch(plain.fetchImpl.sent.map((s) => s.text).join('\n'), /moved to the account you chose/i);
});

test('a pack says My packs; the same address (payer = account) gets ONE email', async () => {
  const { emailer, fetchImpl } = make({ order: { ...PASS, passType: 'pack_chapter', packTarget: 'human-eye-and-colourful-world', amountPaise: 5800 } });
  await emailer.sendForPayment(input({ email: 'Chetan@Gmail.com' }));
  assert.equal(fetchImpl.sent.length, 1);
  assert.match(fetchImpl.sent[0].text, /My packs to download/);
});

test('exactly once per order: replay, duplicate webhook and racing verify + claim send nothing more', async () => {
  const { emailer, fetchImpl } = make({ account: { ...ACCOUNT, email: '' } });
  await Promise.all([emailer.sendForPayment(input()), emailer.sendForPayment(input())]);
  await emailer.sendForPayment(input());
  await emailer.sendForPayment(input());
  assert.equal(fetchImpl.sent.length, 1);
});

test('B2 · a "someone else" order: the PAYER (via the Razorpay record) AND the recipient each get exactly one email', async () => {
  const order = { ...PASS, status: 'claimed', payer: 'guest', checkoutWho: true, guestEmail: 'recipient@example.com', guestPhone: '+919000000001', uid: 'u9' };
  const { emailer, fetchImpl } = make({
    order,
    account: { email: '', phoneNumber: '+919123456789', providerIds: ['phone'] },
    extra: { fetchPayment: async () => ({ email: 'payer@example.com' }) },
  });
  await emailer.sendForPayment({ orderId: 'order_X1', paymentId: 'pay_ABC123', email: '' }); // after the attach / claim grant: no email in hand
  await emailer.sendRecipientReady({ orderId: 'order_X1', paymentId: 'pay_ABC123' });
  await emailer.sendForPayment({ orderId: 'order_X1', paymentId: 'pay_ABC123', email: '' });
  assert.deepEqual(fetchImpl.sent.map((s) => s.to).sort(), ['payer@example.com', 'recipient@example.com']);
  const payer = fetchImpl.sent.find((s) => s.to === 'payer@example.com');
  assert.match(payer.text, /phone 91•••••789/);
  assert.doesNotMatch(payer.text, /9123456789|recipient@example/);
});

test('attach hold: nothing until the choice or the 10-minute fallback; then ONE email naming the chosen account; the sweep covers a restart', async () => {
  const held = { ...PASS, status: 'paid_unclaimed', uid: null, payer: 'guest', attachFlow: true, guestPaidAt: new Date(NOW - 60_000), guestPhone: '+919000000001' };
  let clock = NOW;
  const db = makeDb({ 'payOrders/order_X1': held });
  const fetchImpl = makeFetch();
  const emailer = createPaymentReceiptEmailer({
    adminFirestore: db, env: ENV, fetchImpl, now: () => clock, getAuthUser: async () => ACCOUNT,
    fetchPayment: async () => ({ email: 'buyer@example.com' }),
  });
  const r = await emailer.sendForPayment({ orderId: 'order_X1', paymentId: 'pay_ABC123', email: 'buyer@example.com' });
  assert.equal(r.skipped, 'attach_hold');
  assert.equal(fetchImpl.sent.length, 0);
  // the payer attaches it to an account: the grant calls the receipt again
  db.docs.set('payOrders/order_X1', { ...held, status: 'claimed', uid: 'u9', attachedAt: new Date(NOW) });
  await emailer.sendForPayment({ orderId: 'order_X1', paymentId: 'pay_ABC123', email: '' });
  await emailer.sendForPayment({ orderId: 'order_X1', paymentId: 'pay_ABC123', email: '' });
  assert.equal(fetchImpl.sent.filter((s) => s.to === 'buyer@example.com').length, 1);
  assert.match(fetchImpl.sent[0].text, /Sign in at lazytopper\.com with phone 98•••••210/);
  // fallback with nobody choosing: the hourly sweep sends once the hold is over (a paid-but-unclaimed order is never left with no email)
  const db2 = makeDb({ 'payOrders/order_X1': held });
  const f2 = makeFetch();
  const e2 = createPaymentReceiptEmailer({ adminFirestore: db2, env: ENV, fetchImpl: f2, now: () => clock, fetchPayment: async () => ({ email: 'buyer@example.com' }) });
  assert.equal(await e2.drainHeldReceipts(), 0);
  clock = NOW + 11 * 60_000;
  assert.equal(await e2.drainHeldReceipts(), 1);
  assert.equal(await e2.drainHeldReceipts(), 0);
  assert.equal(f2.sent.length, 1);
});

test('a plain paid-but-unclaimed pay-first order still gets its capture-time receipt (the live behaviour)', async () => {
  const unclaimed = { ...PASS, status: 'paid_unclaimed', uid: null, payer: 'guest', guestPhone: '+919000000001' };
  const { emailer, fetchImpl } = make({ order: unclaimed });
  await emailer.sendForPayment(input());
  assert.equal(fetchImpl.sent.length, 1);
  assert.match(fetchImpl.sent[0].text, /phone number \+91 90•••••001/);
});

test('no address held -> no email and the order stays unmarked; placeholder address is no address', async () => {
  const { emailer, fetchImpl, db } = make({ account: { email: '', phoneNumber: '+919876543210' } });
  await emailer.sendForPayment(input({ email: 'void@razorpay.com' }));
  assert.equal(fetchImpl.sent.length, 0);
  assert.equal(db.docs.get('payOrders/order_X1').receiptEmail, undefined);
});

test('kill switch RECEIPT_EMAIL_DISABLED silences receipt and recipient-ready; PAYMENT_EMAIL_ENABLED unset is off', async () => {
  for (const env of [{ ...ENV, RECEIPT_EMAIL_DISABLED: '1' }, { RESEND_API_KEY: 're_x' }]) {
    const { emailer, fetchImpl } = make({ env, order: { ...PASS, checkoutWho: true, payer: 'guest', guestEmail: 'r@example.com' } });
    await emailer.sendForPayment(input());
    await emailer.sendRecipientReady({ orderId: 'order_X1', paymentId: 'pay_ABC123' });
    assert.equal(fetchImpl.sent.length, 0);
  }
});

test('cap exemption: sent with every one-a-day ledger full, writes to none, and no cap owner reads the receipt marker', async () => {
  const today = { lastClaimMs: NOW - 1000, count: 9999 };
  const seed = {
    'nudgeEmails/u1': today, 'trialEmails/u1': { status: 'sent', sentAt: new Date(NOW - 1000) }, 'guestNudgeEmails/k': today,
    'nudgeEmailDaily/2030-06-15': today, 'trialEmailDaily/2030-06-15': today, 'gstInvoiceEmailDaily/2030-06-15': today,
  };
  const { emailer, fetchImpl, db } = make({ seed });
  const ledgers = () => JSON.stringify([...db.docs].filter(([k]) => !k.startsWith('payOrders/')));
  const before = ledgers();
  await emailer.sendForPayment(input());
  assert.equal(fetchImpl.sent.length, 2);
  assert.equal(ledgers(), before);
  assert.ok(db.writes.every((w) => w.startsWith('payOrders/')));
  for (const f of ['nudgeEmail.cjs', 'trialEndingEmail.cjs', 'guestAbandonEmail.cjs']) {
    assert.doesNotMatch(fs.readFileSync(path.join(__dirname, f), 'utf8'), /receiptEmail\b/, f);
  }
});

test('a send failure never throws; only a retryable total failure frees the claim', async () => {
  const a = make({ status: 503, account: { ...ACCOUNT, email: '' } });
  assert.equal((await a.emailer.sendForPayment(input())).sent, false);
  assert.equal(a.db.docs.get('payOrders/order_X1').receiptEmail.status, 'failed');
  const b = make({ status: 422, account: { ...ACCOUNT, email: '' } });
  await b.emailer.sendForPayment(input());
  await b.emailer.sendForPayment(input());
  assert.equal(b.fetchImpl.sent.length, 1);
  const boom = createPaymentReceiptEmailer({ adminFirestore: { collection: () => { throw new Error('down'); } }, env: ENV, fetchImpl: makeFetch(), now: () => NOW });
  assert.deepEqual(await boom.sendForPayment(input()), { error: true });
});

test('the body carries no full phone / address; copy rules hold', async () => {
  const { emailer, fetchImpl } = make({ order: { ...PASS, guestPhone: '+919876543210' } });
  await emailer.sendForPayment(input());
  for (const m of fetchImpl.sent) {
    for (const body of [m.text, m.html]) {
      assert.doesNotMatch(body, /9876543210|chetan@gmail|parent@example/);
      assert.doesNotMatch(body, /\bAI\b|answer key|optional|refund|<s>|<del>|line-through/i);
    }
  }
});

test('sweep (R3): only attach orders paid in the last 7 days; an address-less order is marked done, not re-looked-up forever', async () => {
  const mk = (extra) => ({ ...PASS, status: 'paid_unclaimed', uid: null, payer: 'guest', attachFlow: true, guestPaidAt: new Date(NOW - 20 * 60_000), ...extra });
  const seed = {
    'payOrders/order_new': mk({ paymentId: 'pay_new' }),
    'payOrders/order_old': mk({ paymentId: 'pay_old', guestPaidAt: new Date(NOW - 8 * 24 * 3600_000) }),
    'payOrders/order_noaddr': mk({ paymentId: 'pay_na' }),
    'payOrders/order_plain': { ...PASS, status: 'paid_unclaimed', uid: null, payer: 'guest', paymentId: 'pay_pl', guestPaidAt: new Date(NOW - 20 * 60_000) },
  };
  const lookups = [];
  const { emailer, fetchImpl, db } = make({
    seed,
    extra: { fetchPayment: async (pid) => { lookups.push(pid); return pid === 'pay_na' ? { email: '' } : { email: 'b@example.com' }; } },
  });
  assert.equal(await emailer.drainHeldReceipts(), 2);
  assert.deepEqual(fetchImpl.sent.map((s) => s.key).sort(), ['payment-receipt-pay_new']);
  assert.ok(!lookups.includes('pay_old') && !lookups.includes('pay_pl'), 'old / non-attach orders are never touched');
  assert.equal(db.docs.get('payOrders/order_noaddr').receiptEmail.status, 'no_address');
  const before = lookups.length;
  await emailer.drainHeldReceipts();
  assert.ok(!lookups.slice(before).includes('pay_na'), 'not looked up again');
});

const sweepOrder = (extra = {}) => ({ ...PASS, status: 'paid_unclaimed', uid: null, payer: 'guest', attachFlow: true, guestPaidAt: new Date(NOW - 20 * 60_000), ...extra });

test('RECEIPT-RACE-1 R5 - sweep never overwrites a receipt sent meanwhile; absent / failed still becomes no_address', async () => {
  for (const [prior, expected] of [[{ status: 'sent', at: new Date(NOW) }, 'sent'], [{ status: 'refused', at: new Date(NOW) }, 'refused'], [{ status: 'failed', at: new Date(NOW) }, 'no_address'], [undefined, 'no_address']]) {
    const seed = { 'payOrders/order_R': sweepOrder({ paymentId: 'pay_R', ...(prior && prior.status === 'failed' ? { receiptEmail: prior } : {}) }) };
    const { emailer, db } = make({
      seed,
      extra: {
        fetchPayment: async () => {
          // the attach / claim grant path lands between the sweep's run() and its settle write
          if (prior && prior.status !== 'failed') db.docs.set('payOrders/order_R', { ...db.docs.get('payOrders/order_R'), receiptEmail: prior });
          return { email: '' };
        },
      },
    });
    await emailer.drainHeldReceipts();
    assert.equal(db.docs.get('payOrders/order_R').receiptEmail.status, expected);
  }
});

test('RECEIPT-RACE-1 R4 - a stale `sending` claim is re-claimed (same idempotency key); a fresh one is not', async () => {
  const stale = { ...PASS, receiptEmail: { status: 'sending', at: new Date(NOW - 31 * 60_000) } };
  const a = make({ order: stale });
  await a.emailer.sendForPayment(input());
  assert.ok(a.fetchImpl.sent.length >= 1);
  assert.ok(a.fetchImpl.sent.every((m) => /^payment-receipt-pay_ABC123(-\d+)?$/.test(m.key)));
  assert.equal(a.db.docs.get('payOrders/order_X1').receiptEmail.status, 'sent');

  const fresh = { ...PASS, receiptEmail: { status: 'sending', at: new Date(NOW - 5 * 60_000) } };
  const b = make({ order: fresh });
  await b.emailer.sendForPayment(input());
  assert.equal(b.fetchImpl.sent.length, 0);
  assert.equal(b.db.docs.get('payOrders/order_X1').receiptEmail.status, 'sending');
});

test('RECEIPT-RACE-1 R4 - the sweep picks up a stale `sending` attach order but not a fresh one', async () => {
  const seed = {
    'payOrders/order_st': sweepOrder({ paymentId: 'pay_st', receiptEmail: { status: 'sending', at: new Date(NOW - 40 * 60_000) } }),
    'payOrders/order_fr': sweepOrder({ paymentId: 'pay_fr', receiptEmail: { status: 'sending', at: new Date(NOW - 60_000) } }),
  };
  const { emailer, fetchImpl } = make({ seed, extra: { fetchPayment: async () => ({ email: 'b@example.com' }) } });
  assert.equal(await emailer.drainHeldReceipts(), 1);
  assert.deepEqual(fetchImpl.sent.map((s) => s.key), ['payment-receipt-pay_st']);
});
