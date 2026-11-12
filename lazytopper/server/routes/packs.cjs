'use strict';
// PACKS-SERVER-1 - GET /api/packs/mine: the PDF packs the verified caller owns, plus the licensee
// (name + email) the client prints on every page. AUTH REQUIRED (401 otherwise).
//
// Deliberately NOT behind PACKS_ENABLED: a pack a student paid for stays downloadable if the flag is
// ever turned off (contract §1). The licensee comes from the server's own auth record for the VERIFIED
// uid (deps.getLicensee) - never from a header, query or body.

const { listPacks } = require('../services/packGrant.cjs');
const { toMillis } = require('../services/passGrant.cjs');
const { readRawBody } = require('./payments.cjs');
const { templateIdForPackFile } = require('../services/packCovering.cjs');
const { boardPassCreditFor } = require('../services/packCredit.cjs');
// REDOWNLOAD-ENFORCE-1: the pack re-download date (31 Mar 2027 from 5 Nov 2026; 31 May 2027 before), on the SERVER clock.
const { splitByRedownload } = require('../services/packTerms.cjs');
const { quotePass } = require('./payments.cjs');
// PAY-PHONE-1: a phone-only account is licensed by its MASKED verified number (never the full number).
const { maskIndianMobile } = require('../services/guestPay.cjs');

const PACKS_MINE_PATH = '/api/packs/mine';
// SERVER-PDF-1 PR-B: a stamped copy of one pack file / of one group of them, as a 15-minute signed link. POST, credentialed.
const PACKS_FILE_LINK_PATH = '/api/packs/file-link';
const PACKS_ZIP_LINK_PATH = '/api/packs/zip-link';
const MAX_JSON_BYTES = 2 * 1024;
const ID_PATTERN = /^[A-Za-z0-9_:|.\- ]{1,200}$/;
const LINKS_PER_HOUR = 240;
const ZIPS_PER_HOUR = 30;
/** Kill switch: PACK_SERVER_PDF_DISABLED=1 -> both routes answer 404 and the client builds the PDF itself, as before. */
function isServerPdfDisabled(env = process.env) {
  return /^(1|true|on|yes)$/i.test(String((env && env.PACK_SERVER_PDF_DISABLED) || '').trim());
}
/** The subscription document the Board Pass quote is read from (same collection passGrant writes). */
const SUBSCRIPTIONS_COLLECTION = 'subscriptions';

function createPackRoutes(deps = {}) {
  const { sendJson, verifiedCaller, adminFirestore, getLicensee, telemetry, cbqTutorTaste, now = () => Date.now(), foundingOfferOpen, packPdf, env = process.env } = deps;

  function emit(event) {
    try {
      if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(event, 1);
    } catch {
      /* a counter must never fail a request */
    }
  }

  /**
   * The ownership + licensee prefix every pack route shares (/mine and the PDF links): the VERIFIED uid, the licensee from the server's
   * own auth record, the packs the student owns, split by the re-download window on the SERVER clock. Sends the refusal itself and
   * returns null when there is none. `scope` only names the counters ('mine' keeps today's `packs.mine.*` names).
   */
  async function resolveBuyer(req, res, scope) {
    const uid = await verifiedCaller.resolveVerifiedUid(req);
    if (!uid) {
      sendJson(res, 401, { ok: false, error: 'unauthenticated' });
      return null;
    }
    if (!adminFirestore) {
      emit(`packs.${scope}.unavailable`);
      sendJson(res, 503, { ok: false, error: 'Packs are unavailable right now.' });
      return null;
    }
    // The licensee is printed on every page of every PDF: without a real email — or, for a phone-only account
    // (PAY-PHONE-1), its verified phone number MASKED (+91 98•••••948) — there is nothing safe to print, so refuse
    // (503) rather than hand back blanks. Checked first; nothing about the packs is sent. An account WITH an email is
    // licensed exactly as before (the phone is not even read). The full phone number never leaves the server.
    let licensee = null;
    try {
      const got = typeof getLicensee === 'function' ? await getLicensee(uid) : null;
      const email = got && typeof got.email === 'string' ? got.email.trim() : '';
      const name = got && typeof got.name === 'string' ? got.name : '';
      if (email) licensee = { name, email };
      else {
        const phone = maskIndianMobile(got && typeof got.phone === 'string' ? got.phone : '');
        if (phone) licensee = { name, email: '', phone };
      }
    } catch {
      /* falls through to licensee_unavailable */
    }
    if (!licensee) {
      emit(`packs.${scope}.licensee_unavailable`);
      sendJson(res, 503, { ok: false, error: 'licensee_unavailable' });
      return null;
    }
    let owned;
    try {
      owned = await listPacks(adminFirestore, uid);
    } catch (e) {
      emit(`packs.${scope}.read_failed`);
      console.error(`[packs/${scope}] read failed:`, e && e.message);
      sendJson(res, 500, { ok: false, error: 'Could not read your packs.' });
      return null;
    }
    // REDOWNLOAD-ENFORCE-1: a pack whose re-download date has passed (SERVER clock) is no longer served - it leaves `packs`
    // (the list the client builds PDFs from, so no Download button can appear for it) and is reported in `endedPacks` with
    // its date, so My packs can say so honestly. The entitlement document is NOT touched. Before the date `packs` is the
    // same list as before and `endedPacks` is absent: the response is byte-identical to today's.
    const { open, ended } = splitByRedownload(owned, now());
    if (ended.length > 0) emit(`packs.${scope}.redownload_ended`);
    return { uid, licensee, owned, open, ended };
  }

  async function handleMine(req, res) {
    const buyer = await resolveBuyer(req, res, 'mine');
    if (!buyer) return undefined;
    const { uid, licensee, owned, open: packs, ended } = buyer;
    // PACK-CREDIT-1: what the student's recent packs take off a Board Pass right now, and what the server says
    // the student would then pay (payInr = the server's Board Pass quote less the credit). READ ONLY. A failed
    // or doubtful read is credit 0 (the packs themselves are still returned). The order route decides the
    // amount actually charged, again, with the same rule.
    let boardPassCredit = { creditInr: 0, expiresAtMs: null, payInr: null };
    try {
      const snap = await adminFirestore.collection(SUBSCRIPTIONS_COLLECTION).doc(uid).get();
      const stored = snap && snap.exists ? snap.data() || {} : {};
      const nowMs = now();
      const quote = quotePass(stored, 'till_boards', nowMs, { foundingOfferOpen });
      const credit = await boardPassCreditFor(adminFirestore, uid, 'till_boards', quote.pricePaidInr, nowMs);
      if (credit.readFailed) emit('packs.mine.credit_read_failed');
      if (credit.creditInr > 0) {
        boardPassCredit = { creditInr: credit.creditInr, expiresAtMs: credit.expiresAtMs, payInr: quote.pricePaidInr - credit.creditInr };
      }
    } catch {
      emit('packs.mine.credit_read_failed');
    }
    // CBQ-TUTOR-TASTE-1: how many of the 3 CBQ-Pack tutor questions are left. READ ONLY, additive, and present only
    // for a student who owns a CBQ Pack (the client shows its banner from it, and only to a non-Premium student).
    let tutorTaste;
    try {
      if (owned.some((p) => p.sku === 'pack_cbq') && cbqTutorTaste && typeof cbqTutorTaste.status === 'function') {
        const t = await cbqTutorTaste.status(uid);
        if (t && t.owned) tutorTaste = { used: t.used, left: t.left, limit: t.limit };
      }
    } catch {
      tutorTaste = undefined;
    }
    return sendJson(res, 200, { packs, licensee, boardPassCredit, ...(tutorTaste ? { tutorTaste } : {}), ...(ended.length > 0 ? { endedPacks: ended } : {}) });
  }

  // ---- SERVER-PDF-1 PR-B: stamped copies as signed links ----
  const hits = new Map();
  function limited(key, max) {
    const t = now();
    const recent = (hits.get(key) || []).filter((x) => t - x < 60 * 60 * 1000);
    recent.push(t);
    hits.set(key, recent);
    if (hits.size > 5000) hits.clear();
    return recent.length > max;
  }

  async function readBody(req, res) {
    try {
      const buf = await readRawBody(req, MAX_JSON_BYTES);
      const parsed = JSON.parse(buf.length ? buf.toString('utf8') : '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
      return parsed;
    } catch {
      sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
      return null;
    }
  }

  /** true = a paid Board Pass (a premium tier, not past `passEnd`) - false = known not - null = unknown (no Board Pass card either way). */
  async function paidBoardPass(uid) {
    try {
      const snap = await adminFirestore.collection(SUBSCRIPTIONS_COLLECTION).doc(uid).get();
      const d = snap && snap.exists ? snap.data() || {} : {};
      if (d.tier !== 'premium') return false;
      const end = d.passEnd === undefined || d.passEnd === null ? null : toMillis(d.passEnd);
      return end === null || end > now();
    } catch {
      return null;
    }
  }

  /** The 404 a disabled / unwired feature gives: the client reads it as "build it yourself", exactly as before this existed. */
  function unavailable(res) {
    return sendJson(res, 404, { error: 'Not Found' });
  }

  function failure(res, e, scope) {
    const code = e && e.code;
    if (code === 'not_ready') {
      emit(`packs.${scope}.not_ready`);
      return sendJson(res, 503, { ok: false, error: 'not_ready' });
    }
    if (code === 'unknown_file' || code === 'unknown_group') return sendJson(res, 404, { ok: false, error: code });
    emit(`packs.${scope}.failed`);
    console.error(`[packs/${scope}] failed:`, e && e.message);
    return sendJson(res, 500, { ok: false, error: 'Could not prepare your file.' });
  }

  /** Is `packId` one the caller owns, inside its window? Sends the refusal and returns false when not. */
  function ownsOpen(res, buyer, packId) {
    if (buyer.open.some((p) => p.packId === packId)) return true;
    const ended = buyer.ended.find((p) => p.packId === packId);
    if (ended) sendJson(res, 403, { ok: false, error: 'redownload_ended', redownloadUntil: ended.redownloadUntil });
    else sendJson(res, 403, { ok: false, error: 'not_owned' });
    return false;
  }

  const contactOf = (l) => l.email || l.phone || '';

  async function handleFileLink(req, res) {
    if (isServerPdfDisabled(env) || !packPdf) return unavailable(res);
    const buyer = await resolveBuyer(req, res, 'file_link');
    if (!buyer) return undefined;
    const body = await readBody(req, res);
    if (!body) return undefined;
    const { packId, fileId } = body;
    if (typeof packId !== 'string' || typeof fileId !== 'string' || !ID_PATTERN.test(packId) || !ID_PATTERN.test(fileId)) return sendJson(res, 400, { ok: false, error: 'bad_request' });
    if (!ownsOpen(res, buyer, packId)) return undefined;
    const templateId = templateIdForPackFile(packId, fileId);
    if (!templateId) return sendJson(res, 404, { ok: false, error: 'unknown_file' });
    if (limited(`f:${buyer.uid}`, LINKS_PER_HOUR)) return sendJson(res, 429, { ok: false, error: 'too_many_requests' });
    try {
      const link = await packPdf.fileLink({
        uid: buyer.uid,
        buyer: { name: buyer.licensee.name, contact: contactOf(buyer.licensee) },
        owned: buyer.open,
        packId,
        templateId,
        boardPass: await paidBoardPass(buyer.uid),
      });
      // The server is the one place that knows a file was handed out: one feed entry per file (the client does NOT also send its own).
      await packPdf.recordDownloads(buyer.uid, 1);
      emit('packs.file_link.issued');
      return sendJson(res, 200, { ok: true, ...link });
    } catch (e) {
      return failure(res, e, 'file_link');
    }
  }

  async function handleZipLink(req, res) {
    if (isServerPdfDisabled(env) || !packPdf) return unavailable(res);
    const buyer = await resolveBuyer(req, res, 'zip_link');
    if (!buyer) return undefined;
    const body = await readBody(req, res);
    if (!body) return undefined;
    const { packId, group } = body;
    if (typeof packId !== 'string' || typeof group !== 'string' || !ID_PATTERN.test(packId) || !ID_PATTERN.test(group)) return sendJson(res, 400, { ok: false, error: 'bad_request' });
    if (!ownsOpen(res, buyer, packId)) return undefined;
    if (limited(`z:${buyer.uid}`, ZIPS_PER_HOUR)) return sendJson(res, 429, { ok: false, error: 'too_many_requests' });
    try {
      const link = await packPdf.zipLink({
        uid: buyer.uid,
        buyer: { name: buyer.licensee.name, contact: contactOf(buyer.licensee) },
        owned: buyer.open,
        packId,
        groupId: group,
        boardPass: await paidBoardPass(buyer.uid),
      });
      // One entry per file in the ZIP: the same count the student would have made downloading them one by one.
      await packPdf.recordDownloads(buyer.uid, link.files.length);
      emit('packs.zip_link.issued');
      return sendJson(res, 200, { ok: true, ...link });
    } catch (e) {
      return failure(res, e, 'zip_link');
    }
  }

  return { handleMine, handleFileLink, handleZipLink };
}

module.exports = { createPackRoutes, PACKS_MINE_PATH, PACKS_FILE_LINK_PATH, PACKS_ZIP_LINK_PATH, isServerPdfDisabled };
