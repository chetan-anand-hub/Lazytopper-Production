import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * GATE-QP-1 wiring guard (source-level, like the repo's other PracticePage structure guards): every door through which a
 * Basic / Test Series-only student could WRITE or UPLOAD a practice answer for marking is closed by the one `qpWall` value,
 * and the MCQ path (answer taps, scorecard mint) is not touched by it.
 */
const SRC = readFileSync(resolve(process.cwd(), "src/pages/PracticePage.tsx"), "utf8");

describe("GATE-QP-1 · PracticePage wiring", () => {
  it("reads the wall once from the hook", () => {
    expect(SRC.match(/const qpWall = useQpWrittenWall\(\);/g)).toHaveLength(1);
  });
  it("hides the answer box and the card's grading promise while walled", () => {
    expect(SRC).toContain("answerBoxOff={reviewMode || qpWall}");
    expect(SRC).toContain("writtenLocked={qpWall}");
  });
  it("shows the Board Pass screen before the work, on a set that has a written question", () => {
    expect(SRC).toMatch(/isBuilt && qpWall && !reviewMode && filteredQuestions\.some\(/);
    expect(SRC).toContain("<QpBoardPassWall />");
  });
  it("closes the Finish gate, the 'Upload written answers' door and Byte's written-answer nudge", () => {
    expect(SRC).toContain("if (!reviewMode && !batchResult && !qpWall) {");
    expect(SRC).toContain("laterPanel && qpWall ?");
    expect(SRC).toContain("{qpWall ? <QpBoardPassWall testId=\"qp-board-pass-wall-reopen\" /> : (");
    expect(SRC).toContain("!objectiveLineShows && !qpWall ?");
  });
  it("does not touch the MCQ scorecard gate (useQpGate) or tap scoring", () => {
    expect(SRC).toContain("const qpGate = useQpGate(showScorecard, qpSetKey);");
    expect(SRC).not.toMatch(/qpGate[^;\n]*qpWall/);
  });
});
