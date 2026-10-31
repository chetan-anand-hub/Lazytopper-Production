import { Suspense, lazy, useCallback, useEffect, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { importWithRetry } from "../../lib/lazyWithRetry";
import { CHALLENGE_COPY, type ChallengeQuestion } from "./challengeModel";
import "./friendChallenge.css";

/**
 * FRIEND-CHALLENGE-1 - the "Challenge a friend" button. LIGHT: it imports no bank, no card and no
 * html-to-image. The sheet (card, PNG, channels) is a separate chunk imported on the tap.
 *
 * Two ways in:
 *   - `question`: the question is already resolved (the one-minute ladder's right answer);
 *   - `candidateIds`: ids of objective questions the student got right (Quick Practice's result). The first
 *     that resolves to a served board MCQ is used; if none does, NOTHING renders (no dead-end button).
 */

type SheetProps = { question: ChallengeQuestion; onClose: () => void };

function ChunkFailed({ onClose }: SheetProps) {
  return (
    <div className="lt-fcs__dim" role="dialog" aria-modal="true" aria-label={CHALLENGE_COPY.title} onClick={onClose}>
      <div className="lt-fcs" role="status">
        {CHALLENGE_COPY.failed}
      </div>
    </div>
  );
}

const ChallengeSheet = lazy(
  (): Promise<{ default: ComponentType<SheetProps> }> => importWithRetry(() => import("./ChallengeSheet")).catch(() => ({ default: ChunkFailed })),
);

export interface ChallengeFriendButtonProps {
  question?: ChallengeQuestion | null;
  candidateIds?: readonly string[];
  /** Where the button sits, for the test id. */
  placement: "ladder" | "quick-practice";
}

function useResolved(question: ChallengeQuestion | null | undefined, candidateIds: readonly string[] | undefined): ChallengeQuestion | null {
  const [found, setFound] = useState<ChallengeQuestion | null>(null);
  const key = (candidateIds ?? []).join("|");
  useEffect(() => {
    if (question || !candidateIds || candidateIds.length === 0) return;
    let live = true;
    void (async () => {
      try {
        const { resolveChallengeQuestion } = await import("./challengeBank");
        for (const id of candidateIds) {
          const q = await resolveChallengeQuestion(id);
          if (!live) return;
          if (q) {
            setFound(q);
            return;
          }
        }
      } catch {
        /* no button */
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, key]);
  return question ?? found;
}

export default function ChallengeFriendButton({ question, candidateIds, placement }: ChallengeFriendButtonProps) {
  const resolved = useResolved(question, candidateIds);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  if (!resolved) return null;
  return (
    <div className="lt-fcb">
      <button type="button" className="lt-fcb__btn" data-testid={`challenge-friend-${placement}`} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <svg className="lt-fcb__ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
        </svg>
        {CHALLENGE_COPY.button}
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <Suspense fallback={null}>
            <ChallengeSheet question={resolved} onClose={close} />
          </Suspense>,
          document.body,
        )}
    </div>
  );
}
