'use strict';
/**
 * BUYER-SCORE-1 (admin, server side) - the buyer-propensity score of a sign-up, from what the server
 * already stores: the first-touch source (signupSources/{uid}), its landing path, and the sign-up hour (IST).
 * NO behaviour points here (the server has none); the browser adds those. Analytics only: nothing in
 * purchase, entitlement or grading reads this.
 *
 * CJS port of src/analytics/buyerScore.ts (classifySource / landingGroup / hourBlock), which is in turn
 * the rules of buyer_analysis_2026-11-23.py. The points table is ONE JSON file both sides require:
 * src/config/buyerScorePoints.json. src/analytics/buyerScore.parity.test.ts fails if the two ports diverge.
 *
 * Kill switch: BUYER_SCORE_ADMIN_DISABLED=1 -> the field is omitted from the Students rows.
 */
const POINTS = require('../../src/config/buyerScorePoints.json');

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function isDisabled(env) {
  const raw = (env || process.env).BUYER_SCORE_ADMIN_DISABLED;
  return /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? '' : String(raw).trim());
}

function lower(v) {
  return typeof v === 'string' ? v.toLowerCase() : '';
}

function classifySource(src) {
  const s = src || {};
  const us = lower(s.utm_source);
  const um = lower(s.utm_medium);
  const uc = lower(s.utm_campaign);
  const ref = lower(s.ref);
  const g = s.gclid === true;
  const f = s.fbclid === true;
  if (['an', 'meta', 'facebook', 'ig', 'instagram'].includes(us) || f || ref.includes('facebook') || ref.includes('instagram')) {
    return 'Meta';
  }
  if (us === 'youtube' || ref.includes('youtube')) return 'YouTube';
  if (us === 'google' && um === 'cpc') {
    const byCampaign = {
      search_pdf_packs: 'GSearch PDF Packs',
      search_test_series: 'GSearch Test Series',
      search_board_pass: 'GSearch Board Pass',
      search_signups_v2: 'GSearch Sign-ups v2',
    };
    return Object.prototype.hasOwnProperty.call(byCampaign, uc) ? byCampaign[uc] : 'GSearch other';
  }
  if (g && (ref === '' || ref.includes('google') || ref.includes('syndicated'))) return 'GSearch untagged';
  if (ref.includes('google')) return 'Organic Google';
  if (['bing', 'yahoo', 'msn', 'brave', 'duckduck'].some((x) => ref.includes(x))) return 'Bing/other search';
  if (us === 'parent_share' || us === 'whatsapp' || ref.includes('chatgpt') || us.includes('chatgpt')) {
    return 'Share/WhatsApp/ChatGPT';
  }
  if (ref === '' && us === '') return 'Direct/unknown';
  return 'Other';
}

function landingGroup(landing) {
  const x = lower(landing);
  if (x === '') return 'none';
  if (x === '/') return 'home';
  if (x.startsWith('/pricing') || x.startsWith('/board-pass')) return 'pricing/board-pass';
  if (x.startsWith('/for-parents')) return 'for-parents';
  if (['/packs', '/cbq-packs', '/question-bank', '/mock-test'].some((p) => x.startsWith(p))) return 'packs';
  if (x.startsWith('/test-series')) return 'test-series';
  if (x.startsWith('/practice-hub')) return 'practice-hub';
  if (x.startsWith('/check-improve')) return 'answer-checker';
  if (['/notes', '/cbse', '/tutor'].some((p) => x.startsWith(p))) return 'notes/SEO';
  if (['/login', '/welcome', '/browse'].some((p) => x.startsWith(p))) return 'login';
  return 'content (HPQ/trends/tests)';
}

function istHour(ms) {
  return new Date(ms + IST_OFFSET_MS).getUTCHours();
}

function hourBlock(h) {
  return h < 6 ? '00-06' : h < 9 ? '06-09' : h < 13 ? '09-13' : h < 17 ? '13-17' : h < 21 ? '17-21' : '21-24';
}

function pointsFor(table, key) {
  return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : 0;
}

function tierOf(points) {
  return points >= POINTS.tiers.hot ? 'hot' : points >= POINTS.tiers.warm ? 'warm' : 'cold';
}

/** { points, tier } from a stored source + sign-up ms; null when no source was recorded (never a guess). */
function buyerScoreForRow(source, createdMs) {
  if (!source || typeof source !== 'object') return null;
  let points = pointsFor(POINTS.source, classifySource(source)) + pointsFor(POINTS.landing, landingGroup(source.landing));
  if (typeof createdMs === 'number' && Number.isFinite(createdMs)) {
    points += pointsFor(POINTS.hour, hourBlock(istHour(createdMs)));
  }
  return { points, tier: tierOf(points) };
}

module.exports = { isDisabled, classifySource, landingGroup, hourBlock, istHour, tierOf, buyerScoreForRow };
