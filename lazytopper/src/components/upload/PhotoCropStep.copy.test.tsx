// TUTOR-PASTE-1 - the crop step's instruction line: Answer Checker's default stays byte-identical; a caller may override it.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import PhotoCropStep from "./PhotoCropStep";
import type { DecodedPhoto } from "../../services/preparePhoto";

const decoded = (): DecodedPhoto => ({
  file: new File([new Uint8Array([1])], "a.jpg", { type: "image/jpeg" }),
  source: {} as CanvasImageSource,
  geometry: { sourceWidth: 4000, sourceHeight: 3000, orientation: 1 },
  fileOrientation: 1,
  release: vi.fn(),
});
const mount = (description?: string) =>
  render(
    <PhotoCropStep
      photo={decoded()}
      description={description}
      onConfirm={() => {}}
      onCancel={() => {}}
      renderPreview={() => ({ url: "data:image/png;base64,AA==" })}
    />,
  );
afterEach(cleanup);

describe("PhotoCropStep instruction copy", () => {
  it("default (Answer Checker) text is unchanged", () => {
    mount();
    expect(screen.getByText("Drag the corners to just the answer you want checked — or use the whole photo.")).toBeTruthy();
  });
  it("the tutor copy is shown when passed in", () => {
    mount("Drag the corners to just the question you want explained — or use the whole photo.");
    expect(screen.getByText("Drag the corners to just the question you want explained — or use the whole photo.")).toBeTruthy();
    expect(screen.queryByText(/answer you want checked/)).toBeNull();
  });
});
