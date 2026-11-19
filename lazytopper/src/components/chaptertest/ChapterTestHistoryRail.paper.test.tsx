import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ChapterTestHistoryRail from "./ChapterTestHistoryRail";
import type { SessionRecord } from "../../services/sessionRecords";

afterEach(() => cleanup());
const rec = (id: string, worksheetId: string): SessionRecord =>
  ({ id, title: "Real Numbers - Chapter Test", surface: "chapter-test", subject: "Maths", status: "graded", marksAwarded: 10, marksTotal: 30, gradedAt: 1_700_000_000_000, topicKeys: ["real-numbers"], worksheetId, fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 } }) as unknown as SessionRecord;

describe("TS-MORE-1 history list labels the series paper", () => {
  it("a series sitting shows its paper code; a non-series sitting shows none", () => {
    const tag = (r: SessionRecord) => (r.worksheetId.includes("ts1p3") ? "CT-M01-3" : r.worksheetId.startsWith("ct-ts1-") ? "CT-M01" : null);
    render(
      <ChapterTestHistoryRail
        topicLabel="Real Numbers"
        loading={false}
        onOpen={() => {}}
        paperTag={tag}
        records={[rec("CT-#03", "ct-ts1p3-real-numbers--a"), rec("CT-#02", "ct-ts1-real-numbers--b"), rec("CT-#01", "ct-abc-def")]}
      />,
    );
    expect(screen.getAllByTestId("ct-hist-paper").map((e) => e.textContent)).toEqual(["CT-M01-3 · ", "CT-M01 · "]);
  });
});
