/** GRADE-RESULT-COPY-1 — a slow-retry stage line replaces the in-progress text (one line, never two). */
import { describe, it, expect, vi } from "vitest";

vi.mock("../../context/AuthContext", async (orig) => ({ ...(await orig<object>()), useAuth: () => ({ user: null, loading: false }) }));
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ChapterTestUploadPanel from "./ChapterTestUploadPanel";

const props = {
  name: "Quadratic Equations · Test #4",
  code: "CT-M-QE-04",
  objective: { awarded: 1, total: 6 },
  error: null,
  isSignedIn: true,
  onGrade: () => {},
  onSkip: () => {},
};

/** Attach a small PDF (no crop/compress step) so the grade button renders, then re-render grading. */
async function withFile(extra: { stageLabel?: string }) {
  const view = render(<ChapterTestUploadPanel {...props} grading={false} />);
  const input = view.container.querySelector('input[type="file"]') as HTMLInputElement;
  const pdf = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a])], "answers.pdf", { type: "application/pdf" });
  fireEvent.change(input, { target: { files: [pdf] } });
  await waitFor(() => expect(screen.getByText("Grade my written answers →")).toBeTruthy());
  view.rerender(<ChapterTestUploadPanel {...props} grading {...extra} />);
  return view;
}

describe("ChapterTestUploadPanel stageLabel", () => {
  it("shows the usual in-progress text while grading with no stage label", async () => {
    await withFile({});
    expect(screen.getByText("Grading your answers… ~30–60s")).toBeTruthy();
  });
  it("replaces the in-progress text with the stage label", async () => {
    await withFile({ stageLabel: "Taking a little longer than usual — still checking…" });
    expect(screen.getByText("Taking a little longer than usual — still checking…")).toBeTruthy();
    expect(screen.queryByText("Grading your answers… ~30–60s")).toBeNull();
  });
  it("ignores the stage label when not grading", () => {
    render(<ChapterTestUploadPanel {...props} grading={false} stageLabel="Taking a little longer than usual — still checking…" />);
    expect(screen.queryByText("Taking a little longer than usual — still checking…")).toBeNull();
  });
});
