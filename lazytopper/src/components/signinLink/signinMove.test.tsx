// @vitest-environment jsdom
// SIGNED-IN-MOVE-1: option 3 of "Who will use this?" - move a purchase to the child's own phone or email.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const state = vi.hoisted(() => ({
  user: null as null | { uid: string; email: string | null; phoneNumber: string | null; providerIds: string[] },
  events: [] as Array<[string, unknown]>,
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: state.user, sendLinkPhoneOtp: vi.fn(), confirmLinkPhoneOtp: vi.fn() }),
}));
vi.mock("../../services/firebaseClient", () => ({
  authClient: {
    get currentUser() {
      return state.user ? { uid: state.user.uid, providerData: [{ providerId: "google.com", email: state.user.email }], getIdToken: async () => "tok" } : null;
    },
  },
}));
vi.mock("../../services/linkSignInEmail", () => ({ linkGoogleToCurrentAccount: vi.fn() }));
vi.mock("../../analytics/analytics", () => ({
  sendAnalyticsHit: (_k: string, payload: { name: string; data?: unknown }) => {
    state.events.push([payload.name, payload.data]);
  },
}));

import SigninLinkCardLazy from "./SigninLinkCardLazy";
import { MOVE_REFUSALS } from "./signinLinkModel";

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 80)); });
const MOVE = { orderId: "order_ABC123", item: "Maths CBQ Pack" };
const fetchMock = vi.fn();

function mockServer(status: number, body: Record<string, unknown>) {
  fetchMock.mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
}

beforeAll(async () => {
  // warm the lazy chunk so a negative assertion below is never vacuous
  state.user = { uid: "u1", email: "p@gmail.com", phoneNumber: null, providerIds: ["google.com"] };
  render(<SigninLinkCardLazy signedIn move={MOVE} />);
  await screen.findByTestId("signin-link-card");
  cleanup();
});
beforeEach(() => {
  state.user = { uid: "u1", email: "p@gmail.com", phoneNumber: null, providerIds: ["google.com"] };
  state.events = [];
  window.localStorage.clear();
  vi.unstubAllEnvs();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const openMove = async () => {
  render(<SigninLinkCardLazy signedIn move={MOVE} />);
  fireEvent.click(await screen.findByTestId("signin-choice-move"));
};
const typeAndContinue = (v: string) => {
  fireEvent.change(screen.getByTestId("signin-move-input"), { target: { value: v } });
  fireEvent.click(screen.getByTestId("signin-move-continue"));
};

describe("option 3 visibility", () => {
  it("shows 'Move it to my child's own phone or email' when the host hands over an order", async () => {
    render(<SigninLinkCardLazy signedIn move={MOVE} />);
    expect((await screen.findByTestId("signin-choice-move")).textContent).toBe("Move it to my child's own phone or email");
  });
  it("is hidden when there is no order to move (host passed none)", async () => {
    render(<SigninLinkCardLazy signedIn />);
    await screen.findByTestId("signin-link-card");
    await settle();
    expect(screen.queryByTestId("signin-choice-move")).toBeNull();
  });
  it("is hidden by the client kill switch VITE_PAY_MOVE_TO_OTHER_DISABLED=1", async () => {
    vi.stubEnv("VITE_PAY_MOVE_TO_OTHER_DISABLED", "1");
    render(<SigninLinkCardLazy signedIn move={MOVE} />);
    await screen.findByTestId("signin-link-card");
    await settle();
    expect(screen.queryByTestId("signin-choice-move")).toBeNull();
    expect(screen.getByTestId("signin-choice-child")).toBeTruthy();
  });
});

describe("the move flow", () => {
  it("validates before any request: a short number and a bad email show an error and call nothing", async () => {
    await openMove();
    typeAndContinue("12345");
    expect(screen.getByTestId("signin-move-error").textContent).toBe("Enter a 10-digit mobile number.");
    fireEvent.click(screen.getByTestId("signin-move-switch"));
    typeAndContinue("not-an-email");
    expect(screen.getByTestId("signin-move-error").textContent).toBe("Enter a valid email address.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("phone: shows the masked confirm line; NOTHING is sent until 'Yes, move it'; then one request and a done line", async () => {
    mockServer(200, { ok: true, moved: true, kind: "pack", to: { kind: "phone", masked: "+91 98•••••210" } });
    await openMove();
    typeAndContinue("98765 43210");
    expect(screen.getByTestId("signin-move-confirm").textContent).toContain(
      "Move Maths CBQ Pack to +91 98•••••210? Your account will keep nothing, and your child signs in with that.",
    );
    expect(screen.getByTestId("signin-move-confirm").textContent).not.toContain("9876543210");
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("signin-move-confirm-yes"));
    await waitFor(() => expect(screen.getByTestId("signin-move-done")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, { method: string; headers: Record<string, string>; body: string }];
    expect(url).toBe("/api/pay/move-to-other");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body)).toEqual({ orderId: "order_ABC123", phone: "+919876543210" });
    expect(screen.getByTestId("signin-move-done").textContent).toBe("Done. It is now on the account for +91 98•••••210. Your child signs in with that.");
    expect(document.body.textContent).not.toContain("9876543210");
    expect(window.localStorage.getItem("lazytopper.signinLink.dismissed.v1:u1")).toBe("1");
  });

  it("F6: the host's onMoved is called exactly once, only after the server confirms the move", async () => {
    const onMoved = vi.fn();
    mockServer(200, { ok: true, moved: true, kind: "pack", to: { kind: "phone", masked: "+91 98\u2022\u2022\u2022\u2022\u2022210" } });
    render(<SigninLinkCardLazy signedIn move={MOVE} onMoved={onMoved} />);
    fireEvent.click(await screen.findByTestId("signin-choice-move"));
    typeAndContinue("9876543210");
    expect(onMoved).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("signin-move-confirm-yes"));
    await waitFor(() => expect(screen.getByTestId("signin-move-done")).toBeTruthy());
    expect(onMoved).toHaveBeenCalledTimes(1);
    cleanup();
    window.localStorage.clear(); // the first move marked the card answered
    fetchMock.mockReset();
    mockServer(409, { ok: false, reason: "used" });
    const onMoved2 = vi.fn();
    render(<SigninLinkCardLazy signedIn move={MOVE} onMoved={onMoved2} />);
    fireEvent.click(await screen.findByTestId("signin-choice-move"));
    typeAndContinue("9876543210");
    fireEvent.click(screen.getByTestId("signin-move-confirm-yes"));
    await waitFor(() => expect(screen.getByTestId("signin-move-refused")).toBeTruthy());
    expect(onMoved2).not.toHaveBeenCalled();
  });

  it("email: confirm shows the masked email and the request carries the lowercased address", async () => {
    mockServer(200, { ok: true, moved: true, kind: "pass", to: { kind: "email", masked: "ki••••@example.com" } });
    await openMove();
    fireEvent.click(screen.getByTestId("signin-move-switch"));
    typeAndContinue("Kid.Name@Example.com");
    expect(screen.getByTestId("signin-move-confirm").textContent).toContain("ki••••@example.com");
    expect(document.body.textContent).not.toContain("Kid.Name");
    fireEvent.click(screen.getByTestId("signin-move-confirm-yes"));
    await waitFor(() => expect(screen.getByTestId("signin-move-done")).toBeTruthy());
    expect(JSON.parse((fetchMock.mock.calls[0] as [string, { body: string }])[1].body)).toEqual({ orderId: "order_ABC123", email: "kid.name@example.com" });
  });

  it("a double tap on 'Yes, move it' while the request is in flight sends exactly one request", async () => {
    let release: (v: unknown) => void = () => undefined;
    fetchMock.mockReturnValue(new Promise((r) => { release = r; })); // stays in flight until released
    await openMove();
    typeAndContinue("9876543210");
    const yes = screen.getByTestId("signin-move-confirm-yes");
    fireEvent.click(yes);
    fireEvent.click(yes);
    fireEvent.click(yes);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((yes as HTMLButtonElement).disabled).toBe(true);
    await act(async () => {
      release({ ok: true, status: 200, json: async () => ({ ok: true, moved: true, kind: "pack", to: { kind: "phone", masked: "+91 98\u2022\u2022\u2022\u2022\u2022210" } }) });
    });
    await waitFor(() => expect(screen.getByTestId("signin-move-done")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("'Go back' on the confirm screen returns to entry and sends nothing; Cancel returns to the three choices", async () => {
    await openMove();
    typeAndContinue("9876543210");
    fireEvent.click(screen.getByTestId("signin-move-confirm-back"));
    expect(screen.getByTestId("signin-move-enter")).toBeTruthy();
    fireEvent.click(screen.getByTestId("signin-move-cancel"));
    expect(screen.getByTestId("signin-choice-move")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("lazytopper.signinLink.dismissed.v1:u1")).toBeNull();
  });

  it.each(Object.keys(MOVE_REFUSALS))("server refusal '%s' shows its own plain line, never a raw server string, and the card is not marked answered", async (reason) => {
    mockServer(409, { ok: false, error: "move_refused", reason, message: "RAW SERVER TEXT" });
    await openMove();
    typeAndContinue("9876543210");
    fireEvent.click(screen.getByTestId("signin-move-confirm-yes"));
    await waitFor(() => expect(screen.getByTestId("signin-move-refused")).toBeTruthy());
    const text = screen.getByTestId("signin-move-refused").textContent ?? "";
    expect(text).toContain(MOVE_REFUSALS[reason]);
    expect(text).not.toContain("RAW SERVER TEXT");
    expect(window.localStorage.getItem("lazytopper.signinLink.dismissed.v1:u1")).toBeNull();
    expect(state.events.some(([n, d]) => n === "signin_move_refused" && (d as { reason: string }).reason === reason)).toBe(true);
  });

  it("an unknown reason, a network failure and a 404 (server kill switch) get the neutral line", async () => {
    for (const make of [() => mockServer(500, {}), () => fetchMock.mockRejectedValue(new Error("offline")), () => mockServer(404, { error: "Not Found" })]) {
      cleanup();
      fetchMock.mockReset();
      make();
      await openMove();
      typeAndContinue("9876543210");
      fireEvent.click(screen.getByTestId("signin-move-confirm-yes"));
      await waitFor(() => expect(screen.getByTestId("signin-move-refused")).toBeTruthy());
      expect(screen.getByTestId("signin-move-refused").textContent).toContain("Couldn't move it just now. Nothing was changed.");
    }
  });

  it("analytics: names + kind/to/reason only - never a phone, an email, an order id or a uid", async () => {
    mockServer(200, { ok: true, moved: true, kind: "pack", to: { kind: "phone", masked: "+91 98•••••210" } });
    await openMove();
    typeAndContinue("9876543210");
    fireEvent.click(screen.getByTestId("signin-move-confirm-yes"));
    await waitFor(() => expect(screen.getByTestId("signin-move-done")).toBeTruthy());
    const names = state.events.map((e) => e[0]);
    expect(names).toEqual(expect.arrayContaining(["signin_move_confirmed", "signin_move_done"]));
    const blob = JSON.stringify(state.events);
    expect(blob).not.toMatch(/9876543210|order_ABC123|u1|@/);
  });

  it("copy rules: no 'AI', 'answer key', 'optional' or refund promise anywhere in the flow's strings", async () => {
    const all = Object.values(MOVE_REFUSALS).join(" ");
    await openMove();
    const text = document.body.textContent + all;
    expect(text).not.toMatch(/\bAI\b|answer key|optional|refund/i);
  });
});
