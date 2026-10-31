/**
 * nudgeConciergeTemplates.cjs — EMAIL-CONCIERGE-1 (owner ruling 25 Oct 2026): the two
 * "personal note" emails the founder used to send by hand. PURE functions, no I/O.
 *
 *   founder_checkin  "A quick question from LazyTopper's founder"  - names what the student really did,
 *                    asks one question, offers a free 10-minute call with a parent. NO price, no urgency.
 *   checkout_help    "Did something go wrong at payment?"           - asks whether payment failed or it was
 *                    the price, offers to show a parent in a call. May name the plan and its real price.
 *
 * Look: a plain note. No images, no marketing layout, no buttons. A text part, and the shared
 * unsubscribe footer. Replies go to the founder (Reply-To is set by the caller).
 */

const { escapeHtml, plural } = require('./trialEndingEmail.cjs');

const SIGNATURE = '— Chetan, founder, LazyTopper';

/** "about 20 minutes" - a real, rounded figure, never invented. PURE. */
function minutesPhrase(minutes) {
  const m = Math.round(Number.isFinite(minutes) ? minutes : 0);
  return m >= 1 ? `about ${plural(m, 'minute', 'minutes')}` : null;
}

/**
 * What the student actually did, in words, from real numbers only. PURE.
 * facts = { checks, tests, practiceSets, activeMinutes, pricingOpens }. Returns a sentence or null.
 */
function didLine(facts) {
  const f = facts || {};
  const parts = [];
  if (f.checks > 0) parts.push(plural(f.checks, 'answer check', 'answer checks'));
  if (f.tests > 0) parts.push(plural(f.tests, 'test', 'tests'));
  if (f.practiceSets > 0) parts.push(plural(f.practiceSets, 'practice set', 'practice sets'));
  const mins = minutesPhrase(f.activeMinutes);
  if (parts.length === 0 && !mins) return null;
  const doneWhat = parts.length ? parts.join(', ') : null;
  if (doneWhat && mins) return `You have done ${doneWhat} and spent ${mins} on it.`;
  if (doneWhat) return `You have done ${doneWhat}.`;
  return `You have spent ${mins} on it.`;
}

/** "the monthly plan" | "the till-boards plan". PURE. */
function planPhrase(passType) {
  if (passType === 'till_boards') return 'the till-boards plan';
  if (passType === 'month') return 'the monthly plan';
  return 'a plan';
}

const rupees = (paise) => `₹${Math.round(paise / 100)}`;

/**
 * @param {'founder_checkin'|'checkout_help'} kind
 * @param {{facts?:object, order?:{passType?:string, amountPaise?:number}, unsubscribeUrl:string}} o
 * @returns {{subject:string, text:string, html:string}}
 */
function buildConciergeEmail(kind, o) {
  const { facts, order, unsubscribeUrl } = o;
  let subject;
  const paras = ['Hi,'];
  if (kind === 'founder_checkin') {
    subject = "A quick question from LazyTopper's founder";
    paras.push("I'm Chetan, the founder of LazyTopper. Thank you for using it for your board preparation.");
    const did = didLine(facts);
    if (did) paras.push(did);
    paras.push('I would like to ask you one honest question: what would make LazyTopper genuinely useful for your boards, and what stops you from using it more?');
    paras.push('If it is easier to talk, I am happy to have a free 10-minute call with you and a parent. Just reply to this email.');
  } else {
    subject = 'Did something go wrong at payment?';
    // PRICE-FIXED-1: a month order is never quoted (its price is hidden); only a Board Pass order names its amount.
    const hasPlan = order && order.passType === 'till_boards' && Number.isInteger(order.amountPaise) && order.amountPaise > 0;
    paras.push("I'm Chetan, the founder of LazyTopper.");
    paras.push(
      hasPlan
        ? `I saw that you started to pay for ${planPhrase(order.passType)} (${rupees(order.amountPaise)}), but it did not go through.`
        : 'I saw that you started to pay for Premium, but it did not go through.'
    );
    paras.push('Did something go wrong at payment, or was it the price? Either answer helps me, and I would like to fix it.');
    paras.push('If you would like, I can show a parent how it works in a free 10-minute call. Just reply to this email.');
  }
  paras.push(SIGNATURE);

  const footer = "You're getting this because you made a LazyTopper account with this address. You can stop these emails any time.";
  const text = [...paras.flatMap((p) => [p, '']), footer, `Unsubscribe: ${unsubscribeUrl}`, '', 'LazyTopper'].join('\n');
  const pStyle = 'margin:0 0 14px;font-size:15px;line-height:1.5;color:#1b2a3a';
  const html = [
    '<!doctype html><html><body style="margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;color:#1b2a3a">',
    '<div style="max-width:520px">',
    paras.map((p) => `<p style="${pStyle}">${escapeHtml(p)}</p>`).join(''),
    `<p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#5b6b7c">${escapeHtml(footer)} <a href="${escapeHtml(unsubscribeUrl)}" style="color:#5b6b7c">Unsubscribe</a></p>`,
    '</div></body></html>',
  ].join('');
  return { subject, text, html };
}

module.exports = { buildConciergeEmail, didLine, planPhrase, minutesPhrase, SIGNATURE };
