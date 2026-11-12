'use strict';
// SERVER-PDF-1 PR-B - which owned pack COVERS a template file, and so which Order id and which paid time are printed on it.
//
// A pure port of the client's `coveringRef` / `paidAtOf` (src/lib/packs/buildPackFiles.ts). The TS/CJS parity test
// (src/lib/packs/packCovering.serverParity.test.ts) builds every shop pack's real files with the client and compares both
// answers for every file, so a change on one side without the other is a red test, not a wrong licence on a buyer's PDF.
//
// The client knows a file's chapter -> subject from its chapter list; the server does not carry that list: a chapter's subject
// is the subject pack (`pack_subject:<s>`) whose manifest file list holds the template. Same answer, derived from the same data
// the files came from.

const SUBJECTS = ['maths', 'science'];

/**
 * Where a template sits: {kind: 'chapter'|'mocks'|'cbq', key, subject}. `key` is the chapter slug / the subject (mocks, cbq).
 * `manifest` is a PackManifest (or anything with `files[templateId].groupId` and `packs[packId].files`).
 */
function placementOf(manifest, templateId) {
  const file = manifest && manifest.files && manifest.files[templateId];
  if (!file) return null;
  const cbq = /^cbq-([a-z]+)\|/.exec(templateId);
  if (cbq) return { kind: 'cbq', key: cbq[1], subject: cbq[1] };
  const mocks = /^mocks-([a-z]+)$/.exec(String(file.groupId || ''));
  if (mocks) return { kind: 'mocks', key: mocks[1], subject: mocks[1] };
  const packs = (manifest && manifest.packs) || {};
  let subject = null;
  for (const s of SUBJECTS) {
    const p = packs[`pack_subject:${s}`];
    if (p && Array.isArray(p.files) && p.files.includes(templateId)) {
      subject = s;
      break;
    }
  }
  return { kind: 'chapter', key: String(file.groupId), subject };
}

/** The pack ids that cover a file, best match first (the client's `order`). */
function coveringOrder(kind, key, subject) {
  if (kind === 'cbq') return [`pack_cbq:${key}`];
  if (kind === 'chapter') return [`pack_chapter:${key}`, `pack_subject:${subject}`, 'pack_bundle:all'];
  return [`pack_mock:${key}`, `pack_subject:${key}`, 'pack_bundle:all'];
}

/** The Order reference printed on a file: the covering owned pack's `orderId || packId`; else the pack being listed; else ''. */
function coveringRef(owned, placement, fallback) {
  if (!placement) return fallback ? fallback.orderId || fallback.packId : '';
  for (const id of coveringOrder(placement.kind, placement.key, placement.subject)) {
    const hit = owned.find((p) => p.packId === id);
    if (hit) return hit.orderId || hit.packId;
  }
  return fallback ? fallback.orderId || fallback.packId : '';
}

/** The paid time of the owned pack whose order reference is `ref` (the one printed); undefined when unknown. */
function paidAtOf(owned, ref) {
  const hit = ref ? owned.find((p) => (p.orderId || p.packId) === ref) : undefined;
  return hit && typeof hit.paidAt === 'number' && hit.paidAt > 0 ? hit.paidAt : undefined;
}

/**
 * What a buyer's copy of `templateId`, downloaded from `packId`, prints: {orderId, paidAtMs}.
 * `owned` is the buyer's OPEN packs (the same list /api/packs/mine gives the client to build from).
 */
function buyerRefFor(manifest, owned, packId, templateId) {
  const fallback = owned.find((p) => p.packId === packId);
  const orderId = coveringRef(owned, placementOf(manifest, templateId), fallback);
  return { orderId, paidAtMs: paidAtOf(owned, orderId) };
}

/** A buyer's file id (`<packId>|<tail>`) for a template: the inverse of templateIdForPackFile (packTemplateCore.ts). */
function fileIdFor(packId, templateId) {
  if (packId.startsWith('pack_cbq:')) {
    const prefix = `cbq-${packId.slice('pack_cbq:'.length)}|`;
    return templateId.startsWith(prefix) ? `${packId}|${templateId.slice(prefix.length)}` : null;
  }
  return `${packId}|${templateId}`;
}
/** The template a buyer's file id names (the rule of packTemplateCore.templateIdForPackFile; parity-tested). */
function templateIdForPackFile(packId, fileId) {
  if (typeof packId !== 'string' || typeof fileId !== 'string' || !fileId.startsWith(`${packId}|`)) return null;
  const tail = fileId.slice(packId.length + 1);
  if (!tail) return null;
  return packId.startsWith('pack_cbq:') ? `cbq-${packId.slice('pack_cbq:'.length)}|${tail}` : tail;
}
module.exports = { fileIdFor, templateIdForPackFile, placementOf
, coveringOrder, coveringRef, paidAtOf, buyerRefFor };
