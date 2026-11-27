'use strict';
// SERVER-PDF-1 PR-B - the pack PDF service: read the template manifest, stamp one buyer's licence into a file (or a whole group),
// keep the stamped copy, and hand back a 15-minute signed link. No HTTP in here (routes/packs.cjs owns that); `bucket` is injected,
// so every rule is testable without Google.
//
// Storage (private; only the server's admin credentials read or write it):
//   packs/current.json -> packs/manifests/<contentHash>.json -> packs/files|bridge|ws/...      (written by CI, PR-A)
//   stamped/<uid>/<contentHash>/<fileId>.pdf      one buyer's stamped copy (+ metadata.stampKey)
//   stamped/<uid>/<contentHash>/zip/<group>.zip   one buyer's per-group ZIP (store-only)
// A stamped copy is reused only while its `stampKey` (everything that is printed on it) is unchanged: a renamed licensee, a Board Pass
// bought since, another day's Edition date or a new template generation each restamp. Put a lifecycle rule on `stamped/` (delete after
// 2 days): nothing here ever needs an old copy.

const { PassThrough } = require('node:stream');
const archiver = require('archiver');

const { buyerRefFor, fileIdFor, templateIdForPackFile } = require('./packCovering.cjs');
const { stampTemplate, loadFonts, dateLabel, sha256Hex } = require('./packStamp.cjs');
const { istDayKey } = require('./rateLimiter.cjs');
const activity = require('../routes/studentActivity.cjs');

const CURRENT_PATH = 'packs/current.json';
const LINK_TTL_MS = 15 * 60 * 1000;
const MANIFEST_TTL_MS = 60 * 1000;
const ZIP_STAMP_CONCURRENCY = 3;
/** GUEST-ZIP-1: the internal group id that means "every file of the pack, as ONE ZIP" (a signed-out buyer has no chapter groups to pick). Never a real group id. */
const ZIP_ALL_GROUP = '__all__';
/** Process-wide bounds on the heavy work (pdf-lib holds a whole template in memory): stamps at once, ZIP builds at once, requests per buyer at once. */
const STAMP_SLOTS = 4;
const ZIP_SLOTS = 2;
const MAX_INFLIGHT_PER_UID = 3;
const CACHE_BYTES = 64 * 1024 * 1024;

class NotReady extends Error {
  constructor(detail) {
    super(`not_ready${detail ? `: ${detail}` : ''}`);
    this.code = 'not_ready';
  }
}

const safeName = (s) => encodeURIComponent(String(s)).replace(/%/g, '_');
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'group';
const headerSafe = (s) => String(s).replace(/["\\\r\n]/g, '');

function createGate(slots) {
  let active = 0;
  const waiting = [];
  const release = () => {
    active -= 1;
    const next = waiting.shift();
    if (next) next();
  };
  return async function run(fn) {
    if (active >= slots) await new Promise((resolve) => waiting.push(resolve));
    active += 1;
    try {
      return await fn();
    } finally {
      release();
    }
  };
}

function createPackPdfService(deps = {}) {
  const { bucket, now = () => Date.now(), telemetry, firestore, firestoreApi, fontsLoader = loadFonts } = deps;

  function emit(event) {
    try {
      if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(event, 1);
    } catch {
      /* a counter must never fail a request */
    }
  }
  function theBucket() {
    const b = typeof bucket === 'function' ? bucket() : bucket;
    if (!b) throw new NotReady('no bucket');
    return b;
  }

  // ---- verified object reads, with a small byte-bounded cache ----
  const cache = new Map();
  let cached = 0;
  function remember(key, bytes) {
    if (bytes.length > CACHE_BYTES / 4) return;
    cache.set(key, bytes);
    cached += bytes.length;
    for (const [k, v] of cache) {
      if (cached <= CACHE_BYTES) break;
      cache.delete(k);
      cached -= v.length;
    }
  }
  async function readObject(path) {
    const f = theBucket().file(path);
    const [exists] = await f.exists();
    if (!exists) return null;
    const [buf] = await f.download();
    return Buffer.from(buf);
  }
  async function readVerified(path, sha256) {
    const key = `${path}@${sha256}`;
    if (cache.has(key)) return cache.get(key);
    const bytes = await readObject(path);
    if (!bytes) throw new NotReady(`missing ${path}`);
    if (sha256 && sha256Hex(bytes) !== sha256) throw new NotReady(`hash mismatch ${path}`);
    remember(key, bytes);
    return bytes;
  }

  // ---- manifest ----
  let current = null; // {at, contentHash, manifest}
  async function getManifest() {
    const t = now();
    if (current && t - current.at < MANIFEST_TTL_MS) return current.manifest;
    const raw = await readObject(CURRENT_PATH);
    if (!raw) throw new NotReady('no current.json');
    let ptr;
    try {
      ptr = JSON.parse(raw.toString('utf8'));
    } catch {
      throw new NotReady('bad current.json');
    }
    if (!ptr || typeof ptr.contentHash !== 'string' || typeof ptr.manifestPath !== 'string' || !ptr.manifestPath.startsWith('packs/manifests/')) throw new NotReady('bad current.json');
    if (current && current.contentHash === ptr.contentHash) {
      current.at = t;
      return current.manifest;
    }
    const body = await readObject(ptr.manifestPath);
    if (!body) throw new NotReady('no manifest');
    let manifest;
    try {
      manifest = JSON.parse(body.toString('utf8'));
    } catch {
      throw new NotReady('bad manifest');
    }
    if (!manifest || manifest.contentHash !== ptr.contentHash || !manifest.files || !manifest.packs) throw new NotReady('manifest does not match current.json');
    current = { at: t, contentHash: ptr.contentHash, manifest };
    return manifest;
  }

  let fontsCache = null;
  function getFonts(manifest) {
    if (!fontsCache || fontsCache.hash !== manifest.contentHash) {
      try {
        fontsCache = { hash: manifest.contentHash, fonts: fontsLoader(manifest.fonts) };
      } catch (e) {
        // a missing or altered font file is "not ready" (the client falls back), not a server fault
        throw e && e.code === 'not_ready' ? e : new NotReady(`fonts: ${e && e.message}`);
      }
    }
    return fontsCache.fonts;
  }

  // ---- planning and stamping one file ----
  /** Everything that decides what a buyer's copy prints, and the path it is kept at. Throws {code:'unknown_file'}. */
  function planFile({ manifest, uid, buyer, owned, packId, templateId, boardPass }) {
    const file = manifest.files[templateId];
    const pack = manifest.packs[packId];
    if (!file || !pack || !pack.files.includes(templateId)) {
      const e = new Error('unknown_file');
      e.code = 'unknown_file';
      throw e;
    }
    const { orderId, paidAtMs } = buyerRefFor(manifest, owned, packId, templateId);
    const variants = pack.bridge && pack.bridge[templateId];
    const bridgeKey = file.hasBridge && variants ? (boardPass === false ? variants.card : variants.noCard) : null;
    // FAIL CLOSED: a file with bridge pages is never stamped with the template's blank ones
    if (file.hasBridge && (!bridgeKey || !manifest.bridges || !manifest.bridges[bridgeKey])) throw new NotReady(`no bridge pages for ${templateId}`);
    const day = dateLabel(now());
    const stampKey = sha256Hex(JSON.stringify([manifest.contentHash, templateId, packId, buyer.name, buyer.contact, orderId, paidAtMs ?? null, bridgeKey, day]));
    const fileId = fileIdFor(packId, templateId);
    return { file, templateId, packId, orderId, paidAtMs, bridgeKey, stampKey, fileId, path: `stamped/${uid}/${manifest.contentHash}/${safeName(fileId)}.pdf`, buyer };
  }

  const stampGate = createGate(STAMP_SLOTS);
  const zipGate = createGate(ZIP_SLOTS);
  const busy = new Map();
  /** At most MAX_INFLIGHT_PER_UID requests of one buyer at a time (per instance): a loop of requests cannot queue the whole server. */
  async function perUid(uid, fn) {
    const n = busy.get(uid) || 0;
    if (n >= MAX_INFLIGHT_PER_UID) {
      const e = new Error('busy');
      e.code = 'busy';
      throw e;
    }
    busy.set(uid, n + 1);
    try {
      return await fn();
    } finally {
      const left = (busy.get(uid) || 1) - 1;
      if (left <= 0) busy.delete(uid);
      else busy.set(uid, left);
    }
  }

  const inflight = new Map();
  /** Make sure the stamped copy exists (stamping it if not) and return its bytes when `wantBytes`. */
  async function ensureStamped(manifest, plan, wantBytes) {
    const existing = inflight.get(plan.path);
    if (existing) {
      const r = await existing;
      return wantBytes && !r.bytes ? { path: r.path, bytes: Buffer.from((await theBucket().file(r.path).download())[0]) } : r;
    }
    const run = (async () => {
      const obj = theBucket().file(plan.path);
      const [exists] = await obj.exists();
      if (exists) {
        const [meta] = await obj.getMetadata();
        if (meta && meta.metadata && meta.metadata.stampKey === plan.stampKey) {
          emit('packs.pdf.stamp_cache_hit');
          return { path: plan.path, bytes: wantBytes ? Buffer.from((await obj.download())[0]) : null };
        }
      }
      const bytes = await stampGate(async () => {
        const template = await readVerified(plan.file.path, plan.file.sha256);
        const bridge = plan.bridgeKey ? await readVerified(manifest.bridges[plan.bridgeKey].path, manifest.bridges[plan.bridgeKey].sha256) : undefined;
        const out = await stampTemplate({
          templateBytes: template,
          marks: plan.file.marks,
          buyer: { name: plan.buyer.name, contact: plan.buyer.contact, orderId: plan.orderId, paidAtMs: plan.paidAtMs },
          nowMs: now(),
          fonts: getFonts(manifest),
          bridgeBytes: bridge,
          requireBridge: Boolean(plan.file.hasBridge),
        });
        return Buffer.from(out);
      });
      await obj.save(bytes, { resumable: false, contentType: 'application/pdf', metadata: { cacheControl: 'private, max-age=0', metadata: { stampKey: plan.stampKey } } });
      emit('packs.pdf.stamped');
      return { path: plan.path, bytes };
    })();
    inflight.set(plan.path, run);
    try {
      return await run;
    } finally {
      inflight.delete(plan.path);
    }
  }

  async function sign(path, filename, contentType) {
    const expiresAtMs = now() + LINK_TTL_MS;
    const [url] = await theBucket().file(path).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: expiresAtMs,
      responseDisposition: `attachment; filename="${headerSafe(filename)}"`,
      responseType: contentType,
    });
    return { url, expiresAtMs };
  }

  /** R1: the paper(s) a file prints, exactly as drawn: [{code, reg:{kind,name,subject,topicKey}, ws}] (the client registers THIS, not a rebuild). */
  async function papersOf(manifest, codes) {
    const out = [];
    for (const code of codes) {
      const p = manifest.papers && manifest.papers[code];
      if (!p) continue;
      const bytes = await readVerified(p.wsPath, p.wsSha256);
      out.push({ code, reg: { kind: p.kind, name: p.name, subject: p.subject, topicKey: p.topicKey }, ws: JSON.parse(bytes.toString('utf8')) });
    }
    return out;
  }

  /** One file: stamped, kept, signed. */
  async function fileLink(args) {
    return perUid(args.uid, () => fileLinkInner(args));
  }
  async function fileLinkInner(args) {
    const manifest = await getManifest();
    const plan = planFile({ manifest, ...args });
    await ensureStamped(manifest, plan, false);
    const signed = await sign(plan.path, plan.file.filename, 'application/pdf');
    return { ...signed, filename: plan.file.filename, fileId: plan.fileId, label: plan.file.label, contentHash: manifest.contentHash, papers: await papersOf(manifest, plan.file.codes || []) };
  }

  /** A group of files as one store-only ZIP (stamped 3 at a time), kept and signed. */
  async function zipLink(args) {
    return perUid(args.uid, () => zipLinkInner(args));
  }
  async function zipLinkInner({ uid, buyer, owned, packId, groupId, boardPass }) {
    const manifest = await getManifest();
    const pack = manifest.packs[packId];
    const group = pack && (groupId === ZIP_ALL_GROUP ? { groupId: ZIP_ALL_GROUP, group: packId, files: pack.files } : pack.groups.find((g) => g.groupId === groupId));
    if (!group) {
      const e = new Error('unknown_group');
      e.code = 'unknown_group';
      throw e;
    }
    const plans = group.files.map((templateId) => planFile({ manifest, uid, buyer, owned, packId, templateId, boardPass }));
    const zipKey = sha256Hex(JSON.stringify(plans.map((p) => p.stampKey)));
    const zipName = `lazytopper-${slug(group.group || group.groupId)}.zip`;
    const zipPath = `stamped/${uid}/${manifest.contentHash}/zip/${safeName(`${packId}|${group.groupId}`)}.zip`;
    const obj = theBucket().file(zipPath);
    let have = false;
    const [exists] = await obj.exists();
    if (exists) {
      const [meta] = await obj.getMetadata();
      have = Boolean(meta && meta.metadata && meta.metadata.stampKey === zipKey);
    }
    if (!have) {
      await zipGate(
        () =>
          new Promise((resolve, reject) => {
            const archive = archiver('zip', { zlib: { level: 0 } });
            const sink = new PassThrough();
            const ws = obj.createWriteStream({ resumable: false, contentType: 'application/zip', metadata: { cacheControl: 'private, max-age=0', metadata: { stampKey: zipKey } } });
            const fail = (e) => {
              try {
                archive.abort();
                ws.destroy(e);
              } catch {
                /* already torn down */
              }
              reject(e);
            };
            archive.on('error', fail);
            sink.on('error', fail);
            ws.on('error', fail);
            ws.on('finish', resolve);
            archive.pipe(sink).pipe(ws);
            // stamp up to ZIP_STAMP_CONCURRENCY files ahead, and append each as soon as it is its turn, so only a few are in memory
            const pending = new Map();
            const start = (i) => {
              if (i >= plans.length) return;
              const pr = ensureStamped(manifest, plans[i], true);
              pr.catch(() => {});
              pending.set(i, pr);
            };
            (async () => {
              for (let i = 0; i < Math.min(ZIP_STAMP_CONCURRENCY, plans.length); i += 1) start(i);
              const used = new Set();
              for (let i = 0; i < plans.length; i += 1) {
                const r = await pending.get(i);
                pending.delete(i);
                start(i + ZIP_STAMP_CONCURRENCY);
                let name = plans[i].file.filename;
                for (let n = 2; used.has(name); n += 1) name = plans[i].file.filename.replace(/(\.[^.]*)?$/, ` (${n})$1`);
                used.add(name);
                archive.append(r.bytes, { name, store: true });
              }
              await archive.finalize();
            })().catch(fail);
          }),
      );
      emit('packs.pdf.zip_built');
    } else emit('packs.pdf.zip_cache_hit');
    const signed = await sign(zipPath, zipName, 'application/zip');
    const codes = [...new Set(plans.flatMap((p) => p.file.codes || []))];
    return {
      ...signed,
      filename: zipName,
      group: group.group,
      groupId: group.groupId,
      contentHash: manifest.contentHash,
      files: plans.map((p) => ({ fileId: p.fileId, filename: p.file.filename, label: p.file.label, codes: p.file.codes || [] })),
      papers: await papersOf(manifest, codes),
    };
  }

  /**
   * The download feed: one `pack_download` entry per file served, in the SAME place and shape the client's own event lands
   * (activityLog/{uid}/activityDays/{IST day}.feed [{t,k:'event',n}] + events.pack_download), which is what moveToOther reads to
   * refuse a move after a download. Best effort: a failed write never fails the link.
   */
  async function recordDownloads(uid, count) {
    try {
      const FieldValue = firestoreApi && firestoreApi.FieldValue;
      const Timestamp = firestoreApi && firestoreApi.Timestamp;
      if (!firestore || !FieldValue || !Timestamp || !(count > 0)) return false;
      const nowMs = now();
      const dayKey = istDayKey(nowMs);
      const ref = firestore.collection(activity.ACTIVITY_COLLECTION).doc(uid).collection(activity.ACTIVITY_SEGMENTS.days).doc(dayKey);
      await firestore.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const exists = Boolean(snap && snap.exists);
        const prev = exists ? snap.data() || {} : {};
        const prevFeed = Array.isArray(prev.feed) ? prev.feed : [];
        const room = Math.max(0, activity.MAX_FEED_PER_DAY - prevFeed.length);
        const add = Array.from({ length: Math.min(count, room) }, () => ({ t: nowMs, k: 'event', n: 'pack_download' }));
        const write = {
          lastSeenMs: nowMs,
          expireAt: Timestamp.fromMillis(activity.expireAtMsForDay(dayKey)),
          events: { pack_download: FieldValue.increment(count) },
          ...(exists ? {} : { firstSeenMs: nowMs }),
        };
        if (add.length) write.feed = [...prevFeed, ...add];
        if (count > room) write.feedTruncated = true;
        tx.set(ref, write, { merge: true });
      });
      return true;
    } catch {
      emit('packs.pdf.download_event_failed');
      return false;
    }
  }

  // ---- BONUS-BOOK-1: the CBQ Pack's bonus "complete book" (one pre-built PDF per subject, uploaded by the owner) ----
  // Not stamped and not in the manifest: a fixed object under packs/bonus/. Until that object exists the row stays hidden
  // (bonusBooksPresent says no) and a link request is not_ready. The ROUTE checks the entitlement (pack_cbq:<subject>, open window).
  const bonusSeen = new Map(); // subject -> {at, present}
  async function bonusPresent(subject) {
    const path = BONUS_BOOK_PATHS[subject];
    if (!path) return false;
    const t = now();
    const c = bonusSeen.get(subject);
    if (c && t - c.at < MANIFEST_TTL_MS) return c.present;
    let present = false;
    try {
      [present] = await theBucket().file(path).exists();
      present = Boolean(present);
    } catch {
      present = false;
    }
    bonusSeen.set(subject, { at: t, present });
    return present;
  }
  /** The subjects (of `subjects`) whose bonus book is uploaded. Never throws: an unreadable bucket is "none". */
  async function bonusBooksPresent(subjects) {
    const out = [];
    for (const s of subjects) if (await bonusPresent(s)) out.push(s);
    return out;
  }
  /** A 15-minute signed link to one subject's bonus book. Throws not_ready while it is not uploaded. */
  async function bonusLink({ subject }) {
    const path = BONUS_BOOK_PATHS[subject];
    if (!path) {
      const e = new Error('unknown_file');
      e.code = 'unknown_file';
      throw e;
    }
    bonusSeen.delete(subject);
    if (!(await bonusPresent(subject))) throw new NotReady(`missing ${path}`);
    const filename = BONUS_BOOK_FILENAMES[subject];
    const signed = await sign(path, filename, 'application/pdf');
    return { ...signed, filename, papers: [] };
  }

  return { getManifest, fileLink, zipLink, recordDownloads, bonusBooksPresent, bonusLink, _planFile: planFile };
}

/** BONUS-BOOK-1: where the owner uploads each subject's complete book (private bucket, same rules as the rest of packs/). */
const BONUS_BOOK_PATHS = Object.freeze({ maths: 'packs/bonus/cbq-maths-complete-book.pdf', science: 'packs/bonus/cbq-science-complete-book.pdf' });
const BONUS_BOOK_FILENAMES = Object.freeze({ maths: 'LazyTopper-CBQ-Maths-Complete-Book.pdf', science: 'LazyTopper-CBQ-Science-Complete-Book.pdf' });

module.exports = { createPackPdfService, ZIP_ALL_GROUP, NotReady, templateIdForPackFile, fileIdFor, LINK_TTL_MS, CURRENT_PATH, BONUS_BOOK_PATHS, BONUS_BOOK_FILENAMES };
