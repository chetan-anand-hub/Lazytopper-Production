import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FeedbackPrompt } from "./FeedbackPrompt";
import { APPEARANCE_PRIORITY, __resetMascotBudgetForTests, __setMascotBudgetForTests, noteShown, requestAppearance, unpromptedShownCount } from "../guide/mascotBudget";
import { __resetMascotHostsForTests, noteMascotHost } from "../guide/mascotPresence";
import { __resetMascotsForTests, hideMascots } from "../guide/mascotsMute";
import { setMatchMediaMatches } from "../../test/setup";

/**
 * FEEDBACK-NUDGE-1 - the paywall / trial-end card: a short slide-up, and Ziggy beside the question when the
 * mascot budget grants him. The words, the six reasons, the call offer and the close are untouched.
 */

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  __resetMascotsForTests();
  __resetMascotBudgetForTests();
  __setMascotBudgetForTests(true);
});
afterEach(() => {
  cleanup();
  __resetMascotHostsForTests();
  __resetMascotBudgetForTests();
  __resetMascotsForTests();
  window.localStorage.clear();
});

function renderCard(over: { withZiggy?: boolean; moment?: "paywall" | "trial_end" } = {}) {
  const p = { onAnswer: vi.fn(), onDismiss: vi.fn(), onDone: vi.fn() };
  const view = render(<FeedbackPrompt moment={over.moment ?? "paywall"} withZiggy={over.withZiggy ?? true} {...p} />);
  return { ...p, view };
}
const card = () => screen.getByTestId("feedback-prompt");

describe("FEEDBACK-NUDGE-1 - slide-up", () => {
  it("carries the slide-up class by default", () => {
    renderCard();
    expect(card().className).toBe("lt-fb lt-fb--rise");
  });

  it("carries NO slide-up class when the device asks for reduced motion (it just appears)", () => {
    setMatchMediaMatches((q) => q.includes("prefers-reduced-motion: reduce"));
    renderCard();
    expect(card().className).toBe("lt-fb");
  });

  it("the motion lives only under prefers-reduced-motion: no-preference, uses transform + opacity, and the exit has none", () => {
    renderCard();
    const css = (card().querySelector("style") as HTMLStyleElement).textContent ?? "";
    const m = css.match(/@media \(prefers-reduced-motion: no-preference\) \{([\s\S]*?)\n  \}\n/);
    expect(m).not.toBeNull();
    expect(m![1]).toContain(".lt-fb--rise");
    expect(m![1]).toMatch(/250ms/);
    expect(m![1]).toContain("translateY");
    expect(m![1]).toContain("opacity");
    expect(css.replace(m![0], "")).not.toMatch(/animation|transition/);
  });

  it("stays a fixed, non-modal card with no inline style", () => {
    renderCard();
    expect(card().getAttribute("style")).toBeNull();
    expect(card().getAttribute("aria-modal")).toBe("false");
    expect(card().getAttribute("role")).toBe("dialog");
    expect(card().getAttribute("aria-labelledby")).toBe("lt-fb-title");
  });
});

describe("FEEDBACK-NUDGE-1 - Ziggy beside the question", () => {
  it("is drawn (lazily) when the budget grants a slot, and spends it once drawn (the pending case is in nudgeSlot.test)", async () => {
    renderCard();
    const z = await screen.findByTestId("blob-ziggy");
    expect(card().contains(z)).toBe(true);
    // beside the question: before the title, inside the same header row
    const title = screen.getByRole("heading", { level: 2 });
    expect(title.parentElement?.contains(z)).toBe(true);
    expect(unpromptedShownCount()).toBe(1);
  });

  it("says nothing of his own: no new text, the question is the card's", async () => {
    renderCard();
    await screen.findByTestId("blob-ziggy");
    expect(screen.getByTestId("blob-ziggy").textContent).toBe("");
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Quick question — what would make LazyTopper more useful for you?");
  });

  it("is plain when the host did not ask for him", () => {
    renderCard({ withZiggy: false });
    expect(screen.queryByTestId("blob-ziggy")).toBeNull();
    expect(card().querySelector(".lt-fbg__z")).toBeNull();
    expect(card().querySelector(".lt-fb__head--z")).toBeNull();
  });

  it("is plain when the three appearances are spent - and the question is still asked", () => {
    for (const k of ["a", "b", "c"]) {
      requestAppearance(k, APPEARANCE_PRIORITY.explainer);
      noteShown(k);
    }
    renderCard();
    expect(card().querySelector(".lt-fbg__z")).toBeNull();
    expect(screen.queryByTestId("blob-ziggy")).toBeNull();
    expect(screen.getByText("Quick question — what would make LazyTopper more useful for you?")).toBeInTheDocument();
    expect(unpromptedShownCount()).toBe(3);
  });

  it("is plain with hidden mascots, and nothing is counted", () => {
    hideMascots();
    renderCard();
    expect(card().querySelector(".lt-fbg__z")).toBeNull();
    expect(unpromptedShownCount()).toBe(0);
  });

  it("is plain while another mascot is on screen, and steps aside the moment one arrives", async () => {
    const other = document.createElement("span");
    document.body.appendChild(other);
    act(() => noteMascotHost(other, true));
    renderCard();
    expect(card().querySelector(".lt-fbg__z")).toBeNull();
    act(() => noteMascotHost(other, false));
    await screen.findByTestId("blob-ziggy");
    act(() => noteMascotHost(other, true));
    expect(screen.queryByTestId("blob-ziggy")).toBeNull();
    other.remove();
  });

  it("leaves the thank-you plain (no character on the thanks line)", async () => {
    renderCard();
    await screen.findByTestId("blob-ziggy");
    fireEvent.click(screen.getByTestId("feedback-opt-price"));
    expect(screen.getByTestId("feedback-thanks")).toBeInTheDocument();
    expect(screen.queryByTestId("blob-ziggy")).toBeNull();
  });
});

describe("FEEDBACK-NUDGE-1 - fits without scrolling (measured in a real browser; the CSS is pinned here)", () => {
  it("compact layout on short / narrow screens keeps every tap >= 44 px and the reasons in two columns", () => {
    renderCard();
    const css = (card().querySelector("style") as HTMLStyleElement).textContent ?? "";
    const m = css.match(/@media \(max-width: 400px\), \(max-height: 700px\) \{([\s\S]*?)\n  \}\n/);
    expect(m).not.toBeNull();
    expect(m![1]).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(m![1]).toContain("width: 36px");
    expect(css).toMatch(/\.lt-fb__opt \{[^}]*min-height: 44px/);
    expect(m![1]).not.toMatch(/min-height/); // nothing in the compact block lowers a tap target
  });

  it("the card's own bottom clears the iOS home indicator", () => {
    renderCard();
    const css = (card().querySelector("style") as HTMLStyleElement).textContent ?? "";
    expect(css).toContain("bottom: calc(12px + env(safe-area-inset-bottom, 0px))");
    expect(css).toContain("max-height: calc(100vh - 24px - env(safe-area-inset-bottom, 0px))");
  });
});

describe("FEEDBACK-NUDGE-1 - nothing else moved", () => {
  it("copy is byte-identical", () => {
    renderCard();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Quick question — what would make LazyTopper more useful for you?");
    expect(card().querySelector(".lt-fb__sub")?.textContent).toBe("One tap is enough. It helps us improve LazyTopper.");
    expect([...card().querySelectorAll(".lt-fb__opt")].map((b) => b.textContent)).toEqual([
      "I haven't tried checking an answer yet",
      "My parents need to decide",
      "The price is too high for me right now",
      "It didn't help me enough yet",
      "Boards still feel far away",
      "Something else",
    ]);
    expect(card().querySelector(".lt-fb__call-offer")?.textContent).toBe("Got 5 minutes? Chat with us and we'll extend your Premium trial by 7 days.");
    expect(card().querySelector(".lt-fb__call-note")?.textContent).toBe("Our team adds the 7 days to your account after the call.");
    expect(card().querySelector(".lt-fb__call-cta")?.textContent).toBe("Chat with us on WhatsApp");
    expect(screen.getByTestId("feedback-no-thanks").textContent).toBe("No thanks");
  });

  it.each(["paywall", "trial_end"] as const)("%s: answer, dismiss (x / No thanks / Escape) behave as before", async (moment) => {
    const a = renderCard({ moment });
    fireEvent.click(screen.getByTestId("feedback-opt-ask_parents"));
    expect(a.onAnswer).toHaveBeenCalledWith("ask_parents");
    expect(screen.getByTestId("feedback-thanks").textContent).toBe("Thank you — this really helps us.");
    cleanup();
    for (const close of [
      () => fireEvent.click(screen.getByTestId("feedback-x")),
      () => fireEvent.click(screen.getByTestId("feedback-no-thanks")),
      () => fireEvent.keyDown(document, { key: "Escape" }),
    ]) {
      __resetMascotBudgetForTests();
      __setMascotBudgetForTests(true);
      const b = renderCard({ moment });
      await screen.findByTestId("blob-ziggy");
      close();
      expect(b.onDismiss).toHaveBeenCalledTimes(1);
      expect(b.onDone).toHaveBeenCalledTimes(1);
      cleanup();
    }
  });
});
