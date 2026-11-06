'use strict';
/**
 * sampleFollowup.cjs - SAMPLE-FOLLOWUP-1 (owner approved 4 Nov 2026). ONE follow-up email to a SIGNED-IN student who saved a
 * pack's free sample page and has not bought that pack. PURE helpers and the email template; no I/O, no clock. The pass that uses
 * them is runSampleFollowup in services/nudgeEmail.cjs, on the SAME rails as every other nudge (claim + durable daily cap +
 * opt-out re-read in one transaction, the IST send window, 24 h spacing, the shared signed unsubscribe, Resend). No second
 * scheduler, no new collection: the "sample saved" marker and the ledger key both live in `nudgeEmails/{uid}`.
 *
 * ★ DARK BY DEFAULT. Nothing runs unless SAMPLE_FOLLOWUP_EMAIL_ENABLED is exactly "1" (on top of the nudge job's own
 *   NUDGE_EMAIL_ENABLED / NUDGE_EMAIL_DRY_RUN=0 / Resend / sender / unsubscribe-secret requirements).
 *
 * ★ WHO. Only a SIGNED-IN student: the marker is written by routes/packSampleSeen.cjs from a verified ID token, so a signed-out
 *   visitor leaves nothing (no email address is collected before sign-up; many students are minors). The pass then applies every
 *   nudge rule: verified email sign-in only, never admin / @lazytopper.com, never an opted-out address.
 *   Sent 24-72 h after the FIRST sample save of that pack, and only if the student does not own the pack (or a pack that includes
 *   it) and has no paid Board Pass. At most ONE per student per pack, ever (ledger key `samplefu_<pack>`).
 *
 * ★ COPY. What the full pack contains, from the pack catalogue (packProducts.cjs PACK_CHAPTERS; the mock counts mirror
 *   MOCKS_PER_SUBJECT / BUNDLE_MOCKS in src/lib/packs/packLabels.ts - KEEP IN STEP, as abandonedCheckout.cjs does). NO price in
 *   the email at all (the pack price is decided and formatted elsewhere and GST-EXCL-1 is changing it): the button opens the pack,
 *   where the price is shown before payment. No refund wording, no "Premium", no urgency, no tracking pixel.
 * ★ PRIVACY. Every URL carries a path and UTM tags only: no uid, no email, no phone.
 */

const { escapeHtml } = require('./trialEndingEmail.cjs');
const { PACK_CHAPTERS, PACK_SUBJECTS, validateTarget, isAlreadyOwned, chaptersOf, ownsMocks, ownsCbq } = require('./packProducts.cjs');
const { greetingFor } = require('./packNudge.cjs');

const HOUR_MS = 60 * 60 * 1000;

/** Due 24 h after the first save; still eligible until 72 h (a full daily cap or the send window can defer it). */
const SAMPLE_FOLLOWUP_MIN_AGE_MS = 24 * HOUR_MS;
const SAMPLE_FOLLOWUP_MAX_AGE_MS = 72 * HOUR_MS;
/** The newest marked students read per run (one single-field range query, the abandoned-checkout pattern). */
const CAP_SAMPLE_FOLLOWUP = 500;
const KIND_PREFIX = 'samplefu_';
const METRIC = 'sample_followup';
/**
 * The nudgeEmails/{uid} field the route writes: ONE flat number per pack, `sampleSeenAt_<pack>` = first-save ms. Flat and per pack
 * so the job can run one single-field range query PER PACK and judge each pack by its OWN first-save time (a later sample of
 * another pack can never push an earlier pack past its window).
 */
const SEEN_PREFIX = 'sampleSeenAt_';
const MOCKS_PER_SUBJECT = 8;
const BUNDLE_MOCKS = MOCKS_PER_SUBJECT * 2;
/** The ONE support WhatsApp link: a mirror of src/config/socialProfiles.ts WHATSAPP_URL (sampleFollowup.test.cjs reads that file and fails on drift). */
const SUPPORT_WHATSAPP_URL = 'https://wa.me/919714568948';
const SUBJECT_LABEL = Object.freeze({ maths: 'Maths', science: 'Science' });

/** The switch: exactly "1" turns it on; anything else (unset included) is off. PURE. */
function sampleFollowupEnabled(env = process.env) {
  return String((env && env.SAMPLE_FOLLOWUP_EMAIL_ENABLED) || '').trim() === '1';
}

/**
 * A sample key as the browser sends it: `<sku>:<target>` where the target is the SAMPLE's subject (a Chapter Pack's sample is a
 * subject's sample, not one chapter) or `all` for the bundle. Returns { sku, target } or null. PURE.
 */
function parseSampleKey(key) {
  if (typeof key !== 'string' || key.length > 40) return null;
  const i = key.indexOf(':');
  if (i <= 0) return null;
  const sku = key.slice(0, i);
  const target = key.slice(i + 1);
  if (sku === 'pack_bundle') return target === 'all' ? { sku, target } : null;
  if (!['pack_chapter', 'pack_mock', 'pack_subject', 'pack_cbq'].includes(sku)) return null;
  return PACK_SUBJECTS.includes(target) ? { sku, target } : null;
}

/** Every sample key the browser can send (closed list, mirrors PACK_SAMPLES in src/lib/packs/packSamples.ts). */
const SAMPLE_KEYS = Object.freeze([
  ...['pack_chapter', 'pack_mock', 'pack_subject', 'pack_cbq'].flatMap((sku) => PACK_SUBJECTS.map((t) => `${sku}:${t}`)),
  'pack_bundle:all',
]);

/** The per-pack first-save field, e.g. `sampleSeenAt_pack_cbq_science` (a safe top-level field name). PURE. */
function seenField(key) {
  return `${SEEN_PREFIX}${String(key || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`;
}

/** The ledger key for one pack's follow-up, e.g. `samplefu_pack_cbq_science` (a safe Firestore map key). PURE. */
function sampleFollowupKind(key) {
  const safe = String(key || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `${KIND_PREFIX}${safe}`;
}

/** Is a first save `ageMs` ago inside the send window? PURE. */
function sampleFollowupDue(ageMs) {
  return Number.isFinite(ageMs) && ageMs >= SAMPLE_FOLLOWUP_MIN_AGE_MS && ageMs < SAMPLE_FOLLOWUP_MAX_AGE_MS;
}

/**
 * Does the student already hold what this sample is a sample of? `packs` are their entitlements ({ packId }).
 *   Chapter Pack sample -> any chapter pack of that subject, that subject's Subject Pack, or the Bundle.
 *   Mock / Subject / Bundle -> the server's own coverage rule (isAlreadyOwned). CBQ -> only that CBQ Pack. PURE.
 */
function sampleOwned(packs, key) {
  const p = parseSampleKey(key);
  if (!p) return true; // an unreadable key is never emailed
  const ids = new Set((Array.isArray(packs) ? packs : []).map((x) => x && x.packId).filter((x) => typeof x === 'string'));
  if (p.sku === 'pack_chapter') {
    if (ids.has('pack_bundle:all') || ids.has(`pack_subject:${p.target}`)) return true;
    return chaptersOf(p.target).some((slug) => ids.has(`pack_chapter:${slug}`));
  }
  if (p.sku === 'pack_mock') return ownsMocks(packs, p.target);
  if (p.sku === 'pack_cbq') return ownsCbq(packs, p.target);
  return isAlreadyOwned(packs, p.sku, p.target);
}

/** The pack's name in the email. null for an unreadable key. PURE. */
function sampleDisplayName(key) {
  const p = parseSampleKey(key);
  if (!p) return null;
  const subject = SUBJECT_LABEL[p.target];
  switch (p.sku) {
    case 'pack_bundle':
      return 'Maths + Science Bundle';
    case 'pack_chapter':
      return 'Chapter Pack';
    case 'pack_mock':
      return `${subject} Mock Pack`;
    case 'pack_subject':
      return `${subject} Subject Pack`;
    case 'pack_cbq':
      return `${subject} CBQ Pack`;
    default:
      return null;
  }
}

/** What the full pack contains, from the catalogue. Counts are never invented. PURE. */
function sampleContents(key) {
  const p = parseSampleKey(key);
  if (!p) return null;
  const all = Object.keys(PACK_CHAPTERS).length;
  const subject = SUBJECT_LABEL[p.target];
  const n = p.target === 'all' ? all : chaptersOf(p.target).length;
  switch (p.sku) {
    case 'pack_bundle':
      return `All ${all} chapters of Maths and Science plus ${BUNDLE_MOCKS} board-pattern mock papers, with step-marking keys.`;
    case 'pack_chapter':
      return `Important questions for one chapter of your choice (any of the ${all} chapters), with a CBSE step-marking answer key.`;
    case 'pack_mock':
      return `${MOCKS_PER_SUBJECT} board-pattern ${subject} mock papers for 2027, with step-marking keys.`;
    case 'pack_subject':
      return `Every ${subject} chapter (${n} chapters), as a chapter-wise question bank for 2026-27, with answer keys.`;
    case 'pack_cbq':
      return `Competency-based questions for every ${subject} chapter (${n} chapters): MCQ, assertion-reason, short, case study and long answer, each with a step-wise solution.`;
    default:
      return null;
  }
}

const utm = 'utm_source=email&utm_medium=email&utm_campaign=sample_followup';

/**
 * "Get the full pack": the one-tap path the app already supports, `/packs?buy=<sku>&t=<subject>` (the Bundle has no `t`), with
 * `from=sample` so the checkout reports where it came from. A Chapter Pack needs a chapter the sample does not name, so it opens
 * /packs. UTM tags only. PURE.
 */
function fullPackUrl(appUrl, key) {
  const p = parseSampleKey(key);
  if (!p || p.sku === 'pack_chapter') return `${appUrl}/packs?${utm}`;
  const q = new URLSearchParams({ buy: p.sku });
  if (p.sku !== 'pack_bundle') q.set('t', p.target);
  q.set('from', 'sample');
  return `${appUrl}/packs?${q.toString()}&${utm}`;
}

/**
 * The email for one pack. PURE. Plain HTML + text, one button, the shared unsubscribe link, the WhatsApp line.
 * @returns {{subject:string, text:string, html:string} | null} null when the key is not a real sample.
 */
function buildSampleFollowupEmail({ packKey, displayName, appUrl, unsubscribeUrl }) {
  const name = sampleDisplayName(packKey);
  const contents = sampleContents(packKey);
  if (!name || !contents) return null;
  const greeting = greetingFor(displayName);
  const url = fullPackUrl(appUrl, packKey);
  const button = 'Get the full pack';
  const subject = `The full ${name}: what's in it`;
  const lead = `${greeting} you saved the free ${name} sample page. If it looked useful, here is what the full pack has:`;
  const closing = 'Made by an IITian (IIT Kanpur). Take your time; the sample page is yours to keep either way.';
  const whatsapp = 'Questions? WhatsApp us';
  const signoff = 'Team LazyTopper';
  const footer = "You're getting this because you made a LazyTopper account with this address. You can stop these emails any time.";

  const text = [lead, '', `- ${contents}`, '', `${button}: ${url}`, '', closing, '', `${whatsapp}: ${SUPPORT_WHATSAPP_URL}`, '', signoff, '', footer, `Unsubscribe: ${unsubscribeUrl}`, '', 'LazyTopper'].join('\n');

  const pStyle = 'margin:0 0 14px;font-size:15px;line-height:1.5;color:#1b2a3a';
  const html = [
    '<!doctype html><html><body style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif">',
    '<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px">',
    `<p style="${pStyle}">${escapeHtml(lead)}</p>`,
    `<ul style="margin:0 0 16px;padding-left:22px;font-size:15px;line-height:1.5;color:#1b2a3a"><li>${escapeHtml(contents)}</li></ul>`,
    `<p style="margin:0 0 18px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#13804f;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:8px">${escapeHtml(button)}</a></p>`,
    `<p style="${pStyle}">${escapeHtml(closing)}</p>`,
    `<p style="${pStyle}"><a href="${escapeHtml(SUPPORT_WHATSAPP_URL)}" style="color:#13804f">${escapeHtml(whatsapp)}</a></p>`,
    `<p style="${pStyle}">${escapeHtml(signoff)}</p>`,
    `<p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#5b6b7c">${escapeHtml(footer)} <a href="${escapeHtml(unsubscribeUrl)}" style="color:#5b6b7c">Unsubscribe</a></p>`,
    '</div></body></html>',
  ].join('');
  return { subject, text, html };
}

/** One structured line per run: counts only, no PII. */
function runCountLine(own) {
  return `[sample-followup] run mode=${own.mode} candidates=${own.candidates} wouldSend=${own.wouldSend} sent=${own.sent} failed=${own.failed} skipped=${JSON.stringify(own.skipped)}`;
}

module.exports = {
  SAMPLE_FOLLOWUP_MIN_AGE_MS,
  SAMPLE_FOLLOWUP_MAX_AGE_MS,
  CAP_SAMPLE_FOLLOWUP,
  KIND_PREFIX,
  METRIC,
  MOCKS_PER_SUBJECT,
  BUNDLE_MOCKS,
  SEEN_PREFIX,
  SAMPLE_KEYS,
  seenField,
  SUPPORT_WHATSAPP_URL,
  sampleFollowupEnabled,
  parseSampleKey,
  sampleFollowupKind,
  sampleFollowupDue,
  sampleOwned,
  sampleDisplayName,
  sampleContents,
  fullPackUrl,
  buildSampleFollowupEmail,
  runCountLine,
};
