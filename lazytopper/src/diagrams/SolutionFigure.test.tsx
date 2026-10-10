/**
 * DIAGRAMS-1 PR-2a — SolutionFigure: a bound row shows its computed figure with an
 * honest caption and an enlarge lightbox; an unbound row (CONTROL) and a binding the
 * builder refuses both render NOTHING — no placeholder, never a lookalike.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.doUnmock("./registry");
  vi.resetModules();
});

const BOUND = "TRIG-N-NCERT-9-SA-001"; // 15 m, 60° — bound in the Trig registry
const UNBOUND = "TRIG-N-EXMPLR-9-SA-001"; // read and refused (no numbers)

describe("SolutionFigure", () => {
  it("a bound question shows its figure, drawn from its own numbers, with the honest caption", async () => {
    const { SolutionFigure, SOLUTION_FIGURE_CAPTION } = await import("./SolutionFigure");
    const { container } = render(<SolutionFigure questionId={BOUND} />);
    const svg = container.querySelector("figure.lt-solfig svg[role='img']");
    expect(svg).not.toBeNull();
    const text = Array.from(container.querySelectorAll("svg text")).map((t) => t.textContent);
    expect(text).toEqual(expect.arrayContaining(["15 m", "60°"]));
    expect(container.querySelector("figcaption")!.textContent).toContain(SOLUTION_FIGURE_CAPTION);
  });

  it("CONTROL: an unbound question renders nothing at all", async () => {
    const { SolutionFigure } = await import("./SolutionFigure");
    const { container } = render(<SolutionFigure questionId={UNBOUND} />);
    expect(container.innerHTML).toBe("");
  });

  it("a binding the builder REFUSES (θ = 90°) renders nothing — CONTROL: the same mock with 60° renders", async () => {
    const binding = (questionId: string, theta: number) => ({
      kind: "computed" as const,
      questionId,
      slot: "solution" as const,
      builder: "heightsDistances" as const,
      params: { template: "single" as const, view: "shadow" as const, unit: "m" as const, theta, h: "2" },
      provenance: [],
      expect: [],
      confirmedBy: "test",
    });
    vi.doMock("./registry", async () => {
      const real = await vi.importActual<typeof import("./registry")>("./registry");
      return {
        ...real,
        getSolutionFigures: (id: string) => (id === "X-90" ? [binding("X-90", 90)] : id === "X-60" ? [binding("X-60", 60)] : []),
      };
    });
    const { SolutionFigure } = await import("./SolutionFigure");
    const refused = render(<SolutionFigure questionId="X-90" />);
    expect(refused.container.innerHTML).toBe("");
    const control = render(<SolutionFigure questionId="X-60" />);
    expect(control.container.querySelector("figure.lt-solfig svg")).not.toBeNull();
  });

  it("enlarges into the accessible lightbox with a data:image/svg URL that carries its own styles", async () => {
    const { SolutionFigure } = await import("./SolutionFigure");
    render(<SolutionFigure questionId={BOUND} />);
    fireEvent.click(screen.getByRole("button", { name: /Enlarge figure/ }));
    const dialog = screen.getByRole("dialog");
    // Portalled to <body>: never inside the card, so a transformed ancestor cannot trap it.
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog.closest("figure")).toBeNull();
    const img = dialog.querySelector("img")!;
    const src = img.getAttribute("src")!;
    expect(src.startsWith("data:image/svg+xml")).toBe(true);
    const markup = decodeURIComponent(src.split(",").slice(1).join(","));
    expect(markup).toContain("<style>");
    expect(markup).toContain("15 m");
    expect(img.getAttribute("alt")).toMatch(/15 m/);
    fireEvent.click(screen.getByRole("button", { name: /Close enlarged figure/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("a CROP entry renders the official image with its alt text and enlarges it", async () => {
    vi.doMock("./registry", async () => {
      const real = await vi.importActual<typeof import("./registry")>("./registry");
      return {
        ...real,
        getSolutionFigures: (id: string) =>
          id === "CROP-1"
            ? [
                {
                  kind: "crop" as const,
                  questionId: "CROP-1",
                  slot: "solution" as const,
                  filePath: "/figures/solutions/test/CROP-1.webp",
                  alt: "Labelled diagram of the human heart",
                  source: { file: "ncert.pdf", page: 1, figure: "6.10" },
                  eyeConfirm: "test",
                  confirmedBy: "test",
                },
              ]
            : [],
      };
    });
    const { SolutionFigure, SOLUTION_CROP_CAPTION } = await import("./SolutionFigure");
    const { container } = render(<SolutionFigure questionId="CROP-1" />);
    const img = container.querySelector("figure.lt-solfig img") as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.getAttribute("alt")).toBe("Labelled diagram of the human heart");
    expect(img.getAttribute("src")).toMatch(/\/figures\/solutions\/test\/CROP-1\.webp$/);
    expect(container.querySelector("figcaption")!.textContent).toContain(SOLUTION_CROP_CAPTION);
    expect(container.querySelector("figure svg")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Enlarge figure/ }));
    const dialogImg = screen.getByRole("dialog").querySelector("img")!;
    expect(dialogImg.getAttribute("src")).toBe(img.getAttribute("src"));
    expect(dialogImg.getAttribute("alt")).toBe("Labelled diagram of the human heart");
  });
});
