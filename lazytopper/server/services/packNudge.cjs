'use strict';
// packNudge.cjs - PACK-NUDGE-1 (owner approved 2 Nov 2026): email a student who BOUGHT a PDF pack but has not
// opened (downloaded) any file of it. PURE helpers and the two email templates; no I/O, no clock.
// The scheduler pass that uses them is runPackNudge in services/nudgeEmail.cjs, on the SAME rails as every other
// nudge: one claim transaction, the durable daily cap, the 24 h spacing (at most one email a day), the shared
// unsubscribe, Resend. There is no second mailer and no second ledger.
//
//   email 1 (pack bought 2-4 days ago)  "Your {Pack name} is ready. Start with {first step} today"
//   email 2 (pack bought 5-7 days ago, email 1 was sent, still not opened)  "Done the first 20 minutes? ..."
//   Never more than these two per pack.
//
// ★ THE "DOWNLOADED" SIGNAL. A pack PDF is built in the student's browser (lib/packs/buildPackFiles.ts), so there is
//   no download route to record on. The browser does fire the first-party `pack_download` event for every file
//   saved, and the activity recorder (routes/studentActivity.cjs) counts it per IST day in
//   `activityLog/{uid}/activityDays/{day}.events.pack_download`. That count is the signal. It names no pack, only
//   "a pack file was saved", so a student who holds two packs and saved a file of either is treated as having
//   opened both: the safe error (we may stay silent, we never nag someone who has started).

const { escapeHtml } = require('./trialEndingEmail.cjs');
const { parsePackId } = require('./packProducts.cjs');

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Email 1 goes out from day 2 to before day 4 after the purchase; email 2 from day 5 to before day 7. */
const PACK_NUDGE_WINDOWS = Object.freeze({
  1: Object.freeze({ fromMs: 2 * DAY_MS, toMs: 4 * DAY_MS }),
  2: Object.freeze({ fromMs: 5 * DAY_MS, toMs: 7 * DAY_MS }),
});
/** The oldest purchase the scheduler needs to look at (end of the email-2 window). */
const PACK_NUDGE_MAX_AGE_MS = PACK_NUDGE_WINDOWS[2].toMs;
const PACK_NUDGE_MIN_AGE_MS = PACK_NUDGE_WINDOWS[1].fromMs;
const DEFAULT_REPLY_TO = 'support@lazytopper.com';

/** Which email (1, 2) a purchase of this age is due, or null between windows. PURE. */
function packNudgeStageFor(ageMs) {
  if (!Number.isFinite(ageMs)) return null;
  for (const stage of [1, 2]) {
    const w = PACK_NUDGE_WINDOWS[stage];
    if (ageMs >= w.fromMs && ageMs < w.toMs) return stage;
  }
  return null;
}

/** The ledger key for one email of one pack, e.g. `packnudge1_pack_cbq_science` (a safe Firestore map key). PURE. */
function packNudgeKind(stage, packId) {
  const safe = String(packId || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `packnudge${stage}_${safe}`;
}

/**
 * Has the student saved any pack file since the purchase? `days` are the student's recent activityDays documents.
 * A day counts when its `events.pack_download` is positive and the student was last seen on it at or after the
 * purchase. PURE.
 */
function packDownloadedSince(days, paidAtMs) {
  for (const d of Array.isArray(days) ? days : []) {
    if (!d || typeof d !== 'object') continue;
    const n = d.events && typeof d.events === 'object' ? d.events.pack_download : 0;
    if (typeof n !== 'number' || !(n > 0)) continue;
    const last = typeof d.lastSeenMs === 'number' ? d.lastSeenMs : null;
    if (last === null || last >= paidAtMs) return true;
  }
  return false;
}

const SUBJECT_LABEL = Object.freeze({ maths: 'Maths', science: 'Science' });
const titleCase = (slug) =>
  String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

/** What the pack is called in the email, e.g. "Maths CBQ Pack". null for an unreadable pack id. PURE. */
function packDisplayName(packId) {
  const p = parsePackId(packId);
  if (!p) return null;
  const subject = SUBJECT_LABEL[p.target];
  if (p.sku === 'pack_bundle') return 'Maths + Science Bundle';
  if (p.sku === 'pack_chapter') return `${titleCase(p.target)} Chapter Pack`;
  if (p.sku === 'pack_mock') return `${subject} Mock Pack`;
  if (p.sku === 'pack_subject') return `${subject} Subject Pack`;
  if (p.sku === 'pack_cbq') return `${subject} CBQ Pack`;
  return null;
}

/** 'mock' | 'cbq' | 'chapter' (chapter / subject / bundle share one set of steps). PURE. */
function packFlavour(packId) {
  const p = parsePackId(packId);
  if (!p) return null;
  if (p.sku === 'pack_mock') return 'mock';
  if (p.sku === 'pack_cbq') return 'cbq';
  return 'chapter';
}

const FIRST_STEP = Object.freeze({ mock: 'Paper 1', cbq: '10 CBQs', chapter: 'your first chapter' });

const STEPS = Object.freeze({
  mock: [
    'Open Paper 1 and print it (or keep it on your phone).',
    'Set a 20-minute timer and do Section A only.',
    'Check each answer against the step-marking key.',
  ],
  cbq: [
    "Open one chapter's CBQs.",
    'Set a 20-minute timer and do 10 CBQs.',
    'Check each against its step-wise solution.',
  ],
  chapter: [
    'Open your first chapter.',
    "Set a 20-minute timer and try the first worked example's questions.",
    'Check each against its worked solution.',
  ],
});

const NEXT_LINE = Object.freeze({
  mock: "Done Section A? Try Section B next — it's where most marks slip.",
  cbq: 'Done 10 CBQs? Try the case-study CBQs next.',
  chapter: 'Done the first set? Try the next set of questions.',
});

/** "Hi Asha," - the first name from the account when it is plain letters, else "Hi there,". PURE. */
function greetingFor(displayName) {
  const first = String(displayName || '').trim().split(/\s+/)[0] || '';
  const ok = /^[\p{L}][\p{L}'.-]{0,23}$/u.test(first);
  return `Hi ${ok ? first : 'there'},`;
}

/** The "Open my pack" link: the My packs section, UTM only (no uid, email or other student data). PURE. */
function packNudgeUrl(appUrl, stage) {
  return `${appUrl}/packs?utm_source=email&utm_medium=email&utm_campaign=pack_nudge_${stage}#my-packs`;
}

/**
 * The email for one stage of one pack. PURE. Plain HTML + text, no tracking, an unsubscribe link, no price, no
 * mention of refunds. The page is called Answer Checker.
 * @returns {{subject:string, text:string, html:string} | null} null when the pack id is not a real pack.
 */
function buildPackNudgeEmail(stage, { packId, displayName, appUrl, unsubscribeUrl }) {
  const name = packDisplayName(packId);
  const flavour = packFlavour(packId);
  if (!name || !flavour) return null;
  const greeting = greetingFor(displayName);
  const url = packNudgeUrl(appUrl, stage);
  const button = 'Open my pack';
  const signoff = 'Team LazyTopper · Made by an IITian (IIT Kanpur)';
  const footer = "You're getting this because you made a LazyTopper account with this address. You can stop these emails any time.";

  let subject;
  const paras = [greeting];
  let steps = null;
  if (stage === 1) {
    subject = `Your ${name} is ready. Start with ${FIRST_STEP[flavour]} today`;
    paras.push(`your ${name} is waiting in My packs. Pre-boards are close, so here's a 20-minute start:`);
    steps = STEPS[flavour];
    paras.push('Want a written answer marked like a CBSE examiner? Upload one in the Answer Checker.');
  } else {
    subject = "Done the first 20 minutes? Here's the next step";
    paras.push(`Your ${name} is waiting in My packs.`);
    paras.push(NEXT_LINE[flavour]);
  }

  // Email 1 reads "Hi Asha, your {Pack name} is waiting ..." as one sentence in the approved copy.
  const lead = stage === 1 ? `${paras[0]} ${paras[1]}` : paras[0];
  const rest = stage === 1 ? paras.slice(2) : paras.slice(1);

  const textLines = [lead, ''];
  if (steps) {
    steps.forEach((s, i) => textLines.push(`${i + 1}) ${s}`));
    textLines.push('');
  }
  for (const p of rest) textLines.push(p, '');
  textLines.push(`${button}: ${url}`, '', signoff, '', footer, `Unsubscribe: ${unsubscribeUrl}`, '', 'LazyTopper');
  const text = textLines.join('\n');

  const pStyle = 'margin:0 0 14px;font-size:15px;line-height:1.5;color:#1b2a3a';
  const html = [
    '<!doctype html><html><body style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif">',
    '<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px">',
    `<p style="${pStyle}">${escapeHtml(lead)}</p>`,
    steps ? `<ol style="margin:0 0 14px;padding-left:22px;font-size:15px;line-height:1.5;color:#1b2a3a">${steps.map((s) => `<li style="margin:0 0 6px">${escapeHtml(s)}</li>`).join('')}</ol>` : '',
    rest.map((p) => `<p style="${pStyle}">${escapeHtml(p)}</p>`).join(''),
    `<p style="margin:0 0 18px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#13804f;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:8px">${escapeHtml(button)}</a></p>`,
    `<p style="${pStyle}">${escapeHtml(signoff)}</p>`,
    `<p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#5b6b7c">${escapeHtml(footer)} <a href="${escapeHtml(unsubscribeUrl)}" style="color:#5b6b7c">Unsubscribe</a></p>`,
    '</div></body></html>',
  ].join('');
  return { subject, text, html };
}

module.exports = {
  PACK_NUDGE_WINDOWS,
  PACK_NUDGE_MAX_AGE_MS,
  PACK_NUDGE_MIN_AGE_MS,
  DEFAULT_REPLY_TO,
  packNudgeStageFor,
  packNudgeKind,
  packDownloadedSince,
  packDisplayName,
  packFlavour,
  greetingFor,
  packNudgeUrl,
  buildPackNudgeEmail,
};
