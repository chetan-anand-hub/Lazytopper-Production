/**
 * Parent result page — PARENT-REPORT-1 (owner ask 22 Oct 2026): "Share with parents" on a
 * scorecard sends a LINK to one result, so a parent sees a LazyTopper page, not only an image.
 *
 *   POST /api/parent-report/link   { resultId }   AUTH REQUIRED (the student)
 *   POST /api/parent-report/view   { token }      capability token (the parent, signed out)
 *
 * ★★ THE PRIVACY PATTERN IS PARENT PAY'S (routes/parentPay.cjs), copied, not imported:
 *   - the token is 256 bits of crypto.randomBytes, shown ONCE (in the student's WhatsApp
 *     message), and stored only as its SHA-256 (`parentReports/{sha256(token)}`);
 *   - it travels in the URL FRAGMENT (`/u/report#r=<token>`), so it never reaches a server
 *     log, a Referer or an analytics vendor;
 *   - the parent sees the child's FIRST name only (letters only), never a uid, an email,
 *     a phone number, another result or any other study data.
 *
 * ★★ OWNERSHIP IS STRUCTURAL. The result is read at `sessionRecords/{VERIFIED uid}/records/
 * {resultId}` through the Admin SDK: the uid comes from the verified ID token and from
 * nowhere else (no body field, no header), so a student can only ever reach their OWN
 * results. Somebody else's resultId is simply not found under the caller's uid.
 *
 * ★★ A SNAPSHOT, NOT A WINDOW. Minting copies ONLY the page's fields into the link document:
 * first name, subject, chapter slugs, date, score, marks lost by type (or the mistake counts),
 * up to three "where marks slipped" lines (question number, marks, mistake type — numbers and
 * enum keys only, never answer text, never AI text) and whether the result was tap-only. The
 * view route reads THAT document and nothing else: it never opens the student's account.
 * The `uid` is a FIELD on the document so account erasure can find and delete it
 * (studentDataMap `parentReports`, field-keyed like `parentPayLinks`); it is never returned.
 *
 * ★ EXPIRY. A link answers for LINK_TTL_MS (30 days). An expired link answers 410 and its
 * document is deleted on that read (best-effort; erasure and an optional Firestore TTL policy
 * on `expiresAt` cover the rest).
 *
 * ★ THE SLIP PICKER IS A MIRROR. `chipTypeOf` / `isGraded` / `questionMarksLost` reproduce
 * src/lib/mistakeDisplay.ts (`questionChipType`, `gradeStateOf`, `questionMarksLost`), the ONE
 * picker the scorecard uses. The CJS server cannot import TS, so the mirror is pinned by
 * src/components/parentReport/parentReportServerMirror.test.ts, which runs BOTH over the same
 * fixtures and fails if they ever disagree.
 *
 * ★ Rate limits: minting per VERIFIED uid per IST day; viewing per client per IST day, through
 * the product's one limiter (rateLimiter.cjs), exactly as parent pay does.
 */

const crypto = require('node:crypto');
const { createRateLimiter, ANONYMOUS_CLASS } = require('../services/rateLimiter.cjs');

const PARENT_REPORT_LINK_PATH = '/api/parent-report/link';
const PARENT_REPORT_VIEW_PATH = '/api/parent-report/view';

/** Top-level collection. Named as a constant so the studentDataMap drift guard sees it. */
const PARENT_REPORTS_COLLECTION = 'parentReports';
/** The student's own records (already mapped). Read only, through the Admin SDK. */
const SESSION_RECORDS_COLLECTION = 'sessionRecords';
// Subcollections, held as properties so the drift scanner (which reads every
// `.collection(NAME)` as a TOP-LEVEL collection) does not see phantom `records` /
// `perQuestion` collections — the studentActivity.cjs ACTIVITY_SEGMENTS pattern.
const SESSION_SEGMENTS = Object.freeze({ records: 'records', perQuestion: 'perQuestion' });

/** How long a parent's link answers. */
const LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Links one student may mint per IST day. */
const MAX_LINKS_PER_UID_PER_DAY = 20;
/** Parent page reads per client per IST day. */
const MAX_VIEWS_PER_CLIENT_PER_DAY = 300;
const PARENT_REPORT_LINK_CLASS = 'parentReportLink';
const PARENT_REPORT_VIEW_CLASS = 'parentReportView';

const MAX_JSON_BYTES = 4 * 1024;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
/** A session record id is the surface CODE (e.g. CI-M-QUAD-03, qp:… refs are not ids). */
const RESULT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_:-]{0,119}$/;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const MAX_FIRST_NAME_LENGTH = 24;
const MAX_SLIPS = 3;
const MAX_CHAPTERS = 3;
const MAX_RESULTS_READ = 200;
const ERASED_UID = 'erased';
const NOT_FOUND_BODY = Object.freeze({ ok: false, error: 'link_unavailable', reason: 'invalid' });

const STORED_TYPES = Object.freeze(['conceptual', 'calculation', 'silly', 'presentation']);
const MARKS_BUCKETS = Object.freeze(['conceptual', 'calculation', 'silly', 'presentation', 'unattempted', 'untyped']);
/** The picker's order: the scorecard's MISTAKE_GROUPS display order, then each group's types. */
const CHIP_ORDER = Object.freeze(['conceptual', 'presentation', 'calculation', 'silly']);
const MARKS_LOST_BY_TYPE_VERSION = 1;
const SURFACES = Object.freeze(['worksheet', 'chapter-test', 'full-mock', 'check-improve', 'quick-practice']);

/** 256 bits, URL-safe, 43 characters. */
function mintToken() {
  return crypto.randomBytes(32).toString('base64url');
}

/** The link document id: the token itself is never stored. */
function reportIdOf(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/** Mirror of src/services/sessionRecords.ts sanitizeDocId. */
function sanitizeDocId(id) {
  return String(id).replace(/[/.#$[\]\s]/g, '_');
}

/**
 * The FIRST name only, LETTERS ONLY (any script, with combining marks): the first word of
 * the account's display name. Anything else — digits, punctuation, an email-looking word,
 * an over-long word — gives '' and the page says "your child".
 */
function firstNameOf(displayName) {
  const first = String(displayName || '').trim().split(/\s+/)[0] || '';
  if (!first || first.length > MAX_FIRST_NAME_LENGTH) return '';
  if (!/^[\p{L}][\p{L}\p{M}]*$/u.test(first)) return '';
  return first;
}

function toMillis(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value === 'object') {
    if (typeof value.toMillis === 'function') {
      try {
        return value.toMillis();
      } catch {
        return null;
      }
    }
    if (typeof value.seconds === 'number') return value.seconds * 1000;
  }
  return null;
}

const finiteNonNeg = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
/** Marks on the CBSE ½ grid with float noise removed (mistakeDisplay.roundMarks). */
const roundMarks = (n) => Math.round((Number(n) || 0) * 100) / 100;

/* ── the mirror of src/lib/mistakeDisplay.ts (pinned by parentReportServerMirror.test.ts) ── */

function notGradedReasonOf(q) {
  const v = q ? q.notGraded : undefined;
  if (v === undefined || v === null || v === false || v === '') return null;
  return ['unreadable', 'withheld', 'timeout', 'error', 'interrupted'].includes(v) ? v : 'error';
}

/** gradeStateOf(q) === "graded". */
function isGraded(q) {
  if (!q || typeof q !== 'object') return false;
  if (notGradedReasonOf(q)) return false;
  if (q.answerMismatch === true) return false;
  if (q.couldNotRead) return false;
  if (q.objectiveResolved === false) return false;
  return true;
}

function marksLostOn(q) {
  if (!isGraded(q)) return 0;
  return Math.max(0, (Number(q.totalMarks) || 0) - (Number(q.marksAwarded) || 0));
}

function readMarksLostByType(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const out = {};
  for (const b of MARKS_BUCKETS) {
    if (!finiteNonNeg(raw[b])) return null;
    out[b] = raw[b];
  }
  return out;
}

function questionMarksLost(q) {
  if (!q || !isGraded(q)) return null;
  const raw = readMarksLostByType(q.marksLostByType);
  if (!raw) return null;
  const lost = roundMarks(marksLostOn(q));
  const sum = roundMarks(MARKS_BUCKETS.reduce((s, k) => s + raw[k], 0));
  if (sum > lost + 1e-9) return null;
  return sum < lost - 1e-9 ? { ...raw, untyped: roundMarks(raw.untyped + (lost - sum)) } : { ...raw };
}

function toCounts(raw) {
  const out = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
  if (!raw || typeof raw !== 'object') return out;
  for (const t of STORED_TYPES) {
    const n = Number(raw[t]);
    out[t] = Number.isFinite(n) && n > 0 ? n : 0;
  }
  return out;
}

function stepTypeCounts(steps) {
  const out = toCounts(null);
  for (const s of Array.isArray(steps) ? steps : []) {
    const t = s && s.mistakeType;
    const status = s && s.status;
    if (STORED_TYPES.includes(t) && status !== 'missing' && status !== 'unattempted' && status !== 'withdrawn') out[t] += 1;
  }
  return out;
}

function effectiveTypeCounts(q) {
  if (!isGraded(q) || marksLostOn(q) <= 0) return toCounts(null);
  const summary = toCounts(q.mistakeSummary);
  const steps = stepTypeCounts(q.annotatedSteps);
  const out = toCounts(null);
  for (const t of STORED_TYPES) out[t] = Math.max(summary[t], steps[t]);
  return out;
}

/** questionChipType(q): the type that cost the most marks (else the most mistakes), or null. */
function chipTypeOf(q) {
  if (!isGraded(q) || marksLostOn(q) <= 0) return null;
  const marks = questionMarksLost(q);
  const score = marks
    ? { conceptual: marks.conceptual, calculation: marks.calculation, silly: marks.silly, presentation: marks.presentation }
    : effectiveTypeCounts(q);
  let best = null;
  let bestN = 0;
  for (const t of CHIP_ORDER) {
    if (score[t] > bestN) {
      best = t;
      bestN = score[t];
    }
  }
  return best;
}

/**
 * Up to three "where marks slipped" lines from the STORED per-question results: every GRADED
 * question that lost marks (the scorecard's own "Where marks slipped" rule), biggest loss
 * first, then by question number. Numbers and an enum type only.
 */
function slipsFrom(results) {
  const rows = [];
  for (const q of results) {
    if (!isGraded(q)) continue;
    const available = roundMarks(Number(q.totalMarks) || 0);
    const awarded = roundMarks(Number(q.marksAwarded) || 0);
    const qNumber = Number(q.qNumber);
    if (!(available > awarded) || !Number.isInteger(qNumber) || qNumber < 1 || qNumber > 999) continue;
    rows.push({ q: qNumber, awarded: Math.max(0, awarded), available, type: chipTypeOf(q), lost: available - awarded });
  }
  rows.sort((a, b) => b.lost - a.lost || a.q - b.q);
  return rows.slice(0, MAX_SLIPS).map(({ q, awarded, available, type }) => ({ q, awarded, available, type }));
}

/** Tap-only (MCQ / objective) or a written, step-marked result? Decided from the stored data. */
function kindOf(record, results) {
  if (record.surface === 'quick-practice') return 'objective';
  const graded = results.filter(isGraded);
  if (graded.length > 0 && graded.every((q) => q.objective === true)) return 'objective';
  return 'written';
}

function chaptersOf(record) {
  const out = [];
  const add = (s) => {
    const slug = String(s || '').trim();
    if (SLUG_PATTERN.test(slug) && !out.includes(slug) && out.length < MAX_CHAPTERS) out.push(slug);
  };
  for (const k of Array.isArray(record.topicKeys) ? record.topicKeys : []) add(k);
  if (out.length === 0 && Array.isArray(record.questionTopics)) {
    for (const t of record.questionTopics) add(t && t.topicSlug);
  }
  return out;
}

/**
 * The snapshot a link stores — built ONLY from the student's stored record and its stored
 * per-question payload. Returns null when the record cannot honestly be shown.
 */
function buildSnapshot(record, payload) {
  if (!record || typeof record !== 'object') return null;
  if (!SURFACES.includes(record.surface)) return null;
  if (record.status === 'pending-upload') return null;
  const total = roundMarks(record.marksTotal);
  const awarded = roundMarks(record.marksAwarded);
  if (!finiteNonNeg(record.marksTotal) || !finiteNonNeg(record.marksAwarded) || !(total > 0) || awarded > total) return null;
  const gradedAt = toMillis(record.gradedAt);
  if (gradedAt === null) return null;
  const subject = record.subject === 'science' ? 'science' : record.subject === 'maths' ? 'maths' : null;
  if (!subject) return null;

  const results =
    payload && payload.response && Array.isArray(payload.response.results)
      ? payload.response.results.slice(0, MAX_RESULTS_READ).filter((q) => q && typeof q === 'object')
      : [];
  const marksLost =
    record.marksLostByTypeVersion === MARKS_LOST_BY_TYPE_VERSION ? readMarksLostByType(record.marksLostByType) : null;

  return {
    v: 1,
    subject,
    chapters: chaptersOf(record),
    gradedAt,
    awarded,
    total,
    marksLost: marksLost ? Object.fromEntries(MARKS_BUCKETS.map((b) => [b, roundMarks(marksLost[b])])) : null,
    fourType: toCounts(record.fourType),
    slips: slipsFrom(results),
    kind: kindOf(record, results),
  };
}

/** The fields a parent's page receives — the snapshot's display fields, never `uid`. */
function viewOf(doc) {
  return {
    firstName: firstNameOf(doc.firstName),
    subject: doc.subject,
    chapters: Array.isArray(doc.chapters) ? doc.chapters.filter((s) => SLUG_PATTERN.test(String(s))).slice(0, MAX_CHAPTERS) : [],
    gradedAt: toMillis(doc.gradedAt),
    awarded: doc.awarded,
    total: doc.total,
    marksLost: doc.marksLost ? readMarksLostByType(doc.marksLost) : null,
    fourType: toCounts(doc.fourType),
    slips: (Array.isArray(doc.slips) ? doc.slips : []).slice(0, MAX_SLIPS).map((s) => ({
      q: Number(s.q),
      awarded: Number(s.awarded),
      available: Number(s.available),
      type: STORED_TYPES.includes(s.type) ? s.type : null,
    })),
    kind: doc.kind === 'objective' ? 'objective' : 'written',
    expiresAt: new Date(toMillis(doc.expiresAt)).toISOString(),
  };
}

function createParentReportLimiter({ telemetry, now } = {}) {
  return createRateLimiter({
    telemetry,
    now,
    paidEndpoints: {
      [PARENT_REPORT_LINK_PATH]: PARENT_REPORT_LINK_CLASS,
      [PARENT_REPORT_VIEW_PATH]: PARENT_REPORT_VIEW_CLASS,
    },
    limits: {
      [PARENT_REPORT_LINK_CLASS]: { soft: Math.ceil(MAX_LINKS_PER_UID_PER_DAY / 2), hard: MAX_LINKS_PER_UID_PER_DAY },
      [ANONYMOUS_CLASS]: { soft: Math.ceil(MAX_VIEWS_PER_CLIENT_PER_DAY / 2), hard: MAX_VIEWS_PER_CLIENT_PER_DAY },
    },
  });
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function createParentReportRoutes(deps = {}) {
  const {
    sendJson,
    verifiedCaller,
    adminFirestore,
    telemetry,
    now = () => Date.now(),
    /** async (uid) => display name | '' — the server's own auth record, never the request. */
    getDisplayName = async () => '',
    tokenFactory = mintToken,
  } = deps;
  const rateLimiter = deps.rateLimiter || createParentReportLimiter({ telemetry, now });

  function emit(event) {
    try {
      if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(event, 1);
    } catch {
      /* a counter must never fail a request */
    }
  }

  async function readJsonBody(req, res) {
    try {
      const buf = await readBody(req, MAX_JSON_BYTES);
      const parsed = JSON.parse(buf.length ? buf.toString('utf8') : '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
      return parsed;
    } catch {
      sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
      return null;
    }
  }

  /** The student's OWN record and its per-question payload — under the VERIFIED uid only. */
  async function readOwnResult(uid, resultId) {
    const root = adminFirestore.collection(SESSION_RECORDS_COLLECTION).doc(uid);
    const recSnap = await root.collection(SESSION_SEGMENTS.records).doc(sanitizeDocId(resultId)).get();
    const record = recSnap && recSnap.exists ? recSnap.data() || null : null;
    if (!record || record.id !== resultId) return { record: null, payload: null };
    let payload = null;
    const ref = typeof record.perQuestionRef === 'string' ? record.perQuestionRef : '';
    if (ref) {
      const pSnap = await root.collection(SESSION_SEGMENTS.perQuestion).doc(sanitizeDocId(ref)).get();
      const p = pSnap && pSnap.exists ? pSnap.data() || null : null;
      if (p && p.ref === ref) payload = p;
    }
    return { record, payload };
  }

  /* ── POST /api/parent-report/link — the signed-in student mints a link to ONE result ── */
  async function handleMintLink(req, res) {
    const uid = await verifiedCaller.resolveVerifiedUid(req);
    if (!uid) return sendJson(res, 401, { ok: false, error: 'unauthenticated' });
    const verdict = rateLimiter.check(req, PARENT_REPORT_LINK_PATH, uid);
    if (!verdict.allowed) {
      emit('parent_report.link.rate_limited');
      return sendJson(res, 429, { ok: false, error: 'Too many links today. Please try again tomorrow.' });
    }
    if (!adminFirestore) return sendJson(res, 503, { ok: false, error: 'Unavailable right now.' });
    const body = await readJsonBody(req, res);
    if (!body) return undefined;
    const resultId = typeof body.resultId === 'string' ? body.resultId : '';
    if (!RESULT_ID_PATTERN.test(resultId)) return sendJson(res, 400, { ok: false, error: 'resultId is required' });

    let snapshot;
    try {
      const { record, payload } = await readOwnResult(uid, resultId);
      snapshot = buildSnapshot(record, payload);
    } catch (e) {
      emit('parent_report.link.read_failed');
      console.error('[parent-report/link] read failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not create a link.' });
    }
    if (!snapshot) {
      emit('parent_report.link.not_found');
      return sendJson(res, 404, { ok: false, error: 'result_not_found' });
    }

    let firstName = '';
    try {
      firstName = firstNameOf(await getDisplayName(uid));
    } catch {
      firstName = '';
    }

    const token = tokenFactory();
    if (!TOKEN_PATTERN.test(token)) return sendJson(res, 500, { ok: false, error: 'Could not create a link.' });
    const createdMs = now();
    const expiresMs = createdMs + LINK_TTL_MS;
    try {
      await adminFirestore.collection(PARENT_REPORTS_COLLECTION).doc(reportIdOf(token)).set({
        uid,
        firstName,
        ...snapshot,
        createdAt: new Date(createdMs),
        expiresAt: new Date(expiresMs),
      });
    } catch (e) {
      emit('parent_report.link.store_failed');
      console.error('[parent-report/link] could not store the link:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not create a link.' });
    }
    emit('parent_report.link.created');
    return sendJson(res, 200, { ok: true, token, expiresAt: new Date(expiresMs).toISOString(), kind: snapshot.kind });
  }

  /* ── POST /api/parent-report/view — the parent's page reads the snapshot, nothing else ── */
  async function handleView(req, res) {
    // Signed out by construction: no uid (verified or header) keys this bucket.
    const verdict = rateLimiter.check(req, PARENT_REPORT_VIEW_PATH, '', { signedOut: true });
    if (!verdict.allowed) {
      emit('parent_report.view.rate_limited');
      return sendJson(res, 429, { ok: false, error: 'Too many attempts. Please try again tomorrow.' });
    }
    if (!adminFirestore) return sendJson(res, 503, { ok: false, error: 'Unavailable right now.' });
    const body = await readJsonBody(req, res);
    if (!body) return undefined;
    const token = body.token;
    if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) {
      emit('parent_report.view.invalid');
      return sendJson(res, 404, NOT_FOUND_BODY);
    }
    let doc;
    let ref;
    try {
      ref = adminFirestore.collection(PARENT_REPORTS_COLLECTION).doc(reportIdOf(token));
      const snap = await ref.get();
      doc = snap && snap.exists ? snap.data() || null : null;
    } catch (e) {
      emit('parent_report.view.failed');
      console.error('[parent-report/view] failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not open this link.' });
    }
    if (!doc || typeof doc.uid !== 'string' || !doc.uid || doc.uid === ERASED_UID) {
      emit('parent_report.view.invalid');
      return sendJson(res, 404, NOT_FOUND_BODY);
    }
    const exp = toMillis(doc.expiresAt);
    if (exp === null || exp <= now()) {
      emit('parent_report.view.expired');
      try {
        if (typeof ref.delete === 'function') await ref.delete();
      } catch {
        /* best-effort clean-up; erasure / the TTL policy cover the rest */
      }
      return sendJson(res, 410, { ok: false, error: 'link_unavailable', reason: 'expired' });
    }
    emit('parent_report.view.ok');
    return sendJson(res, 200, { ok: true, ...viewOf(doc) });
  }

  return { handleMintLink, handleView };
}

module.exports = {
  createParentReportRoutes,
  createParentReportLimiter,
  buildSnapshot,
  slipsFrom,
  chipTypeOf,
  isGraded,
  firstNameOf,
  reportIdOf,
  mintToken,
  sanitizeDocId,
  PARENT_REPORT_LINK_PATH,
  PARENT_REPORT_VIEW_PATH,
  PARENT_REPORTS_COLLECTION,
  LINK_TTL_MS,
  MAX_LINKS_PER_UID_PER_DAY,
  MAX_VIEWS_PER_CLIENT_PER_DAY,
  TOKEN_PATTERN,
};
