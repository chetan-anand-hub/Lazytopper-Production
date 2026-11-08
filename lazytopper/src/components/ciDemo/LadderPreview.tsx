/**
 * SPEED-CI-2 (owner ruling 8 Nov 2026 12:10 IST) — the card's FIRST frame for a first-time visitor, drawn by the eager
 * CiDemoCard while the lazy chunk (./ciDemoChunk.tsx) loads: the fixed starter's question and four options, Byte's
 * header line and the watch link, exactly as the ladder's first frame (the question and options are the SAME
 * components, ./LadderTapParts.tsx; the frame is pinned to the chunk's by ladderPreview.test.tsx). The Answer
 * Checker's static paint (scripts/seo/checkImprovePaint.ts) is captured from this, so on a phone the question is the
 * page's first paint instead of arriving with the chunk ~4 s later.
 *
 * NOT A SECOND LADDER. It marks nothing and records nothing: a tap is HELD (shown pressed) and handed to the ladder,
 * which answers it with its own 0-or-full verdict the moment it renders (./ladderVisit.ts). × and the watch link are
 * pressed-only until the card is in. The row is the bank-pinned copy (./oneMinuteStarterRows.ts): no bank import.
 */
import { useState } from "react";
import { useMascotsHidden } from "../guide/mascotsMute";
import { LADDER_HEAD, LADDER_WATCH } from "./ladderCopy";
import { hasChallengeParam, ladderLeads } from "./ladderLeads";
import { holdLadderTap, isFirstLadderVisit, peekLadderTap } from "./ladderVisit";
import { LadderMeta, LadderOptions, LadderQuestionText } from "./LadderTapParts";
import { STARTER_ROWS } from "./oneMinuteStarterRows";
import { fixedStarter, type OneMinuteStarter } from "./oneMinuteStarters";
import { readCiDemoSubjectHint } from "./ciDemoModel";

/** The starter the preview draws, or null (draw today's placeholder): only when the chunk will open on it. */
export function previewStarter(uid: string | null | undefined, forced: boolean): OneMinuteStarter | null {
  if (!isFirstLadderVisit() || hasChallengeParam() || !ladderLeads(uid, forced)) return null;
  const starter = fixedStarter(readCiDemoSubjectHint());
  const row = STARTER_ROWS[starter.bankId];
  return row && row.options.length === 4 && row.right >= 0 && row.right <= 3 ? starter : null;
}

export default function LadderPreview({ starter }: { starter: OneMinuteStarter }) {
  const row = STARTER_ROWS[starter.bankId];
  const hidden = useMascotsHidden();
  const [holding, setHolding] = useState<number | null>(() => peekLadderTap(starter.bankId));
  const hold = (i: number) => {
    holdLadderTap(starter.bankId, i);
    setHolding(i);
  };
  return (
    <section
      className="ci-demo ci-demo--pick"
      data-testid="ci-demo-preview"
      data-ci-first=""
      data-ci-bank={starter.bankId}
      data-view="pick"
      aria-label="Watch a sample answer get marked"
    >
      <button type="button" className="ci-demo__close" aria-label="Close" data-testid="ci-demo-close" aria-disabled="true">
        <span aria-hidden="true">×</span>
      </button>
      <div className="ci-demo__main">
        <div className="ci-demo__ladder" data-testid="one-min-ladder" data-step="tap">
          <LadderMeta subject={starter.subject} topicName={row.topicName} />
          <LadderQuestionText question={row.question} />
          <LadderOptions options={row.options} right={row.right} picked={null} onTap={hold} holding={holding} />
          <button type="button" className="ci-demo__link" data-testid="one-min-watch" aria-disabled="true">
            {LADDER_WATCH}
          </button>
        </div>
      </div>
      <div className="ci-demo__byte" data-testid="ci-demo-byte" data-pose="hello" data-drawn={hidden ? "0" : "1"}>
        {hidden ? null : <span className="ci-demo__avatar" />}
        <div className="ci-demo__say">
          <p className="ci-demo__line" aria-live="polite" data-testid="ci-demo-line">
            {LADDER_HEAD}
          </p>
        </div>
      </div>
    </section>
  );
}
