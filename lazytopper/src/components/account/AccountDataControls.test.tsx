/**
 * AccountDataControls — the confirmation flow guard.
 *
 * ★★ THE CLAIM UNDER TEST: a minor cannot delete their account by accident, is told in
 * plain words what happens, is told what we CANNOT delete, and is never shown a success
 * message over a run that did not succeed.
 *
 * ★ Mounted inside the app's always-present outer router (MemoryRouter), because the
 * component navigates after erasure. A test that renders it bare would pass while the
 * real page threw.
 */

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import AccountDataControls from "./AccountDataControls";
import { THIRD_PARTY_RETENTION_DISCLOSURE } from "../../services/accountDataService";

/* ── the auth edge ── */

const logout = vi.fn(async () => {});
const navigateSpy = vi.fn();

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "uid-student-1" }, loading: false, logout }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateSpy };
});

let currentUser: { uid: string; getIdToken: () => Promise<string | null> } | null = null;
vi.mock("../../services/firebaseClient", () => ({
  get authClient() {
    return { currentUser };
  },
}));

function jsonResponse(status: number, body: unknown) {
  return {
    status,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

/**
 * ★ SEEDED FROM THE OLD SHAPE, NOT FROM CLEAN — the same rule the service suite follows.
 * A student who has used the product for months carries these; a clean-state test would
 * not notice a sweep that only handles freshly-written keys.
 */
function seedExistingStudentState() {
  localStorage.setItem("lazytopper.mistakeLogs.v1", JSON.stringify([{ id: "m1" }]));
  localStorage.setItem("lazytopper.progress.snapshot.v1", JSON.stringify({ maths: 42 }));
  localStorage.setItem("lazytopper.profile", JSON.stringify({ name: "pre-version shape" }));
  localStorage.setItem("lazytopper.streak", JSON.stringify({ count: 9 }));
  localStorage.setItem("lazyTopper.vibeMode", "beast"); // the legacy capital-T key
  localStorage.setItem("otherapp.session", "keep-me"); // ★ CONTROL
}

function renderControls() {
  return render(
    <MemoryRouter>
      <AccountDataControls />
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  logout.mockClear();
  navigateSpy.mockClear();
  currentUser = { uid: "uid-student-1", getIdToken: async () => "token-abc" };
  seedExistingStudentState();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/* ══════════════════════════════════════════════════════════════════════════════
   1 · IT CANNOT BE COMPLETED BY ACCIDENT
   ══════════════════════════════════════════════════════════════════════════════ */

describe("1 · the flow cannot be completed accidentally", () => {
  it("the resting page has no armed delete — the destructive control opens a confirmation first", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn(async () => jsonResponse(200, { ok: true, remaining: [] }));
    vi.stubGlobal("fetch", fetchSpy);

    renderControls();

    // one tap on the page-level button must NOT delete anything
    await user.click(screen.getByRole("button", { name: /delete my account/i }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(localStorage.getItem("lazytopper.mistakeLogs.v1")).toBeTruthy();
  });

  it("★ the confirm button is DISABLED until the exact phrase is typed", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn(async () => jsonResponse(200, { ok: true, remaining: [] }));
    vi.stubGlobal("fetch", fetchSpy);

    renderControls();
    await user.click(screen.getByRole("button", { name: /delete my account/i }));

    const dialog = screen.getByRole("dialog");
    const confirmBtn = within(dialog).getByRole("button", { name: /delete my account/i });

    expect((confirmBtn as HTMLButtonElement).disabled).toBe(true);

    // a stray tap while disabled does nothing
    await user.click(confirmBtn);
    expect(fetchSpy).not.toHaveBeenCalled();

    // a WRONG phrase does not arm it either
    await user.type(within(dialog).getByLabelText(/type delete to confirm/i), "delet");
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(true);
    await user.click(confirmBtn);
    expect(fetchSpy).not.toHaveBeenCalled();

    // the exact phrase arms it
    await user.type(within(dialog).getByLabelText(/type delete to confirm/i), "e");
    await waitFor(() => expect((confirmBtn as HTMLButtonElement).disabled).toBe(false));
  });

  it("★ CONTROL: once the phrase IS typed, the same click DOES fire the erasure", async () => {
    // Without this the test above would pass on a permanently-dead button.
    const user = userEvent.setup();
    const fetchSpy = vi.fn(async () => jsonResponse(200, { ok: true, remaining: [] }));
    vi.stubGlobal("fetch", fetchSpy);

    renderControls();
    await user.click(screen.getByRole("button", { name: /delete my account/i }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/type delete to confirm/i), "DELETE");
    await user.click(within(dialog).getByRole("button", { name: /delete my account/i }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    const [url] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/account/erase");
  });
});

/* ══════════════════════════════════════════════════════════════════════════════
   2 · A CANCELLED FLOW DELETES NOTHING
   ══════════════════════════════════════════════════════════════════════════════ */

describe("2 · a cancelled flow deletes nothing", () => {
  it("cancelling after typing the phrase leaves every key and calls no route", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn(async () => jsonResponse(200, { ok: true, remaining: [] }));
    vi.stubGlobal("fetch", fetchSpy);

    renderControls();
    await user.click(screen.getByRole("button", { name: /delete my account/i }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/type delete to confirm/i), "DELETE");
    await user.click(within(dialog).getByRole("button", { name: /cancel/i }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
    expect(localStorage.getItem("lazytopper.mistakeLogs.v1")).toBeTruthy();
    expect(localStorage.getItem("lazytopper.progress.snapshot.v1")).toBeTruthy();
    expect(localStorage.getItem("lazyTopper.vibeMode")).toBe("beast");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("★ re-opening after a cancel starts from an EMPTY box — the typed phrase does not persist", async () => {
    const user = userEvent.setup();
    renderControls();

    await user.click(screen.getByRole("button", { name: /delete my account/i }));
    await user.type(
      within(screen.getByRole("dialog")).getByLabelText(/type delete to confirm/i),
      "DELETE"
    );
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /cancel/i }));
    await user.click(screen.getByRole("button", { name: /delete my account/i }));

    const input = within(screen.getByRole("dialog")).getByLabelText(
      /type delete to confirm/i
    ) as HTMLInputElement;
    expect(input.value).toBe("");
  });
});

/* ══════════════════════════════════════════════════════════════════════════════
   3 · THE DISCLOSURE — pinned so nobody can soften it
   ══════════════════════════════════════════════════════════════════════════════ */

describe("3 · the third-party retention disclosure", () => {
  it("★★ appears on the confirmation screen BEFORE the student commits, verbatim", async () => {
    const user = userEvent.setup();
    renderControls();
    await user.click(screen.getByRole("button", { name: /delete my account/i }));

    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain(THIRD_PARTY_RETENTION_DISCLOSURE);
  });

  it("★★ COPY ASSERTION — the specific facts a softened rewrite would drop", async () => {
    // Each of these is a separate promise to the student. A gentler rewrite that keeps
    // the paragraph but drops any one of them fails here.
    const user = userEvent.setup();
    renderControls();
    await user.click(screen.getByRole("button", { name: /delete my account/i }));
    const text = screen.getByRole("dialog").textContent ?? "";

    expect(text, "must NAME the third party").toMatch(/Google/);
    expect(text, "must NAME the service").toMatch(/Gemini/i);
    expect(text, "must say the data LEFT the product").toMatch(/was sent to/i);
    expect(text, "must say deletion does NOT reach it").toMatch(/does not reach them/i);
    expect(text, "must admit WE cannot delete it").toMatch(/we cannot delete them/i);
    expect(text, "must say whose rules govern it").toMatch(/Google's rules, not ours/i);
  });

  it("★ the disclosure is NOT rendered as an error — it is a true fact, not a malfunction", async () => {
    // SCREENSHOT-DRIVEN. Copy that passes every wording assertion can still render as a
    // block of alarm-red, which reads to a student as "something broke".
    const user = userEvent.setup();
    renderControls();
    await user.click(screen.getByRole("button", { name: /delete my account/i }));

    const dialog = screen.getByRole("dialog");
    const host = Array.from(dialog.querySelectorAll("p")).find((p) =>
      (p.textContent ?? "").includes("Google's Gemini AI")
    );
    expect(host, "the disclosure paragraph was not found").toBeTruthy();
    expect(host!.className).toContain("lt-acct__disclosurebody");
    expect(host!.className).not.toContain("error");
    expect(host!.closest('[role="alert"]')).toBeNull();
  });

  it("states in plain words what gets deleted", async () => {
    const user = userEvent.setup();
    renderControls();
    await user.click(screen.getByRole("button", { name: /delete my account/i }));
    const text = screen.getByRole("dialog").textContent ?? "";

    expect(text).toMatch(/cannot be undone/i);
    expect(text).toMatch(/email, phone number and name/i);
    expect(text).toMatch(/answers you typed/i);
    expect(text).toMatch(/photos of handwritten answers/i);
    expect(text).toMatch(/saved on this device/i);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════
   4 · A COMPLETED ERASURE — device cleared, signed out, no re-entry
   ══════════════════════════════════════════════════════════════════════════════ */

describe("4 · a completed erasure", () => {
  async function completeErasure(response: Response) {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async () => response));
    renderControls();
    await user.click(screen.getByRole("button", { name: /delete my account/i }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/type delete to confirm/i), "DELETE");
    await user.click(within(dialog).getByRole("button", { name: /delete my account/i }));
  }

  it("★ clears the device — including the legacy capital-T key — and SPARES foreign keys", async () => {
    await completeErasure(jsonResponse(200, { ok: true, remaining: [] }));

    await waitFor(() => expect(localStorage.getItem("lazytopper.mistakeLogs.v1")).toBeNull());
    expect(localStorage.getItem("lazytopper.progress.snapshot.v1")).toBeNull();
    expect(localStorage.getItem("lazytopper.profile")).toBeNull();
    expect(localStorage.getItem("lazytopper.streak")).toBeNull();
    expect(localStorage.getItem("lazyTopper.vibeMode")).toBeNull();
    // ★ CONTROL — a clear-everything implementation fails this line
    expect(localStorage.getItem("otherapp.session")).toBe("keep-me");
  });

  it("★ signs the student out and sends them away — no re-entry into a half-deleted account", async () => {
    await completeErasure(jsonResponse(200, { ok: true, remaining: [] }));

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(navigateSpy).toHaveBeenCalledWith("/login", { replace: true });
  });

  it("★ a 207 PARTIAL run never says 'deleted' — it says partly, and lists what is left", async () => {
    await completeErasure(
      jsonResponse(207, {
        ok: false,
        remaining: [{ id: "subscriptions", status: "failed", reason: "permission denied" }],
      })
    );

    await waitFor(() => expect(screen.getByRole("status")).toBeTruthy());
    const receipt = screen.getByRole("status").textContent ?? "";
    expect(receipt).toMatch(/partly deleted/i);
    expect(receipt).not.toMatch(/your account has been deleted/i);
    expect(receipt).toMatch(/subscriptions/);
    expect(receipt).toMatch(/permission denied/);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════
   5 · A FAILED RUN CLAIMS NOTHING AND DESTROYS NOTHING
   ══════════════════════════════════════════════════════════════════════════════ */

describe("5 · a failed or undeployed run", () => {
  it("★★ an UNDEPLOYED route shows an honest error and does NOT clear the device", async () => {
    const user = userEvent.setup();
    // the SPA shell: HTML, status 200 — what an unrouted /api path really returns
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        status: 200,
        headers: { get: () => null },
        text: async () => "<!doctype html><html><body></body></html>",
      }))
    );

    renderControls();
    await user.click(screen.getByRole("button", { name: /delete my account/i }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/type delete to confirm/i), "DELETE");
    await user.click(within(dialog).getByRole("button", { name: /delete my account/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByRole("alert").textContent).toMatch(/not switched on yet/i);
    expect(screen.getByRole("alert").textContent).toMatch(/nothing was changed/i);

    // ★★ the device is untouched and the student is still signed in
    expect(localStorage.getItem("lazytopper.mistakeLogs.v1")).toBeTruthy();
    expect(logout).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
    // and no success receipt anywhere
    expect(screen.queryByText(/your account has been deleted/i)).toBeNull();
  });

  it("★ a 500 leaves the device intact and the student signed in", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(500, { ok: false, error: "Account erasure failed." }))
    );

    renderControls();
    await user.click(screen.getByRole("button", { name: /delete my account/i }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/type delete to confirm/i), "DELETE");
    await user.click(within(dialog).getByRole("button", { name: /delete my account/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(localStorage.getItem("lazytopper.mistakeLogs.v1")).toBeTruthy();
    expect(logout).not.toHaveBeenCalled();
  });
});

/* ══════════════════════════════════════════════════════════════════════════════
   6 · DOWNLOAD
   ══════════════════════════════════════════════════════════════════════════════ */

describe("6 · download my data", () => {
  it("★ an undeployed export route reports honestly and saves no file", async () => {
    const user = userEvent.setup();
    const clickSpy = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(clickSpy);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        status: 200,
        headers: { get: () => null },
        text: async () => "<!doctype html><html></html>",
      }))
    );

    renderControls();
    await user.click(screen.getByRole("button", { name: /^download$/i }));

    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/not switched on yet/i));
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("★ CONTROL: a real export DOES save a file", async () => {
    const user = userEvent.setup();
    const clickSpy = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(clickSpy);
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:fake"),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(200, { readme: "your data" })));

    renderControls();
    await user.click(screen.getByRole("button", { name: /^download$/i }));

    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("status").textContent).toMatch(/saved/i);
  });
});
