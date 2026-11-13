import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import MergeAccountsCard from "./MergeAccountsCard";

const side = (uid: string, over: Record<string, unknown> = {}) => ({
  uid, email: "ki••••@gmail.com", phone: "", providers: ["google.com"], disabled: false,
  plan: { tier: "", passType: "", passEndMs: null }, packs: [], paidOrders: 0, hasStudyData: false, ...over,
});
const getToken = async () => "tok";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("MergeAccountsCard (ADMIN-MERGE-REAL-1)", () => {
  it("is one collapsed button until opened", () => {
    render(<MergeAccountsCard getToken={getToken} />);
    expect(screen.getByTestId("mac-open")).toBeTruthy();
    expect(screen.queryByTestId("mac-keep")).toBeNull();
  });

  it("shows both accounts before the click; the button works only after typing MERGE exactly; sends uids + confirm", async () => {
    const calls: Array<Record<string, unknown>> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_u, init) => {
      const body = JSON.parse(String((init as RequestInit).body));
      calls.push(body);
      return new Response(JSON.stringify(body.preview ? { ok: true, keep: side("keepUid1"), remove: side("removeUid2", { phone: "+91 96•••••555", email: "", providers: ["phone"], packs: ["pack_bundle:all"], plan: { tier: "premium", passType: "till_boards", passEndMs: 1 }, paidOrders: 2, hasStudyData: true }) } : { ok: true, merged: true, replayed: false, removed: true }), { status: 200 });
    });
    render(<MergeAccountsCard getToken={getToken} />);
    fireEvent.click(screen.getByTestId("mac-open"));
    fireEvent.change(screen.getByTestId("mac-keep"), { target: { value: "kid@gmail.com" } });
    fireEvent.change(screen.getByTestId("mac-remove"), { target: { value: "9611111555" } });
    fireEvent.click(screen.getByTestId("mac-review"));
    const rm = await screen.findByTestId("mac-remove-view");
    expect(screen.getByTestId("mac-keep-view").textContent).toContain("ki••••@gmail.com");
    expect(rm.textContent).toContain("+91 96•••••555");
    expect(rm.textContent).toContain("Board Pass (till_boards)");
    expect(rm.textContent).toContain("pack_bundle:all");
    expect(rm.textContent).toContain("Paid orders: 2");
    expect(screen.getByText(/study data is not merged/i)).toBeTruthy();
    const go = screen.getByTestId("mac-go") as HTMLButtonElement;
    expect(go.disabled).toBe(true);
    fireEvent.change(screen.getByTestId("mac-typed"), { target: { value: "merge" } });
    expect(go.disabled).toBe(true);
    fireEvent.change(screen.getByTestId("mac-typed"), { target: { value: "MERGE" } });
    expect(go.disabled).toBe(false);
    fireEvent.click(go);
    expect((await screen.findByTestId("mac-result")).textContent).toContain("Merged.");
    expect(calls).toEqual([{ preview: true, keep: "kid@gmail.com", remove: "9611111555" }, { keepUid: "keepUid1", removeUid: "removeUid2", confirm: "MERGE" }]);
  });

  it("a blocker from the server is shown and there is no way to confirm; a lookup error returns to the form", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true, keep: side("k1"), remove: side("r2"), blocker: "Both accounts hold a Board Pass; not merged automatically" }), { status: 200 }));
    render(<MergeAccountsCard getToken={getToken} />);
    fireEvent.click(screen.getByTestId("mac-open"));
    fireEvent.change(screen.getByTestId("mac-keep"), { target: { value: "a@gmail.com" } });
    fireEvent.change(screen.getByTestId("mac-remove"), { target: { value: "b@gmail.com" } });
    fireEvent.click(screen.getByTestId("mac-review"));
    expect((await screen.findByTestId("mac-blocker")).textContent).toContain("Both accounts hold a Board Pass");
    expect(screen.queryByTestId("mac-go")).toBeNull();
    fireEvent.click(screen.getByText("Back"));
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: false, error: "The account to KEEP was not found" }), { status: 404 }));
    fireEvent.click(screen.getByTestId("mac-review"));
    await waitFor(() => expect(screen.getByTestId("mac-error").textContent).toContain("KEEP was not found"));
  });

  it("a parent-link warning is shown but does not stop the merge (the confirm box is still there)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true, keep: side("k1"), remove: side("r2"), warning: "The account to remove has a parent payment link that is still open." }), { status: 200 }));
    render(<MergeAccountsCard getToken={getToken} />);
    fireEvent.click(screen.getByTestId("mac-open"));
    fireEvent.change(screen.getByTestId("mac-keep"), { target: { value: "a@gmail.com" } });
    fireEvent.change(screen.getByTestId("mac-remove"), { target: { value: "b@gmail.com" } });
    fireEvent.click(screen.getByTestId("mac-review"));
    expect((await screen.findByTestId("mac-warning")).textContent).toContain("parent payment link");
    expect(screen.getByTestId("mac-typed")).toBeTruthy();
  });
});
