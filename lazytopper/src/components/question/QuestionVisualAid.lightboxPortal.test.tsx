import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { QuestionVisualAid } from "./QuestionVisualAid";
import { getFiguresForQuestion } from "../../data/visualConceptRegistry";

// DIAGRAMS-1 PR-1 fix round — the tap-to-enlarge lightbox must escape its card.
//
// The overlay is `position: fixed`. Rendered in place, fixed positioning resolves
// against the nearest TRANSFORMED ancestor, and the mobile shell's
// <main class="animate-float-up"> keeps an identity transform after its entry
// animation. Measured in the real app at 390 px: the overlay became a ~24,000px-tall
// box inside <main> and the enlarged figure sat at y = -7901 — the screen went dark
// and the figure was never visible. The fix portals the overlay to document.body.
//
// The harness reproduces the trap: the card is mounted under an element with a
// transform, exactly like the shell. CONTROL: before the click there is no overlay.

const BOUND_ID = "PYQ-M-CIRC-001";

function mountInTransformedShell() {
  const shell = document.createElement("main");
  shell.className = "animate-float-up";
  shell.style.transform = "matrix(1, 0, 0, 1, 0, 0)";
  document.body.appendChild(shell);
  const utils = render(<QuestionVisualAid questionId={BOUND_ID} topicKey="circles" subject="maths" />, { container: shell });
  return { shell, ...utils };
}

describe("QuestionVisualAid lightbox is portalled to document.body", () => {
  it("the fixture id is genuinely bound (guards against a vacuous test)", () => {
    expect(getFiguresForQuestion(BOUND_ID).length).toBe(1);
  });

  it("CONTROL: no overlay exists before the figure is tapped", () => {
    const { shell, unmount } = mountInTransformedShell();
    expect(document.body.querySelector('img[alt="Enlarged figure"]')).toBeNull();
    unmount(); shell.remove();
  });

  it("tapping the figure mounts the overlay as a direct child of document.body, outside the card and its transformed shell", () => {
    const { shell, container, unmount } = mountInTransformedShell();
    const thumb = container.querySelector('img[src*="/figures/pyq-maths/circles/PYQ-M-CIRC-001.webp"]');
    expect(thumb).not.toBeNull();
    fireEvent.click(thumb!.closest("button")!);
    const big = document.body.querySelector('img[alt="Enlarged figure"]');
    expect(big).not.toBeNull();
    const overlay = big!.parentElement!;
    expect(overlay.parentElement).toBe(document.body);
    expect(shell.contains(overlay)).toBe(false);
    expect(container.contains(big)).toBe(false);
    expect(overlay.style.position).toBe("fixed");
    expect(big!.getAttribute("src")).toContain("/figures/pyq-maths/circles/PYQ-M-CIRC-001.webp");
    unmount(); shell.remove();
  });

  it("tapping the overlay closes it (behaviour unchanged)", () => {
    const { shell, container, unmount } = mountInTransformedShell();
    fireEvent.click(container.querySelector('img[src*="/figures/"]')!.closest("button")!);
    const overlay = document.body.querySelector('img[alt="Enlarged figure"]')!.parentElement!;
    fireEvent.click(overlay);
    expect(document.body.querySelector('img[alt="Enlarged figure"]')).toBeNull();
    unmount(); shell.remove();
  });

  it("unmounting the card while the lightbox is open removes the overlay too", () => {
    const { shell, container, unmount } = mountInTransformedShell();
    fireEvent.click(container.querySelector('img[src*="/figures/"]')!.closest("button")!);
    expect(document.body.querySelector('img[alt="Enlarged figure"]')).not.toBeNull();
    unmount(); shell.remove();
    expect(document.body.querySelector('img[alt="Enlarged figure"]')).toBeNull();
  });
});
