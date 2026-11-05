import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/** NAV-PRICING-1 — Me / Progress is the FIRST row of the phone avatar menu; the "new" dot is honest (a graded paper not yet seen on Me). */
const authState = vi.hoisted(() => ({ user: { uid: "dot-uid", displayName: "Asha", email: "a@x.com" } as null | { uid: string; displayName?: string; email?: string } }));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: authState.user, logout: vi.fn(async () => {}) }),
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({ tier: "free", isTrialActive: false, isPremium: false, isTrialExpired: false, daysLeftInTrial: 0 }),
}));
const records = vi.hoisted(() => ({ list: [] as { gradedAt: number }[] }));
vi.mock("../../services/sessionRecords", () => ({ loadLocalSessionRecords: () => records.list }));

import { MobileAccountMenu } from "./MobileAccountMenu";

beforeEach(() => {
  records.list = [];
  window.localStorage.clear();
});
afterEach(cleanup);

const mount = (path = "/browse") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <MobileAccountMenu />
    </MemoryRouter>,
  );

describe("MobileAccountMenu — Me / Progress first", () => {
  it("the first menu row is Me / Progress", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
    const items = screen.getAllByRole("menuitem");
    expect(items[0]).toHaveTextContent("Me / Progress");
  });

  it("no graded record -> no dot (nothing is invented)", () => {
    mount();
    expect(screen.queryByTestId("me-new-dot")).toBeNull();
  });

  it("a graded paper newer than the last Me visit -> dot and 'New' on the row", () => {
    records.list = [{ gradedAt: 2000 }];
    window.localStorage.setItem("lazytopper.meSeenGradedAt.dot-uid", "1000");
    mount();
    expect(screen.getByTestId("me-new-dot")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
    expect(screen.getByTestId("menu-me-progress")).toHaveTextContent("New");
  });

  it("no stored key (first load after deploy): no dot, and the current newest is stored silently", () => {
    records.list = [{ gradedAt: 2000 }];
    mount();
    expect(screen.queryByTestId("me-new-dot")).toBeNull();
    expect(window.localStorage.getItem("lazytopper.meSeenGradedAt.dot-uid")).toBe("2000");
  });

  it("already seen -> no dot", () => {
    records.list = [{ gradedAt: 2000 }];
    window.localStorage.setItem("lazytopper.meSeenGradedAt.dot-uid", "2000");
    mount();
    expect(screen.queryByTestId("me-new-dot")).toBeNull();
  });

  it("being on /me marks it seen and clears the dot", () => {
    records.list = [{ gradedAt: 5000 }];
    mount("/me");
    expect(screen.queryByTestId("me-new-dot")).toBeNull();
    expect(window.localStorage.getItem("lazytopper.meSeenGradedAt.dot-uid")).toBe("5000");
  });
});
