import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, type AuthUser } from "../context/AuthContext";
import OfferStrip from "../components/auth/OfferStrip";
import VerifyEmailGate from "../components/auth/VerifyEmailGate";
import { useIsDesktop } from "../hooks/useIsDesktop";
import { trackUxEvent } from "../services/uxTelemetry";
import { creditPendingReferral } from "../services/referralService";

type LocationState = { from?: string };

function isSafeInternalPath(path: string | null | undefined): path is string {
  if (!path) return false;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) return false;
  if (trimmed.startsWith("//")) return false;
  if (trimmed.startsWith("/\\")) return false;
  if (trimmed.startsWith("\\")) return false;
  if (trimmed.includes("\\")) return false;
  if (/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return false;
  return true;
}

const LOGIN_CSS = `
  .lt-login-page,
  .lt-login-page * {
    box-sizing: border-box;
  }

  html:has(.lt-login-page),
  body:has(.lt-login-page),
  #root:has(.lt-login-page),
  #root > div:has(.lt-login-page) {
    background: var(--lt-login-bg);
  }

  #root > div:has(.lt-login-page) {
    padding-bottom: 0 !important;
  }

  #root:has(.lt-login-page) > div[style*="position: fixed"][style*="bottom: 0px"] {
    display: none !important;
  }

  .lt-login-page {
    --lt-navy: #071a3d;
    --lt-navy-2: #092858;
    --lt-green: #16b96a;
    --lt-green-dark: #0b8f50;
    --lt-ink: #071a3d;
    --lt-muted: #49627f;
    --lt-soft: #f6fbff;
    --lt-line: rgba(7, 26, 61, 0.12);
    --lt-card: rgba(255, 255, 255, 0.94);
    --lt-login-bg: #f7fbff;

    min-height: 100vh;
    width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(460px, 0.95fr);
    overflow-x: hidden;
    color: var(--lt-ink);
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background:
      radial-gradient(circle at 71% 21%, rgba(22, 185, 106, 0.12) 0, rgba(22, 185, 106, 0) 24%),
      radial-gradient(circle at 18% 26%, rgba(125, 220, 255, 0.20) 0, rgba(125, 220, 255, 0) 23%),
      linear-gradient(180deg, #fbfdff 0%, #f6fbff 62%, #eef7ff 100%);
  }

  .lt-login-page[data-login-theme="dark"] {
    --lt-ink: #f8fafc;
    --lt-muted: #b8c6d8;
    --lt-soft: #0b203a;
    --lt-card: rgba(10, 31, 55, 0.92);
    --lt-line: rgba(255, 255, 255, 0.14);
    --lt-login-bg: #051733;
    background:
      radial-gradient(circle at 71% 21%, rgba(22, 185, 106, 0.12) 0, rgba(22, 185, 106, 0) 24%),
      linear-gradient(180deg, #071a3d 0%, #051733 100%);
  }

  .lt-login-brand-panel {
    position: relative;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 44px;
    padding: 42px 56px 36px;
    overflow: hidden;
    color: #f8fafc;
    background:
      radial-gradient(circle at 22% 24%, rgba(53, 242, 160, 0.18) 0, rgba(53, 242, 160, 0) 22%),
      radial-gradient(circle at 82% 33%, rgba(125, 220, 255, 0.18) 0, rgba(125, 220, 255, 0) 24%),
      linear-gradient(145deg, #082958 0%, #071a3d 54%, #051733 100%);
  }

  .lt-login-brand-panel:after {
    content: "";
    position: absolute;
    left: 56px;
    right: 56px;
    bottom: 118px;
    height: 1px;
    background: linear-gradient(90deg, rgba(53, 242, 160, 0), rgba(53, 242, 160, 0.55), rgba(125, 220, 255, 0));
    opacity: 0.72;
  }

  .lt-login-home-link,
  .lt-login-mobile-brand,
  .lt-login-back-link {
    text-decoration: none;
  }

  .lt-login-home-link {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    align-self: flex-start;
    color: #f8fafc;
  }

  .lt-login-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    border-radius: 12px;
    background: var(--lt-green);
    color: #06281b;
    font-weight: 900;
    box-shadow: 0 18px 38px rgba(22, 185, 106, 0.28);
  }

  .lt-login-wordmark {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: 0;
  }

  .lt-login-promise {
    position: relative;
    z-index: 1;
    max-width: 610px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .lt-login-kicker {
    display: inline-flex;
    width: fit-content;
    align-items: center;
    gap: 8px;
    min-height: 30px;
    padding: 0 12px;
    border-radius: 999px;
    color: #dffff0;
    background: rgba(22, 185, 106, 0.13);
    border: 1px solid rgba(53, 242, 160, 0.24);
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .lt-login-title {
    margin: 0;
    color: #ffffff;
    font-family: 'Fraunces', Georgia, serif;
    font-size: 3.7rem;
    line-height: 1.02;
    font-weight: 700;
    letter-spacing: 0;
    max-width: 650px;
  }

  .lt-login-lede {
    max-width: 560px;
    margin: 0;
    color: #d8e4ef;
    font-size: 1.02rem;
    line-height: 1.6;
    font-weight: 500;
  }

  .lt-login-benefits {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    max-width: 580px;
    margin-top: 8px;
  }

  .lt-login-benefit {
    min-height: 54px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.13);
    background: rgba(255, 255, 255, 0.08);
    color: #edf7ff;
    font-size: 0.84rem;
    font-weight: 800;
    line-height: 1.25;
  }

  .lt-login-benefit-dot {
    width: 10px;
    height: 10px;
    flex: 0 0 auto;
    border-radius: 999px;
    background: var(--lt-green);
    box-shadow: 0 0 0 5px rgba(22, 185, 106, 0.14);
  }

  /* Replaced the product-loop strip that used to close this column. The strip
     restated navigation the student has not reached yet; the consent line is
     the one thing on the page they are actually agreeing to. */
  .lt-login-brand-legal {
    position: relative;
    z-index: 1;
    margin: 0;
    padding-top: 22px;
    border-top: 1px solid rgba(53, 242, 160, 0.24);
    font-size: 0.86rem;
    line-height: 1.6;
    color: #a9c0da;
  }

  .lt-login-brand-legal a {
    color: #e4eefb;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .lt-login-brand-legal a:hover {
    color: #7ff3c0;
  }

  .lt-login-auth-panel {
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 34px 48px;
  }

  .lt-login-gate {
    width: 100%;
    max-width: 470px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .lt-login-mobile-brand {
    display: none;
    align-items: center;
    gap: 10px;
    align-self: flex-start;
    color: var(--lt-ink);
  }

  .lt-login-mobile-brand-sub {
    display: block;
    margin-top: 2px;
    color: var(--lt-muted);
    font-size: 0.78rem;
    font-weight: 700;
  }

  .lt-login-prompt {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .lt-login-reason-chip {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 0 11px;
    border-radius: 999px;
    color: var(--lt-green-dark);
    background: rgba(22, 185, 106, 0.12);
    border: 1px solid rgba(22, 185, 106, 0.24);
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .lt-login-heading {
    margin: 0;
    color: var(--lt-ink);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 2rem;
    line-height: 1.15;
    font-weight: 800;
    letter-spacing: 0;
  }

  .lt-login-subcopy {
    margin: 0;
    color: var(--lt-muted);
    font-size: 0.96rem;
    line-height: 1.55;
    font-weight: 500;
  }

  .lt-login-frame {
    width: 100%;
    padding: 22px;
    border-radius: 18px;
    border: 1px solid var(--lt-line);
    background: var(--lt-card);
    box-shadow: 0 24px 80px rgba(7, 26, 61, 0.12);
    backdrop-filter: blur(18px);
  }

  /* ── ONE DOOR: the step heading inside the frame ───────────────────────
     Every step (choose / email / phone / verify) leads with the same two
     elements, so the frame's vertical rhythm never jumps as the student
     moves between them. */
  .lt-login-stephead {
    margin: 0 0 4px;
    color: var(--lt-ink);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.32rem;
    line-height: 1.2;
    font-weight: 800;
  }

  .lt-login-stepsub {
    margin: 0 0 16px;
    color: var(--lt-muted);
    font-size: 0.87rem;
    line-height: 1.5;
    font-weight: 600;
  }

  .lt-google {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 11px;
    background: #ffffff;
    border: 1px solid #dbe3ee;
    border-radius: 12px;
    padding: 13px;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--lt-ink);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }

  .lt-google:hover:not(:disabled) {
    border-color: #bcc9dc;
    background: #fafcff;
  }

  .lt-google:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* PRE-EXISTING dark-theme defect, same class as the .lt-field one below and
     worse, because this is the PRIMARY action: the button keeps a hard white
     background while its label inherits color: var(--lt-ink), which the dark
     block redefines to #f8fafc — white text on a white button. Measured at
     rgb(248,250,252) on rgb(255,255,255). The background STAYS white on
     purpose (Google's brand guidance for the sign-in button); it is the INK
     that has to be pinned dark rather than inherited. */
  .lt-login-page[data-login-theme="dark"] .lt-google {
    color: #071a3d;
  }

  /* The phone and email doors. Deliberately the SAME weight as the Google
     button — three equal methods, no tabs and no visual hierarchy between
     them, because the student's right answer depends only on which account
     they already have. */
  .lt-method {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 11px;
    margin-top: 9px;
    background: #ffffff;
    border: 1px solid #dbe3ee;
    border-radius: 12px;
    padding: 13px;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--lt-ink);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }

  .lt-method:hover:not(:disabled) {
    border-color: rgba(22, 185, 106, 0.45);
    background: rgba(22, 185, 106, 0.06);
  }

  .lt-method:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .lt-login-page[data-login-theme="dark"] .lt-method {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.16);
    color: #f8fafc;
  }

  .lt-method-icon {
    display: inline-flex;
    width: 18px;
    height: 18px;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    color: var(--lt-muted);
  }

  .lt-gmark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    flex: 0 0 auto;
  }

  .lt-onetap {
    margin: 8px 0 0;
    font-size: 0.78rem;
    color: var(--lt-muted);
    text-align: center;
  }

  .lt-or {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 18px 0 16px;
    color: rgba(7, 26, 61, 0.4);
    font-size: 0.8rem;
    font-weight: 700;
  }

  .lt-or:before,
  .lt-or:after {
    content: "";
    height: 1px;
    flex: 1;
    background: var(--lt-line);
  }

  /* "<- All sign-in options" — the way back out of a chosen method. */
  .lt-login-backstep {
    display: inline-flex;
    align-items: center;
    border: 0;
    background: transparent;
    padding: 0;
    margin: 0 0 12px;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--lt-muted);
    cursor: pointer;
  }

  .lt-login-backstep:hover:not(:disabled) {
    color: var(--lt-ink);
  }

  /* The linking warning. Deliberately NEUTRAL grey, not error-red and not the
     green notice treatment: it is neither a mistake the student has made nor
     good news, it is a fact about how accounts work that they need before
     choosing. Red here would read as "you have done something wrong" on a
     screen where they have not yet done anything. */
  .lt-login-linkwarn {
    margin: 14px 0 0;
    padding: 10px 12px;
    border-radius: 10px;
    color: var(--lt-muted);
    background: rgba(7, 26, 61, 0.04);
    border: 1px solid var(--lt-line);
    font-size: 0.78rem;
    line-height: 1.5;
    font-weight: 600;
  }

  .lt-login-page[data-login-theme="dark"] .lt-login-linkwarn {
    background: rgba(255, 255, 255, 0.05);
  }

  .lt-login-linkwarn b {
    color: var(--lt-ink);
    font-weight: 800;
  }

  .lt-field-label {
    display: block;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--lt-ink);
    margin: 0 0 7px;
  }

  .lt-field-label + .lt-field {
    margin-bottom: 12px;
  }

  /* Label row that carries a trailing action (e.g. "Forgot password?").
     Mirrors the plain-label spacing so the field below keeps its rhythm. */
  .lt-login-field-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
  }

  .lt-login-field-row + .lt-field {
    margin-bottom: 12px;
  }

  .lt-field {
    display: flex;
    align-items: center;
    border: 1px solid var(--lt-line);
    border-radius: 12px;
    background: #ffffff;
    overflow: hidden;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .lt-field:focus-within {
    border-color: var(--lt-green);
    box-shadow: 0 0 0 3px rgba(22, 185, 106, 0.15);
  }

  .lt-prefix {
    padding: 0 12px;
    align-self: stretch;
    display: flex;
    align-items: center;
    font-size: 0.95rem;
    font-weight: 700;
    color: rgba(7, 26, 61, 0.6);
    background: #f6f9fd;
    border-right: 1px solid var(--lt-line);
  }

  .lt-field input {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    padding: 13px 14px;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.95rem;
    color: var(--lt-ink);
    background: transparent;
  }

  .lt-field input::placeholder {
    color: rgba(7, 26, 61, 0.35);
  }

  .lt-field input:disabled {
    color: rgba(7, 26, 61, 0.4);
    cursor: not-allowed;
  }

  /* ⚠ DARK-THEME LEGIBILITY — a PRE-EXISTING defect, found by screenshotting
     this page rather than by any assertion, and fixed here because this PR
     makes the email form a deliberate destination rather than a default pane.

     MEASURED, not guessed: with no dark override, .lt-field kept its hard
     background #ffffff while .lt-field input inherited color: var(--lt-ink),
     which the dark block redefines to #f8fafc. getComputedStyle reported
     rgb(248,250,252) text on rgb(255,255,255) — about 1.04:1, i.e. the student
     could not see what they were typing. The dark theme is what renders when no
     data-theme attribute is set, so this was the default. */
  .lt-login-page[data-login-theme="dark"] .lt-field {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.16);
  }

  .lt-login-page[data-login-theme="dark"] .lt-field input::placeholder {
    color: rgba(248, 250, 252, 0.42);
  }

  .lt-login-page[data-login-theme="dark"] .lt-field input:disabled {
    color: rgba(248, 250, 252, 0.45);
  }

  .lt-login-page[data-login-theme="dark"] .lt-prefix {
    background: rgba(255, 255, 255, 0.07);
    color: rgba(248, 250, 252, 0.72);
    border-right-color: rgba(255, 255, 255, 0.16);
  }

  .lt-login-error {
    margin: 2px 0 0;
    color: #c0362c;
    font-size: 0.82rem;
    font-weight: 600;
    line-height: 1.4;
  }

  .lt-login-note {
    margin: 2px 0 0;
    color: var(--lt-muted);
    font-size: 0.8rem;
    font-weight: 600;
    line-height: 1.4;
  }

  /* The self-declaration control. Two equal halves, no tab semantics — these
     change what the form DOES, they do not swap panels. */
  .lt-login-seg {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    padding: 5px;
    margin: 14px 0 4px;
    background: var(--lt-soft);
    border: 1px solid var(--lt-line);
    border-radius: 13px;
  }

  .lt-login-seg button {
    font: inherit;
    font-size: 0.9rem;
    font-weight: 700;
    padding: 11px 10px;
    border-radius: 9px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--lt-muted);
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }

  .lt-login-seg button[aria-pressed="true"] {
    background: #ffffff;
    border-color: var(--lt-line);
    color: var(--lt-ink);
    box-shadow: 0 2px 8px rgba(7, 26, 61, 0.08);
  }

  .lt-login-seg button:disabled {
    cursor: default;
  }

  /* Dark theme: the light-theme rule above hardcodes a white pill, and the ink
     that sits on it is near-white in dark — the 1.04:1 trap AUTH-3 fixed on the
     Google button and the input fields. Both halves are re-pinned here. */
  .lt-login-page[data-login-theme="dark"] .lt-login-seg {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.14);
  }

  .lt-login-page[data-login-theme="dark"] .lt-login-seg button {
    color: rgba(248, 250, 252, 0.72);
  }

  .lt-login-page[data-login-theme="dark"] .lt-login-seg button[aria-pressed="true"] {
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(255, 255, 255, 0.22);
    color: #f8fafc;
  }

  /* A note that sits BETWEEN two fields has to carry the gap the form normally
     gets from the .lt-field-label + .lt-field margin-bottom. Plain
     .lt-login-note has no bottom margin and .lt-field-label has no top margin,
     so the next label renders butted straight against the note's last line — no
     breathing room at all, while every other label on the form has 12px.

     Found by a 390px screenshot in NAME-1 v1, where the name prompt's notice
     hit it; every assertion in the suite passed with it broken. v2 moved the
     name field but reintroduced the same adjacency (name hint, then the Email
     address label), so the rule is repurposed rather than deleted.

     Scoped to its own class rather than widening .lt-login-note, which the
     phone step also uses and whose rhythm is correct as it stands.

     ⚠ NO BACKTICKS IN THIS BLOCK. The whole stylesheet is a template literal,
     so a backtick in a CSS comment ends the string — it took the dev server
     down with a Babel parse error the moment it was introduced. */
  .lt-login-note.lt-login-note--between {
    margin: 4px 0 14px;
  }

  .lt-continue {
    width: 100%;
    margin-top: 16px;
    background: var(--lt-navy);
    color: #ffffff;
    border: 0;
    border-radius: 12px;
    padding: 14px;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.98rem;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: background 0.15s, transform 0.05s;
  }

  .lt-continue:hover:not(:disabled) {
    background: #0a2452;
  }

  .lt-continue:active:not(:disabled) {
    transform: scale(0.99);
  }

  .lt-continue:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  /* The CTA echoes the typed address, so it must survive a long one without
     pushing the arrow off the button. */
  .lt-continue-echo {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .lt-signup {
    text-align: center;
    margin: 14px 0 0;
    font-size: 0.86rem;
    color: var(--lt-muted);
  }

  .lt-signup a {
    color: var(--lt-ink);
    font-weight: 800;
    text-decoration: none;
  }

  .lt-signup a:hover {
    color: var(--lt-green-dark);
  }

  .lt-login-linkbtn {
    border: 0;
    background: transparent;
    padding: 0;
    font: inherit;
    color: var(--lt-ink);
    font-weight: 800;
    cursor: pointer;
  }

  .lt-login-linkbtn:hover:not(:disabled) {
    color: var(--lt-green-dark);
  }

  .lt-login-linkbtn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .lt-login-forgot {
    margin: 0 0 7px;
    font-size: 0.78rem;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 2px;
    white-space: nowrap;
  }

  /* "Reset my password", offered beside the wrong-password message. A
     SECONDARY button: the student's first instinct is usually to retype, so
     the primary action stays "try again". */
  .lt-login-reset-offer {
    width: 100%;
    margin-top: 10px;
    border: 1px solid var(--lt-line);
    border-radius: 12px;
    background: transparent;
    padding: 11px;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.88rem;
    font-weight: 800;
    color: var(--lt-ink);
    cursor: pointer;
  }

  .lt-login-reset-offer:hover:not(:disabled) {
    border-color: rgba(22, 185, 106, 0.45);
    background: rgba(22, 185, 106, 0.06);
  }

  .lt-login-reset-lede {
    margin: 0 0 14px;
    color: var(--lt-muted);
    font-size: 0.86rem;
    line-height: 1.45;
    font-weight: 600;
  }

  .lt-login-reset-notice {
    display: flex;
    gap: 9px;
    align-items: flex-start;
    margin: 12px 0 0;
    padding: 11px 12px;
    border-radius: 12px;
    color: var(--lt-green-dark);
    background: rgba(22, 185, 106, 0.1);
    border: 1px solid rgba(22, 185, 106, 0.24);
    font-size: 0.84rem;
    line-height: 1.45;
    font-weight: 700;
  }

  .lt-login-page[data-login-theme="dark"] .lt-login-reset-notice {
    color: #b6f2d5;
  }

  .lt-login-reset-back {
    text-align: center;
    margin: 14px 0 0;
    font-size: 0.86rem;
    color: var(--lt-muted);
  }

  /* ── VERIFY-EMAIL GATE ─────────────────────────────────────────────────
     A neutral, expected step — NOT an error. It therefore borrows the offer
     strip's green-bordered treatment (the same one the reset confirmation
     uses) and leaves error-red for genuine input mistakes, which on this
     screen means only a bad address in "change it". */
  .lt-verify-heading {
    margin: 0 0 5px;
    color: var(--lt-ink);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.32rem;
    line-height: 1.2;
    font-weight: 800;
  }

  .lt-verify-lede {
    margin: 0 0 12px;
    color: var(--lt-muted);
    font-size: 0.87rem;
    line-height: 1.5;
    font-weight: 600;
  }

  .lt-verify-address {
    margin: 0 0 12px;
    padding: 11px 12px;
    border-radius: 12px;
    border: 1px solid var(--lt-line);
    background: rgba(7, 26, 61, 0.04);
    color: var(--lt-ink);
    font-size: 0.92rem;
    font-weight: 800;
    overflow-wrap: anywhere;
  }

  .lt-login-page[data-login-theme="dark"] .lt-verify-address {
    background: rgba(255, 255, 255, 0.06);
  }

  .lt-verify-spam {
    display: flex;
    gap: 9px;
    align-items: flex-start;
    margin: 0;
    padding: 11px 12px;
    border-radius: 12px;
    color: var(--lt-green-dark);
    background: rgba(22, 185, 106, 0.1);
    border: 1px solid rgba(22, 185, 106, 0.24);
    font-size: 0.84rem;
    line-height: 1.45;
    font-weight: 700;
  }

  .lt-login-page[data-login-theme="dark"] .lt-verify-spam {
    color: #b6f2d5;
  }

  .lt-verify-notice {
    margin: 10px 0 0;
    color: var(--lt-muted);
    font-size: 0.82rem;
    line-height: 1.45;
    font-weight: 700;
  }

  .lt-verify-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 10px;
    margin-top: 14px;
    font-size: 0.82rem;
  }

  .lt-verify-change {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--lt-line);
  }

  .lt-verify-startover {
    text-align: center;
    margin: 14px 0 0;
    font-size: 0.82rem;
    color: var(--lt-muted);
  }

  .lt-login-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    color: var(--lt-muted);
    font-size: 0.78rem;
    font-weight: 700;
  }

  .lt-login-back-link {
    color: var(--lt-muted);
    font-weight: 800;
    white-space: nowrap;
  }

  .lt-login-terms {
    text-align: right;
    line-height: 1.35;
  }

  .lt-login-terms a {
    color: var(--lt-ink);
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .lt-login-terms a:hover {
    color: var(--lt-green-dark);
  }

  @media (max-width: 1180px) {
    .lt-login-page {
      grid-template-columns: minmax(0, 0.95fr) minmax(430px, 1.05fr);
    }

    .lt-login-brand-panel {
      padding: 38px 40px 34px;
    }

    .lt-login-brand-panel:after {
      left: 40px;
      right: 40px;
    }

    .lt-login-title {
      font-size: 3.05rem;
    }

    .lt-login-auth-panel {
      padding: 36px 34px;
    }
  }

  @media (min-width: 1024px) and (max-height: 820px) {
    .lt-login-brand-panel {
      gap: 28px;
      padding-top: 30px;
      padding-bottom: 26px;
    }

    .lt-login-brand-panel:after {
      bottom: 92px;
    }

    .lt-login-promise {
      gap: 13px;
    }

    .lt-login-title {
      font-size: 3rem;
    }

    .lt-login-lede {
      font-size: 0.95rem;
      line-height: 1.48;
    }

    .lt-login-benefit {
      min-height: 44px;
      padding: 8px 11px;
      font-size: 0.8rem;
    }

    .lt-login-auth-panel {
      padding-top: 24px;
      padding-bottom: 24px;
    }

    .lt-login-gate {
      gap: 12px;
    }

    .lt-login-heading {
      font-size: 1.72rem;
    }

    .lt-login-subcopy {
      font-size: 0.9rem;
      line-height: 1.45;
    }

    .lt-login-frame {
      padding: 16px;
    }

  }

  @media (max-width: 1023px) {
    .lt-login-page {
      min-height: 100svh;
      display: flex;
      align-items: stretch;
      justify-content: center;
      padding: 20px;
      background:
        radial-gradient(circle at 18% 12%, rgba(125, 220, 255, 0.22) 0, rgba(125, 220, 255, 0) 28%),
        radial-gradient(circle at 86% 20%, rgba(22, 185, 106, 0.14) 0, rgba(22, 185, 106, 0) 28%),
        linear-gradient(180deg, #fbfdff 0%, #eef7ff 100%);
    }

    .lt-login-page[data-login-theme="dark"] {
      background: linear-gradient(180deg, #071a3d 0%, #051733 100%);
    }

    .lt-login-brand-panel {
      display: none;
    }

    .lt-login-auth-panel {
      width: 100%;
      padding: 0;
      align-items: center;
    }

    .lt-login-gate {
      max-width: 500px;
      gap: 16px;
      padding: 24px;
      border-radius: 20px;
      border: 1px solid var(--lt-line);
      background: var(--lt-card);
      box-shadow: 0 22px 70px rgba(7, 26, 61, 0.13);
      backdrop-filter: blur(18px);
    }

    .lt-login-mobile-brand {
      display: inline-flex;
    }

    .lt-login-heading {
      font-size: 1.55rem;
    }

    .lt-login-subcopy {
      font-size: 0.92rem;
    }

    .lt-login-frame {
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
      backdrop-filter: none;
    }
  }

  @media (max-width: 520px) {
    .lt-login-page {
      padding: 14px;
    }

    .lt-login-gate {
      padding: 20px 16px;
      border-radius: 18px;
    }

    .lt-login-stephead {
      font-size: 1.2rem;
    }

    .lt-verify-heading {
      font-size: 1.2rem;
    }

    /* At 390px a wrapped two-line address inside a fixed-height button
       clipped the arrow. Let the row wrap instead of the label overflow. */
    .lt-continue {
      flex-wrap: wrap;
    }

    .lt-login-foot {
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 8px;
    }

    .lt-login-terms {
      text-align: center;
    }
  }
`;

/**
 * The ONE DOOR (`/login` and `/sign-up`).
 *
 * ── WHY ONE PAGE ──────────────────────────────────────────────────────────
 * Verified on trunk: for GOOGLE and PHONE, "sign in" and "sign up" already call
 * the identical function — `signInWithPopup` and `signInWithPhoneNumber` both
 * create the account when it does not exist. Only email/password had two
 * mutually exclusive halves. So the sign-in/sign-up tabs solved a
 * one-method-in-three problem by making EVERY student classify themselves, and
 * guessing wrong returned an error instead of the thing they came for.
 *
 * ── THE EMAIL FLOW IS INVERTED, AND THAT IS DELIBERATE ────────────────────
 * Firebase Email Enumeration Protection is ENABLED on this project:
 *   • `signInWithEmailAndPassword` returns the SAME error for wrong-password and
 *     no-such-account. Indistinguishable — sign-in cannot tell us which case we
 *     are in.
 *   • `createUserWithEmailAndPassword` still returns `auth/email-already-in-use`.
 *     Distinguishable — create CAN.
 * So we try sign-in, and on an ambiguous failure we try create. The create call
 * is the probe AND the commitment: there is no dry run.
 *
 * ⚠ There is deliberately NO "no account found — create one?" confirmation.
 * It would disclose non-existence and re-open by hand the exact leak the owner
 * enabled Enumeration Protection to close. Typos are mitigated instead by (a)
 * echoing the address in the CTA — "Continue as you@example.com" — and (b) the
 * blocking verification gate, which is the real protection.
 */
function authErrorCode(err: unknown): string {
  return typeof err === "object" && err !== null && "code" in err
    ? String((err as { code?: unknown }).code || "")
    : "";
}

/**
 * The ONE neutral password-reset confirmation.
 *
 * ACCOUNT ENUMERATION: this exact string is rendered whether or not the address is
 * registered. Confirming that an account exists would let anyone probe the address of
 * a LazyTopper student, and these are minors' accounts. Never branch this copy on the
 * outcome of the reset call, and never add an "email not found" state.
 */
const RESET_NEUTRAL_NOTICE =
  "If an account exists for that email, we've sent a reset link. Check your inbox and spam.";

/**
 * Reset failures that may be shown as a DISTINCT message.
 *
 * Every one of these describes the REQUEST, not the account: a malformed address is a
 * property of the string the student typed, and a rate limit / network failure is a
 * property of the connection. None of them differ between a registered and an
 * unregistered address, so none of them leak existence.
 *
 * Everything else — `auth/user-not-found`, `auth/user-disabled`, the
 * `auth/invalid-credential` that Firebase's own email-enumeration protection returns,
 * and any code Firebase adds in future — falls through to RESET_NEUTRAL_NOTICE. The
 * fallback is deliberately the SAFE side: an unrecognised code can never become an
 * existence oracle.
 *
 * ⚠ THE SIGN-IN FORM NOW DISCLOSES MORE (it can say "that password doesn't match").
 * The RESET flow must NOT follow it. They are different trades: a login form has
 * always told you your password was wrong, and the student is holding the address
 * either way; a reset form is the one an outsider would use to probe a stranger.
 */
const RESET_SURFACEABLE_ERRORS: Record<string, string> = {
  "auth/invalid-email": "Enter a valid email address.",
  "auth/missing-email": "Enter your email address.",
  "auth/too-many-requests": "Too many requests. Please try again in a few minutes.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
};

/**
 * Sign-in failures that MAY fall through to a create attempt.
 *
 * ⚠ THIS SET IS LOAD-BEARING AND MUST STAY SMALL. Every code in it means "these
 * credentials did not match, and Enumeration Protection will not tell us why" —
 * the genuinely ambiguous case, and the only one where creating an account is
 * the right next move.
 *
 * Everything NOT in this set is a failure we can already explain: a malformed
 * address, a disabled account, a rate limit, a dead network. Falling through on
 * those would be actively harmful — `auth/too-many-requests` would answer a
 * throttle by firing a SECOND write call, and the others would replace an
 * accurate message with a confusing one.
 */
const AMBIGUOUS_SIGN_IN_CODES = new Set([
  // What Firebase returns for BOTH wrong-password and no-such-account once
  // Email Enumeration Protection is on. The REST API name is
  // INVALID_LOGIN_CREDENTIALS; the JS SDK surfaces it as invalid-credential.
  "auth/invalid-credential",
  "auth/invalid-login-credentials",
  // The pre-protection pair, still returned by older projects and the emulator.
  "auth/user-not-found",
  "auth/wrong-password",
]);

/**
 * The RETURNING path's failure message — and it must stay AMBIGUOUS.
 *
 * ⚠ IT DELIBERATELY DOES NOT SAY "that password is wrong". With Email
 * Enumeration Protection on, a wrong password and an address with no account
 * return the SAME code (see AMBIGUOUS_SIGN_IN_CODES), so naming the password as
 * the fault would assert that the account EXISTS — an existence oracle built by
 * hand out of copy, defeating the setting the project turned on.
 *
 * ★ It names the three things the student can actually do without claiming
 * which one applies: re-check, reset, or switch to creating an account. The
 * switch is the honest resolution of the ambiguity — if they are in fact new,
 * that is the tab that works, and nothing here had to tell them so.
 *
 * ⚠ ITS PREDECESSOR IS WORTH REMEMBERING. This replaces "That password doesn't
 * match. Try again, or reset it." — which was reachable ONLY after a create
 * attempt returned `email-already-in-use`, and that really did prove the account
 * existed. The returning branch no longer calls create, so the proof is gone.
 * Keeping the words while losing the proof is precisely the shape of defect this
 * repo has shipped before.
 */
const AMBIGUOUS_SIGN_IN_MESSAGE =
  "That email and password didn't match. Check them, reset your password, or " +
  'switch to "I\'m new here" to create an account.';

/**
 * The CREATE path's already-registered message.
 *
 * ⚠ THIS ONE DOES DISCLOSE, and it is inherent rather than chosen. Firebase
 * returns `auth/email-already-in-use` from `createUserWithEmailAndPassword`
 * whatever we do — Enumeration Protection covers sign-in, not create. EVERY
 * create path has this property, including the try-then-create this replaces,
 * so it is not a regression introduced by the redesign.
 *
 * ★ The copy therefore INVITES A SWITCH rather than announcing a finding: it
 * reports what the attempt did, hands over the two routes out, and never
 * phrases itself as an answer to "does this address have an account?".
 */
const EMAIL_TAKEN_MESSAGE =
  "That address is already registered here. Switch to \"Already have an " +
  'account" to sign in, or reset your password.';

function describeAuthError(err: unknown): string {
  const code = authErrorCode(err);
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return ""; // user dismissed the Google popup — nothing to surface
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/email-already-in-use":
      return "An account with this email already exists — sign in instead.";
    case "auth/weak-password":
      return "Choose a password with at least 6 characters.";
    case "auth/operation-not-allowed":
      return "Email sign-up is not enabled yet. Please try Google.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again in a few minutes.";
    case "auth/invalid-phone-number":
    case "auth/missing-phone-number":
      return "Enter a valid 10-digit mobile number.";
    case "auth/invalid-verification-code":
      return "That code is incorrect. Check the SMS and try again.";
    case "auth/code-expired":
      return "This code has expired. Request a new one.";
    case "auth/quota-exceeded":
      return "SMS limit reached. Please try again later.";
    case "auth/captcha-check-failed":
      return "Verification check failed. Please try again.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Allow popups and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Sign-in failed. Please try again.";
  }
}

/**
 * Does this student have to verify their address before entering?
 *
 * ⚠ THE SCOPE IS NARROW ON PURPOSE — check each boundary, do not widen it:
 *   • GOOGLE — never blocked. Google has already proven the address, so the
 *     account arrives with `emailVerified: true`.
 *   • PHONE — never blocked. There is no email to verify and the OTP already
 *     proved possession. A phone account reports `emailVerified: false`, which
 *     is exactly why the presence of an ADDRESS and not the flag alone is half
 *     the test — keying on the flag by itself would strand every phone student
 *     on a screen asking them to check an inbox they never gave us.
 *   • RETURNING, ALREADY VERIFIED — never blocked; straight in, forever after.
 *   • NEW EMAIL/PASSWORD — blocked, once.
 *
 * ⚠⚠ WHY THIS READS `email` RATHER THAN `providerIds`, against the advice on
 * `AuthUser.providerIds` itself. Two reasons, and the first is binding:
 *
 *   1. A REPO-WIDE RULING FORBIDS IT. `LinkSignInMethodModal.test.tsx` scans
 *      every non-test file under `src/` and fails on ANY `providerIds` read
 *      outside the linking surfaces — the ruling being that linking is optional
 *      and must never gate a feature. `providerIds.includes("password")` here
 *      is not link-status gating in spirit, but the guard is textual and the
 *      ruling is the owner's. Weakening a doctrine guard to fit a feature is
 *      the wrong direction of fit.
 *   2. It is EQUIVALENT over every reachable state. The `providerIds` doc warns
 *      that `email`/`phoneNumber` describe the PROFILE rather than the
 *      credentials — true, and the case it has in mind is a phone account
 *      carrying a Google email. That account reports `emailVerified: true`, so
 *      the first clause already excludes it. The inverse — an address with no
 *      way to have verified it — needs an email credential added to a
 *      phone-first account, and NO SUCH PATH EXISTS: AuthContext imports
 *      `linkWithPhoneNumber` and nothing else, so linking runs one way only.
 *
 * → If an email-link path is ever built (the queued NAME+LINK lane), revisit
 *   this: a phone-first student who adds an unverified email would then start
 *   matching here, and would be right to.
 *
 * `emailVerified === false` (rather than `!== true`) is likewise deliberate: the
 * field is OPTIONAL on `AuthUser`, and an UNKNOWN value must not block. A local
 * session stored before the field existed, and every test factory that
 * hand-builds a user, both read `undefined` — neither should be stranded on a
 * verification screen for an account we know nothing about. The real path
 * always populates it, because `mapFirebaseUser` always does.
 */
export function needsEmailVerification(user: AuthUser | null | undefined): boolean {
  if (!user || user.isLocalSession) return false;
  return Boolean(user.email) && user.emailVerified === false;
}

type DoorStep = "choose" | "email" | "phone" | "verify";

export type AuthDoorProps = {
  /**
   * Which door the student came through. Both render the same three methods —
   * the intent only changes the framing copy and WHEN the email form collects
   * a name: `"create"` asks up front, `"signin"` asks only at the moment the
   * flow is about to create (see `nameRequested`).
   *
   * ⚠ `intent="create"` keeps the required name field, and that is not
   * cosmetic. `signUpWithEmailPassword` is the ONLY `updateProfile` call in
   * product code, so this form is one of only two places a `displayName` is
   * ever captured — `FirstSession` deliberately does not ask (it would need a
   * context key). Dropping it here would silently re-open the defect PR-B2
   * closed: every new account rendering its raw email address as the student's
   * name across the shell. See [FU-AUTH-NAME-PROMPT].
   *
   * ⚠ AND `intent="create"` IS UNREACHABLE FROM THE PRODUCT. Its only route is
   * `/sign-up`, and NAME-1 found zero links to it in `src/` against nine to
   * `/login` — App.tsx's two `<Route>` lines are the only references that
   * exist. So this prop's create branch fixes nothing on its own: every real
   * student arrives through `intent="signin"`. That is why the signin door now
   * captures a name of its own rather than relying on this one.
   */
  intent: "signin" | "create";
  /**
   * ⚠ MUST BE UNIQUE PER ROUTE. The reCAPTCHA verifier is bound to one DOM
   * element and `AuthContext.initPhoneRecaptcha` reuses it when the requested
   * container id matches AND that id is still in the document. Two routes
   * sharing an id would satisfy both checks after a navigation while the
   * verifier was actually bound to the OLD, now-detached element — reuse of a
   * dead widget, failing at send time pointing at the wrong thing.
   */
  recaptchaContainerId: string;
};

export function AuthDoor({ intent, recaptchaContainerId }: AuthDoorProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const {
    user,
    signInWithGoogle,
    signInWithEmailPassword,
    signUpWithEmailPassword,
    sendPasswordReset,
    initPhoneRecaptcha,
    sendPhoneOtp,
    verifyPhoneOtp,
    logout,
  } = useAuth();

  const isCreate = intent === "create";

  /**
   * ⚠ Drives WHICH legal mount renders — never a CSS toggle. 1024px, the same
   * threshold at which `.lt-login-brand-panel` goes display:none, so the two
   * can never disagree about which column exists.
   *
   * jsdom does not implement `matchMedia`; `src/test/setup.ts` polyfills it and
   * defaults to FALSE (mobile), which is why Login.legalLinks.test.tsx resolves
   * the footer mount without being modified.
   */
  const isDesktop = useIsDesktop();

  const [isLight, setIsLight] = useState(
    () => document.documentElement.getAttribute("data-theme") === "light"
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const reason = searchParams.get("reason");
  const isStartTrial = reason === "start-trial";

  const nextPath = useMemo(() => {
    if (searchParams.has("redirect")) {
      const explicitRedirect = searchParams.get("redirect");
      return isSafeInternalPath(explicitRedirect) ? explicitRedirect : "/";
    }
    const st = (location.state || {}) as LocationState;
    if (st.from) return isSafeInternalPath(st.from) ? st.from : "/";
    // RETIREMENT PR-1: the fallback is now unconditionally "/" (RootEntry routes to the
    // live home per viewport). The /onboarding page is retired — a new signup lands on
    // the homepage, not the dark onboarding screen.
    //
    // The `hasProfile ? "/" : "/onboarding"` gate this replaces was dead anyway: it read
    // the BARE key "lazytopper.profile.v2", but studentCloudStore only ever writes the
    // uid-suffixed "lazytopper.profile.v2:<uid>". So hasProfile was permanently false and
    // EVERY login — new and returning — was routed to /onboarding. Resolves
    // [FU-LOGIN-HASPROFILE-DEAD-KEY].
    //
    // ?redirect= / state.from remain isSafeInternalPath-guarded above; a stale severed
    // target still resolves via the catch-all to "/", never stranding the user.
    return "/";
  }, [location.state, searchParams]);

  const [step, setStep] = useState<DoorStep>("choose");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneStep, setPhoneStep] = useState<"number" | "otp">("number");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerReset, setOfferReset] = useState(false);

  /**
   * ★★ THE UNLOCK — the page no longer GUESSES who is new. The student says so.
   *
   * Email Enumeration Protection means Firebase will not tell us whether an
   * address is registered, and the previous design worked around that by trying
   * sign-in first and creating on an ambiguous failure. It worked, but it cost
   * the returning student who mistyped a password an extra submit before they
   * could be told anything useful, because the only way to learn the account
   * existed was to attempt the create.
   *
   * A self-declared choice removes the guess entirely, and it is NOT an
   * enumeration disclosure: no branch depends on a server answer, and nothing
   * on screen asserts that an address does or does not exist. The student is
   * simply the other source of a fact Firebase declines to give.
   *
   * ⚠ "new" PRE-SELECTS, deliberately. Returning students overwhelmingly arrive
   * through Google; whoever reaches this email form is disproportionately new.
   *
   * ⚠ The three-method door above is UNTOUCHED by this. There are still no
   * new-vs-returning tabs at the entrance — this control lives one level in, on
   * the email sub-screen only, which is the one method where the distinction
   * changes what has to happen.
   */
  const [emailMode, setEmailMode] = useState<"new" | "returning">("new");

  // Set once the verify gate reports success. Without it the `user` effect,
  // which still sees a context user carrying the STALE `emailVerified: false`
  // (`reload()` mutates the Firebase user in place and re-emits nothing), would
  // put the student straight back on the gate it just let them off.
  const [verificationCleared, setVerificationCleared] = useState(false);

  // Password recovery lives INLINE in the email step — it is not a route (routes are
  // owned by App.tsx). Phone accounts have no password, so none of this renders in the
  // phone step.
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    trackUxEvent("login_start", "login", {
      reason: reason ?? "unspecified",
    });
  }, [reason]);

  useEffect(() => {
    if (!user) return;
    trackUxEvent("login_complete", "login", {
      reason: reason ?? "unspecified",
    });
    // ⚠ THE BLOCK GOES BEFORE THE NAVIGATION, and before the referral credit.
    // A student whose address is unverified has not finished signing up, so
    // nothing downstream of entry should fire for them yet.
    if (!verificationCleared && needsEmailVerification(user)) {
      setStep("verify");
      setBusy(false);
      return;
    }
    // Referral crediting — relocated here from the retired Onboarding page, which
    // was its only caller. Capture still happens at App.tsx (`?ref=` -> pending key);
    // this is the first authenticated moment on every door path (Google / email /
    // phone OTP all land in this one effect). Self-idempotent: creditPendingReferral
    // no-ops when there is no pending code and again once REFERRAL_CREDITED_KEY is
    // set, so it credits at most once ever. Keyed on the real Firebase uid — a
    // stable identifier the `addReferralToCode` dedup can actually match (the old
    // `user_${Date.now()}` was fresh on every call and defeated that dedup).
    creditPendingReferral(user.uid);
    navigate(nextPath, { replace: true });
  }, [user, nextPath, navigate, reason, verificationCleared]);

  /**
   * True whenever this submit will CREATE. The `/sign-up` door forces it; the
   * one door reads the student's own declaration.
   *
   * ★ One derived value, read by the handler, the field set, the labels and the
   * CTA alike — so what the button says and what the submit does cannot drift.
   */
  const creatingAccount = isCreate || emailMode === "new";

  /**
   * Switching modes clears the error and the reset offer, because both describe
   * the OTHER branch's attempt. Leaving "that address is already registered"
   * on screen after the student has switched to signing in would be reporting a
   * failure they have already acted on.
   *
   * The typed email and password are deliberately KEPT — the student re-submits
   * the same credentials down the other path, and clearing them would punish
   * the correction this control exists to make cheap.
   */
  const switchEmailMode = (next: "new" | "returning") => {
    if (busy) return;
    setError(null);
    setOfferReset(false);
    setEmailMode(next);
  };

  const goToStep = (next: DoorStep) => {
    setError(null);
    setOfferReset(false);
    setPhoneStep("number");
    setOtp("");
    closeReset();
    setStep(next);
  };

  const handleGoogle = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      // Navigation is handled by the `user` effect once auth state updates.
    } catch (err) {
      setError(describeAuthError(err));
      setBusy(false);
    }
  };

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setOfferReset(false);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    // The student has declared which they are, so each branch runs ONE call and
    // reports its own outcome. No probing, no fallthrough between them.
    const creating = isCreate || emailMode === "new";

    if (creating && !trimmedName) {
      // The name is REQUIRED, not optional, and that is a deliberate call: it is
      // a ONE-WAY DOOR. An account created without a name cannot be backfilled
      // without asking the student again, so an OPTIONAL field would close the
      // defect only for students who happened to fill it in and permanently
      // re-create it for everyone who skipped.
      setError("Enter your name.");
      return;
    }
    if (!trimmedEmail || !password) {
      setError(creating ? "Enter an email and a password." : "Enter your email and password.");
      return;
    }
    if (password.length < 6) {
      // Checked BEFORE any network call. Firebase has always required six
      // characters, so no existing account can have fewer — which makes this
      // honest for a returning student and stops the create branch below from
      // ever being reached with a password Firebase would reject anyway.
      setError("Choose a password with at least 6 characters.");
      return;
    }

    setBusy(true);

    if (creating) {
      // ── CREATE, DIRECTLY ────────────────────────────────────────────────
      // One call. The name is already in hand because the field is above the
      // submit and required, which is what makes this possible at all:
      // `signUpWithEmailPassword` is the only `updateProfile` in product code,
      // so a name that is not held HERE can never be set afterwards.
      try {
        await signUpWithEmailPassword(trimmedEmail, password, trimmedName);
        // Navigation (or the verify gate) is handled by the `user` effect.
      } catch (err) {
        if (authErrorCode(err) === "auth/email-already-in-use") {
          // ⚠ Enumeration Protection does NOT suppress this code on create —
          // it covers sign-in only. Every create path in every product can
          // reach here, including the try-then-create this replaces, so it is
          // inherent rather than introduced. The copy invites a switch instead
          // of announcing a finding.
          setError(EMAIL_TAKEN_MESSAGE);
          setOfferReset(true);
        } else {
          setError(describeAuthError(err));
        }
        setBusy(false);
      }
      return;
    }

    // ── SIGN IN, DIRECTLY ──────────────────────────────────────────────────
    // ★ ONE call, and its failure is reported on THIS submit. That is the whole
    // gain of the self-declared control: the previous design had to attempt a
    // create before it could say anything useful to a student who mistyped a
    // password, which cost them a second submit. Nothing is probed here, so
    // nothing has to be inferred.
    try {
      await signInWithEmailPassword(trimmedEmail, password);
      // the `user` effect takes it from here
    } catch (signInErr) {
      if (AMBIGUOUS_SIGN_IN_CODES.has(authErrorCode(signInErr))) {
        // ⚠ AMBIGUOUS BY CONSTRUCTION — these codes cannot separate "wrong
        // password" from "no such account", so the message must not name either
        // as the cause. See AMBIGUOUS_SIGN_IN_MESSAGE.
        setError(AMBIGUOUS_SIGN_IN_MESSAGE);
        setOfferReset(true);
      } else {
        // Explainable failure — a rate limit, a disabled account, a dead
        // network — keeps its own accurate message.
        setError(describeAuthError(signInErr));
      }
      setBusy(false);
    }
  };

  function closeReset() {
    setResetOpen(false);
    setResetEmail("");
    setResetBusy(false);
    setResetSent(false);
    setResetError(null);
  }

  const openReset = () => {
    if (busy) return;
    setError(null);
    setOfferReset(false);
    setResetSent(false);
    setResetError(null);
    setResetEmail(email.trim());
    setResetOpen(true);
  };

  const handleResetSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (resetBusy) return;
    setResetError(null);
    const trimmedEmail = resetEmail.trim();
    if (!trimmedEmail) {
      setResetError("Enter your email address.");
      return;
    }
    setResetBusy(true);
    try {
      await sendPasswordReset(trimmedEmail);
      setResetSent(true);
    } catch (err) {
      // ACCOUNT ENUMERATION — the load-bearing branch. Firebase rejects with
      // `auth/user-not-found` for an address it does not know, so surfacing that
      // rejection would turn this form into a "does this student have an account?"
      // oracle. Only request-shaped failures (see RESET_SURFACEABLE_ERRORS) get their
      // own message; every other outcome — success, unknown address, disabled account,
      // an unrecognised future code — renders the identical RESET_NEUTRAL_NOTICE.
      const surfaceable = RESET_SURFACEABLE_ERRORS[authErrorCode(err)];
      if (surfaceable) {
        setResetError(surfaceable);
      } else {
        setResetSent(true);
      }
    } finally {
      setResetBusy(false);
    }
  };

  const handlePhoneSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    if (phoneStep === "number") {
      if (phone.length !== 10) {
        setError("Enter your 10-digit mobile number.");
        return;
      }
      setBusy(true);
      try {
        await sendPhoneOtp(`+91${phone}`, recaptchaContainerId);
        setPhoneStep("otp");
      } catch (err) {
        setError(describeAuthError(err));
      } finally {
        setBusy(false);
      }
      return;
    }
    // phoneStep === "otp"
    if (otp.length !== 6) {
      setError("Enter the 6-digit code from the SMS.");
      return;
    }
    setBusy(true);
    try {
      await verifyPhoneOtp(otp);
      // Navigation is handled by the `user` effect once auth state updates.
    } catch (err) {
      setError(describeAuthError(err));
      setBusy(false);
    }
  };

  // Re-send: `initPhoneRecaptcha` REUSES the live verifier here rather than
  // rebuilding it. The rebuild is conditional — it happens only when the widget
  // is stale (a different container, or one no longer in the document). On this
  // path neither holds: the host element is always mounted and unchanged, so
  // reuse is not just an optimisation but required — rendering a second widget
  // into the same element throws "reCAPTCHA has already been rendered in this
  // element", and `clear()` does not free it. Reset the OTP field and re-request.
  const handleResendOtp = async () => {
    if (busy) return;
    setError(null);
    setOtp("");
    setBusy(true);
    try {
      await sendPhoneOtp(`+91${phone}`, recaptchaContainerId);
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleChangeNumber = () => {
    if (busy) return;
    setError(null);
    setOtp("");
    setPhoneStep("number");
  };

  // Warm the invisible reCAPTCHA when the phone step opens so the first "Send
  // OTP" doesn't pay the Google script-load latency. Warming is what makes the
  // later sends cheap: `initPhoneRecaptcha` reuses this widget for as long as it
  // stays valid (same container, still in the document) and rebuilds only once
  // it is stale, so the cost is paid here once rather than on every send. The
  // bottom-right badge is expected (left for launch).
  useEffect(() => {
    if (step !== "phone") return;
    void initPhoneRecaptcha(recaptchaContainerId).catch(() => {
      // Surfaced on the actual send attempt; no honest state to show pre-action.
    });
  }, [step, initPhoneRecaptcha, recaptchaContainerId]);

  const handleStartOver = async () => {
    try {
      await logout();
    } catch {
      // Even a failed sign-out should return the student to a usable door.
    }
    setVerificationCleared(false);
    setPassword("");
    goToStep("choose");
  };

  const themeVars = {
    "--lt-login-bg": isLight ? "#f7fbff" : "#051733",
  } as CSSProperties;

  const mark = (size: number, fontSize: number) => (
    <span
      className="lt-login-mark"
      style={{ width: size, height: size, fontSize }}
      aria-hidden="true"
    >
      L
    </span>
  );

  const trimmedEmail = email.trim();
  const continueLabel = busy
    ? creatingAccount
      ? "Creating account..."
      : "Signing in..."
    : creatingAccount
      ? "Create my account"
      : trimmedEmail
        ? `Sign in as ${trimmedEmail}`
        : "Sign in";

  const backToOptions = (
    <button
      type="button"
      className="lt-login-backstep"
      onClick={() => goToStep("choose")}
      disabled={busy}
    >
      {"<- All sign-in options"}
    </button>
  );

  return (
    <main
      className="lt-login-page"
      data-login-theme={isLight ? "light" : "dark"}
      style={themeVars}
      aria-label="LazyTopper sign in"
    >
      <style dangerouslySetInnerHTML={{ __html: LOGIN_CSS }} />

      <section className="lt-login-brand-panel" aria-label="LazyTopper exam companion">
        <Link to="/" aria-label="Back to LazyTopper home" className="lt-login-home-link">
          {mark(42, 17)}
          <span className="lt-login-wordmark">LazyTopper</span>
        </Link>

        <div className="lt-login-promise">
          <span className="lt-login-kicker">CBSE Class 10 study cockpit</span>
          <h1 className="lt-login-title">Sign in when your work needs saving.</h1>
          <p className="lt-login-lede">
            LazyTopper can keep attempts, checked answers, progress, and Mistake
            Intelligence evidence connected to your account only after real sign-in.
          </p>

          <div className="lt-login-benefits" aria-label="What sign-in protects">
            <div className="lt-login-benefit">
              <span className="lt-login-benefit-dot" />
              Saved practice attempts
            </div>
            <div className="lt-login-benefit">
              <span className="lt-login-benefit-dot" />
              Checked-answer history
            </div>
            <div className="lt-login-benefit">
              <span className="lt-login-benefit-dot" />
              Progress tied to account
            </div>
            <div className="lt-login-benefit">
              <span className="lt-login-benefit-dot" />
              Mistake Intelligence evidence
            </div>
          </div>

          {/* The offer, merged and moved here. It carries the after-trial line
              (the sentence that stops "free trial" reading as "a card gets
              charged in seven days") AND the founding rate, so the auth column
              is left for the act of signing in. A compact mirror without the
              price renders inside the gate below 1024px, where this whole panel
              is display:none — see OfferStrip's two variants. */}
          <OfferStrip variant="panel" />
        </div>

        {/*
          ★ LEGAL REPLACES THE PRODUCT-LOOP STRIP. The strip was decoration; a
          reachable consent line is load-bearing, and this is a minors audience.

          ⚠ CONDITIONAL RENDER, NOT CSS — and the distinction is the whole
          point. A CSS-hidden duplicate is still in the DOM, so
          `getByRole("link", { name: "Terms of Service" })` would throw on two
          matches and every consumer of that query would have to be weakened to
          `getAllBy[0]` — which is how a real duplicate ships. Exactly one mount
          exists at any width, and Login.legalLinks.test.tsx still resolves it.

          The mobile mount is the auth-panel footer, which is where this lived
          before and where it must stay below 1024px: this panel does not exist
          there, and a student consenting with no reachable policy link is a
          launch blocker, not a layout bug.
        */}
        {isDesktop ? (
          <p className="lt-login-brand-legal" data-testid="lt-legal-panel">
            By signing in, you agree to our <Link to="/legal/terms">Terms of Service</Link> and{" "}
            <Link to="/legal/privacy">Privacy Policy</Link>
          </p>
        ) : null}
      </section>

      <section className="lt-login-auth-panel" aria-label="Sign in">
        <div className="lt-login-gate">
          <Link to="/" aria-label="Back to LazyTopper home" className="lt-login-mobile-brand">
            {mark(42, 17)}
            <span>
              <span className="lt-login-wordmark">LazyTopper</span>
              <span className="lt-login-mobile-brand-sub">CBSE Class 10 Board Exam Prep</span>
            </span>
          </Link>

          <div className="lt-login-frame">
            {step === "verify" ? (
              <VerifyEmailGate
                email={user?.email ?? trimmedEmail}
                knownPassword={password || undefined}
                onVerified={() => setVerificationCleared(true)}
                onStartOver={handleStartOver}
              />
            ) : step === "choose" ? (
              <>
                {/* ── STEP 1 · THE DOOR ────────────────────────────────────
                    Three equal methods and no tabs. The student is never
                    asked whether they are new — for Google and phone the
                    question was always meaningless, and for email the page
                    now works it out. */}
                <h2 className="lt-login-stephead">
                  {isCreate ? "Create your LazyTopper account" : "Sign in to LazyTopper"}
                </h2>
                <p className="lt-login-stepsub">
                  New here? Just continue — your account is created automatically.
                </p>

                <button
                  type="button"
                  className="lt-google"
                  onClick={handleGoogle}
                  disabled={busy}
                >
                  <span className="lt-gmark" aria-hidden="true">
                    <svg viewBox="0 0 48 48" width="18" height="18">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                  </span>
                  Continue with Google
                </button>

                <button
                  type="button"
                  className="lt-method"
                  onClick={() => goToStep("phone")}
                  disabled={busy}
                >
                  <span className="lt-method-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="6" y="2" width="12" height="20" rx="2.5" />
                      <line x1="10.5" y1="18.5" x2="13.5" y2="18.5" />
                    </svg>
                  </span>
                  Continue with phone
                </button>

                <button
                  type="button"
                  className="lt-method"
                  onClick={() => goToStep("email")}
                  disabled={busy}
                >
                  <span className="lt-method-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
                      <path d="M3 7l9 6 9-6" />
                    </svg>
                  </span>
                  Continue with email
                </button>

                {error ? (
                  <p className="lt-login-error" role="alert">
                    {error}
                  </p>
                ) : null}

                {/*
                  ⚠ THE COPY STOPS WHERE THE CAPABILITY STOPS.
                  An earlier draft ended "— you can link both from your account
                  menu later." That is FALSE for a phone-first student:
                  AuthContext exposes `sendLinkPhoneOtp`/`confirmLinkPhoneOtp`
                  and imports `linkWithPhoneNumber` and nothing else, so the
                  link runs in ONE direction — an email or Google student can
                  ADD a phone; a phone-first student can never add an email.
                  This page makes phone prominent, so phone-first students
                  become common, and promising them a capability that does not
                  exist is worse than saying nothing.
                */}
                {/*
                  ★★ ONE BLOCK, MERGED FROM TWO — and the merge is a CORRECTNESS
                  fix, not a tidy-up. This replaced both the old link-warning and
                  the separate helper note at the foot of the gate, which said
                  overlapping things in two places.

                  ⚠ "until you link them" IS GONE, because it is FALSE for a
                  phone-first student. Only `linkWithPhoneNumber` exists, so an
                  email or Google account can ABSORB a phone while a phone-first
                  account can never absorb an email. The old copy promised a
                  capability to precisely the students who do not have it.

                  ★ So it now ADVISES A DIRECTION instead: start with email or
                  Google, because that is the direction that can absorb a phone
                  later. Until AUTH-1 builds the other direction, this sentence
                  is the only thing standing between a student and an
                  unrecoverable split account. Do not trim it for length.

                  It points at surfaces that ALREADY SHIP: LinkPhoneNudge on
                  both Homes, LinkSignInMethodModal from the account menus.
                */}
                <p className="lt-login-linkwarn" data-testid="lt-link-warning">
                  <b>Use the same method every time.</b> Your attempts, checked answers
                  and progress stay with that account. Start with email or Google and
                  you can add your phone later from Home — both then open the same
                  account. No email? Phone works on its own; just sign in with that
                  same number each time.
                </p>
              </>
            ) : step === "email" ? (
              <>
                {backToOptions}
                {resetOpen ? (
                  <form onSubmit={handleResetSubmit} noValidate aria-label="Reset your password">
                    <h2 className="lt-login-stephead">Reset your password</h2>
                    <p className="lt-login-reset-lede">
                      Enter the email you signed in with and we'll send you a link to set a
                      new password.
                    </p>
                    <label className="lt-field-label" htmlFor="lt-login-reset-email">
                      Email address
                    </label>
                    <div className="lt-field">
                      <input
                        id="lt-login-reset-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={resetEmail}
                        disabled={resetSent}
                        onChange={(e) => setResetEmail(e.target.value)}
                      />
                    </div>
                    {resetError ? (
                      <p className="lt-login-error" role="alert">
                        {resetError}
                      </p>
                    ) : null}
                    {resetSent ? (
                      <p className="lt-login-reset-notice" role="status">
                        <span aria-hidden="true">{"✓"}</span>
                        <span data-testid="lt-reset-notice">{RESET_NEUTRAL_NOTICE}</span>
                      </p>
                    ) : (
                      <button className="lt-continue" type="submit" disabled={resetBusy}>
                        {resetBusy ? "Sending link..." : "Send reset link"}{" "}
                        <span aria-hidden="true">{"→"}</span>
                      </button>
                    )}
                    <p className="lt-login-reset-back">
                      <button
                        type="button"
                        className="lt-login-linkbtn"
                        onClick={closeReset}
                        disabled={resetBusy}
                      >
                        {"<- Back to sign in"}
                      </button>
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleEmailSubmit} noValidate>
                    <h2 className="lt-login-stephead">Continue with email</h2>

                    {/*
                      ★★ THE SELF-DECLARATION. Not tabs at the door — the three
                      methods above are still equal and unclassified. This sits
                      one level in, on the only method where new and returning
                      genuinely need different work, and it replaces a guess the
                      server refuses to answer.

                      `role="group"` rather than `tablist`: these do not switch
                      between two panels of the same form, they change what the
                      form DOES. Login.oneDoor.test.tsx asserts zero elements
                      with role="tab" and that stays true.
                    */}
                    {!isCreate ? (
                      <div
                        className="lt-login-seg"
                        role="group"
                        aria-label="Do you already have an account?"
                        data-testid="lt-email-mode"
                      >
                        <button
                          type="button"
                          aria-pressed={emailMode === "new"}
                          onClick={() => switchEmailMode("new")}
                          disabled={busy}
                        >
                          I'm new here
                        </button>
                        <button
                          type="button"
                          aria-pressed={emailMode === "returning"}
                          onClick={() => switchEmailMode("returning")}
                          disabled={busy}
                        >
                          Already have an account
                        </button>
                      </div>
                    ) : null}

                    <p className="lt-login-stepsub">
                      {creatingAccount
                        ? "We'll create your account and start your 7-day trial."
                        : "Welcome back — sign in to pick up where you left off."}
                    </p>

                    {/*
                      Name FIRST on the create path — before the email, before
                      the password. Required, never optional: an account created
                      without a name cannot be backfilled from this page, because
                      `signUpWithEmailPassword` is the only `updateProfile` in
                      product code.
                    */}
                    {creatingAccount ? (
                      <>
                        <label className="lt-field-label" htmlFor="lt-login-name">
                          Your name
                        </label>
                        <div className="lt-field">
                          <input
                            id="lt-login-name"
                            type="text"
                            autoComplete="name"
                            placeholder="What should we call you?"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                          />
                        </div>
                        <p className="lt-login-note lt-login-note--between">
                          This is what LazyTopper calls you on Progress and Mistake
                          Intelligence.
                        </p>
                      </>
                    ) : null}

                    <label className="lt-field-label" htmlFor="lt-login-email">
                      Email address
                    </label>
                    <div className="lt-field">
                      <input
                        id="lt-login-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="lt-login-field-row">
                      {/*
                        ⚠ THE LABEL STAYS "Password" ON BOTH BRANCHES — a
                        deliberate deviation from the v2 prototype, which shows
                        "Create a password" on the new branch.

                        The label IS the accessible name, and
                        Login.forgotPassword.test.tsx:278 and :296 resolve this
                        field with getByLabelText("Password") as their control
                        that the password form came back. That file is NOT on
                        this lane's allowlist, so renaming the label would have
                        reddened a suite this lane may not repair.

                        The placeholder still distinguishes the two branches —
                        a student creating an account sees "At least 6
                        characters" — so the prototype's intent survives while
                        the accessible name stays stable.
                      */}
                      <label className="lt-field-label" htmlFor="lt-login-password">
                        Password
                      </label>
                      {/*
                        Reset is offered on BOTH modes. A student who declared
                        themselves new but is actually returning still needs the
                        route out, and hiding it here would push them into the
                        create path and an already-registered message.
                      */}
                      <button
                        type="button"
                        className="lt-login-linkbtn lt-login-forgot"
                        onClick={openReset}
                        disabled={busy}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="lt-field">
                      <input
                        id="lt-login-password"
                        type="password"
                        autoComplete={creatingAccount ? "new-password" : "current-password"}
                        placeholder={creatingAccount ? "At least 6 characters" : "Your password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>

                    {error ? (
                      <p className="lt-login-error" role="alert">
                        {error}
                      </p>
                    ) : null}
                    <button className="lt-continue" type="submit" disabled={busy}>
                      <span className="lt-continue-echo">{continueLabel}</span>
                      <span aria-hidden="true">{"→"}</span>
                    </button>
                    {offerReset ? (
                      <button
                        type="button"
                        className="lt-login-reset-offer"
                        onClick={openReset}
                        disabled={busy}
                      >
                        Reset my password
                      </button>
                    ) : null}
                  </form>
                )}
              </>
            ) : (
              <>
                {backToOptions}
                <form onSubmit={handlePhoneSubmit} noValidate>
                  {phoneStep === "number" ? (
                    <>
                      <h2 className="lt-login-stephead">Continue with phone</h2>
                      <p className="lt-login-stepsub">
                        New or returning — phone works the same either way. No password
                        to remember.
                      </p>
                      <label className="lt-field-label" htmlFor="lt-login-phone">
                        Mobile number
                      </label>
                      <div className="lt-field">
                        <span className="lt-prefix">+91</span>
                        <input
                          id="lt-login-phone"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          maxLength={10}
                          placeholder="10-digit mobile number"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        />
                      </div>
                      <p className="lt-login-note">
                        We'll text a 6-digit code to verify this number.
                      </p>
                      {error ? (
                        <p className="lt-login-error" role="alert">
                          {error}
                        </p>
                      ) : null}
                      <button className="lt-continue" type="submit" disabled={busy}>
                        {busy ? "Sending code..." : "Send OTP"}{" "}
                        <span aria-hidden="true">{"→"}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <h2 className="lt-login-stephead">Enter the code</h2>
                      <label className="lt-field-label" htmlFor="lt-login-otp">
                        Enter the 6-digit code
                      </label>
                      <div className="lt-field">
                        <input
                          id="lt-login-otp"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          placeholder="6-digit code"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        />
                      </div>
                      <p className="lt-login-note">
                        Code sent to +91 {phone}.{" "}
                        <button
                          type="button"
                          className="lt-login-linkbtn"
                          onClick={handleChangeNumber}
                          disabled={busy}
                        >
                          Change number
                        </button>
                      </p>
                      {error ? (
                        <p className="lt-login-error" role="alert">
                          {error}
                        </p>
                      ) : null}
                      <button className="lt-continue" type="submit" disabled={busy}>
                        {busy ? "Verifying..." : "Verify & continue"}{" "}
                        <span aria-hidden="true">{"→"}</span>
                      </button>
                      <p className="lt-signup">
                        Didn't get it?{" "}
                        <button
                          type="button"
                          className="lt-login-linkbtn"
                          onClick={handleResendOtp}
                          disabled={busy}
                        >
                          Resend OTP
                        </button>
                      </p>
                    </>
                  )}
                </form>
              </>
            )}
          </div>

          {/* The compact offer — phones only, and WITHOUT the price. The full
              block with the founding rate lives in the brand panel, which does
              not exist at this width. Both variants read src/config/pricing.ts;
              neither ever renders a remaining-seats count. */}
          <OfferStrip variant="mobile" />

          {/*
            Invisible reCAPTCHA host — always mounted (NOT inside the phone
            step), so moving between steps never unmounts the container out
            from under a live verifier. The bottom-right badge is expected.
          */}
          <div id={recaptchaContainerId} />

          <div className="lt-login-foot">
            <Link to="/" className="lt-login-back-link">
              {isStartTrial ? "<- Back to landing" : "<- Back to home"}
            </Link>
            {/*
              ⚠ THE MOBILE MOUNT OF THE CONSENT LINE, and it is the reason the
              desktop one is a conditional render rather than a CSS toggle. The
              brand panel that carries the desktop copy is display:none here, so
              this is the ONLY reachable route to the policies below 1024px.
              Exactly one of the two exists at any width.
            */}
            {!isDesktop ? (
              <span className="lt-login-terms" data-testid="lt-legal-footer">
                By signing in, you agree to our <Link to="/legal/terms">Terms of Service</Link> and{" "}
                <Link to="/legal/privacy">Privacy Policy</Link>
              </span>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

/**
 * `/login` — the sign-in door.
 *
 * Production responsibilities preserved:
 * - Native Firebase Auth drives sign-in: Google (popup), phone (SMS OTP) and
 *   email/password, all from ONE page with no sign-in/sign-up tabs.
 * - Redirect priority stays `?redirect`, `location.state.from`, then "/".
 * - The page stays standalone, without DesktopShell/sidebar chrome.
 * - No guest CTA or fake trial activation is exposed from the door.
 */
export default function Login() {
  return <AuthDoor intent="signin" recaptchaContainerId="lt-login-recaptcha" />;
}
