import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import KeyDisputesCard from "./KeyDisputesCard";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const item = (over = {}) => ({
  questionId: "CHEM-EXMPLR-1-MCQ-002", source: "NCERT Exemplar Ex 1.1 Q2", fileHint: "CHEM-EXMPLR-1-MCQ",
  counts: { mismatch: 2, opinion: 1, challenge: 3 }, total: 6, lastAtMs: 1760000000000, firstAtMs: 1750000000000, resolved: false,
  latest: [{ kind: "mismatch", reason: "steps say B, key C", studentChallenge: "key is wrong", atMs: 1760000000000 }], ...over,
});

describe("KeyDisputesCard", () => {
  it("loads on request and renders counts by kind, source, file hint and latest reasons", async () => {
    const fetchMock = vi.fn(async (..._a: unknown[]) => ({ ok: true, status: 200, json: async () => ({ ok: true, items: [item()] }) }));
    vi.stubGlobal("fetch", fetchMock);
    render(<KeyDisputesCard getToken={async () => "tok"} />);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("kd-load"));
    await waitFor(() => expect(screen.getByTestId("kd-list")).toBeTruthy());
    expect(screen.getByTestId("kd-counts-CHEM-EXMPLR-1-MCQ-002").textContent).toBe("mismatch 2 · opinion 1 · challenge 3");
    expect(screen.getByText(/NCERT Exemplar Ex 1.1 Q2/)).toBeTruthy();
    expect(screen.getByText(/steps say B, key C/)).toBeTruthy();
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ headers: { Authorization: "Bearer tok" } });
  });
  it("an empty queue says so; a failed read says so (never 'none')", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, items: [] }) })));
    const r = render(<KeyDisputesCard getToken={async () => "t"} />);
    fireEvent.click(screen.getByTestId("kd-load"));
    await waitFor(() => expect(screen.getByTestId("kd-empty")).toBeTruthy());
    r.unmount();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    render(<KeyDisputesCard getToken={async () => "t"} />);
    fireEvent.click(screen.getByTestId("kd-load"));
    await waitFor(() => expect(screen.getByTestId("kd-failed")).toBeTruthy());
  });
});
