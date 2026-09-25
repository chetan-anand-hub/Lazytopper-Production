import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import {
  FOUNDING_LABEL,
  FOUNDING_OFFER_OPEN,
  PRICE_FREE_DISPLAY,
  PRICE_MONTHLY_FOUNDING_DISPLAY,
  PRICE_MONTHLY_LIST_DISPLAY,
} from "../config/pricing";
import { predictCbseExamDate } from "../services/cbseExamDate";

/**
 * LazyTopper public landing — ONE component for every screen size.
 * LANDING-MERGE-1, built from `LazyTopper_landing_v6_FINAL.html`
 * (SHA-256 8630c51b…59011d84), which IS the design.
 *
 * ★ THIS REPLACES BOTH `Welcome.tsx` (>=1024px) AND `MobileWelcome.tsx` (<1024px).
 * Owner ruling, not a preference. The router no longer picks a landing by width.
 *
 * ★★ THE FROZEN >=1180px LAYOUT IS GONE, DELIBERATELY — owner ruling, §2.2.
 * The page it replaced pinned `html/body/#root/.lt-frozen-landing` to
 * `height:100vh; overflow:hidden` and laid the page out as a five-row grid, so
 * the legal footer only stayed reachable by occupying the fifth row. THIS PAGE
 * SCROLLS AT EVERY WIDTH. If you are reading this because the desktop landing
 * no longer fills exactly one screen: that is the intent, not a regression.
 * The footer is reachable by scrolling, which is why its mount is now an
 * ordinary last child (see the P10 note on PublicLegalFooter below).
 *
 * ★★ NO `useIsDesktop()` IN THIS PAGE, and the omission is load-bearing.
 * The spec PERMITS the hook; the prototype FORBIDS it. CSS-only satisfies both,
 * so that is what this is: three mobile-first breakpoints, base / 700 / 1000,
 * and no width read in JavaScript. A width hook reads `window.matchMedia` at
 * render time, so a future static capture (fixed 1280x900 viewport) would bake
 * the desktop DOM into the HTML served to phones. CSS media queries re-evaluate
 * in the reader's own browser and are immune. If you reach for a width hook
 * here, the CSS is wrong — stop and report.
 *
 * ⚠ THIS LANE DOES NOT MAKE `/app/` PRERENDERABLE AND DOES NOT CLAIM TO.
 * The capture excludes the root because `RootEntry` serves this page to a
 * signed-out visitor and `DesktopHome` to a signed-in one — an AUTH split, not
 * a width split (`scripts/seo/captureStaticBodies.ts:20-30`). Collapsing the
 * width branch leaves that reason true word for word. The prototype's header
 * says merging "removes that reason"; MEASURED AGAINST THE CODE, IT DOES NOT.
 *
 * ★ NO AUTH READ IN THIS PAGE EITHER. The landing it replaced called `useAuth()`
 * to vary its CTA. This one does not: every destination is a static link. That
 * is one less auth-dependent branch on the route whose auth-dependence is the
 * documented reason the root cannot be captured, and it costs nothing — a
 * signed-in visitor is routed away from `/` before this page ever renders.
 */

/**
 * ★ PURE, AND THE CALLER SUPPLIES BOTH `now` AND THE ANCHOR. This function reads
 * no clock of its own, which is what lets a test assert every band without
 * mocking Date, and what keeps every clock read in this module inside the effect
 * (see below).
 *
 * The anchor is `predictCbseExamDate("10")` (LANDING-FOLLOWUP-1), NOT a date typed
 * here. The landing used to hardcode "2027-02-01", which was not the ruled date;
 * the predictor rolls last year's real board start forward, and the day CBSE
 * publishes the real date, one line in its `officialDates` corrects this page
 * with no edit of its own.
 *
 * Returns the FIGURE only ("5 months"); the section's heading, "Your boards are
 * closer than you think." (ADDENDUM-A A5), supplies the words around it.
 *
 * The full year, by calendar days to the boards (owner rulings):
 *   · >= 60 — MONTHS, ROUNDED (150 days is 4.93 months; "4 months" understated it).
 *   · 15-59 — WEEKS, FLOORED. Rounded months would read 46 days as "2 months",
 *     false comfort in the final stretch; floored weeks never overstate.
 *   · 2-14  — DAYS.  · 1 — "Tomorrow".  · 0 — "Today".
 *   · ★ the exam window — no countdown: the heading becomes BOARDS_ON_HEADING
 *     and the figure BOARDS_ON_FIGURE (see below).
 *
 * ⚠ The addendum's table says months for "more than 60" and weeks for "15-59",
 * which leaves day 60 itself unassigned. It stays in MONTHS ("2 months", 1.97
 * rounded), as in step 3 — reported, not silently chosen.
 *
 * ⚠ THE SINGULARS "1 month" AND "1 week" ARE ABSENT BECAUSE THEY ARE UNREACHABLE,
 * not forgotten: at >= 60 days `Math.round(days / 30.44)` is always >= 2, and the
 * weeks band is 15-59 days, so `weeks` is always 2..8. A branch for either would
 * be dead code — the defect the reachability test in Welcome.countdown.test.tsx
 * exists to catch.
 *
 * ★★ THE EXAM WINDOW. `predictCbseExamDate()` never returns a past date: the day
 * after the boards start it rolls straight to next year's date. Without this
 * branch, during the boards themselves the page would say "12 months". The date
 * that JUST passed is recovered as the upcoming date minus one year — derived
 * here, in this pure helper, so the predictor (which other surfaces rely on) is
 * untouched. ⚠ That derivation is exact for the predictor's rolled-forward date
 * (same calendar day, one year on); if a session's `officialDates` entry differs
 * from the day the predictor rolls to, the window ends that many days early.
 */
export function boardsCountdown(now: Date, upcomingIso: string): BoardsCountdown {
  const upcoming = new Date(`${upcomingIso}T00:00:00`);
  if (Number.isNaN(upcoming.getTime())) return { inWindow: false, figure: "" };
  // Calendar days, from local midnights — so 3pm the day before still reads
  // "Tomorrow", and a DST shift cannot turn 1 day into 0.96.
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((upcoming.getTime() - today.getTime()) / 86_400_000);
  const previous = new Date(upcoming);
  previous.setFullYear(upcoming.getFullYear() - 1);
  const sincePrevious = Math.round((today.getTime() - previous.getTime()) / 86_400_000);
  if (days > 0 && sincePrevious >= 1 && sincePrevious <= BOARDS_WINDOW_DAYS) {
    return { inWindow: true, figure: BOARDS_ON_FIGURE };
  }
  return { inWindow: false, figure: countdownFigure(days) };
}

function countdownFigure(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days <= 14) return `${days} days`;
  if (days < 60) return `${Math.floor(days / 7)} weeks`;
  return `${Math.round(days / 30.44)} months`;
}

export interface BoardsCountdown {
  /** True for BOARDS_WINDOW_DAYS days after the boards start: the heading swaps too. */
  inWindow: boolean;
  /** The figure line: "5 months", "Tomorrow", BOARDS_ON_FIGURE… or "" for a bad date. */
  figure: string;
}

/**
 * ⚠ AN ASSUMPTION, NAMED SO IT CAN BE CORRECTED. Class 10 boards run about a month
 * from the first paper. For this many days after the board START the page says
 * the boards are on instead of counting to next year. Correct it when CBSE
 * publishes the 2027 date sheet.
 *
 * ⚠ KNOWN LIMIT (owner-accepted). The window's start is recovered as the
 * predictor's rolled-forward date minus one year. If CBSE's official date differs
 * from that roll-forward, THE WINDOW ENDS EARLY BY THE DIFFERENCE (official 20 Feb
 * vs roll-forward 17 Feb → it ends 3 days early). Small, known, and corrected
 * automatically once `officialDates` in cbseExamDate.ts carries the real date.
 */
export const BOARDS_WINDOW_DAYS = 30;

/** The close section's durable heading — the ONLY one in the rendered/captured markup. */
export const BOARDS_HEADING = "Your boards are closer than you think.";
/** During the exam window only, written client-side by the effect (owner ruling). */
export const BOARDS_ON_HEADING = "Your boards are on.";
export const BOARDS_ON_FIGURE = "Best of luck.";

/**
 * Public assets, resolved through Vite's own base. CLAUDE.md §7 forbids a
 * hardcoded `/app/` prefix in source; `BASE_URL` is the mechanism the repo
 * already uses for exactly this (`QuestionVisualAid.tsx:18`).
 *
 * ⚠ The prototype inlined these as base64 for portability and says so in its
 * header: "In production use real image files, not base64." They live in
 * `public/brand/`.
 *
 * ★ ADDENDUM-A A4 — ALL FOUR ARE CUT FROM `LazyTopper_Logo_HD.png` (3366x4206) AT
 * THE OWNER'S EXACT BOXES: fingerprint 700,190-2680,2930 · wordmark + plane
 * 300,2820-3240,3660 with the leaked dots blanked in x1300-2010, y<2948 ·
 * tagline 850,3780-2540,3965. The previous crop put three fingerprint dots above
 * the "T"; the wordmark cut sits inside the clean band between the last dot
 * (y~2915) and the T (y~2976). The paper plane is part of the registered mark.
 * The fingerprint ships as TWO files: a small one for the 48px lockup and a
 * 555px-wide one for the right-half mark, because one file at the mark's
 * resolution cost ~250 KB on every phone for a 48px icon.
 */
const ASSET_BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const FINGERPRINT = `${ASSET_BASE}/brand/lazytopper-fingerprint.png`;
const FINGERPRINT_MARK = `${ASSET_BASE}/brand/lazytopper-fingerprint-mark.png`;
const WORDMARK = `${ASSET_BASE}/brand/lazytopper-wordmark.png`;
const TAGLINE = `${ASSET_BASE}/brand/lazytopper-tagline.png`;

/**
 * ⚠ "Check my answer" lands on `/`, NOT on Check & Improve — §2.4, and it is a
 * measured decision rather than a cautious one. Sending a student who has not
 * uploaded anything straight to the grading surface puts them on an empty state
 * with nothing to grade. The auth door's own fallback is already `/`
 * (`Login.tsx:1508`); `redirect` is passed explicitly so the intent is legible
 * at the call site instead of resting on that default.
 *
 * ⚠ AND NO TRIAL IS PROMISED ANYWHERE ON THIS PAGE. `startTrial()` has exactly
 * one production caller — a button inside the premium gate
 * (`RequireAuth.tsx:74`). A new account is signed-in FREE, not trial. The
 * prototype's subtext is "Free to start", which is true; "free for 7 days"
 * would not be. Do not reintroduce it.
 */
const START_URL = /^(1|true|on|yes)$/i.test(String(import.meta.env.VITE_FREE_CHECK_ENABLED ?? "").trim())
  ? "/check-improve"
  : "/sign-up?redirect=%2F";
const SIGN_IN_URL = "/login?reason=login&redirect=%2F";

/** The three illustrative diagnoses. Prototype copy, verbatim — owner ruling. */
const STUDENTS = [
  {
    key: "concept",
    name: "Aarav",
    score: "1/3",
    verdict: "CONCEPT GAP",
    head: "",
    lead: "Opposite aur adjacent swap",
    rest: " ho gaye. Confident tha, samajh nahi.",
    fix: "→ Notes pe wapas jaana hai",
  },
  {
    key: "step",
    name: "Diya",
    score: "2½/3",
    verdict: "STEP SKIPPED",
    head: "Sab sahi. Bas ",
    lead: "Pythagoras dimaag mein",
    rest: " kar liya, copy mein nahi.",
    fix: "→ Concept solid. Likhna hai, bas",
  },
  {
    key: "calc",
    name: "Kabir",
    score: "2/3",
    verdict: "CALCULATION SLIP",
    head: "Method perfect. ",
    lead: "√25k² = 5k, likha 4k.",
    rest: " Ek digit.",
    fix: "→ Padhna nahi. Dheere karna hai",
  },
] as const;

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,900&family=Inter:wght@400;500;600;700;800&display=swap');

.lt-landing{
  --bg:#fbfcfe; --card:#fff; --ink:#0b1c33; --ink2:#48607c; --ink3:#7589a0;
  --line:#dde6f0; --g:hsl(152,55%,45%); --gd:hsl(152,60%,30%); --gw:hsl(152,50%,96%); --gl:hsl(152,40%,84%);
  --navy:#0a1a30; --blue:#2f7fd4; --bluew:#eaf2fc; --amber:#c98a1e; --amberw:#fdf4e5;
  --violet:#7a5fb0; --violetw:#f2eefa; --urg:#b4451f; --urgw:#fdf0ea;
  --serif:Fraunces,Georgia,serif; --sans:Inter,system-ui,sans-serif;
  --sh:0 1px 2px rgba(11,28,51,.04),0 10px 28px rgba(11,28,51,.06);
  --pad:20px;
  display:block;background:var(--bg);color:var(--ink);font-family:var(--sans);
  font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased;overflow-x:hidden;
  padding-bottom:78px;
}
.lt-landing *{box-sizing:border-box}
.lt-landing h1,.lt-landing h2{font-family:var(--serif);letter-spacing:-.028em;margin:0;font-weight:900}
.lt-landing a{color:var(--gd)}
.lt-landing :focus-visible{outline:2px solid var(--g);outline-offset:3px;border-radius:5px}
.lt-landing-wrap{max-width:1040px;margin:0 auto;position:relative;z-index:1}
.lt-landing-bgmark{position:fixed;right:-22vw;top:6vh;width:82vw;max-width:640px;opacity:.065;pointer-events:none;z-index:0}

.lt-landing .btn{font:inherit;font-weight:700;font-size:15.5px;padding:15px 26px;border-radius:14px;
  text-decoration:none;display:inline-flex;align-items:center;justify-content:center;min-height:54px;
  border:2px solid transparent;white-space:nowrap}
.lt-landing .btn.solid{background:var(--g);color:#fff}
.lt-landing .btn.solid:hover{background:var(--gd)}

.lt-landing-top{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px var(--pad)}
.lt-landing-brand{display:flex;align-items:center;gap:10px}
.lt-landing-brand .fp{height:42px;width:auto;display:block;flex:0 0 auto}
.lt-landing-brand .col{display:flex;flex-direction:column;gap:3px}
.lt-landing-brand .word{height:21px;width:auto;display:block}
.lt-landing-brand .tag{height:10px;width:auto;display:block;opacity:.95}
/* ADDENDUM-A A3 — "Log in" is a solid green button, matching every other CTA.
   The (0,2,1) selector outranks ".lt-landing a{color:var(--gd)}", which would
   otherwise paint the label green-on-green. min-height stays 44px (touch target). */
.lt-landing a.lt-landing-login{font-size:14px;font-weight:700;color:#fff;background-color:var(--g);
  text-decoration:none;padding:10px 18px;border-radius:12px;display:inline-flex;align-items:center;min-height:44px}
.lt-landing a.lt-landing-login:hover{background-color:var(--gd)}

.lt-landing-cls{display:flex;gap:6px;padding:0 var(--pad)}
.lt-landing-cls button{font:inherit;font-size:12px;font-weight:700;padding:6px 13px;border-radius:999px;
  border:1px solid var(--line);background:var(--card);color:var(--ink2);cursor:pointer;min-height:44px}
.lt-landing-cls button[aria-selected="true"]{background:var(--navy);border-color:var(--navy);color:#fff}
.lt-landing-cls button[disabled]{opacity:.45;cursor:default}

.lt-landing-hero{padding:14px var(--pad) 0}
.lt-landing h1{font-size:clamp(42px,12.2vw,92px);line-height:.94;max-width:11ch}
.lt-landing h1 em{font-style:normal;display:block;color:var(--g)}
.lt-landing-sub{font-size:clamp(16.5px,4.3vw,20px);color:var(--ink2);margin:18px 0 0;max-width:31ch;line-height:1.4}
.lt-landing-sub b{color:var(--ink);font-weight:700}
.lt-landing-hcta{margin-top:24px}
.lt-landing-hnote{font-size:13px;color:var(--ink3);margin:12px 0 0}
.lt-landing-peek{margin:14px 0 0;display:flex;flex-direction:column;gap:9px;align-items:flex-start}
.lt-landing-peek a{font-size:13.5px;font-weight:600;color:var(--ink2);text-decoration:none;
  border-bottom:1px solid var(--line);padding-bottom:2px}
.lt-landing-peek a:hover{color:var(--gd);border-color:var(--gl)}

.lt-landing-proof{padding:52px 0 0}
.lt-landing-ph{padding:0 var(--pad);margin-bottom:14px}
.lt-landing h2{font-size:clamp(26px,6.8vw,44px);line-height:1.04;max-width:14ch}
.lt-landing-q{font-size:12.5px;color:var(--ink3);margin:11px 0 0;padding-left:13px;border-left:3px solid var(--line)}
.lt-landing-rail{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;
  padding:4px var(--pad) 12px;scrollbar-width:none}
.lt-landing-rail::-webkit-scrollbar{display:none}
.lt-landing-kid{flex:0 0 80%;scroll-snap-align:center;background:var(--card);border:1px solid var(--line);
  border-top:5px solid var(--c);border-radius:20px;padding:16px 17px;box-shadow:var(--sh);
  display:flex;flex-direction:column}
.lt-landing-kid--concept{--c:var(--blue);--cw:var(--bluew)}
.lt-landing-kid--step{--c:var(--amber);--cw:var(--amberw)}
.lt-landing-kid--calc{--c:var(--violet);--cw:var(--violetw)}
.lt-landing-kid-h{display:flex;align-items:baseline;justify-content:space-between;gap:9px}
.lt-landing-kid-n{font-size:14.5px;font-weight:700}
.lt-landing-kid-s{font-family:var(--serif);font-size:26px;font-weight:900;color:var(--c);line-height:1}
.lt-landing-kid-w{font-size:10.5px;font-weight:800;letter-spacing:.05em;color:var(--c);background:var(--cw);
  border-radius:999px;padding:4px 10px;align-self:flex-start;margin:9px 0 10px}
.lt-landing-kid-q{font-size:13.8px;color:var(--ink2);margin:0 0 12px;flex:1}
.lt-landing-kid-q b{color:var(--ink);font-weight:600}
.lt-landing-kid-f{border-top:1px dashed var(--line);padding-top:10px;font-size:13.2px;font-weight:600;color:var(--ink)}
.lt-landing-swipe{font-size:11.5px;color:var(--ink3);padding:0 var(--pad);margin:0}

.lt-landing-payoff{padding:36px var(--pad) 0}
.lt-landing-payoff h2{max-width:15ch}
.lt-landing-payoff h2 em{font-style:normal;color:var(--g)}
.lt-landing-payoff p{font-size:15.5px;color:var(--ink2);margin:14px 0 0;max-width:36ch}
.lt-landing-payoff p b{color:var(--ink);font-weight:700}

.lt-landing-close{padding:46px var(--pad) 0}
.lt-landing-close h2{font-size:clamp(24px,6vw,36px);max-width:15ch;margin-bottom:9px}
.lt-landing-close h2 em{font-style:normal;color:var(--urg)}
.lt-landing-close p{font-size:15px;color:var(--ink2);margin:0 0 20px;max-width:33ch}
.lt-landing-close p b{color:var(--ink);font-weight:700}
/* ⚠ QUALIFIED BY .lt-landing-close ON PURPOSE: the node is a <p> inside the close
   section, and ".lt-landing-close p" (0,1,1) outranks a bare class (0,1,0) — which
   silently rendered the figure at body size, grey. (0,2,0) wins. The owner's v8
   mockup reproduced exactly this bug; Welcome.countdown.test.tsx asserts the
   COMPUTED style so it cannot come back. */
.lt-landing-close .lt-landing-countdown{font-family:var(--serif);font-size:clamp(56px,15vw,112px);font-weight:900;
  color:var(--urg);letter-spacing:-.035em;margin:2px 0 18px;line-height:.95;max-width:none}
/* The exam-window sentence is a line of words, not a figure: same voice, smaller. */
.lt-landing-close .lt-landing-countdown--on{font-size:clamp(44px,11vw,88px)}
.lt-landing-countdown:empty{display:none}
/* ADDENDUM-A A6 — the second "Free to start" matches the first. Same trap as the
   figure: ".lt-landing-close p" set it to 15px ink2; (0,2,0) restores the hero's. */
.lt-landing-close .lt-landing-hnote{font-size:13px;color:var(--ink3);margin:12px 0 4px}
.lt-landing-plans{display:grid;gap:10px;margin-top:22px;max-width:540px}
.lt-landing-plan{border:1px solid var(--line);background:var(--card);border-radius:16px;padding:14px 16px;
  box-shadow:var(--sh);text-decoration:none;color:inherit;display:block}
.lt-landing-plan:hover{border-color:var(--gl)}
.lt-landing-plan.pay{border-color:var(--gl);background:var(--gw)}
.lt-landing-plan .pt{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:4px}
.lt-landing-plan .pn{font-size:12.5px;font-weight:800;letter-spacing:.04em;color:var(--ink3)}
.lt-landing-plan.pay .pn{color:var(--gd)}
.lt-landing-plan .pp{font-family:var(--serif);font-size:20px;font-weight:900;white-space:nowrap}
.lt-landing-plan .per{font-size:12.5px;font-weight:600}
.lt-landing-plan.pay .pp{color:var(--gd)}
.lt-landing-plan .was{font-family:var(--sans);font-size:13px;font-weight:600;color:var(--ink3)}
.lt-landing-plan .fl{font-size:11.5px;font-weight:800;letter-spacing:.04em;color:var(--gd);margin:0 0 4px}
.lt-landing-plan .pd{font-size:13.4px;color:var(--ink2);margin:0}
.lt-landing-plan .go{font-size:12.3px;font-weight:700;color:var(--gd);margin:7px 0 0}

/* ★ STICKY MOBILE CTA — phone only, kept from MobileWelcome on the owner's ruling.
   env(safe-area-inset-bottom) is NOT optional: without it this sits underneath the
   iPhone home indicator. This is MobileWelcome.tsx:237's mechanism REUSED, not a
   second solution to the same problem — same env() inset, same calc() shape, same
   sticky bar. It is hidden from 700px up, where there is no home indicator. */
.lt-landing-sticky{position:fixed;left:0;right:0;bottom:0;z-index:30;background:rgba(251,252,254,.94);
  -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border-top:1px solid var(--line);
  padding:10px var(--pad) calc(10px + env(safe-area-inset-bottom,0px))}
.lt-landing-sticky a{width:100%;font-size:15.5px;min-height:50px}

.lt-landing-fineprint{margin-top:46px;border-top:1px solid var(--line);padding:20px var(--pad) 0}
.lt-landing-fn{font-size:11.5px;color:var(--ink3);max-width:56ch;margin:0}
.lt-landing .lt-public-legal{padding:12px var(--pad) 34px}

@media(min-width:700px){
  .lt-landing{--pad:32px;padding-bottom:0}
  .lt-landing-sticky{display:none}
  .lt-landing-kid{flex:0 0 31.5%}
  .lt-landing-swipe{display:none}
  .lt-landing-bgmark{right:-8vw;width:52vw;opacity:.075}
  .lt-landing-plans{grid-template-columns:1fr 1fr;max-width:none}
  .lt-landing-brand .fp{height:48px}
  .lt-landing-brand .word{height:24px}
  .lt-landing-brand .tag{height:11px}
  /* ADDENDUM-A A3 — the class row aligns right beneath Log in from 700px up. */
  .lt-landing-cls{justify-content:flex-end}
}
@media(min-width:1000px){
  .lt-landing{--pad:40px;position:relative}
  .lt-landing-rail{display:grid;grid-template-columns:repeat(3,1fr);overflow:visible;padding-bottom:0}
  .lt-landing-kid{flex:none}
  /* ★ ADDENDUM-A A2 — THE FINGERPRINT FILLS THE RIGHT HALF, and it is the tagline:
     "One size fits one" is a fingerprint. ~60% opacity beside the hero's lower
     half, starting just below the class row; its bottom fades out (mask) before
     the student cards begin. ⚠ NO clip-path: with the owner's crop there is no
     paper plane in this image; an earlier clip only sliced real dots flat.
     ★ FIXED, AS IT ALWAYS WAS (owner ruling — the v8 mockup's scroll-away was a
     mistake). ★★ BRIGHT WHEREVER THE RIGHT HALF IS EMPTY, FAINT ONLY WHERE CONTENT
     ACTUALLY SITS BEHIND IT (owner ruling after live-verify): beside "One size fits
     one." the fingerprint is the tagline drawn next to the tagline written. The only
     content that ever reaches under the mark is the two FULL-WIDTH CARD ROWS (the
     students, the plans); every paragraph's TEXT ends well left of it, though its
     block box spans the container. So "is-quiet" is set when a card row enters the
     mark's band — see the effect. It is only ever set after the page has scrolled,
     so nothing scroll-derived exists at scroll 0, where a capture runs.
     aspect-ratio = the mark file's 555x768, so the box (and the band the effect
     reads from it) is right before the image has loaded. */
  .lt-landing-bgmark{right:max(0px,calc((100vw - 1040px)/2 - 110px));top:185px;
    width:27vw;max-width:370px;aspect-ratio:555/768;opacity:.6;transition:opacity .45s ease;
    -webkit-mask-image:linear-gradient(to bottom,#000 70%,transparent 96%);
    mask-image:linear-gradient(to bottom,#000 70%,transparent 96%)}
  .lt-landing-bgmark.is-quiet{opacity:.075}
}
/* Reduced motion: no scroll-driven change at any width — just the faint fixed mark. */
@media(min-width:1000px) and (prefers-reduced-motion:reduce){
  .lt-landing-bgmark{opacity:.075;transition:none}
}
`;

/**
 * The paid card's head — name, price, founding line. ★ TAKES THE OFFER STATE AS A
 * PROP so a test can render both states WITHOUT mocking src/config: the repo forbids
 * `vi.mock` of anything under config/ (gradingLimits.guard.test.ts), and a flag
 * flipped by mock would be exactly that. Welcome passes `FOUNDING_OFFER_OPEN`.
 * While the offer is open the founding price leads with the list price struck
 * beside it; when it closes, the list price stands alone. Constants only.
 */
/** The mark's visible height: its mask fades it out between 70% and 96%. */
const MARK_VISIBLE_FRACTION = 0.96;

export function PaidPlanHead({ offerOpen }: { offerOpen: boolean }) {
  return (
    <>
      <div className="pt">
        <span className="pn">WITH MARKING</span>
        {offerOpen ? (
          <span className="pp" data-testid="landing-paid-price">
            {PRICE_MONTHLY_FOUNDING_DISPLAY}
            <span className="per">/mo</span> <s className="was">{PRICE_MONTHLY_LIST_DISPLAY}</s>
          </span>
        ) : (
          <span className="pp" data-testid="landing-paid-price">
            {PRICE_MONTHLY_LIST_DISPLAY}
            <span className="per">/mo</span>
          </span>
        )}
      </div>
      {offerOpen && <p className="fl">{FOUNDING_LABEL} price</p>}
    </>
  );
}

export default function Welcome() {
  const { pathname } = useLocation();

  /**
   * ★ THE ONLY CLOCK READS IN THIS MODULE, AND THEY ARE OUTSIDE THE RENDER PATH:
   * `new Date()` and `predictCbseExamDate()` (which reads the clock internally),
   * both called inside the effect below and nowhere else.
   * §2.7: no clock read may reach server-rendered markup. The first render
   * emits this node EMPTY, so nothing time-derived exists at render time; the
   * live figure is written by the browser afterwards.
   *
   * ⚠ AN EFFECT IS NOT BY ITSELF A DEFENCE, and this comment must not be read
   * as claiming otherwise. A static capture waits for the page to settle, so it
   * would capture this value too. What makes the figure safe is the pairing:
   * the node carries `data-testid="boards-countdown"` so a capture can remove
   * it BY STRUCTURAL SELECTOR, exactly as `stripAuthChrome()` removes the
   * greeting — never by matching the text, because "months" and "left" are
   * ordinary words that appear inside CBSE content.
   *
   * ⚠ THAT STRIP RULE IS NOT IN THIS LANE. It lives in
   * `scripts/seo/captureStaticBodies.ts`, which this lane is forbidden to
   * touch. Nothing can bake today — the root is not captured at all — so the
   * requirement is prospective, and this node is built to satisfy it in
   * advance. Whoever adds the root to `capturablePaths()` owes the strip and
   * its matching line in `countResidualAuthNodes()`.
   */
  const [countdown, setCountdown] = useState<BoardsCountdown>({ inWindow: false, figure: "" });
  useEffect(() => {
    // ★★ BOTH CLOCK READS LIVE HERE. `predictCbseExamDate` reads the clock itself
    // (it picks the academic year from today), so it is a clock read by another
    // name. Hoisting it to module scope — `const ANCHOR = predictCbseExamDate("10")`
    // — would keep the `new Date()` count at one while baking the date into any
    // capture at build time. Welcome.countdown.test.tsx asserts the call site.
    setCountdown(boardsCountdown(new Date(), predictCbseExamDate("10")));
  }, []);

  /**
   * ★★ THE MARK IS FAINT ONLY WHERE A CARD ROW SITS BEHIND IT (owner ruling after
   * live-verify). Bright wherever the right half is empty — beside the hero, beside
   * the payoff ("One size fits one."), beside "5 months" — and faint while the
   * student cards or the plans pass behind it.
   *
   * ⚠ WHY CARD ROWS AND NOT ELEMENT BOXES. A paragraph is a block: "5 months" has a
   * box reaching x=1200 at 1440 while its text ends at x=656. Fading on boxes would
   * fade behind every paragraph — the opposite of the ruling. The two card rows are
   * the only content whose RENDERED extent reaches under the mark (measured per
   * width in the lane report), so they are the triggers.
   *
   * HOW, WITHOUT PER-FRAME LAYOUT WORK. One IntersectionObserver whose root margin
   * is the mark's own vertical band (top → the end of its mask fade). The band is
   * read from the mark's box once, and again on resize — never on scroll. The
   * browser reports only crossings; the CSS transition smooths each one, and a row
   * edge crossing a fixed band edge toggles once, so there is nothing to flicker.
   *
   * Guards, each load-bearing:
   *   · `window.scrollY > 0` — nothing scroll-derived exists at scroll 0, where a
   *     capture runs, whatever the viewport height.
   *   · prefers-reduced-motion — no observer at all; the CSS pins the faint level.
   *   · no IntersectionObserver (jsdom, old browsers) — the mark stays as rendered.
   *   · below 1000px the observer does not run at all, so the mobile markup never
   *     changes (the CSS gives "is-quiet" no effect there either). Re-checked on resize.
   */
  const markRef = useRef<HTMLImageElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const plansRef = useRef<HTMLDivElement>(null);
  const [markQuiet, setMarkQuiet] = useState(false);
  useEffect(() => {
    const mark = markRef.current;
    const rows = [railRef.current, plansRef.current].filter((r): r is HTMLDivElement => !!r);
    if (!mark || rows.length === 0 || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let io: IntersectionObserver | null = null;
    const behind = new Set<Element>();
    const watch = () => {
      io?.disconnect();
      io = null;
      behind.clear();
      if (!window.matchMedia?.("(min-width: 1000px)").matches) {
        setMarkQuiet(false);
        return;
      }
      const box = mark.getBoundingClientRect();
      const top = Math.round(box.top);
      const bottom = Math.round(box.top + box.height * MARK_VISIBLE_FRACTION);
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) behind.add(e.target);
            else behind.delete(e.target);
          }
          setMarkQuiet(window.scrollY > 0 && behind.size > 0);
        },
        { rootMargin: `${-top}px 0px ${bottom - window.innerHeight}px 0px`, threshold: 0 },
      );
      for (const row of rows) io.observe(row);
    };
    watch();
    let resizeTimer: number | undefined;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(watch, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(resizeTimer);
      io?.disconnect();
    };
  }, []);

  const cbseHref =
    `/cbse/class-10?returnTo=${encodeURIComponent(pathname)}` + `&backLabel=Back+to+LazyTopper`;
  // ★ THE SAME SHAPE AS THE CBSE LINK, SO THE SAME RETURN TICKET (LANDING-FOLLOWUP-1).
  // The notes page reads it through `useReturnTicket()` → `safeInternalReturnTo`;
  // without it, a student who followed this link had no way back to the landing.
  // `tab=questions` opens the note on the competency-based questions tab.
  const questionsHref =
    `/notes/trigonometry?tab=questions&returnTo=${encodeURIComponent(pathname)}` +
    `&backLabel=Back+to+LazyTopper`;

  return (
    <main className="lt-landing" aria-label="LazyTopper public landing">
      <style>{CSS}</style>

      {/* Decorative: alt="" AND aria-hidden (ADDENDUM-A A2). ★ <picture> so a phone
          never downloads the 555px mark: below 1000px the faint fixed mark uses the
          same small file as the lockup (already fetched), exactly as production
          did; only a viewport >= 1000px selects FINGERPRINT_MARK. */}
      <picture>
        <source media="(min-width: 1000px)" srcSet={FINGERPRINT_MARK} />
        <img
          ref={markRef}
          className={"lt-landing-bgmark" + (markQuiet ? " is-quiet" : "")}
          src={FINGERPRINT}
          alt=""
          aria-hidden="true"
        />
      </picture>

      <div className="lt-landing-wrap">
        <div className="lt-landing-top">
          <div className="lt-landing-brand">
            <img className="fp" src={FINGERPRINT} alt="" aria-hidden="true" />
            <span className="col">
              <img className="word" src={WORDMARK} alt="LazyTopper" />
              <img className="tag" src={TAGLINE} alt="One Size Fits One." />
            </span>
          </div>
          <Link className="lt-landing-login" to={SIGN_IN_URL}>
            Log in
          </Link>
        </div>

        <div className="lt-landing-cls" role="tablist" aria-label="Class">
          <button type="button" role="tab" aria-selected="true">
            Class 10
          </button>
          <button type="button" role="tab" aria-selected="false" disabled>
            Class 11 &middot; soon
          </button>
          <button type="button" role="tab" aria-selected="false" disabled>
            Class 12 &middot; soon
          </button>
        </div>

        {/* ADDENDUM-A A3 — the "BOARDS: FEBRUARY 2027" pill is REMOVED. It was a
            hardcoded month that would contradict the countdown the day CBSE
            published a non-February date; the countdown is now the page's only
            statement about when the boards are. */}

        <section className="lt-landing-hero">
          <h1>
            Full marks<em>milenge kya?</em>
          </h1>
          {/* ★ LANDING-FOLLOWUP-1 — A CLAIM THE PRODUCT ALWAYS MEETS. This read "against
              CBSE's own marking scheme", which is false whenever no stored scheme exists:
              the grader then derives its own value points from the question
              (checkSolution.cjs, DERIVE-AND-STATE), and the result page says so —
              "marks estimated from the question". Marking the way an examiner does,
              step by step, is true on both paths. */}
          <p className="lt-landing-sub">
            Upload your answer. We mark it <b>the way a CBSE examiner does</b> &mdash; step by
            step.
          </p>
          <div className="lt-landing-hcta">
            <Link className="btn solid" to={START_URL}>
              Check my answer
            </Link>
          </div>
          <p className="lt-landing-hnote">Free to start. One-tap sign-up, no card.</p>
          <p className="lt-landing-peek">
            {/* ★ OWNER INSTRUCTION — this REPLACES the prototype's "Just looking?
                Explore the product" line, which pointed at /app/. The page argues
                that marks are lost step by step; the notes pages carry real board
                questions with step-marked solutions, so this SHOWS the claim
                rather than restating it. It also points at a prerendered, indexed
                page, which makes it a real internal crawl link — /app/ was not. */}
            <Link to={questionsHref}>
              See real competency-based questions, marked step by step &rarr;
            </Link>
            {/* ★ THE CBSE RETURN TICKET, PRESERVED. Both landings this replaces
                passed the visited pathname AND a backLabel so /cbse/class-10 can
                name where the reader came from. The footer's CBSE link carries a
                returnTo but deliberately NO backLabel — a site-wide row cannot
                honestly name its origin (PublicLegalFooter.tsx:93-96), and that
                comment is right and must not be weakened. So the page-level link
                lives here, where the back-link can be named honestly. */}
            <Link to={cbseHref}>CBSE 2027 &mdash; dates, rules and official papers &rarr;</Link>
          </p>
        </section>

        <section className="lt-landing-proof">
          <div className="lt-landing-ph">
            <h2>Lost marks tell different stories.</h2>
            <p className="lt-landing-q">One question &middot; Trigonometry &middot; 3 marks</p>
          </div>
          <div className="lt-landing-rail" ref={railRef}>
            {STUDENTS.map((s) => (
              <div key={s.key} className={`lt-landing-kid lt-landing-kid--${s.key}`}>
                <div className="lt-landing-kid-h">
                  <span className="lt-landing-kid-n">{s.name}</span>
                  <span className="lt-landing-kid-s">{s.score}</span>
                </div>
                <span className="lt-landing-kid-w">{s.verdict}</span>
                <p className="lt-landing-kid-q">
                  {s.head}
                  <b>{s.lead}</b>
                  {s.rest}
                </p>
                <p className="lt-landing-kid-f">{s.fix}</p>
              </div>
            ))}
          </div>
          <p className="lt-landing-swipe">Swipe &rarr;</p>
        </section>

        <section className="lt-landing-payoff">
          <h2>
            Three stories. Three fixes.<em>One size fits one.</em>
          </h2>
          <p>
            The marking scheme gives you a score. <b>Your mistake pattern gives you the reason</b>{" "}
            &mdash; and no two students have the same one.
          </p>
        </section>

        <section className="lt-landing-close">
          {/* ★ §2.7 — THE HEADLINE IS STATIC AND THE COUNT IS A SEPARATE LINE.
              The prototype put a live figure inside this <h2> ("Six months
              left. Then the real paper."). A heading is page structure: strip it
              for a crawler and the page is left with a hole where its structure
              was. So the heading states the durable fact and the countdown sits
              on its own removable line.
              LANDING-FOLLOWUP-1 (owner rulings): "Then the real paper." is removed;
              the heading is "Your boards are closer than you think." (ADDENDUM-A
              A5) and the figure stands alone beneath it, large and rust. With the
              figure stripped, the heading still stands alone, true in any month. */}
          {/* ★ THE HEADING SWAPS ONLY CLIENT-SIDE, ONLY IN THE EXAM WINDOW (owner
              ruling). The first render — the only one a capture could see before
              the strip rule removes the figure — always carries BOARDS_HEADING;
              the effect alone can flip `inWindow`, so no clock reaches markup. */}
          <h2 data-testid="boards-heading">
            {countdown.inWindow ? BOARDS_ON_HEADING : BOARDS_HEADING}
          </h2>
          <p
            className={"lt-landing-countdown" + (countdown.inWindow ? " lt-landing-countdown--on" : "")}
            data-testid="boards-countdown"
          >
            {countdown.figure}
          </p>
          <p>
            Find out which mistake is costing you marks &mdash; and <b>fix it now</b>, not in the
            exam hall.
          </p>
          <Link className="btn solid" to={START_URL}>
            Check my answer
          </Link>
          <p className="lt-landing-hnote">Free to start. One-tap sign-up, no card.</p>
          <div className="lt-landing-plans" ref={plansRef}>
            {/* ⚠ THE PRICE IS IMPORTED, NEVER TYPED. `pricing.guard.test.ts`
                forbids a rupee literal in .ts/.tsx, and the prototype's own
                header says the figure MUST match /app/pricing or stop. It did
                not: the prototype shows Rs 1,999/mo, which appears nowhere in
                `src/config/pricing.ts` (list 999, founding 599). Owner ruled the
                LIST rate. Reading the constant means this card cannot drift from
                the pricing page.
                ★ SUPERSEDED — LANDING-FOLLOWUP-1, owner ruling. The owner has since
                set final pricing: the founding rate, closable at will, then the
                list rate after. Showing only the list rate while the founding offer
                is open hid the deal a student would actually get. So the card now
                reads `FOUNDING_OFFER_OPEN`: while it is true, the founding price
                leads and the list price is struck through beside it (the same
                pattern as OfferStrip and /pricing), so the saving is legible; when
                it is false, the list price stands alone. Still constants, never a
                literal. */}
            <Link className="lt-landing-plan" to="/pricing">
              <div className="pt">
                <span className="pn">FREE</span>
                <span className="pp">{PRICE_FREE_DISPLAY}</span>
              </div>
              <p className="pd">
                Practice, notes, board questions and official CBSE papers. Forever.
              </p>
              <p className="go">See what&apos;s included &rarr;</p>
            </Link>
            <Link className="lt-landing-plan pay" to="/pricing">
              <PaidPlanHead offerOpen={FOUNDING_OFFER_OPEN} />
              {/* ⚠ "Unlimited" REMOVED, NOT ABANDONED (LANDING-FOLLOWUP-1, owner
                  ruling). The rate limiter has a product-wide daily ceiling
                  (rateLimiter.cjs GLOBAL_DAILY_HARD_CALLS) at which grading is shed,
                  so a paying student can be refused after two checks on a busy day
                  for reasons unrelated to their own use. We don't ship claims that
                  are false today. It returns, with a fair-use line, once
                  [FU-GLOBAL-SHED-REFUSES-PAYING] is fixed. */}
              <p className="pd">AI marking for Maths and Science, plus your mistake pattern.</p>
              <p className="go">See plans &rarr;</p>
            </Link>
          </div>
        </section>

        <div className="lt-landing-fineprint">
          <p className="lt-landing-fn">
            LazyTopper &mdash; CBSE Class 10 Maths and Science. Not affiliated with CBSE. Class 11
            and 12 coming.
          </p>
        </div>

        {/* ★ P10 — THE FOOTER MOUNTS HERE, and the position is reasoned.
            (1) It is the LAST CHILD of the page's ordinary scrolling flow. The
                old mount had to sit inside `.lt-landing-stage` only because the
                frozen >=1180px grid would clip a sixth row; that layout is gone,
                so the constraint is gone with it.
            (2) IT IS INSIDE NO <section>, deliberately. `stripAuthChrome()`
                removes `a[href*="/login"]` TOGETHER WITH ITS ENCLOSING <section>.
                This page has a Log in link in its top bar. Keeping the footer
                outside every section is what stops a future strip taking the
                legal row with it — the same property that keeps it safe today.
            (3) THE PROTOTYPE'S OWN FOOTER ROW IS DELIBERATELY DISCARDED. It
                hardcoded six links of which five were href="#" placeholders and
                the sixth was a forbidden hardcoded /app/pricing. This component
                renders the real ones, and its CBSE link carries the returnTo
                ticket automatically from useLocation().
            ★ This footer is the one crawl path Google has actually followed on
            this site. Do not restyle it away. */}
        <PublicLegalFooter />
      </div>

      <div className="lt-landing-sticky">
        <Link className="btn solid" to={START_URL}>
          Check my answer &mdash; free
        </Link>
      </div>
    </main>
  );
}
