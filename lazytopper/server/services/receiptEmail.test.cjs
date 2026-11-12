// RECEIPT-EMAIL-1 - one "Your LazyTopper <item> is ready" email per granted order.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createReceiptEmailer, resolveReceiptConfig, buildReadyEmail, maskPhone, maskMail } = require('./receiptEmail.cjs');

const NOW = Date.parse('2030-06-15T04:30:00.000Z');
const ENV = { RESEND_API_KEY: 're_test_key' };

function makeDb(seed = {}) {
  const docs = new Map(Object.entries(seed));
  const writes = [];
  const ref = (col, id) => ({
    path: `${col}/${id}`,
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
    collection: (col) => ({ doc: (id) => ref(col, id) }),
    // Serialised, like a contended Firestore transaction (it retries): the second runner sees the first one's write.
    chain: Promise.resolve(),
    runTransaction(fn) {
      const tx = { get: (r) => r.get(), set: (r, d) => r.set(d) };
      const next = this.chain.then(() => fn(tx));
      this.chain = next.catch(() => null);
      return next;
    },
  };
}

function makeFetch(plan = () => ({ ok: true, status: 200 })) {
  const sent = [];
  const impl = async (url, init) => {
    const body = JSON.parse(init.body);
    sent.push({ url, to: body.to[0], subject: body.subject, text: body.text, html: body.html, key: init.headers['Idempotency-Key'] });
    const r = plan(body, sent.length);
    return { ok: r.ok, status: r.status, json: async () => ({ id: `em_${sent.length}` }) };
  };
  impl.sent = sent;
  return impl;
}

const ORDER = {
  status: 'paid', paymentId: 'pay_ABC123', passType: 'till_boards', amountPaise: 59900, uid: 'u1', paidAt: new Date(NOW),
};
const ACCOUNT = { email: 'chetan@gmail.com', phoneNumber: '+919876543210', providerIds: ['google.com'] };

function make({ order = ORDER, orders, account = ACCOUNT, env = ENV, plan, extra = {}, seed = {} } = {}) {
  const db = makeDb({ 'payOrders/order_X1': order, ...(orders || {}), ...seed });
  const fetchImpl = makeFetch(plan);
  const telemetryEvents = [];
  const emailer = createReceiptEmailer({
    adminFirestore: db,
    telemetry: { increment: (e) => telemetryEvents.push(e) },
    env,
    fetchImpl,
    now: () => NOW,
    getAuthUser: async () => account,
    ...extra,
  });
  return { db, fetchImpl, emailer, telemetryEvents };
}

test('sends one email with the spec subject and body, masked sign-ins, to the buyer and the account email', async () => {
  const { emailer, fetchImpl, db } = make();
  await emailer.sendForOrder({ orderId: 'order_X1', buyerEmail: 'parent@example.com' });
  assert.equal(fetchImpl.sent.length, 2);
  assert.deepEqual(fetchImpl.sent.map((s) => s.to).sort(), ['chetan@gmail.com', 'parent@example.com']);
  const m = fetchImpl.sent[0];
  assert.equal(m.subject, 'Your LazyTopper Board Pass (Premium till your boards) is ready');
  assert.match(m.text, /Thank you! Your Board Pass \(Premium till your boards\) \(₹599 incl\. GST\) is ready\./);
  assert.match(m.text, /phone 98•••••210 \/ Google ch•••@gmail\.com/);
  assert.match(m.text, /unlocked till the Feb 2027 boards/);
  assert.match(m.text, /Order X1 · 15 June 2030/);
  assert.match(m.text, /WhatsApp \+91 97145 68948/);
  const row = db.docs.get('payOrders/order_X1');
  assert.equal(row.receiptEmailStatus, 'sent');
  assert.ok(row.receiptEmailSentAt && row.receiptEmailAt);
});

test('a pack email says My packs and names the pack', async () => {
  const { emailer, fetchImpl } = make({ order: { ...ORDER, passType: 'pack_chapter', packTarget: 'human-eye-and-colourful-world', amountPaise: 5800 } });
  await emailer.sendForOrder({ orderId: 'order_X1' });
  assert.match(fetchImpl.sent[0].subject, /^Your LazyTopper Chapter Pack · Human Eye and Colourful World is ready$/);
  assert.match(fetchImpl.sent[0].text, /My packs to download/);
  assert.match(fetchImpl.sent[0].text, /₹58 incl\. GST/);
});

test('exactly once per order: replays, duplicate webhooks and racing verify+claim send nothing more', async () => {
  const { emailer, fetchImpl } = make({ account: { ...ACCOUNT, email: '' } });
  await Promise.all([
    emailer.sendForOrder({ orderId: 'order_X1', buyerEmail: 'parent@example.com' }),
    emailer.sendForOrder({ orderId: 'order_X1', buyerEmail: 'parent@example.com' }),
  ]);
  await emailer.sendForOrder({ orderId: 'order_X1', buyerEmail: 'parent@example.com' });
  await emailer.sendForOrder({ orderId: 'order_X1' });
  assert.equal(fetchImpl.sent.length, 1);
});

test('hold-then-attach: nothing while unclaimed; after the attach grant ONE email naming the chosen account', async () => {
  const unclaimed = { ...ORDER, status: 'paid_unclaimed', uid: null, guestPhone: '+919000000001', guestEmail: 'buyer@example.com', payer: 'guest' };
  const accounts = { u9: { email: '', phoneNumber: '+919123456789', providerIds: ['phone'] } };
  const { emailer, fetchImpl, db } = make({ order: unclaimed, extra: { getAuthUser: async (uid) => accounts[uid] || null } });
  await emailer.sendForOrder({ orderId: 'order_X1' });
  assert.equal(fetchImpl.sent.length, 0, 'not granted yet: no email');
  db.docs.set('payOrders/order_X1', { ...unclaimed, status: 'claimed', uid: 'u9' });
  await emailer.sendForOrder({ orderId: 'order_X1' });
  await emailer.sendForOrder({ orderId: 'order_X1' });
  assert.equal(fetchImpl.sent.length, 1);
  assert.equal(fetchImpl.sent[0].to, 'buyer@example.com');
  assert.match(fetchImpl.sent[0].text, /phone 91•••••789/);
  assert.doesNotMatch(fetchImpl.sent[0].text, /9000000001|90•••••001/);
});

test('no email address held -> no email, and the order stays unmarked', async () => {
  const { emailer, fetchImpl, db, telemetryEvents } = make({ account: { email: '', phoneNumber: '+919876543210', providerIds: ['phone'] } });
  await emailer.sendForOrder({ orderId: 'order_X1', buyerEmail: 'void@razorpay.com' });
  assert.equal(fetchImpl.sent.length, 0);
  assert.equal(db.docs.get('payOrders/order_X1').receiptEmailSentAt, undefined);
  assert.ok(telemetryEvents.includes('receipt_email_no_address'));
});

test('kill switch RECEIPT_EMAIL_DISABLED, and no key / foreign sender, send nothing', async () => {
  for (const env of [{ ...ENV, RECEIPT_EMAIL_DISABLED: '1' }, {}, { ...ENV, RECEIPT_EMAIL_FROM: 'X <x@gmail.com>' }]) {
    const { emailer, fetchImpl } = make({ env });
    await emailer.sendForOrder({ orderId: 'order_X1', buyerEmail: 'p@example.com' });
    assert.equal(fetchImpl.sent.length, 0);
  }
  assert.equal(resolveReceiptConfig(ENV).active, true);
  assert.equal(resolveReceiptConfig({ ...ENV, RECEIPT_EMAIL_DISABLED: 'true' }).active, false);
});

test('cap exemption: sent even with every one-a-day ledger full today, and writes to none of them', async () => {
  const today = { lastClaimMs: NOW - 1000, count: 9999 };
  const seed = {
    'nudgeEmails/u1': today, 'trialEmails/u1': { status: 'sent', sentAt: new Date(NOW - 1000) },
    'guestNudgeEmails/k': today, 'nudgeEmailDaily/2030-06-15': today, 'trialEmailDaily/2030-06-15': today,
    'gstInvoiceEmailDaily/2030-06-15': today,
  };
  const { emailer, fetchImpl, db } = make({ seed });
  const before = JSON.stringify([...db.docs].filter(([k]) => !k.startsWith('payOrders/')));
  await emailer.sendForOrder({ orderId: 'order_X1', buyerEmail: 'p@example.com' });
  assert.equal(fetchImpl.sent.length, 2);
  assert.equal(JSON.stringify([...db.docs].filter(([k]) => !k.startsWith('payOrders/'))), before, 'ledgers untouched');
  assert.ok(db.writes.every((w) => w.startsWith('payOrders/')), 'only the order doc is written');
  // ...and the emailers that DO own the cap never read the receipt marker, so a receipt cannot block or use a nudge slot.
  for (const f of ['nudgeEmail.cjs', 'trialEndingEmail.cjs', 'guestAbandonEmail.cjs', 'emailSendWindow.cjs']) {
    assert.doesNotMatch(fs.readFileSync(path.join(__dirname, f), 'utf8'), /receiptEmailSentAt|receiptEmailStatus/, f);
  }
  const src = fs.readFileSync(path.join(__dirname, 'receiptEmail.cjs'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(src, /lastClaimMs|resolveSendWindow|nudgeEmails|trialEmails|Daily/);
});

test('a send failure never throws and never fails the grant path; only a retryable failure releases the claim', async () => {
  const { emailer, fetchImpl, db, telemetryEvents } = make({ plan: () => ({ ok: false, status: 503 }), account: { ...ACCOUNT, email: '' } });
  const r = await emailer.sendForOrder({ orderId: 'order_X1', buyerEmail: 'p@example.com' });
  assert.equal(r.sent, 0);
  assert.equal(db.docs.get('payOrders/order_X1').receiptEmailStatus, 'failed');
  assert.ok(telemetryEvents.includes('receipt_email_failed'));
  assert.ok(telemetryEvents.some((e) => e.startsWith('receipt_email_failed.http_503')));
  const second = make({ plan: () => ({ ok: false, status: 422 }), account: { ...ACCOUNT, email: '' } });
  await second.emailer.sendForOrder({ orderId: 'order_X1', buyerEmail: 'p@example.com' });
  await second.emailer.sendForOrder({ orderId: 'order_X1', buyerEmail: 'p@example.com' });
  assert.equal(second.fetchImpl.sent.length, 1, 'a refused send is not retried');
  // a throwing store / network is swallowed
  const boom = createReceiptEmailer({ adminFirestore: { collection: () => { throw new Error('down'); } }, env: ENV, fetchImpl: makeFetch(), now: () => NOW });
  assert.deepEqual(await boom.sendForOrder({ orderId: 'order_X1' }), { error: true });
});

test('the body carries no full phone or address; copy rules hold', async () => {
  const { emailer, fetchImpl } = make({ order: { ...ORDER, guestPhone: '+919876543210', guestEmail: 'full.address@example.com' } });
  await emailer.sendForOrder({ orderId: 'order_X1', buyerEmail: 'parent@example.com' });
  for (const m of fetchImpl.sent) {
    for (const body of [m.text, m.html]) {
      assert.doesNotMatch(body, /9876543210|chetan@gmail|parent@example|full\.address@example/);
      assert.doesNotMatch(body, /\bAI\b|answer key|optional|refund|<s>|<del>|line-through/i);
    }
    assert.match(m.html, /<p>/);
  }
  assert.equal(maskPhone('+919876543210'), '98•••••210');
  assert.equal(maskMail('Chetan@Gmail.com'), 'ch•••@gmail.com');
  assert.equal(buildReadyEmail({ passType: 'topup_x', amountPaise: 100, orderId: 'o', paidAtMs: NOW }), null);
});

test('route wiring: the hook fires only after the grant, never in the legacy no-grant paths', () => {
  const read = (f) => fs.readFileSync(path.join(__dirname, '..', 'routes', f), 'utf8');
  const pay = read('payments.cjs');
  assert.ok(pay.indexOf('fireGrantReceipt(orderId, buyerEmail);\n      const body = {\n        ok: true,\n        replayed') > pay.indexOf('await grantPass('));
  const guest = read('guestPay.cjs');
  assert.ok(guest.indexOf("grantReceipt({ orderId })") > guest.indexOf("emit('payments.guest.claim.granted')"));
  assert.match(read('parentPay.cjs'), /fireGrantReceipt\(orderId, payment\)/);
});
