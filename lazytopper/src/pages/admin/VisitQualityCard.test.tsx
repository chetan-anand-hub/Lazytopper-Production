// QUICK-LEAVE-1 — the admin card: loads on request, sorted rows, >30% highlighted, honest empty state.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import VisitQualityCard, { isOverTarget, pctText, visitQualityUrl } from "./VisitQualityCard";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const row = (source: string, path: string, visits: number, q: number) => ({
  source, path, visits, quickLeaves: q, quickLeavePct: Math.round((q / visits) * 1000) / 10, inAppVisits: 0, inAppQuickLeaves: 0, inAppQuickLeavePct: null,
});
const data = {
  ok: true, days: 7, from: "2030-06-10", to: "2030-06-16",
  rows: [row("google_ads", "/check-improve", 100, 40), row("direct", "/", 50, 10)],
  totals: { visits: 150, quickLeaves: 50, quickLeavePct: 33.3 },
  bySource: [{ source: "google_ads", visits: 100, quickLeaves: 40, quickLeavePct: 40 }, { source: "direct", visits: 50, quickLeaves: 10, quickLeavePct: 20 }],
};

describe("VisitQualityCard", () => {
  it("helpers", () => {
    expect(isOverTarget(30)).toBe(false);
    expect(isOverTarget(30.1)).toBe(true);
    expect(isOverTarget(null)).toBe(false);
    expect(pctText(null)).toBe("—");
    expect(visitQualityUrl(7)).toBe("/api/admin/visit-quality?days=7");
  });
  it("loads on request with the admin token and highlights rows over 30%", async () => {
    const fetchMock = vi.fn(async (..._a: unknown[]) => ({ ok: true, status: 200, json: async () => data }));
    vi.stubGlobal("fetch", fetchMock);
    render(<VisitQualityCard getToken={async () => "tok"} />);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("vq-7d"));
    await waitFor(() => expect(screen.getByTestId("vq-table")).toBeTruthy());
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/admin/visit-quality?days=7");
    const rows = screen.getByTestId("vq-table").querySelectorAll("tbody tr");
    expect(rows[0].getAttribute("data-over")).toBe("1");
    expect(rows[1].getAttribute("data-over")).toBe("0");
    expect(screen.getByTestId("vq-total").textContent).toContain("33.3%");
  });
  it("empty and failed states are honest", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ...data, rows: [], bySource: [] }) })));
    render(<VisitQualityCard getToken={async () => "tok"} />);
    fireEvent.click(screen.getByTestId("vq-1d"));
    await waitFor(() => expect(screen.getByTestId("vq-empty")).toBeTruthy());
    cleanup();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    render(<VisitQualityCard getToken={async () => "tok"} />);
    fireEvent.click(screen.getByTestId("vq-30d"));
    await waitFor(() => expect(screen.getByTestId("vq-failed")).toBeTruthy());
  });
});
