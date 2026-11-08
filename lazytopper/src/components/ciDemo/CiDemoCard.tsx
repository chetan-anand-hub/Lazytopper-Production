/**
 * CI-SOFT-1 — the EAGER half of the "Pick a board question, watch it get marked" card: the lazy
 * door only. It holds no copy, no samples and no drawing — every line, the six marked answers, the
 * player, the result and the handwriting font live in ./ciDemoChunk.tsx, which Vite emits as its own
 * chunk, fetched only when the card will show (the host decides with `useCiDemoAudience`, ./ciDemoModel.ts).
 * While the chunk loads a plain placeholder holds the PICK card's height (./ciDemoDoor.css, tiny and eager);
 * a failed chunk load renders nothing — never breaks the page.
 *
 * DISPLAY ONLY: no grader call, no AI call; the host fills the question box on "Check my own answer"
 * and the student still taps Check themselves.
 *
 * SPEED-CI-2 (owner ruling 8 Nov 2026): for a FIRST-TIME visitor the card will open on a FIXED question, so the
 * fallback is that question itself (./LadderPreview.tsx), not the empty placeholder — the Answer Checker's static
 * paint is captured from it and a phone shows the question at first paint. Its styles (./ciDemo.css) therefore ship
 * with this eager door; every other visit keeps the placeholder.
 */
import { lazy, Suspense, useState, type ComponentType } from "react";
import type { CiDemoChunkProps } from "./ciDemoChunk";
import LadderPreview, { previewStarter } from "./LadderPreview";
import "./ciDemoDoor.css";
import "./ciDemo.css";

export type { CiDemoOwnPick, CiDemoLadderPick } from "./ciDemoChunk";
export type { LadderAnswer } from "./OneMinuteLadder";

const Nothing: ComponentType<CiDemoChunkProps> = () => null;
const LazyCiDemo = lazy(() =>
  import("./ciDemoChunk").then(
    (m) => ({ default: m.default }),
    () => ({ default: Nothing }),
  ),
);

export default function CiDemoCard(props: CiDemoChunkProps) {
  // Chosen once per mount, like the ladder's own starter.
  const [first] = useState(() => previewStarter(props.uid, props.ladderForced === true));
  return (
    <Suspense
      fallback={first ? <LadderPreview starter={first} /> : <div className="ci-demo-ph" data-testid="ci-demo-placeholder" aria-hidden="true" />}
    >
      <LazyCiDemo {...props} />
    </Suspense>
  );
}
