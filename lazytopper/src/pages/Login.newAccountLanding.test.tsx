/**
 * LOGIN-HOME-1 (owner, 24 Oct 2026; supersedes ACTIVATION-2 C) — a NEW account whose target is the
 * default Home or the Me page lands on HOME (Byte offers "Check one answer" there); any other
 * target wins; a returning login goes back where it came from, /me included. The "new" signal is the one the sign_up event uses
 * (AuthContext: trackSignUpIfNew's isNewUser gate, and the email create call).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import type { AuthUser } from "../context/AuthContext";

const authState: { user: AuthUser | null } = { user: null };

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: authState.user,
    signInWithGoogle: vi.fn(async () => {}),
    signInWithEmailPassword: vi.fn(async () => {}),
    signUpWithEmailPassword: vi.fn(async () => {}),
    sendPasswordReset: vi.fn(async () => {}),
    initPhoneRecaptcha: vi.fn(async () => {}),
    sendPhoneOtp: vi.fn(async () => {}),
    verifyPhoneOtp: vi.fn(async () => {}),
    logout: vi.fn(async () => {}),
  }),
}));
vi.mock("../services/referralService", () => ({ creditPendingReferral: vi.fn() }));
// The door's UX telemetry stamps the wall clock; it is not what this file pins.
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));
vi.mock("firebase/auth", () => ({
  sendEmailVerification: vi.fn(async () => {}),
  reload: vi.fn(async () => {}),
  verifyBeforeUpdateEmail: vi.fn(async () => {}),
  reauthenticateWithCredential: vi.fn(async () => {}),
  EmailAuthProvider: { credential: vi.fn(() => ({})) },
  getAdditionalUserInfo: (c: { isNew?: boolean }) => ({ isNewUser: !!c?.isNew }),
}));

import Login from "./Login";
import {
  NEW_ACCOUNT_LANDING_PATH,
  NEW_ACCOUNT_LANDING_TTL_MS,
  markNewAccountLanding,
  isMeTarget,
  isBrowseTarget,
  markNewAccountLandingIfNew,
  takeNewAccountLanding,
} from "../services/newAccountLanding";

const GOOGLE_USER = {
  uid: "uid-new",
  email: "new@example.com",
  phoneNumber: null,
  displayName: "Ananya",
  providerIds: ["google.com"],
  emailVerified: true,
} as AuthUser;

/** PACKS-RETURN-1 — prints the full landing URL (path + query + hash), so a dropped `#cbq` / `#my-packs` shows. */
function Landed({ name }: { name: string }) {
  const l = useLocation();
  return <div>{`LANDED ON ${name} ${l.pathname}${l.search}${l.hash}`}</div>;
}

function renderDoorAt(entry: string | { pathname: string; search?: string; state: unknown }) {
  return render(
    <MemoryRouter initialEntries={[entry as never]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/check-improve" element={<div>LANDED ON CHECK AND IMPROVE</div>} />
        <Route path="/practice-hub" element={<div>LANDED ON PRACTICE HUB</div>} />
        <Route path="/pricing" element={<div>LANDED ON PRICING</div>} />
        <Route path="/mex" element={<div>LANDED ON MEX</div>} />
        <Route path="/me" element={<div>LANDED ON ME</div>} />
        <Route path="/profile" element={<div>LANDED ON PROFILE</div>} />
        <Route path="/practice/:grade/:subject" element={<div>LANDED ON PRACTICE SET</div>} />
        <Route path="/packs" element={<Landed name="PACKS" />} />
        <Route path="/cbq-class-10" element={<Landed name="CBQ" />} />
        <Route path="/cbq-class-10/:chapterSlug" element={<Landed name="CBQ" />} />
        <Route path="/highly-probable/*" element={<div>LANDED ON HPQ</div>} />
        <Route path="/" element={<div>LANDED ON HOME</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  authState.user = null;
  localStorage.clear();
  takeNewAccountLanding(); // no mark carried between tests
});
afterEach(cleanup);

describe("LOGIN-HOME-1 · where a sign-in lands", () => {
  it("the new-account landing is Home", () => {
    expect(NEW_ACCOUNT_LANDING_PATH).toBe("/");
  });

  it.each([
    ["no target", "/login"],
    ["redirect=/", "/login?reason=login&redirect=%2F"],
    ["redirect=/browse", "/login?redirect=%2Fbrowse"],
    ["redirect=/me", "/login?redirect=%2Fme"],
    ["redirect=/me?x=1", "/login?redirect=%2Fme%3Fx%3D1"],
    ["redirect=/profile", "/login?redirect=%2Fprofile"],
  ])("★★ a NEW account with %s lands on Home", async (_n, entry) => {
    markNewAccountLandingIfNew({ isNew: true } as never);
    authState.user = GOOGLE_USER;
    renderDoorAt(entry);
    expect(await screen.findByText("LANDED ON HOME")).toBeTruthy();
  });

  it("★★ a NEW account whose state.from is /me?x=1 (RequireAuth keeps the query) lands on Home", async () => {
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt({ pathname: "/login", state: { from: "/me?x=1" } });
    expect(await screen.findByText("LANDED ON HOME")).toBeTruthy();
  });

  it("★★ a NEW account with a practice-set target lands THERE (no work lost)", async () => {
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?redirect=%2Fpractice%2F10%2FMaths%3Ftopic%3Dx");
    expect(await screen.findByText("LANDED ON PRACTICE SET")).toBeTruthy();
  });

  it("★★ an explicit ?redirect= to another page wins over the new-account landing", async () => {
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?redirect=%2Fpractice-hub");
    expect(await screen.findByText("LANDED ON PRACTICE HUB")).toBeTruthy();
  });

  it("★★ a NEW account with /pricing?buy=... keeps /pricing; a literal /mex keeps /mex (not read as /me)", async () => {
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?redirect=%2Fpricing%3Fbuy%3Dpack_cbq%26t%3Dmaths");
    expect(await screen.findByText("LANDED ON PRICING")).toBeTruthy();
    cleanup();
    // OFFERS-V2 A2: the one-tap Board Pass link is a purchase intent too - a brand-new account that signs in from it keeps /pricing.
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?redirect=%2Fpricing%3Fbuy%3Dboard_pass");
    expect(await screen.findByText("LANDED ON PRICING")).toBeTruthy();
    cleanup();
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?redirect=%2Fmex");
    expect(await screen.findByText("LANDED ON MEX")).toBeTruthy();
  });

  it("★ a NEW account coming from the free check (/check-improve) goes back to it", async () => {
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?redirect=%2Fcheck-improve");
    expect(await screen.findByText("LANDED ON CHECK AND IMPROVE")).toBeTruthy();
  });

  it("★ state.from wins too", async () => {
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt({ pathname: "/login", state: { from: "/practice-hub" } });
    expect(await screen.findByText("LANDED ON PRACTICE HUB")).toBeTruthy();
  });

  it("★★ a RETURNING login with /me returns to /me", async () => {
    markNewAccountLandingIfNew({ isNew: false } as never);
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?redirect=%2Fme");
    expect(await screen.findByText("LANDED ON ME")).toBeTruthy();
  });

  it("★★ a RETURNING login with state.from /me?x=1 returns to /me", async () => {
    authState.user = GOOGLE_USER;
    renderDoorAt({ pathname: "/login", state: { from: "/me?x=1" } });
    expect(await screen.findByText("LANDED ON ME")).toBeTruthy();
  });

  it("★★ a RETURNING login with no target lands on home; so does redirect=%2F", async () => {
    markNewAccountLandingIfNew({ isNew: false } as never);
    authState.user = GOOGLE_USER;
    renderDoorAt("/login");
    expect(await screen.findByText("LANDED ON HOME")).toBeTruthy();
    cleanup();
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?reason=login&redirect=%2F");
    expect(await screen.findByText("LANDED ON HOME")).toBeTruthy();
  });

  it("★★ an external ?redirect= is still rejected (a new account lands on Home, a returning one too)", async () => {
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?redirect=https%3A%2F%2Fevil.example%2Fme");
    expect(await screen.findByText("LANDED ON HOME")).toBeTruthy();
    cleanup();
    takeNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?redirect=%2F%2Fevil.example");
    expect(await screen.findByText("LANDED ON HOME")).toBeTruthy();
  });
});

describe("ACT-FIRST-1 · a new account from /pricing or Highly Probable lands on Home (no purchase intent)", () => {
  it.each([
    ["/pricing", "/login?reason=start-trial&redirect=%2Fpricing"],
    ["/pricing + utm", "/login?redirect=%2Fpricing%3Futm_source%3Dyt"],
    ["/highly-probable", "/login?redirect=%2Fhighly-probable"],
    ["/highly-probable/maths/x", "/login?redirect=%2Fhighly-probable%2Fmaths%2Fx"],
  ])("a NEW account from %s lands on Home", async (_n, entry) => {
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt(entry);
    expect(await screen.findByText("LANDED ON HOME")).toBeTruthy();
  });

  it("a RETURNING login from /pricing goes back to /pricing (owner ruling 24 Oct)", async () => {
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?redirect=%2Fpricing");
    expect(await screen.findByText("LANDED ON PRICING")).toBeTruthy();
  });

  it("isBrowseTarget keeps every purchase intent and unrelated pages", () => {
    for (const t of ["/pricing", "/pricing/", "/pricing#cbq", "/pricing?utm_source=x", "/highly-probable", "/highly-probable/maths/abc", "/PRICING"]) expect(isBrowseTarget(t), t).toBe(true);
    for (const t of ["/pricing?buy=pack_cbq", "/pricing?buy=board_pass", "/packs?buy=pack_bundle&t=maths", "/packs?pack=cbq", "/packs?chapter=real-numbers", "/packs?mock=Maths", "/packs?view=sample", "/pricingx", "/packs-old", "/highly-probable-x", "/check-improve", "", null, undefined]) expect(isBrowseTarget(t), String(t)).toBe(false);
  });
});

describe("PACKS-RETURN-1 · a new account from /packs or the CBQ pages goes BACK there (owner ruling 3 Nov 2026)", () => {
  it.each([
    ["/packs", "/login?redirect=%2Fpacks", "LANDED ON PACKS /packs"],
    ["/packs#cbq (hash kept)", "/login?redirect=%2Fpacks%23cbq", "LANDED ON PACKS /packs#cbq"],
    ["/packs?utm_source=google", "/login?redirect=%2Fpacks%3Futm_source%3Dgoogle%26utm_medium%3Dcpc", "LANDED ON PACKS /packs?utm_source=google&utm_medium=cpc"],
    ["/packs?buy=pack_cbq&t=maths (intent, unchanged)", "/login?redirect=%2Fpacks%3Fbuy%3Dpack_cbq%26t%3Dmaths", "LANDED ON PACKS /packs?buy=pack_cbq&t=maths"],
    ["/cbq-class-10", "/login?redirect=%2Fcbq-class-10", "LANDED ON CBQ /cbq-class-10"],
    ["/cbq-class-10/electricity", "/login?redirect=%2Fcbq-class-10%2Felectricity", "LANDED ON CBQ /cbq-class-10/electricity"],
  ])("a NEW account from %s lands back there", async (_n, entry, landed) => {
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt(entry);
    expect(await screen.findByText(landed)).toBeTruthy();
  });

  it("★★ pay-by-phone, then 'Sign in with this number' (a NEW phone account) lands on /packs#my-packs, not Home", async () => {
    markNewAccountLanding();
    authState.user = GOOGLE_USER; // phoneNumber null: the claim import is not this file's subject (Login.guestPay.test.tsx pins it)
    renderDoorAt({ pathname: "/login", search: "?redirect=%2Fpacks%23my-packs", state: { guestPayPhone: "9876543948" } });
    expect(await screen.findByText("LANDED ON PACKS /packs#my-packs")).toBeTruthy();
  });

  it("★ the same from /pricing's embedded shop (/pricing#my-packs) keeps the buyer on Pricing's My packs", async () => {
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt({ pathname: "/login", search: "?redirect=%2Fpricing%23my-packs", state: { guestPayPhone: "9876543948" } });
    expect(await screen.findByText("LANDED ON PRICING")).toBeTruthy();
  });

  it("a RETURNING login from /packs#cbq returns there too", async () => {
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?redirect=%2Fpacks%23cbq");
    expect(await screen.findByText("LANDED ON PACKS /packs#cbq")).toBeTruthy();
  });

  it("Home + Byte stays the landing for every other no-intent sign-up ('/', /browse, /me, /pricing, /highly-probable)", async () => {
    for (const entry of ["/login?redirect=%2F", "/login?redirect=%2Fbrowse", "/login?redirect=%2Fme", "/login?redirect=%2Fpricing", "/login?redirect=%2Fhighly-probable"]) {
      markNewAccountLanding();
      authState.user = GOOGLE_USER;
      renderDoorAt(entry);
      expect(await screen.findByText("LANDED ON HOME"), entry).toBeTruthy();
      cleanup();
    }
  });

  it("an external target is still rejected (new account lands on Home)", async () => {
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?redirect=https%3A%2F%2Fevil.example%2Fpacks%23my-packs");
    expect(await screen.findByText("LANDED ON HOME")).toBeTruthy();
    cleanup();
    markNewAccountLanding();
    authState.user = GOOGLE_USER;
    renderDoorAt("/login?redirect=%2F%2Fevil.example%2Fpacks");
    expect(await screen.findByText("LANDED ON HOME")).toBeTruthy();
  });

  it("isBrowseTarget: /packs (any query / hash), the CBQ pages and any #my-packs are never browse targets", () => {
    for (const t of ["/packs", "/packs/", "/PACKS", "/packs#cbq", "/packs#my-packs", "/packs?utm_source=x", "/cbq-class-10", "/cbq-class-10/electricity", "/pricing#my-packs", "/pricing?utm_source=x#my-packs"]) {
      expect(isBrowseTarget(t), t).toBe(false);
    }
  });
});

describe("LOGIN-HOME-1 · the Me-target matcher", () => {
  it("matches /me and /profile with or without query / hash / trailing slash, and nothing else", () => {
    for (const t of ["/me", "/me?x=1", "/me#a", "/me/", "/ME", "/Me?x=1", "/profile", "/Profile", "/profile?tab=2"]) expect(isMeTarget(t), t).toBe(true);
    for (const t of ["/menu", "/mex", "/me/settings", "/profile-x", "/practice/me", "", null, undefined]) expect(isMeTarget(t), String(t)).toBe(false);
  });
});

describe("ACTIVATION-2 C · the new-account mark", () => {
  it("is taken once", () => {
    markNewAccountLanding();
    expect(takeNewAccountLanding()).toBe(true);
    expect(takeNewAccountLanding()).toBe(false);
  });

  it("expires, so a stale mark never redirects a later login", () => {
    const t0 = 1_000_000;
    markNewAccountLanding(t0);
    expect(takeNewAccountLanding(t0 + NEW_ACCOUNT_LANDING_TTL_MS + 1)).toBe(false);
  });

  it("a credential the SDK cannot read never marks (and never throws)", () => {
    expect(() => markNewAccountLandingIfNew(null as never)).not.toThrow();
    expect(takeNewAccountLanding()).toBe(false);
  });
});
