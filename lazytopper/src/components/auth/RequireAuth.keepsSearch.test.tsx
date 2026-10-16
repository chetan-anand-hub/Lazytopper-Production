import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

// TUTOR-FIX-2 T12 (3) — a signed-out visitor bounced to /login by RequireAuth / RequirePremium
// must come back to the SAME deep link: pathname AND query. Before this, state.from carried the
// pathname only, so every /tutor deep link lost q / from / source / returnTo at the door.
// A query that would make the target fail Login's same-origin guard is dropped (pathname only),
// so the gate never turns a working redirect into a fall-back-to-home.

const { authState } = vi.hoisted(() => ({ authState: { user: null as null | { uid: string } } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: authState.user, loading: false }) }));
vi.mock("../UpgradeModal", () => ({ UpgradeModal: () => null }));
vi.mock("../../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/subscriptionService")>();
  return { ...actual, activateTrial: vi.fn(), hydrateSubscriptionFromCloud: vi.fn(async () => null) };
});

import { RequireAuth, RequirePremium, loginFromFor } from "./RequireAuth";

function LoginProbe() {
  const l = useLocation();
  return <div data-testid="login-from">{String((l.state as { from?: string } | null)?.from ?? "")}</div>;
}

function at(url: string, gate: "auth" | "premium") {
  const Gate = gate === "auth" ? RequireAuth : RequirePremium;
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/login" element={<LoginProbe />} />
        <Route path="*" element={<Gate><div>PROTECTED</div></Gate>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe("RequireAuth / RequirePremium keep the query on the way to /login (TUTOR-FIX-2 T12)", () => {
  it.each(["auth", "premium"] as const)("★★ %s: a /tutor deep link keeps pathname + search in state.from", async (gate) => {
    at("/tutor/10/Maths/real-numbers?source=scorecard&q=q-7", gate);
    expect((await screen.findByTestId("login-from")).textContent).toBe(
      "/tutor/10/Maths/real-numbers?source=scorecard&q=q-7",
    );
  });

  it("★★ any protected deep link keeps its query (not only /tutor)", async () => {
    at("/me/progress?tab=mistakes&subject=Science", "auth");
    expect((await screen.findByTestId("login-from")).textContent).toBe("/me/progress?tab=mistakes&subject=Science");
  });

  it("no query: state.from is the pathname, byte for byte as before", async () => {
    at("/tutor/10/Maths/real-numbers", "premium");
    expect((await screen.findByTestId("login-from")).textContent).toBe("/tutor/10/Maths/real-numbers");
  });

  it("★ a query Login would refuse (a scheme-like token) falls back to the pathname, never to nothing", () => {
    expect(loginFromFor({ pathname: "/tutor/10/Maths/real-numbers", search: "?returnTo=javascript:alert(1)" })).toBe(
      "/tutor/10/Maths/real-numbers",
    );
    expect(loginFromFor({ pathname: "/tutor/10/Maths/real-numbers", search: "?returnTo=%2Fpractice%2F10%2Fmaths" })).toBe(
      "/tutor/10/Maths/real-numbers?returnTo=%2Fpractice%2F10%2Fmaths",
    );
  });
});
