import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Card } from "./Card";

afterEach(cleanup);

/**
 * First real render test on the Vitest infra (#160). TileRow, Pill and SectionHeader
 * (and their tests) were retired and deleted by FRICTION-FIX-1 PR-1 — nothing live
 * imported them. Card is still live.
 */

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
