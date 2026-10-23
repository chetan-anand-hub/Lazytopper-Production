/**
 * QP-WORKING-AFTER-1 (owner design, 23 Oct 22:48 IST) — "Don't forget to save your answer!"
 *
 * A student who typed or attached working but never tapped "Save my answer" used to lose it at
 * Finish. Ziggy now prompts IN PLACE, next to that answer box, with a Save button that saves the
 * very working on screen (the host's own save — no API call, nothing graded here).
 *
 *   • Ziggy only for a signed-in guide-arm student, mascots not hidden, and no other character on
 *     screen. Otherwise (Hide mascots, signed out, another character showing, a second nudge at
 *     the same time) the SAME line and button render as plain text: the reminder never depends on
 *     the mascot, and two characters never share the screen.
 *   • While Ziggy shows he holds the stage ("nudge"), so the desktop sidebar's MI character steps
 *     aside (../scoreGuideStage.ts, ../mi/MiVoiceRow.tsx).
 *   • When to show (once per question, after a pause) is the HOST's decision; this only draws it.
 *
 * Display only: no grade, mark, prompt or record is touched.
 */
import { lazy, Suspense, useEffect, useState, useSyncExternalStore, type ComponentType } from "react";
import { useMascotsHidden } from "../mascotsMute";
import { guideAbActive, resolveGuideVariant } from "../guideVariant";
import { anyMascotHost, mascotHostsVersion, subscribeMascotHosts } from "../mascotPresence";
import { useHoldStage } from "../scoreGuideStage";
import "./saveNudge.css";

/** How long typed / attached working sits unsaved before the nudge shows (a pause, not a keystroke). */
export const SAVE_NUDGE_IDLE_MS = 3000;

export const SAVE_NUDGE_COPY = {
  ziggy: "Don't forget to save your answer!",
  plain: "Don't forget to save your answer.",
  save: "Save my answer",
} as const;

const Nothing: ComponentType = () => null;
const LazyZiggy = lazy(
  (): Promise<{ default: ComponentType }> =>
    import("./saveNudgeChunk").then(
      (m) => ({ default: m.SaveNudgeZiggy as ComponentType }),
      () => ({ default: Nothing }),
    ),
);

/* ONE Ziggy nudge at a time: the first nudge to mount owns him; any other shows plain text. */
let owner: string | null = null;
const ownerListeners = new Set<() => void>();
function setOwner(next: string | null): void {
  owner = next;
  for (const l of ownerListeners) l();
}
function subscribeOwner(l: () => void): () => void {
  ownerListeners.add(l);
  return () => {
    ownerListeners.delete(l);
  };
}
export function __resetSaveNudgeForTests(): void {
  setOwner(null);
}

export interface SaveNudgeProps {
  /** A stable id for this answer (the question id, plus a scope for a second copy, e.g. the gate). */
  id: string;
  /** The signed-in student (Ziggy is drawn for a guide-arm account only). */
  uid: string | null | undefined;
  /** Save the working on screen (the host's existing save). */
  onSave: () => void;
}

/**
 * The ONE Ziggy for a nudge: a signed-in guide-arm student, mascots not hidden, this nudge owns him
 * (the first to mount), and no other character on screen (the sidebar's steps aside — we hold the
 * "nudge" stage). False → the caller renders the same words as plain text.
 */
function useNudgeZiggy(id: string, uid: string | null | undefined): boolean {
  const hidden = useMascotsHidden();
  useSyncExternalStore(subscribeOwner, () => owner, () => null);
  useSyncExternalStore(subscribeMascotHosts, mascotHostsVersion, () => 0);
  const guideArm = guideAbActive() && resolveGuideVariant(uid) === "guide";
  const wantsZiggy = guideArm && !hidden;
  const [claimed, setClaimed] = useState(false);
  useEffect(() => {
    if (!wantsZiggy) return;
    if (owner === null) {
      setOwner(id);
      setClaimed(true);
    }
    return () => {
      if (owner === id) setOwner(null);
      setClaimed(false);
    };
  }, [wantsZiggy, id]);
  const otherOnScreen = anyMascotHost(
    (h) => h.closest("[data-save-nudge]")?.getAttribute("data-save-nudge") !== id && !h.closest(".lt-mi-voice"),
  );
  const withZiggy = wantsZiggy && claimed && owner === id && !otherOnScreen;
  useHoldStage("nudge", withZiggy);
  return withZiggy;
}

export function SaveNudge({ id, uid, onSave }: SaveNudgeProps) {
  const withZiggy = useNudgeZiggy(id, uid);
  return (
    <div
      className={`lt-savenudge${withZiggy ? " lt-savenudge--ziggy" : ""}`}
      data-testid="save-nudge"
      data-kind={withZiggy ? "ziggy" : "plain"}
      data-save-nudge={id}
      role="status"
    >
      {withZiggy ? (
        <Suspense fallback={null}>
          <LazyZiggy />
        </Suspense>
      ) : null}
      <div className="lt-savenudge__body">
        <p className="lt-savenudge__say" data-testid="save-nudge-line">
          {withZiggy ? SAVE_NUDGE_COPY.ziggy : SAVE_NUDGE_COPY.plain}
        </p>
        <button type="button" className="lt-savenudge__save" data-testid="save-nudge-save" onClick={onSave}>
          {SAVE_NUDGE_COPY.save}
        </button>
      </div>
    </div>
  );
}

/* ── Ziggy on a WRONG MCQ tap (owner ruling, 23 Oct 23:11 IST) ─────────────────────────────── */

export const WRONG_TAP_COPY = {
  ziggy: "Want to know where it went wrong? Upload or type your working and save it.",
  plain: "Want to know where it went wrong? Upload or type your working and save it.",
  type: "Type my working",
  upload: "Upload a photo",
  dismiss: "Not now",
} as const;

export interface WrongTapNudgeProps {
  id: string;
  uid: string | null | undefined;
  /** Open THIS question's working box on that tab. */
  onOpen: (mode: "type" | "upload") => void;
  onDismiss: () => void;
}

/**
 * In the card's flow (never an overlay: it cannot cover the options or the next question), never
 * focused on mount (it does not steal focus), dismissible. Working saved from here before Finish
 * is graded at Finish by the normal session path: the MCQ mark stays as tapped (CLAUDE.md §13) and
 * the working only gives the mistake type, shown on the scorecard and recorded to MI.
 */
export function WrongTapNudge({ id, uid, onOpen, onDismiss }: WrongTapNudgeProps) {
  const withZiggy = useNudgeZiggy(id, uid);
  return (
    <div
      className={`lt-savenudge lt-savenudge--wrong${withZiggy ? " lt-savenudge--ziggy" : ""}`}
      data-testid="wrong-tap-nudge"
      data-kind={withZiggy ? "ziggy" : "plain"}
      data-save-nudge={id}
      role="status"
    >
      {withZiggy ? (
        <Suspense fallback={null}>
          <LazyZiggy />
        </Suspense>
      ) : null}
      <div className="lt-savenudge__body">
        <p className="lt-savenudge__say" data-testid="wrong-tap-line">
          {withZiggy ? WRONG_TAP_COPY.ziggy : WRONG_TAP_COPY.plain}
        </p>
        <div className="lt-savenudge__acts">
          <button type="button" className="lt-savenudge__save" data-testid="wrong-tap-type" onClick={() => onOpen("type")}>
            {WRONG_TAP_COPY.type}
          </button>
          <button type="button" className="lt-savenudge__save lt-savenudge__save--alt" data-testid="wrong-tap-upload" onClick={() => onOpen("upload")}>
            {WRONG_TAP_COPY.upload}
          </button>
          <button type="button" className="lt-savenudge__dismiss" data-testid="wrong-tap-dismiss" onClick={onDismiss}>
            {WRONG_TAP_COPY.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
}
