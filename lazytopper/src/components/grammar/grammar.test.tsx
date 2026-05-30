import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { setMatchMediaMatches } from "../../test/setup";
import { Card } from "./Card";
import { TileRow } from "./TileRow";
import { Pill } from "./Pill";
import { SectionHeader } from "./SectionHeader";

afterEach(cleanup);

/**
 * First real render test on the Vitest infra (#160). It asserts BEHAVIOR — most
 * importantly that TileRow's desktop→mobile reflow is a real, CSS-media-query
 * contract (not a JS width check). jsdom does not compute layout, so we assert the
 * CSS contract is present and targets the right selector, rather than measuring px.
 */

describe("TileRow reflow (load-bearing)", () => {
  it("emits a real @media (max-width: 1023px) single-column rule targeting the grid", () => {
    const { container } = render(
      <TileRow columns={4}>
        <div>one</div>
        <div>two</div>
        <div>three</div>
        <div>four</div>
      </TileRow>,
    );

    // Container + per-tile class hooks exist.
    const row = container.querySelector(".lt-grammar-tile-row");
    expect(row).not.toBeNull();
    expect(container.querySelectorAll(".lt-grammar-tile")).toHaveLength(4);

    // Column count is driven by the CSS custom property, not hard-coded CSS.
    expect((row as HTMLElement).style.getPropertyValue("--lt-tile-cols")).toBe(
      "4",
    );

    // The reflow mechanism: a real @media (max-width: 1023px) rule that collapses
    // the grid to a single column. Assert the CSS contract in the emitted <style>.
    const css = container.querySelector("style")?.textContent ?? "";
    expect(css).toContain("@media (max-width: 1023px)");
    // The single-column rule targets the grid container inside the media block.
    const mobileBlock = css.slice(css.indexOf("@media (max-width: 1023px)"));
    expect(mobileBlock).toContain(".lt-grammar-tile-row");
    expect(mobileBlock).toContain("grid-template-columns: minmax(0, 1fr)");
  });

  it("reflow is pure-CSS: the @media rule is present regardless of matchMedia state", () => {
    // Desktop simulated.
    setMatchMediaMatches(true);
    const desktop = render(<TileRow columns={3}><div>a</div></TileRow>);
    const desktopCss =
      desktop.container.querySelector("style")?.textContent ?? "";
    expect(desktopCss).toContain("@media (max-width: 1023px)");
    cleanup();

    // Mobile simulated — markup + CSS contract are identical (no JS width branch).
    setMatchMediaMatches(false);
    const mobile = render(<TileRow columns={3}><div>a</div></TileRow>);
    const mobileCss =
      mobile.container.querySelector("style")?.textContent ?? "";
    expect(mobileCss).toBe(desktopCss);
  });

  it("honors the columns prop via the --lt-tile-cols custom property", () => {
    const { container } = render(
      <TileRow columns={2}>
        <div>a</div>
        <div>b</div>
      </TileRow>,
    );
    const row = container.querySelector(".lt-grammar-tile-row") as HTMLElement;
    expect(row.style.getPropertyValue("--lt-tile-cols")).toBe("2");
  });
});

describe("Pill", () => {
  it("active + green tone applies the green tone + active class hooks", () => {
    render(
      <Pill active tone="green">
        Board only
      </Pill>,
    );
    const pill = screen.getByRole("button", { name: "Board only" });
    expect(pill.className).toContain("tone-green");
    expect(pill.className).toContain("is-active");
  });

  it("neutral and green tones differ in their class hook", () => {
    const { container: neutral } = render(<Pill tone="neutral">N</Pill>);
    const { container: green } = render(<Pill tone="green">G</Pill>);
    expect(neutral.querySelector(".lt-grammar-pill")?.className).toContain(
      "tone-neutral",
    );
    expect(green.querySelector(".lt-grammar-pill")?.className).toContain(
      "tone-green",
    );
  });

  it("disabled sets the disabled attribute, aria-disabled, and is-disabled class", () => {
    render(
      <Pill disabled tone="green">
        Locked
      </Pill>,
    );
    const pill = screen.getByRole("button", { name: "Locked" });
    expect(pill).toBeDisabled();
    expect(pill).toHaveAttribute("aria-disabled", "true");
    expect(pill.className).toContain("is-disabled");
  });
});

describe("Card", () => {
  it("renders children inside the card hook element", () => {
    const { container } = render(
      <Card>
        <p>card body</p>
      </Card>,
    );
    const card = container.querySelector(".lt-grammar-card");
    expect(card).not.toBeNull();
    expect(screen.getByText("card body")).toBeInTheDocument();
  });
});

describe("SectionHeader", () => {
  it("renders an uppercase heading element with the class hook", () => {
    render(<SectionHeader>Question style</SectionHeader>);
    const header = screen.getByRole("heading", { name: "Question style" });
    expect(header.tagName).toBe("H3");
    expect(header.className).toContain("lt-grammar-section-header");
    expect(header).toHaveStyle({ textTransform: "uppercase" });
  });
});
