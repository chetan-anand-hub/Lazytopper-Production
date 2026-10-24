/**
 * CI-SOFT-1 — the EAGER half of the "Pick a board question, watch it get marked" card: the lazy
 * door only. It holds no copy, no samples and no drawing — every line, the six marked answers, the
 * player, the result and the handwriting font live in ./ciDemoChunk.tsx, which Vite emits as its own
 * chunk, fetched only when the card will show (the host decides with `useCiDemoAudience`, ./ciDemoModel.ts).
 * A failed chunk load renders nothing — never breaks the page.
 *
 * DISPLAY ONLY: no grader call, no AI call; the host fills the question box on "Check my own answer"
 * and the student still taps Check themselves.
 */
import { lazy, Suspense, type ComponentType } from "react";
import type { CiDemoChunkProps } from "./ciDemoChunk";

export type { CiDemoOwnPick } from "./ciDemoChunk";

const Nothing: ComponentType<CiDemoChunkProps> = () => null;
const LazyCiDemo = lazy(() =>
  import("./ciDemoChunk").then(
    (m) => ({ default: m.default }),
    () => ({ default: Nothing }),
  ),
);

export default function CiDemoCard(props: CiDemoChunkProps) {
  return (
    <Suspense fallback={null}>
      <LazyCiDemo {...props} />
    </Suspense>
  );
}
