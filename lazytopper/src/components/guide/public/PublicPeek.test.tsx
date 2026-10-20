import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
const auth = vi.hoisted(() => ({ currentUser: null as null | { uid: string; isAnonymous: boolean } }));
vi.mock("../../../services/firebaseClient", () => ({ authClient: auth }));
const events = vi.hoisted(() => ({ onboarding: [] as Array<[string, Record<string, unknown>]>, arm: [] as string[] }));
vi.mock("../../../analytics/analytics", async (orig) => ({
  ...(await orig<typeof import("../../../analytics/analytics")>()),
  trackOnboardingEvent: (name: string, params: Record<string, unknown>) => events.onboarding.push([name, params]),
  trackGuidePublicArmAssigned: (arm: string) => events.arm.push(arm),
  trackGuidePublicShown: (params: Record<string, unknown>) => events.onboarding.push(["guide_public_shown", params]),
}));
const bank = vi.hoisted(() => ({ ids: ["q1", "q2", "q3", "q4", "q5"] }));
vi.mock("../../startHere/startHereBank", () => ({ pickStartHereSet: async () => bank.ids }));

import PublicPeek from "./PublicPeek";
import { __setGuideAbForTests, setGuidePreview } from "../guideVariant";
import { GUIDE_PUBLIC_ARM_KEY, PEEK_DWELL_MS, __resetPeekUsedForTests, __resetPublicArmForTests } from "./publicPeekModel";
import { GUIDE_INTENT_KEY } from "../../../analytics/visitSource";

/**
 * GUIDE-PUBLIC-1 — the trigger and the peek, end to end in the DOM: nothing before the trigger
 * (so the prerendered body cannot change), both arms counted alike, the guide arm's three real
 * routes, Esc, and the × that ends it for the tab.
 */
function Where() {
  const l = useLocation();
  return <p data-testid="where">{l.pathname + l.search}</p>;
}

function mount(page: "notes" | "topic_hub" = "notes", slug = "trigonometry") {
  return render(
    <MemoryRouter initialEntries={[`/notes/${slug}`]}>
      <Routes>
        <Route
          path="*"
          element={
            <div className={page === "notes" ? "lt-notes-page" : "lt-spine"}>
              <h1 data-testid="page-h1">Chapter</h1>
              <PublicPeek page={page} chapterSlug={slug} />
              <Where />
            </div>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

/** The first test to open the peek pays for the lazy chunk's transform: a generous wait. */
const SLOW = { timeout: 10_000 };

const shown = () => events.onboarding.filter(([n]) => n === "guide_public_shown");

/** Past the idle wait and the 20 s dwell, then let the async auth check + lazy chunk settle. */
async function reachTrigger() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(PEEK_DWELL_MS + 2000);
  });
  vi.useRealTimers();
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "performance"] });
  window.localStorage.clear();
  window.sessionStorage.clear();
  __resetPublicArmForTests();
  __resetPeekUsedForTests();
  __setGuideAbForTests(true);
  auth.currentUser = null;
  events.onboarding = [];
  events.arm = [];
});

/** F2 — make the viewport "narrow" (below 1024px) or wide for matchMedia. */
function setNarrow(narrow: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (q: string) => ({
      matches: narrow && q.includes("max-width"),
      media: q,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
}

let visibility: DocumentVisibilityState = "visible";
Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  __setGuideAbForTests(null);
  document.body.style.overflow = "";
  visibility = "visible";
  setNarrow(false);
});

describe("GUIDE-PUBLIC-1 · PublicPeek", () => {
  it("★ renders NOTHING before the trigger (the prerendered page body is unchanged)", async () => {
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "guide");
    const { container } = mount();
    expect(container.querySelector(".lt-notes-page")!.children).toHaveLength(2); // only the h1 and <Where/>
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PEEK_DWELL_MS - 3000);
    });
    expect(document.querySelector("[data-testid='public-peek']")).toBeNull();
    expect(shown()).toEqual([]);
  });

  it("the split off (Vitest default) → nothing, ever", async () => {
    __setGuideAbForTests(null);
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "guide");
    mount();
    await reachTrigger();
    await new Promise((r) => setTimeout(r, 50));
    expect(document.querySelector("[data-testid='public-peek']")).toBeNull();
    expect(shown()).toEqual([]);
  });

  it("★ signed-out CONTROL: nothing on screen, but guide_public_shown fires at the same moment", async () => {
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "control");
    mount();
    await reachTrigger();
    await vi.waitFor(() => expect(shown()).toHaveLength(1), SLOW);
    expect(shown()[0][1]).toEqual({ page: "notes", arm: "control", chapter: "trigonometry", signed_in: false });
    await new Promise((r) => setTimeout(r, 50));
    expect(document.querySelector("[data-testid='public-peek']")).toBeNull();
    expect(JSON.parse(window.sessionStorage.getItem(GUIDE_INTENT_KEY)!).public_arm).toBe("control");
    expect(events.arm).toEqual([]); // not freshly assigned on this device
  });

  it("★ a fresh device arm reports the GA4 user property once", async () => {
    vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation(<T extends ArrayBufferView | null>(a: T): T => {
      (a as unknown as Uint8Array)[0] = 3;
      return a;
    });
    mount();
    await reachTrigger();
    await screen.findByTestId("public-peek", undefined, SLOW);
    expect(events.arm).toEqual(["guide"]);
    expect(window.localStorage.getItem(GUIDE_PUBLIC_ARM_KEY)).toBe("guide");
  });

  it("★ signed-out GUIDE: Byte peeks in (pose peek) with the notes line; the panel has 3 real routes", async () => {
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "guide");
    mount();
    await reachTrigger();
    const peek = await screen.findByTestId("public-peek", undefined, SLOW);
    expect(peek.parentElement).toBe(document.body); // portalled, fixed: nothing in the flow moves
    expect(peek.querySelector("[data-testid='blob-byte']")!.getAttribute("data-pose")).toBe("peek");
    expect(screen.getByTestId("public-peek-line").textContent).toBe("Want this chapter's important questions?");
    expect(shown()).toEqual([["guide_public_shown", { page: "notes", arm: "guide", chapter: "trigonometry", signed_in: false }]]);

    fireEvent.click(screen.getByTestId("public-peek-line"));
    const opts = screen.getByTestId("public-peek-panel").querySelectorAll("button");
    expect([...opts].map((b) => b.querySelector("b")!.textContent)).toEqual([
      "Important questions for Trigonometry",
      "Check one answer free",
      "5 quick questions on Trigonometry",
    ]);
    // Esc closes the panel, not Byte.
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("public-peek-panel")).toBeNull();
    expect(screen.getByTestId("public-peek")).toBeTruthy();

    fireEvent.click(screen.getByTestId("public-peek-line"));
    fireEvent.click(screen.getByTestId("public-peek-opt-important"));
    await vi.waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/highly-probable/10/Maths?topic=trigonometry"), SLOW);
    expect(events.onboarding).toContainEqual(["guide_public_option", { option: "important", page: "notes" }]);
  });

  it("★ signed out, '5 quick questions' → /login?redirect=<the Start-here practice path>", async () => {
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "guide");
    mount();
    await reachTrigger();
    fireEvent.click(await screen.findByTestId("public-peek-line", undefined, SLOW));
    fireEvent.click(screen.getByTestId("public-peek-opt-quick"));
    await vi.waitFor(() => expect(screen.getByTestId("where").textContent).toMatch(/^\/login\?redirect=/), SLOW);
    const target = decodeURIComponent(screen.getByTestId("where").textContent!.split("redirect=")[1]);
    expect(target.startsWith("/practice/10/Maths?")).toBe(true);
    const sp = new URLSearchParams(target.split("?")[1]);
    expect(sp.get("topic")).toBe("trigonometry");
    expect(sp.get("focusBankIds")).toBe("q1,q2,q3,q4,q5");
    expect(sp.get("src")).toBe("start_here");
  });

  it("★ signed-in GUIDE arm: the topic-hub line, and '5 quick questions' launches Start-here directly", async () => {
    auth.currentUser = { uid: "u-guide", isAnonymous: false };
    __setGuideAbForTests(true, "guide");
    mount("topic_hub");
    await reachTrigger();
    expect((await screen.findByTestId("public-peek-line", undefined, SLOW)).textContent).toBe("Doing Trigonometry? I can help.");
    expect(window.localStorage.getItem(GUIDE_PUBLIC_ARM_KEY)).toBeNull(); // no device arm for an account
    fireEvent.click(screen.getByTestId("public-peek-line"));
    expect(screen.getByTestId("public-peek-opt-check_one").textContent).toContain("Check one answer");
    expect(screen.getByTestId("public-peek-opt-check_one").textContent).not.toContain("free");
    fireEvent.click(screen.getByTestId("public-peek-opt-quick"));
    await vi.waitFor(() => expect(screen.getByTestId("where").textContent).toMatch(/^\/practice\/10\/Maths\?/), SLOW);
  });

  it("signed-in CONTROL arm: nothing on screen", async () => {
    auth.currentUser = { uid: "u-control", isAnonymous: false };
    __setGuideAbForTests(true, "control");
    mount();
    await reachTrigger();
    await vi.waitFor(() => expect(shown()).toHaveLength(1), SLOW);
    expect(shown()[0][1]).toMatchObject({ arm: "control", signed_in: true });
    expect(document.querySelector("[data-testid='public-peek']")).toBeNull();
  });

  it("★ × closes him and he does not come back in this tab (even on a new mount)", async () => {
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "guide");
    const first = mount();
    await reachTrigger();
    fireEvent.click(await screen.findByTestId("public-peek-close", undefined, SLOW));
    expect(screen.queryByTestId("public-peek")).toBeNull();
    expect(events.onboarding).toContainEqual(["guide_public_dismissed", { page: "notes" }]);
    first.unmount();

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "performance"] });
    mount();
    await reachTrigger();
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByTestId("public-peek")).toBeNull();
    expect(shown()).toHaveLength(1);
  });

  it("never over an open modal / the tutor overlay: waits until it closes", async () => {
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "guide");
    document.body.style.overflow = "hidden";
    mount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PEEK_DWELL_MS + 3000);
    });
    expect(shown()).toEqual([]);
    document.body.style.overflow = "";
    await reachTrigger();
    expect(await screen.findByTestId("public-peek", undefined, SLOW)).toBeTruthy();
  });

  it("★ PREVIEW-1 signed out, preview 'Show Byte': Byte + 'Admin preview' pill, NO event, device arm untouched", async () => {
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "control"); // this device's real arm
    setGuidePreview("guide");
    mount();
    await reachTrigger();
    await screen.findByTestId("public-peek", undefined, SLOW);
    expect(screen.getByTestId("guide-admin-preview").textContent).toBe("Admin preview");
    fireEvent.click(screen.getByTestId("public-peek-line"));
    expect(screen.getByTestId("public-peek-panel").querySelector("[data-testid='guide-admin-preview']")).not.toBeNull();
    fireEvent.click(screen.getByTestId("public-peek-opt-check_one"));
    expect(screen.getByTestId("where").textContent).toBe("/check-improve");
    expect(events.onboarding).toEqual([]); // no guide_public_shown / _option
    expect(events.arm).toEqual([]);
    expect(window.localStorage.getItem(GUIDE_PUBLIC_ARM_KEY)).toBe("control");
    expect(window.sessionStorage.getItem(GUIDE_INTENT_KEY)).toBeNull();
  });

  it("★ PREVIEW-1: × under a preview sends no guide_public_dismissed; a fresh device is not assigned an arm", async () => {
    const grv = vi.spyOn(globalThis.crypto, "getRandomValues");
    setGuidePreview("guide");
    mount("topic_hub");
    await reachTrigger();
    fireEvent.click(await screen.findByTestId("public-peek-close", undefined, SLOW));
    expect(events.onboarding).toEqual([]);
    expect(events.arm).toEqual([]);
    expect(window.localStorage.getItem(GUIDE_PUBLIC_ARM_KEY)).toBeNull();
    expect(grv).not.toHaveBeenCalled();
  });

  it("★ PREVIEW-1 signed in, preview 'Show control': nothing on screen and NO guide_public_shown", async () => {
    auth.currentUser = { uid: "u-any", isAnonymous: false };
    setGuidePreview("control");
    mount();
    await reachTrigger();
    await new Promise((r) => setTimeout(r, 100));
    expect(document.querySelector("[data-testid='public-peek']")).toBeNull();
    expect(events.onboarding).toEqual([]);
  });

  it("no preview: no pill", async () => {
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "guide");
    mount();
    await reachTrigger();
    await screen.findByTestId("public-peek", undefined, SLOW);
    expect(screen.queryByTestId("guide-admin-preview")).toBeNull();
  });

  it("★ F1: the panel comes AFTER the row in the DOM, and opens with focus on its first option", async () => {
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "guide");
    mount();
    await reachTrigger();
    fireEvent.click(await screen.findByTestId("public-peek-line", undefined, SLOW));
    const row = screen.getByTestId("public-peek-row");
    const panel = screen.getByTestId("public-peek-panel");
    expect(row.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByTestId("public-peek-opt-important"));
  });

  it("★ F1: × moves focus to the page's own <h1> (tabIndex -1), never <body>", async () => {
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "guide");
    mount();
    await reachTrigger();
    const x = await screen.findByTestId("public-peek-close", undefined, SLOW);
    x.focus();
    fireEvent.click(x);
    const h1 = screen.getByTestId("page-h1");
    expect(document.activeElement).toBe(h1);
    expect(document.activeElement).not.toBe(document.body);
    expect(h1.getAttribute("tabindex")).toBe("-1");
  });

  it("★ F2: below 1024px the bubble hides while the panel is open (Byte and × stay); Esc → focus on ×", async () => {
    setNarrow(true);
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "guide");
    mount();
    await reachTrigger();
    fireEvent.click(await screen.findByTestId("public-peek-line", undefined, SLOW));
    expect(screen.queryByTestId("public-peek-line")).toBeNull();
    expect(screen.getByTestId("public-peek").querySelector("[data-testid='blob-byte']")).not.toBeNull();
    expect(screen.getByTestId("public-peek-close")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByTestId("public-peek-opt-important"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("public-peek-panel")).toBeNull();
    expect(screen.getByTestId("public-peek-line")).toBeTruthy(); // the bubble is back
    expect(document.activeElement).toBe(screen.getByTestId("public-peek-close"));
  });

  it("F2: at desktop width the bubble stays while the panel is open; Esc → focus back on the bubble", async () => {
    setNarrow(false);
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "guide");
    mount();
    await reachTrigger();
    fireEvent.click(await screen.findByTestId("public-peek-line", undefined, SLOW));
    expect(screen.getByTestId("public-peek-line")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.activeElement).toBe(screen.getByTestId("public-peek-line"));
  });

  it("★ F3: a HIDDEN tab never triggers (the 20 s pauses), and the clock resumes when visible", async () => {
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "guide");
    visibility = "hidden";
    mount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PEEK_DWELL_MS * 3);
    });
    expect(shown()).toEqual([]);
    // Visible again: 15 s is not enough (the hidden minute did not count)…
    visibility = "visible";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(shown()).toEqual([]);
    // …hidden for a while (paused), then visible: the remaining ~5 s completes it.
    visibility = "hidden";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(shown()).toEqual([]);
    visibility = "visible";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await reachTrigger();
    await vi.waitFor(() => expect(shown()).toHaveLength(1), SLOW);
  });

  it("F3: scrolling in a hidden tab does not trigger either", async () => {
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "guide");
    visibility = "hidden";
    mount();
    const art = document.querySelector(".lt-notes-page") as HTMLElement;
    art.getBoundingClientRect = () => ({ top: -5000, height: 6000, left: 0, right: 0, bottom: 1000, width: 0, x: 0, y: 0, toJSON: () => ({}) });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
      document.dispatchEvent(new Event("scroll"));
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(shown()).toEqual([]);
    visibility = "visible";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(10);
    });
    vi.useRealTimers();
    await vi.waitFor(() => expect(shown()).toHaveLength(1), SLOW); // 100 % scrolled, now visible
  });

  it("an unknown chapter → nothing", async () => {
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "guide");
    mount("notes", "not-a-chapter");
    await reachTrigger();
    await new Promise((r) => setTimeout(r, 50));
    expect(shown()).toEqual([]);
  });
});
