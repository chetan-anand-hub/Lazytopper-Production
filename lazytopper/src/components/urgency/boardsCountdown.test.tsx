import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { boardsCountdownCopy, boardsCountdownParts, daysToBoards, PACK_PREBOARD_LINE, PACK_PREBOARD_LINE_SHORT } from "./boardsCountdown";
import { boardPassFoundingPriceLine } from "../../config/pricing";
import BoardsCountdownStrip from "./BoardsCountdownStrip";

const ist = (s: string) => Date.parse(`${s}+05:30`);
const TAIL = "Practise the real paper pattern now.";

describe("URGENCY-1 boards countdown copy (IST boundaries)", () => {
  it("30 Nov 23:59 IST: pre-boards in December, 78 days", () => {
    expect(boardsCountdownCopy(ist("2026-11-30T23:59:00"))).toBe(`Pre-boards in December. Boards in 78 days. ${TAIL}`);
  });
  it("1 Dec 00:00 IST flips to Pre-boards are on", () => {
    expect(boardsCountdownCopy(ist("2026-12-01T00:00:00"))).toBe(`Pre-boards are on. Boards in 77 days. ${TAIL}`);
  });
  it("31 Dec still Pre-boards are on; 1 Jan drops the pre-board clause", () => {
    expect(boardsCountdownCopy(ist("2026-12-31T23:59:00"))).toBe(`Pre-boards are on. Boards in 47 days. ${TAIL}`);
    expect(boardsCountdownCopy(ist("2027-01-01T00:00:00"))).toBe(`Boards in 46 days. ${TAIL}`);
  });
  it("15 Feb says 1 day; 16 Feb hides", () => {
    expect(boardsCountdownCopy(ist("2027-02-15T09:00:00"))).toBe(`Boards in 1 day. ${TAIL}`);
    expect(boardsCountdownCopy(ist("2027-02-16T00:00:00"))).toBeNull();
    expect(boardsCountdownCopy(ist("2027-03-01T00:00:00"))).toBeNull();
  });
  it("counts on the IST date, not UTC (18:30Z on 30 Nov is already 1 Dec IST)", () => {
    expect(daysToBoards(Date.parse("2026-11-30T18:30:00Z"))).toBe(77);
  });
  it("never claims a pre-board date; tile lines avoid 'answer key' and do not promise packs include marking", () => {
    for (const l of [PACK_PREBOARD_LINE, PACK_PREBOARD_LINE_SHORT]) {
      expect(l).not.toMatch(/answer key/i);
      expect(l).toMatch(/Board Pass/);
    }
  });
  it("the strip renders the live sentence", () => {
    render(<BoardsCountdownStrip />);
    const el = screen.queryByTestId("boards-countdown-strip");
    const expected = boardsCountdownCopy(Date.now());
    if (expected) expect(el?.getAttribute("aria-label")).toBe(expected);
    else expect(el).toBeNull();
  });

  it("PRICE-HOLD-1: the founding-price line (with its 'ends 30 Nov ... then 2,499') no longer exists on any date", () => {
    for (const iso of ["2026-11-11T09:00:00", "2026-11-30T23:59:00", "2026-12-01T00:00:00", "2027-01-10T09:00:00"]) {
      expect(boardPassFoundingPriceLine(ist(iso)), iso).toBeNull();
    }
  });

  it("v2 parts: phase line per phase, 1 DAY label, null from 16 Feb", () => {
    expect(boardsCountdownParts(ist("2026-11-30T23:59:00"))).toMatchObject({ days: 78, label: "DAYS TO BOARDS", phase: "Pre-boards start in December" });
    expect(boardsCountdownParts(ist("2026-12-01T00:00:00"))?.phase).toBe("Pre-boards are on");
    expect(boardsCountdownParts(ist("2027-01-01T00:00:00"))?.phase).toBe("Boards start 16 Feb");
    expect(boardsCountdownParts(ist("2027-02-15T09:00:00"))).toMatchObject({ days: 1, label: "DAY TO BOARDS" });
    expect(boardsCountdownParts(ist("2027-02-16T00:00:00"))).toBeNull();
  });
});
