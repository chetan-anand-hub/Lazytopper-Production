// ADMIN-EXTEND-1 — the control: review -> one honest confirmation line -> one request,
// even on a double-click; the result shown is the SERVER's end.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ExtendPremiumControl from "./ExtendPremiumControl";
import { formatIstDate } from "./studentsAdminModel";

const DAY = 24 * 60 * 60 * 1000;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ExtendPremiumControl", () => {
  it("confirms with student, days and end; a double-click on Confirm sends ONE request", async () => {
    const trialEnd = Date.now() + 3 * DAY;
    const serverEnd = new Date(trialEnd + 7 * DAY).toISOString();
    let resolveFetch: (v: unknown) => void = () => {};
    const fetchMock = vi.fn(
      (..._args: unknown[]) =>
        new Promise((r) => {
          resolveFetch = r;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const onExtended = vi.fn();
    render(
      <ExtendPremiumControl
        uid="u1"
        studentLabel="ri•••@gmail.com (uid u1)"
        plan={{ kind: "trial", trialEndsAtMs: trialEnd, daysLeft: 3 }}
        getToken={async () => "tok"}
        onExtended={onExtended}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    const line = screen.getByTestId("sa-extend-confirm").textContent || "";
    expect(line).toContain("ri•••@gmail.com (uid u1)");
    expect(line).toContain("7 more days");
    expect(line).toContain(formatIstDate(trialEnd + 7 * DAY));
    expect(line).toContain("No charge");

    const confirm = screen.getByRole("button", { name: "Confirm" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    resolveFetch({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, replayed: false, extension: { uid: "u1", days: 7, newEnd: serverEnd, pricePaidInr: 0, isSale: false } }),
    });
    const done = await screen.findByTestId("sa-extend-done");
    expect(done.textContent).toContain(formatIstDate(Date.parse(serverEnd)));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onExtended).toHaveBeenCalledTimes(1);
  });

  it("Premium with no end date shows why and offers no button", () => {
    render(
      <ExtendPremiumControl uid="u1" studentLabel="s" plan={{ kind: "premium", premiumUntilMs: null }} getToken={async () => "tok"} onExtended={() => {}} />,
    );
    expect(screen.getByText(/nothing to extend/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Review" })).toBeNull();
  });

  it("days outside 1-30 cannot be reviewed", () => {
    render(<ExtendPremiumControl uid="u1" studentLabel="s" plan={{ kind: "basic" }} getToken={async () => "tok"} onExtended={() => {}} />);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "31" } });
    expect((screen.getByRole("button", { name: "Review" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
