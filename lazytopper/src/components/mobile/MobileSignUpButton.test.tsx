/**
 * ACTIVATION-2 B — the compact mobile header "Sign up" (signed-out only): it goes to
 * `/login?redirect=<this page's path + search>`, the same encoding the free check uses.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";

const H = vi.hoisted(() => ({ auth: { user: null as null | Record<string, unknown>, loading: false } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => H.auth }));

import MobileSignUpButton from "./MobileSignUpButton";
import { FREE_CHECK_SIGNIN_PATH } from "../../services/freeCheckClient";

let where = "";
function Probe() {
  const l = useLocation();
  where = `${l.pathname}${l.search}`;
  return <div data-testid="login-probe" />;
}
const mount = (url: string, onBeforeNavigate?: () => void) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/login" element={<Probe />} />
        <Route path="*" element={<MobileSignUpButton onBeforeNavigate={onBeforeNavigate} />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  H.auth = { user: null, loading: false };
  where = "";
});
afterEach(cleanup);

describe("ACTIVATION-2 B · MobileSignUpButton", () => {
  it("signed out on /check-improve → the free check's exact sign-in path", () => {
    const before = vi.fn();
    mount("/check-improve", before);
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(before).toHaveBeenCalledTimes(1);
    expect(where).toBe(FREE_CHECK_SIGNIN_PATH);
  });

  it("keeps the page's search in the redirect (practice hub scope)", () => {
    mount("/practice-hub?subject=Maths&cbq=1");
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(where).toBe(`/login?redirect=${encodeURIComponent("/practice-hub?subject=Maths&cbq=1")}`);
  });

  it("is a 44px tap target", () => {
    mount("/practice-hub");
    expect(screen.getByRole("button", { name: "Sign up" }).className).toContain("lt-msu");
    expect(document.head.textContent + document.body.textContent).toContain("min-height: 44px");
  });

  it("CONTROL: signed in → nothing", () => {
    H.auth = { user: { uid: "u1" }, loading: false };
    mount("/practice-hub");
    expect(screen.queryByRole("button", { name: "Sign up" })).toBeNull();
  });

  it("CONTROL: while auth is still loading → nothing (no flash for a signed-in student)", () => {
    H.auth = { user: null, loading: true };
    mount("/practice-hub");
    expect(screen.queryByRole("button", { name: "Sign up" })).toBeNull();
  });
});
