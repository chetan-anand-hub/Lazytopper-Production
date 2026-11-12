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
    if (!fontsCache || fontsCache.hash !== manifest.contentHash) fontsCache = { hash: manifest.contentHash, fonts: fontsLoader(manifest.fonts) };
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
    const day = dateLabel(now());
    const stampKey = sha256Hex(JSON.stringify([manifest.contentHash, templateId, packId, buyer.name, buyer.contact, orderId, paidAtMs ?? null, bridgeKey, day]));
    const fileId = fileIdFor(packId, templateId);
    return { file, templateId, packId, orderId, paidAtMs, bridgeKey, stampKey, fileId, path: `stamped/${uid}/${manifest.contentHash}/${safeName(fileId)}.pdf`, buyer };
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
      const template = await readVerified(plan.file.path, plan.file.sha256);
      const bridge = plan.bridgeKey && manifest.bridges[plan.bridgeKey] ? await readVerified(manifest.bridges[plan.bridgeKey].path, manifest.bridges[plan.bridgeKey].sha256) : undefined;
      const out = await stampTemplate({
        templateBytes: template,
        marks: plan.file.marks,
        buyer: { name: plan.buyer.name, contact: plan.buyer.contact, orderId: plan.orderId, paidAtMs: plan.paidAtMs },
        nowMs: now(),
        fonts: getFonts(manifest),
        bridgeBytes: bridge,
      });
      const bytes = Buffer.from(out);
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
    const manifest = await getManifest();
    const plan = planFile({ manifest, ...args });
    await ensureStamped(manifest, plan, false);
    const signed = await sign(plan.path, plan.file.filename, 'application/pdf');
    return { ...signed, filename: plan.file.filename, fileId: plan.fileId, label: plan.file.label, contentHash: manifest.contentHash, papers: await papersOf(manifest, plan.file.codes || []) };
  }

  /** A group of files as one store-only ZIP (stamped 3 at a time), kept and signed. */
  async function zipLink({ uid, buyer, owned, packId, groupId, boardPass }) {
    const manifest = await getManifest();
    const pack = manifest.packs[packId];
    const group = pack && pack.groups.find((g) => g.groupId === groupId);
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
      const stamped = new Array(plans.length);
      let next = 0;
      const worker = async () => {
        for (;;) {
          const i = next;
          next += 1;
          if (i >= plans.length) return;
          stamped[i] = await ensureStamped(manifest, plans[i], true);
        }
      };
      await Promise.all(Array.from({ length: Math.min(ZIP_STAMP_CONCURRENCY, plans.length) }, worker));
      await new Promise((resolve, reject) => {
        const archive = archiver('zip', { zlib: { level: 0 } });
        const sink = new PassThrough();
        const ws = obj.createWriteStream({ resumable: false, contentType: 'application/zip', metadata: { cacheControl: 'private, max-age=0', metadata: { stampKey: zipKey } } });
        archive.on('error', reject);
        sink.on('error', reject);
        ws.on('error', reject);
        ws.on('finish', resolve);
        archive.pipe(sink).pipe(ws);
        const used = new Set();
        plans.forEach((p, i) => {
          let name = p.file.filename;
          for (let n = 2; used.has(name); n += 1) name = p.file.filename.replace(/(\.[^.]*)?$/, ` (${n})$1`);
          used.add(name);
          archive.append(stamped[i].bytes, { name, store: true });
        });
        archive.finalize().catch(reject);
      });
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

  return { getManifest, fileLink, zipLink, recordDownloads, _planFile: planFile };
}

module.exports = { createPackPdfService, NotReady, templateIdForPackFile, fileIdFor, LINK_TTL_MS, CURRENT_PATH };
