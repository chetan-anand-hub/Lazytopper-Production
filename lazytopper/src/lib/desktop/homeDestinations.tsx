import { useCallback, useMemo, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import type { DesktopSubject } from "./navigation";
import { desktopTopicsBySubject } from "./topics";
import { buildTutorPath } from "../../pages/tutor/tutorPath";

/**
 * homeDestinations — the single, firebase-free source of truth for the Home
 * cockpit's four primary destinations, the reason-aware login-URL helper, and
 * the shared "Ask your tutor" picker.
 *
 * Extracted from DesktopHome so the mobile Home variant (MobileHome) reuses the
 * EXACT same routes, labels, and login contract without importing DesktopHome
 * (which pulls firebase via the mistake-log service).
 *
 * ── THE FIREBASE-FREE RULE (load-bearing — do not break) ──────────────────
 * This module's whole transitive import graph must stay firebase-free:
 *   ./navigation      — types only, zero imports
 *   ./topics          — ./navigation + ../../data/syllabus/topicAliasMap (zero imports)
 *   ../../pages/tutor/tutorPath — zero imports
 * That is what lets a NON-Home surface mount the tutor picker. PR-B mounts
 * <TutorPickerModal> from DesktopShell for the rail's Tutor entry; if this file
 * ever gains a data-layer import (mistakeLogService, AuthContext, firebaseClient),
 * the shell can no longer import it. Auth state therefore arrives as the
 * `isSignedIn` PROP — this module never calls useAuth().
 */

// Source attribution param appended to same-app navigation from Home.
const HOME_QS_LEAD = "?source=home&returnTo=%2F";

// The tutor route is grade-scoped; Home is a Class 10 cockpit.
const TUTOR_GRADE = "10";

const FONT_DISPLAY = "'Fraunces', Georgia, serif";

type IconProps = { size?: number };

function LayersIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
function TrendingUpIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
function MessageCircleIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
function ClipboardCheckIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

export type IconCmp = (props: IconProps) => ReactElement;

/** Card accent — SPEC §6 semantics: green = tutor/action, navy = practice,
 *  amber = trends/caution, red = mistakes. */
export type HomeCardAccent = "amber" | "green" | "navy" | "red";

export interface HomeAccentTokens {
  /** 5px accent spine down the card's left edge. */
  spine: string;
  /** Soft accent-tinted card body (never flat white — SPEC §6). */
  body: string;
  border: string;
  /** Border + icon colour on hover. */
  hover: string;
  /** Icon glyph + "go" label colour. */
  ink: string;
  shadow: string;
}

/** Tokens copied VERBATIM from SPEC §6 (TutorPage.tsx:447-458 +
 *  DesktopPracticePage.tsx:131-134). Invent nothing. */
export const HOME_ACCENTS: Record<HomeCardAccent, HomeAccentTokens> = {
  amber: {
    spine: "hsl(38, 80%, 52%)",
    body: "linear-gradient(157deg, hsl(42,90%,96%), #fff 60%)",
    border: "hsl(40, 60%, 84%)",
    hover: "hsl(38, 80%, 52%)",
    ink: "hsl(35, 55%, 38%)",
    shadow: "0 12px 26px -12px hsla(38, 80%, 42%, 0.5)",
  },
  green: {
    spine: "hsl(152, 55%, 45%)",
    body: "linear-gradient(157deg, hsl(152,50%,96%), #fff 60%)",
    border: "hsl(152, 42%, 86%)",
    hover: "hsl(152, 55%, 45%)",
    ink: "hsl(152, 60%, 30%)",
    shadow: "0 12px 26px -12px hsla(152, 55%, 32%, 0.5)",
  },
  navy: {
    spine: "hsl(222, 47%, 24%)",
    body: "linear-gradient(157deg, hsl(222,45%,96%), #fff 60%)",
    border: "hsl(222, 35%, 84%)",
    hover: "hsl(222, 47%, 24%)",
    ink: "hsl(222, 47%, 24%)",
    shadow: "0 12px 26px -12px hsla(222, 47%, 24%, 0.5)",
  },
  red: {
    spine: "hsl(0, 60%, 52%)",
    body: "linear-gradient(157deg, hsl(0,75%,96%), #fff 60%)",
    border: "hsl(0, 55%, 89%)",
    hover: "hsl(0, 60%, 55%)",
    ink: "hsl(0, 60%, 38%)",
    shadow: "0 12px 26px -12px hsla(0, 60%, 40%, 0.42)",
  },
};

interface QuickCardBase {
  icon: IconCmp;
  label: string;
  sub: string;
  /** Trailing affordance, e.g. "Exam Trends →". */
  go: string;
  accent: HomeCardAccent;
}

/**
 * Discriminated union so BOTH Home variants are forced by the compiler to
 * handle the tutor card. It has no `to` — it opens the picker (SPEC §3), and a
 * card that silently rendered as a dead <Link> would be a real regression.
 */
export type QuickCard =
  | ({ kind: "link"; to: string } & QuickCardBase)
  | ({ kind: "tutor" } & QuickCardBase);

// ── REASON-AWARE LOGIN URL HELPER (PR-LANDING contract) ─────────
export function loginUrl(reason: string, redirect: string): string {
  const p = new URLSearchParams();
  p.set("reason", reason);
  p.set("redirect", redirect);
  return `/login?${p.toString()}`;
}

/**
 * composeTutorEntry — SPEC §3, the login/return contract, as ONE pure function.
 *
 * Composes an EXISTING url; it invents nothing. `buildTutorPath` here produces
 * the byte-identical URL that DesktopTopicHubPage's `askTutorHref` builds today.
 *
 *   signed in  → /tutor/10/Science/electricity?source=home&returnTo=%2F
 *   signed out → /login?reason=tutor&redirect=<that url, encoded>
 *
 * The signed-out branch routes to /login and NEVER to /tutor directly, so the
 * `RequirePremium featureLabel="Ask the tutor"` gate on the tutor route is
 * reached exactly as it is from every other entry point — the picker cannot
 * route around it. After login, Login.tsx reads ?redirect (isSafeInternalPath-
 * guarded) and lands the student on the chapter THEY picked, never Home.
 *
 * `topicKey` must be a topics.ts SLUG — never a display name. Callers get slugs
 * from `desktopTopicsBySubject()`, the same source askTutorHref uses.
 */
export function composeTutorEntry(input: {
  subject: DesktopSubject;
  topicKey: string;
  isSignedIn: boolean;
}): string {
  const tutorPath = buildTutorPath({
    grade: TUTOR_GRADE,
    subject: input.subject,
    topicKey: input.topicKey,
    source: "home",
    returnTo: "/",
  });
  return input.isSignedIn ? tutorPath : loginUrl("tutor", tutorPath);
}

/** Pop-card footer note — SPEC §3. Trial framing is frozen: never "then paid". */
export function tutorGateNote(isSignedIn: boolean): string {
  return isSignedIn
    ? "Premium · part of the 7-day trial — then free Basic, upgrade anytime."
    : "Log in to open your tutor. We'll bring you straight back to this chapter.";
}

// ── PRIMARY ACTION CARDS (4) — SPEC §2, journey order ───────────
//
// The Worksheets hero is RETIRED: it carried the identical destination string
// to the Practice card (`/practice-hub?source=home&returnTo=%2F`), so Home
// shipped a literally duplicated slot. Worksheets stay reachable via the
// practice hub and via the quick strip's multi-topic worksheet tile.
export const PRIMARY_CARDS: QuickCard[] = [
  {
    kind: "link",
    to: `/exam-trends${HOME_QS_LEAD}`,
    icon: TrendingUpIcon,
    label: "See what's likely",
    sub: "Tier-ranked chapters from ten years of real papers.",
    go: "Exam Trends →",
    accent: "amber",
  },
  {
    kind: "tutor",
    icon: MessageCircleIcon,
    label: "Ask your tutor",
    sub: "Pick a chapter and get it explained the way the board expects.",
    go: "Open tutor →",
    accent: "green",
  },
  {
    kind: "link",
    to: `/practice-hub${HOME_QS_LEAD}`,
    icon: LayersIcon,
    label: "Practise it",
    sub: "Quick sets, worksheets, predicted papers or a full mock.",
    go: "Practice →",
    accent: "navy",
  },
  {
    kind: "link",
    to: `/check-improve${HOME_QS_LEAD}`,
    icon: ClipboardCheckIcon,
    label: "Check my answer",
    sub: "Upload what you wrote and see where the marks went.",
    go: "Check & Improve →",
    accent: "red",
  },
];

// ── THE TUTOR POP-CARD (SPEC §3) ────────────────────────────────

const PICKER_CSS = `
  .lt-tutor-ov {
    position: fixed; inset: 0; z-index: 60;
    background: hsla(220, 35%, 12%, 0.52);
    display: flex; align-items: center; justify-content: center; padding: 16px;
  }
  .lt-tutor-pop {
    background: #fff; border-radius: 20px; width: 100%; max-width: 410px;
    padding: 21px; position: relative; max-height: 86vh; overflow: auto;
    border-top: 5px solid hsl(152, 55%, 45%);
    box-shadow: 0 26px 60px -18px hsla(220, 45%, 15%, 0.6);
  }
  .lt-tutor-pop h2 {
    margin: 0 0 3px; font-size: 18px; font-family: ${FONT_DISPLAY};
    font-weight: 600; color: hsl(220, 25%, 14%);
  }
  .lt-tutor-pop .lt-tutor-sub {
    margin: 0 0 15px; font-size: 12.5px; color: hsl(220, 15%, 42%); line-height: 1.55;
  }
  .lt-tutor-fld { margin-bottom: 12px; }
  .lt-tutor-fld label {
    display: block; font-size: 10px; font-weight: 800; letter-spacing: 0.09em;
    text-transform: uppercase; color: hsl(220, 15%, 60%); margin: 0 0 6px;
  }
  .lt-tutor-fld select {
    width: 100%; border: 1px solid hsl(220, 20%, 92%); border-radius: 12px;
    padding: 11px 12px; font-size: 13.5px; font-family: inherit; background: #fff;
    color: hsl(220, 25%, 14%); outline: none; cursor: pointer;
  }
  .lt-tutor-fld select:focus {
    border-color: hsl(152, 55%, 45%); box-shadow: 0 0 0 3px hsl(152, 50%, 96%);
  }
  .lt-tutor-x {
    position: absolute; top: 12px; right: 15px; font-size: 17px; line-height: 1;
    color: hsl(220, 15%, 60%); cursor: pointer; background: none; border: 0; padding: 0;
  }
  .lt-tutor-go {
    width: 100%; text-align: center; padding: 12px; font-size: 13.5px;
    border-radius: 12px; font-weight: 700; cursor: pointer; border: 1px solid transparent;
    font-family: inherit; color: #fff;
    background: linear-gradient(140deg, hsl(152,55%,45%), hsl(152,60%,30%));
    box-shadow: 0 4px 12px -5px hsla(152, 55%, 28%, 0.55);
  }
  .lt-tutor-foot {
    margin: 11px 0 0; font-size: 11.5px; color: hsl(220, 15%, 42%); text-align: center;
    line-height: 1.55; border-top: 1px solid hsl(220, 20%, 92%); padding-top: 10px;
  }
`;

export interface TutorPickerModalProps {
  open: boolean;
  onClose: () => void;
  /** Auth state is a PROP — this module must never import AuthContext. */
  isSignedIn: boolean;
}

/**
 * TutorPickerModal — the shared "Ask your tutor" pop-card.
 *
 * Owns its selects and the buildTutorPath composition; the parent supplies only
 * `open`/`onClose` and auth state. Home mounts it behind `useTutorPicker`;
 * PR-B mounts this same component from DesktopShell for the rail Tutor entry.
 * Chapter options come from `desktopTopicsBySubject` so every value is a real
 * topics.ts slug — a display name can never leak into `topicKey`.
 */
export function TutorPickerModal({ open, onClose, isSignedIn }: TutorPickerModalProps) {
  const navigate = useNavigate();
  const [subject, setSubject] = useState<DesktopSubject>("Maths");
  const [topicKey, setTopicKey] = useState<string>("");

  const topics = useMemo(() => desktopTopicsBySubject(subject), [subject]);
  // The chapter list changes with the subject (SPEC §3). Falling back to the
  // first chapter of the CURRENT list keeps the selection valid after a switch.
  const selected = topics.some((t) => t.slug === topicKey)
    ? topicKey
    : (topics[0]?.slug ?? "");

  if (!open) return null;

  const openTutor = () => {
    if (!selected) return;
    onClose();
    navigate(composeTutorEntry({ subject, topicKey: selected, isSignedIn }));
  };

  return (
    <div
      className="lt-tutor-ov"
      data-testid="tutor-picker"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{PICKER_CSS}</style>
      <div
        className="lt-tutor-pop"
        role="dialog"
        aria-modal="true"
        aria-label="Ask your tutor"
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        <button type="button" className="lt-tutor-x" aria-label="Close" onClick={onClose}>
          ✕
        </button>
        <h2>Ask your tutor</h2>
        <p className="lt-tutor-sub">
          Pick what you want to work on. The tutor opens on that chapter.
        </p>

        <div className="lt-tutor-fld">
          <label htmlFor="lt-tutor-subject">Subject</label>
          <select
            id="lt-tutor-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value as DesktopSubject)}
          >
            <option value="Maths">Maths</option>
            <option value="Science">Science</option>
          </select>
        </div>

        <div className="lt-tutor-fld">
          <label htmlFor="lt-tutor-chapter">Chapter</label>
          <select
            id="lt-tutor-chapter"
            value={selected}
            onChange={(e) => setTopicKey(e.target.value)}
          >
            {topics.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="lt-tutor-go"
          data-testid="tutor-picker-open"
          onClick={openTutor}
        >
          Open tutor →
        </button>
        <p className="lt-tutor-foot" data-testid="tutor-picker-gate-note">
          {tutorGateNote(isSignedIn)}
        </p>
      </div>
    </div>
  );
}

/**
 * useTutorPicker — the parent-facing handle. The parent renders `tutorPicker`
 * once and calls `openTutorPicker()` from any trigger (a Home hero card now, a
 * DesktopShell rail item in PR-B). Open/close state lives here, not in the page.
 */
export function useTutorPicker(isSignedIn: boolean): {
  openTutorPicker: () => void;
  tutorPicker: ReactElement;
} {
  const [open, setOpen] = useState(false);
  const openTutorPicker = useCallback(() => setOpen(true), []);
  const closeTutorPicker = useCallback(() => setOpen(false), []);
  return {
    openTutorPicker,
    tutorPicker: (
      <TutorPickerModal open={open} onClose={closeTutorPicker} isSignedIn={isSignedIn} />
    ),
  };
}
