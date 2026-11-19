import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import QpBoardPassWall from "./QpBoardPassWall";
import { QP_WALL_BODY, QP_WALL_TITLE } from "../../lib/practice/qpWrittenGate";
import { boardPassPriceDisplay } from "../../config/pricing";

describe("GATE-QP-1 · QpBoardPassWall", () => {
  it("says what the Board Pass marks, keeps MCQ scoring, and links to the Board Pass with the real price", async () => {
    render(<MemoryRouter initialEntries={["/practice/10/maths?topic=x"]}><QpBoardPassWall /></MemoryRouter>);
    expect(screen.getByText(QP_WALL_TITLE)).toBeInTheDocument();
    expect(QP_WALL_TITLE).toBe("Getting your practice answers marked step by step comes with the Board Pass");
    expect(screen.getByText(QP_WALL_BODY)).toBeInTheDocument();
    const link = await screen.findByTestId("qp-board-pass-wall-bp");
    expect(link).toHaveAttribute("href", "/board-pass");
    expect(link.textContent).toContain(boardPassPriceDisplay(Date.now()));
  });
  it("from a Test Series analysis link, the Board Pass link keeps the way back to the paper (TS-NAV returnTo)", () => {
    const paper = "/chapter-test/10/maths/real-numbers?series=1";
    const search = `?topic=real-numbers&from=test-series&returnTo=${encodeURIComponent(paper)}`;
    render(<MemoryRouter initialEntries={[`/practice/10/maths${search}`]}><QpBoardPassWall /></MemoryRouter>);
    const href = screen.getByTestId("qp-board-pass-wall-bp").getAttribute("href") ?? "";
    const u = new URL(href, "https://x.test");
    expect(u.pathname).toBe("/board-pass");
    expect(u.searchParams.get("from")).toBe("test-series");
    expect(u.searchParams.get("returnTo")).toBe(paper);
  });
  it("never links off-site: an unsafe returnTo falls back to /test-series", () => {
    render(<MemoryRouter initialEntries={["/practice/10/maths?from=test-series&returnTo=https%3A%2F%2Fevil.test"]}><QpBoardPassWall /></MemoryRouter>);
    const u = new URL(screen.getByTestId("qp-board-pass-wall-bp").getAttribute("href") ?? "", "https://x.test");
    expect(u.origin).toBe("https://x.test");
    expect(u.searchParams.get("returnTo")).toBe("/test-series");
  });
});
