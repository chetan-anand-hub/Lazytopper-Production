/**
 * QR answer-handoff channel — acceptance gate.
 *
 * WHY THIS IS A CI GATE AND NOT A vitest FILE: vitest is linux-pinned and does not
 * run on a Windows dev box, and CI runs the MATRICES, not the general vitest suite —
 * so a vitest file asserting these properties would never actually run anywhere that
 * blocks a merge. The security claims below are load-bearing (the token IS the
 * credential for the phone), so they are proven here, in the matrix, on every PR.
 *
 * Drives the REAL channel module against in-memory fakes of the exact firebase-admin
 * Firestore + Storage surfaces it calls. What it pins:
 *   - the QR token is WRITE-ONLY (it cannot read the image back)
 *   - single-use on both ends; delete-on-pickup (retention control for a minor's work)
 *   - TTL expiry, honest states, never a fake success
 *   - per-UID isolation and cap
 *   - tokens are stored HASHED, never raw
 *   - fail-closed when firebase-admin is unavailable
 *
 * If a future change breaks any of these, this goes red before it reaches a student.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LAZY = path.join(__dirname, '..', '..');

process.env.VITE_FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'lazzyy-topper';
delete process.env.VITE_FIREBASE_STORAGE_BUCKET;

const { createQrUploadChannel, __internals } = require(
  path.join(__dirname, '..', '..', 'server', 'services', 'qrUploadChannel.cjs'),
);

// ── Fakes: the minimal firebase-admin surface the channel actually uses ───────
function makeFirestore() {
  const docs = new Map();
  const collection = () => ({
    doc: (id) => ({
      id,
      async set(data) { docs.set(id, { ...data }); },
      async get() {
        const d = docs.get(id);
        return { exists: docs.has(id), id, data: () => (d ? { ...d } : undefined), ref: collection().doc(id) };
      },
      async update(patch) { docs.set(id, { ...docs.get(id), ...patch }); },
      async delete() { docs.delete(id); },
    }),
    where(field, _op, value) {
      const match = () => [...docs.entries()].filter(([, d]) => d[field] === value);
      const build = (entries) => ({
        empty: entries.length === 0,
        docs: entries.map(([id, d]) => ({ id, data: () => ({ ...d }), ref: collection().doc(id) })),
      });
      return {
        limit: (n) => ({ async get() { return build(match().slice(0, n)); } }),
        async get() { return build(match()); },
      };
    },
  });
  return { collection, _docs: docs };
}

function makeStorage() {
  const objects = new Map();
  return {
    storage: () => ({
      bucket: () => ({
        file: (p) => ({
          async save(buf) { objects.set(p, buf); },
          async download() {
            if (!objects.has(p)) throw new Error(`no such object: ${p}`);
            return [objects.get(p)];
          },
          async delete() { objects.delete(p); },
        }),
      }),
    }),
    _objects: objects,
  };
}

let pass = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { failures.push(name); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}

const IMG = Buffer.from('hello-handwritten-answer').toString('base64');
const payload = { imageBase64: IMG, imageMimeType: 'image/jpeg' };
const newChannel = () => {
  const adminFirestore = makeFirestore();
  const firebaseAdmin = makeStorage();
  return { ch: createQrUploadChannel({ firebaseAdmin, adminFirestore }), fs: adminFirestore, st: firebaseAdmin };
};

console.log('\nQR upload channel — acceptance\n');

// 1 · Round trip + delete-on-pickup
{
  const { ch, fs, st } = newChannel();
  check('isAvailable() true when admin + bucket resolve', ch.isAvailable() === true);

  const slot = await ch.mintSlot('uid-alice');
  check('the two tokens are DIFFERENT', slot.uploadToken !== slot.pickupToken);
  check('tokens are 256-bit (43-char base64url)', slot.uploadToken.length >= 43 && slot.pickupToken.length >= 43);

  const peek = await ch.peekSlot(slot.uploadToken);
  check('peek reports liveness and leaks no image', peek.ok === true && !('imageBase64' in peek));

  check('phone upload accepted', (await ch.putBlob(slot.uploadToken, payload)).ok === true);
  check('blob is stored under the minting uid', [...st._objects.keys()][0].startsWith('qr-uploads/uid-alice/'));

  const got = await ch.consumeSlot(slot.pickupToken);
  check('desktop pickup returns the exact image', got.ok === true && got.imageBase64 === IMG);
  check('RETENTION: blob deleted from Storage on pickup', st._objects.size === 0);
  check('RETENTION: coordination doc deleted on pickup', fs._docs.size === 0);
}

// 2 · WRITE-ONLY — the property the whole no-login-on-phone decision rests on
{
  const { ch } = newChannel();
  const slot = await ch.mintSlot('uid-alice');
  await ch.putBlob(slot.uploadToken, payload);
  check('WRITE-ONLY: the QR uploadToken CANNOT pick the image up',
    (await ch.consumeSlot(slot.uploadToken)).ok === false);
  check('WRITE-ONLY: the desktop pickupToken still works afterwards',
    (await ch.consumeSlot(slot.pickupToken)).imageBase64 === IMG);
}

// 3 · Single-use, both ends
{
  const { ch } = newChannel();
  const slot = await ch.mintSlot('uid-alice');
  await ch.putBlob(slot.uploadToken, payload);
  const second = await ch.putBlob(slot.uploadToken, payload);
  check('SINGLE-USE: a slot accepts exactly one image', second.ok === false && second.reason === 'used');
  await ch.consumeSlot(slot.pickupToken);
  const again = await ch.consumeSlot(slot.pickupToken);
  check('SINGLE-USE: a consumed slot cannot be replayed', again.ok === false && again.reason === 'expired');
}

// 4 · Honest states — never a fake success, never a silent hang
{
  const { ch, fs } = newChannel();
  check('unknown pickup token -> expired', (await ch.consumeSlot('made-up-token-aaaaaaaaaaaaaaaa')).reason === 'expired');
  check('unknown upload token -> expired', (await ch.peekSlot('made-up-token-aaaaaaaaaaaaaaaa')).reason === 'expired');

  const slot = await ch.mintSlot('uid-alice');
  check('nothing uploaded yet -> waiting (not ready, not expired)',
    (await ch.consumeSlot(slot.pickupToken)).reason === 'waiting');

  const id = [...fs._docs.keys()][0];
  fs._docs.set(id, { ...fs._docs.get(id), expiresAt: Date.now() - 1 });
  check('past TTL -> expired', (await ch.consumeSlot(slot.pickupToken)).reason === 'expired');
  check('an expired slot is swept out of Firestore', fs._docs.size === 0);
}

// 5 · Validation is the EXISTING mentorImageSupport gate, not a second one
{
  const { ch } = newChannel();
  const slot = await ch.mintSlot('uid-alice');
  check('rejects a disallowed mime type',
    (await ch.putBlob(slot.uploadToken, { imageBase64: IMG, imageMimeType: 'image/gif' })).reason === 'invalid');
  check('rejects a data: URL prefix (raw base64 only)',
    (await ch.putBlob(slot.uploadToken, { imageBase64: `data:image/jpeg;base64,${IMG}`, imageMimeType: 'image/jpeg' })).reason === 'invalid');
  check('rejects an over-3MB image',
    (await ch.putBlob(slot.uploadToken, { imageBase64: 'A'.repeat(5 * 1024 * 1024), imageMimeType: 'image/jpeg' })).reason === 'invalid');
  check('a rejected upload leaves the slot usable', (await ch.putBlob(slot.uploadToken, payload)).ok === true);
}

// 6 · Per-UID isolation + cap (the cap is per-UID because an IP cap would throttle
//     a whole school behind one NAT — see qrUploadChannel.cjs)
{
  const { ch } = newChannel();
  const alice = await ch.mintSlot('uid-alice');
  const bob = await ch.mintSlot('uid-bob');
  await ch.putBlob(alice.uploadToken, payload);
  check("ISOLATION: bob's pickupToken cannot read alice's image",
    (await ch.consumeSlot(bob.pickupToken)).ok === false);
  check("ISOLATION: alice's own pickup still works",
    (await ch.consumeSlot(alice.pickupToken)).imageBase64 === IMG);

  const { ch: ch2, fs: fs2 } = newChannel();
  for (let i = 0; i < 12; i++) await ch2.mintSlot('uid-spammer');
  check('CAP: per-UID cap bounds live slots (<=5)', fs2._docs.size <= 5, `docs=${fs2._docs.size}`);
}

// 7 · Tokens stored hashed, never raw
{
  const { ch, fs } = newChannel();
  const slot = await ch.mintSlot('uid-alice');
  const dump = JSON.stringify([...fs._docs.entries()]);
  check('raw uploadToken is NEVER persisted', !dump.includes(slot.uploadToken));
  check('raw pickupToken is NEVER persisted', !dump.includes(slot.pickupToken));
  check('doc id is sha256(uploadToken)', fs._docs.has(__internals.sha256(slot.uploadToken)));
}

// 8 · Fail-closed + bucket resolution needs no new Railway env var
{
  const ch = createQrUploadChannel({ firebaseAdmin: null, adminFirestore: null });
  check('fail-closed: unavailable without firebase-admin (honest 503, never a hang)', ch.isAvailable() === false);
  check('bucket derives from projectId with no new env var',
    __internals.resolveBucketName() === 'lazzyy-topper.firebasestorage.app', __internals.resolveBucketName());
  process.env.VITE_FIREBASE_STORAGE_BUCKET = 'gs://explicit.firebasestorage.app';
  check('explicit VITE_FIREBASE_STORAGE_BUCKET wins, gs:// stripped',
    __internals.resolveBucketName() === 'explicit.firebasestorage.app', __internals.resolveBucketName());
  delete process.env.VITE_FIREBASE_STORAGE_BUCKET;
}

// 9 · PDF fidelity — a PDF is NOT an image and must survive the channel untouched.
//     Guards the "PDF lands but the grader can't read it" class of bug for good.
{
  const { ch } = newChannel();
  // A structurally real PDF (header, objects, trailer, %%EOF) with pseudo-binary
  // filler — adversarial bytes, not 'AAAA'.
  const head = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    'latin1',
  );
  const tail = Buffer.from('\ntrailer\n<< /Root 1 0 R /Size 4 >>\n%%EOF\n', 'latin1');
  const pad = Buffer.alloc(64 * 1024);
  for (let i = 0; i < pad.length; i++) pad[i] = (i * 31 + 7) & 0xff;
  const pdf = Buffer.concat([head, pad, tail]);
  const b64In = pdf.toString('base64');

  const slot = await ch.mintSlot('uid-pdf', 'document');
  check('PDF: upload accepted', (await ch.putBlob(slot.uploadToken, { imageBase64: b64In, imageMimeType: 'application/pdf' })).ok === true);
  const got = await ch.consumeSlot(slot.pickupToken);
  check('PDF: base64 is byte-identical in==out', got.ok === true && got.imageBase64 === b64In);
  check('PDF: mime survives as application/pdf', got.imageMimeType === 'application/pdf');
  const back = Buffer.from(got.imageBase64 || '', 'base64');
  check('PDF: still a valid PDF after the round-trip (%PDF … %%EOF)',
    back.subarray(0, 5).toString('latin1') === '%PDF-' && back.subarray(-6).toString('latin1').includes('%%EOF'));
  check('PDF: byte length unchanged', back.length === pdf.length);
}

// 10 · Variant — the host's shape must reach the PHONE, which is reached by token
//      alone. Wrong words here make a student photograph page 1 of a 20-question mock.
{
  const { ch } = newChannel();
  const doc = await ch.mintSlot('uid-v', 'document');
  check('variant: mint echoes "document"', doc.variant === 'document');
  check('variant: peek reports it to the phone', (await ch.peekSlot(doc.uploadToken)).variant === 'document');

  const photo = await ch.mintSlot('uid-v2', 'photo');
  check('variant: "photo" round-trips', photo.variant === 'photo' && (await ch.peekSlot(photo.uploadToken)).variant === 'photo');

  // The C&I question-side handoff. Without the server allowlisting "question", this coerces
  // back to "document" and the phone shows a question student "your answers" — the exact bug
  // the third mode exists to kill. Mint AND peek must both read "question".
  const question = await ch.mintSlot('uid-vq', 'question');
  check('variant: "question" round-trips (C&I question-side QR reads back as itself, not "document")',
    question.variant === 'question' && (await ch.peekSlot(question.uploadToken)).variant === 'question');

  const junk = await ch.mintSlot('uid-v3', 'nonsense');
  check('variant: unknown input defaults to the SAFER "document" wording', junk.variant === 'document');
  const bare = await ch.mintSlot('uid-v4');
  check('variant: absent input defaults to "document"', bare.variant === 'document');

  const peeked = await ch.peekSlot(doc.uploadToken);
  check('variant: peek still leaks NO image (write-only intact)', !('imageBase64' in peeked));
}

// 11 · ★ CAP ARITHMETIC — the guard that makes "PDF up to 5 MB" impossible to reintroduce.
//      Imports the REAL client constant (transpile-then-require, never a text scan) and
//      proves it can actually fit the backend body cap. base64 inflates ~4/3, so an
//      advertised limit that ignores that is a promise the channel cannot keep — a
//      student passes the picker and then dies at the grader.
{
  const out = mkdtempSync(path.join(tmpdir(), 'lt-qrcaps-'));
  execFileSync('node', [
    path.join(LAZY, 'node_modules/typescript/bin/tsc'),
    'src/services/uploadLimits.ts',
    '--outDir', out, '--rootDir', 'src',
    '--module', 'commonjs', '--target', 'es2020',
    '--moduleResolution', 'node', '--skipLibCheck', '--esModuleInterop',
  ], { cwd: LAZY, stdio: ['ignore', 'ignore', 'inherit'] });
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  const limits = require(path.join(out, 'services/uploadLimits.js'));

  // readJson's default cap — server/services/httpUtils.cjs.
  const READ_JSON_CAP = 5 * 1024 * 1024;
  // Worst-case questions payload measured against the assembled 8,584-row bank:
  // 0.10 MB for the heaviest 38-question draw. Doubled here as headroom.
  const QUESTIONS_WORST = 200 * 1024;
  const b64 = (raw) => Math.ceil(raw / 3) * 4;
  const mb = (b) => `${(b / 1024 / 1024).toFixed(2)} MB`;

  const pdfWire = b64(limits.MAX_UPLOAD_PDF_BYTES) + QUESTIONS_WORST;
  check(`cap arithmetic: a max-size PDF fits the 5 MB body cap (${mb(pdfWire)})`,
    pdfWire < READ_JSON_CAP, `${mb(pdfWire)} >= ${mb(READ_JSON_CAP)} — the advertised PDF limit is UNSPENDABLE`);

  const imgWire = b64(limits.MAX_UPLOAD_IMAGE_BYTES) + QUESTIONS_WORST;
  check(`cap arithmetic: a max-size image fits the 5 MB body cap (${mb(imgWire)})`,
    imgWire < READ_JSON_CAP, `${mb(imgWire)} >= ${mb(READ_JSON_CAP)}`);

  check('cap arithmetic: the copy sentence states the enforced numbers',
    limits.UPLOAD_LIMIT_SENTENCE.includes(limits.formatUploadLimit(limits.MAX_UPLOAD_PDF_BYTES)) &&
    limits.UPLOAD_LIMIT_SENTENCE.includes(limits.formatUploadLimit(limits.MAX_UPLOAD_IMAGE_BYTES)),
    limits.UPLOAD_LIMIT_SENTENCE);

  // The historical bug, pinned so it can never come back.
  check('cap arithmetic: the old "5 MB" PDF promise is proven unspendable',
    b64(5 * 1024 * 1024) > READ_JSON_CAP);
}

console.log('');
if (failures.length > 0) {
  console.error(`QR upload channel acceptance FAILED — ${failures.length} failing:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`QR upload channel acceptance PASSED — ${pass}/${pass} checks green.`);
console.log('  write-only · single-use · delete-on-pickup · TTL · per-uid isolation · hashed tokens · fail-closed\n');
