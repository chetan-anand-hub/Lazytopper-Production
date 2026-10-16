// TUTOR-FIX-2 (S-C, tutor UI) — the page-level behaviours, driven through a mocked session hook
// so each test sets the exact thread / status / error the page renders:
//   T3  "Continue" on the latest cut-off reply (a normal message);
//   T4  the diagram opens on EVERY figure-bearing reply (the same key twice included), a close is
//       respected until the next one, the phone sheet sits above the composer;
//   T5  /tutor/10/:subject (no chapter) → chapter picker first, "<Subject> tutor", no session;
//   T7  typed error states;
//   T11 the permanent "Get my answer marked" / "Practise this chapter" pair + opener chips, and
//       the offer CTA when the student asked even though the model omitted the tag.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { TutorTurn } from "../../ai/tutorClient";
import type { TutorErrorState } from "./tutorErrorState";

const H = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
  args: [] as Array<Record<string, unknown>>,
  send: vi.fn(),
  retry: vi.fn(),
  openCI: vi.fn(),
  openQP: vi.fn(),
}));

vi.mock("./useTutorSession", () => ({
  useTutorSession: (args: Record<string, unknown>) => {
    H.args.push(args);
    return {
      opener: { text: "Trigonometry - Class 10.", forks: [] },
      messages: [] as TutorTurn[],
      status: "idle",
      error: null,
      errorState: null,
      started: false,
      canRoundTrip: true,
      pending: null,
      returnFollow: null,
      send: H.send,
      retry: H.retry,
      openCheckImproveOverlay: H.openCI,
      checkImproveOverlayOpen: false,
      closeCheckImprove: () => {},
      openQuickPracticeOverlay: H.openQP,
      quickPracticeOverlayOpen: false,
      closeQuickPractice: () => {},
      quickPracticeHref: "",
      recheckPending: () => {},
      dismissPending: () => {},
      ...H.state,
    };
  },
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("../../components/usage/UsageWarning", () => ({ default: () => null }));

import TutorPage from "./TutorPage";
import { renderableFiguresForTopic } from "./tutorFigures";
import { resolveConceptVisual } from "./conceptVisualCatalogue";
import { conceptFigureCatalogue } from "./conceptVisualCatalogue.data";
import { isTutorTopicKeyAllowed } from "./TutorPage";

function Where() {
  const l = useLocation();
  return <div data-testid="where">{`${l.pathname}${l.search}`}</div>;
}

const tree = (path: string) => (
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/tutor/:grade/:subject/:topicKey" element={<TutorPage />} />
      <Route path="/tutor/:grade/:subject" element={<TutorPage />} />
    </Routes>
    <Where />
  </MemoryRouter>
);

const u = (content: string): TutorTurn => ({ role: "user", content });
const t = (over: Partial<TutorTurn> = {}): TutorTurn => ({ role: "tutor", content: "Here is why.", ...over });

beforeEach(() => {
  H.state = {};
  H.args.length = 0;
  H.send.mockReset();
  H.retry.mockReset();
  H.openCI.mockReset();
  H.openQP.mockReset();
});
afterEach(cleanup);

/* ── T3 ─────────────────────────────────────────────────────────────────────── */
describe("T3 · a cut-off reply carries a Continue button", () => {
  it("★★ the latest truncated reply shows Continue, which sends a normal continue turn", () => {
    H.state = { messages: [u("Why?"), t({ content: "Because R depends on", truncated: true })] };
    render(tree("/tutor/10/maths/trigonometry"));
    expect(screen.getByText(/This answer was cut short\./)).toBeTruthy();
    fireEvent.click(screen.getByTestId("tutor-continue"));
    expect(H.send).toHaveBeenCalledWith("Please continue from where you stopped.");
  });
  it("an OLDER cut-off reply keeps only the note; no Continue while sending", () => {
    H.state = { messages: [u("a"), t({ truncated: true }), u("b"), t({})] };
    render(tree("/tutor/10/maths/trigonometry"));
    expect(screen.getByText(/This answer was cut short\./)).toBeTruthy();
    expect(screen.queryByTestId("tutor-continue")).toBeNull();
    cleanup();
    H.state = { messages: [u("a"), t({ truncated: true })], status: "sending" };
    render(tree("/tutor/10/maths/trigonometry"));
    expect(screen.queryByTestId("tutor-continue")).toBeNull();
  });
});

/* ── T4 ─────────────────────────────────────────────────────────────────────── */
// A real board chapter with a concept whose diagram resolves to an IMAGE (no Storage probe).
const FIG = (() => {
  for (const row of conceptFigureCatalogue) {
    if (!isTutorTopicKeyAllowed(row.topicKey)) continue;
    const t2 = { subject: row.subject as "maths" | "science", topicKey: row.topicKey };
    const hit = renderableFiguresForTopic(t2).find(
      (f) => resolveConceptVisual({ ...t2, conceptKey: f.key })?.body.kind === "image",
    );
    if (hit) return { ...t2, key: hit.key };
  }
  throw new Error("no image figure in the catalogue");
})();
const FIG_PATH = `/tutor/10/${FIG.subject}/${FIG.topicKey}`;
const panelOpen = () => !document.querySelector(".lt-tutor__panel")!.classList.contains("lt-tutor__panel--closed");

describe("T4 · the diagram opens on every figure-bearing reply", () => {
  it("★★ the SAME key twice opens the panel twice; a close is respected until the next reply; a restored thread does not pop open", () => {
    const m1 = [u("show me"), t({ figure: FIG.key })];
    H.state = { messages: m1, status: "idle" };
    const r = render(tree(FIG_PATH));
    expect(panelOpen()).toBe(false); // restored thread: seeded, not opened

    const m2 = [...m1, u("again please")];
    H.state = { messages: m2, status: "sending" };
    r.rerender(tree(FIG_PATH));
    const m3 = [...m2, t({ figure: FIG.key })]; // the SAME key again
    H.state = { messages: m3, status: "idle" };
    r.rerender(tree(FIG_PATH));
    expect(panelOpen()).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Close the diagram" }));
    expect(panelOpen()).toBe(false);
    r.rerender(tree(FIG_PATH));
    expect(panelOpen()).toBe(false); // the close is respected

    const m4 = [...m3, u("and once more")];
    H.state = { messages: m4, status: "sending" };
    r.rerender(tree(FIG_PATH));
    H.state = { messages: [...m4, t({ figure: FIG.key })], status: "idle" };
    r.rerender(tree(FIG_PATH));
    expect(panelOpen()).toBe(true);
  });

  it("a reply with no figure does not open it", () => {
    const m1 = [u("hi"), t({})];
    H.state = { messages: m1 };
    const r = render(tree(FIG_PATH));
    H.state = { messages: [...m1, u("x")], status: "sending" };
    r.rerender(tree(FIG_PATH));
    H.state = { messages: [...m1, u("x"), t({})], status: "idle" };
    r.rerender(tree(FIG_PATH));
    expect(panelOpen()).toBe(false);
  });

  it("★ 390: the sheet is docked ABOVE the composer (bottom = the dock height) and never contains the input", () => {
    H.state = { messages: [u("show me"), t({ figure: FIG.key })] };
    render(tree(FIG_PATH));
    const css = document.querySelector(".lt-tutor style")!.textContent || "";
    const mobile = css.slice(css.indexOf("@media (max-width: 1023px)"));
    expect(mobile).toMatch(/\.lt-tutor__panel \{[^}]*bottom: var\(--lt-dock-h/);
    expect(mobile).not.toMatch(/\.lt-tutor__panel \{[^}]*inset: 0/);
    const aside = document.querySelector(".lt-tutor__panel")!;
    const input = screen.getByRole("textbox");
    expect(aside.contains(input)).toBe(false);
    expect(document.querySelector(".lt-tutor__dock")!.contains(input)).toBe(true);
  });
});

/* ── T5 ─────────────────────────────────────────────────────────────────────── */
describe("T5 · cold entry without a chapter", () => {
  it("★★ /tutor/10/maths shows the chapter picker first: 'Maths tutor', no session, never 'this topic'", () => {
    render(tree("/tutor/10/maths?source=home&returnTo=%2F"));
    expect(H.args).toEqual([]); // no tutor session (no thread under an empty topic key)
    expect(screen.getByTestId("tutor-chapter-first-picker")).toBeTruthy();
    expect(screen.getAllByText("Maths tutor").length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/this topic/i);
    // The subject is locked: only the chapter select is shown.
    expect(document.getElementById("lt-tutor-first-subject")).toBeNull();
  });
  it("★★ choosing a chapter opens that chapter's tutor (query kept), and only then a session starts", () => {
    render(tree("/tutor/10/maths?source=home&returnTo=%2F"));
    fireEvent.change(document.getElementById("lt-tutor-first-chapter")!, { target: { value: "real-numbers" } });
    fireEvent.click(screen.getByTestId("tutor-chapter-first-picker-open"));
    expect(screen.getByTestId("where").textContent).toBe("/tutor/10/maths/real-numbers?source=home&returnTo=%2F");
    expect(H.args.length).toBeGreaterThan(0);
    expect(H.args[0].topicKey).toBe("real-numbers");
  });
  it("Science: 'Science tutor'", () => {
    render(tree("/tutor/10/science"));
    expect(screen.getAllByText("Science tutor").length).toBeGreaterThan(0);
  });
  it("CONTROL: a deep link with a chapter is unchanged (session starts, no picker)", () => {
    render(tree("/tutor/10/maths/trigonometry"));
    expect(H.args[0].topicKey).toBe("trigonometry");
    expect(screen.queryByTestId("tutor-chapter-first-picker")).toBeNull();
  });
});

/* ── T7 ─────────────────────────────────────────────────────────────────────── */
describe("T7 · typed error states", () => {
  const withError = (errorState: TutorErrorState) => {
    H.state = { messages: [u("hi")], status: "error", error: "x", errorState };
    render(tree("/tutor/10/maths/trigonometry"));
  };
  it("premium_required → an upgrade card to the existing pricing entry, no Try again", () => {
    withError({ kind: "premium", message: "The tutor is part of Premium." });
    const card = screen.getByTestId("tutor-error-premium");
    expect(card.textContent).toContain("The tutor is part of Premium.");
    const link = screen.getByRole("link", { name: "See Premium" });
    expect(link.getAttribute("href")).toBe(
      `/pricing?source=upgrade-sheet&returnTo=${encodeURIComponent("/tutor/10/maths/trigonometry")}`,
    );
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });
  it("trial_limit / usage_limit → 'You've used today's tutor messages. Back …', no Try again", () => {
    withError({ kind: "limit", resetAt: null, window: null });
    expect(screen.getByTestId("tutor-error-limit").textContent).toBe("You've used today's tutor messages. Back tomorrow.");
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });
  it("busy_today → the same family, + See plans when the server said so", () => {
    withError({ kind: "busy", resetAt: null, message: "busy", plans: true });
    expect(screen.getByTestId("tutor-error-busy").textContent).toContain("The tutor is very busy today. Back tomorrow.");
    expect(screen.getByRole("link", { name: "See plans" })).toBeTruthy();
  });
  it("offline → a connection line + Try again", () => {
    withError({ kind: "offline" });
    expect(screen.getByTestId("tutor-error-offline").textContent).toContain("offline");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(H.retry).toHaveBeenCalled();
  });
  it("5xx → the honest line + Try again (as today)", () => {
    withError({ kind: "failed", message: "The tutor is busy. Try again in a minute." });
    expect(screen.getByTestId("tutor-error-failed").textContent).toContain("The tutor is busy. Try again in a minute.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });
  it("401 → the existing sign-in-again line + Try again", () => {
    withError({ kind: "reauth", message: "Please sign in again." });
    expect(screen.getByTestId("tutor-error-reauth").textContent).toContain("Please sign in again.");
  });
  it("CONTROL: an old session with no errorState still shows its error line", () => {
    H.state = { messages: [u("hi")], status: "error", error: "Old failure line", errorState: undefined };
    render(tree("/tutor/10/maths/trigonometry"));
    expect(screen.getByText("Old failure line")).toBeTruthy();
  });
});

/* ── T11 ────────────────────────────────────────────────────────────────────── */
describe("T11 · Check & Improve and Practice never depend on the student's wording", () => {
  it("★★ the permanent pair sits next to the composer (fresh thread and mid-thread) and opens the overlays directly", () => {
    render(tree("/tutor/10/maths/trigonometry"));
    fireEvent.click(screen.getByTestId("tutor-tool-check"));
    expect(H.openCI).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("tutor-tool-practice"));
    expect(H.openQP).toHaveBeenCalledTimes(1);
    expect(H.send).not.toHaveBeenCalled(); // no model turn needed
    cleanup();
    H.state = { messages: [u("why?"), t({})] };
    render(tree("/tutor/10/maths/trigonometry"));
    expect(screen.getByTestId("tutor-tool-check").textContent).toBe("Get my answer marked");
    expect(screen.getByTestId("tutor-tool-practice").textContent).toBe("Practise this chapter");
    expect(document.querySelector(".lt-tutor__composer")!.contains(screen.getByTestId("tutor-tool-check"))).toBe(true);
  });
  it("the same two as opener chips on a fresh thread", () => {
    render(tree("/tutor/10/maths/trigonometry"));
    fireEvent.click(screen.getByTestId("tutor-chip-check"));
    fireEvent.click(screen.getByTestId("tutor-chip-practice"));
    expect(H.openCI).toHaveBeenCalledTimes(1);
    expect(H.openQP).toHaveBeenCalledTimes(1);
  });
  // Integration (keep one): the offer is carried by the permanent control for the same action
  // (same handler), never a second identical button under the reply.
  it("★★ RED on today's UI: 'grade my answer' + a reply with NO tag still offers Check & Improve (one button)", () => {
    H.state = { messages: [u("grade my answer"), t({ content: "Go to Check & Improve for that." })] };
    render(tree("/tutor/10/maths/trigonometry"));
    expect(screen.getByTestId("tutor-tool-check").getAttribute("data-offered")).toBe("true");
    expect(screen.getByTestId("tutor-tool-practice").getAttribute("data-offered")).toBeNull();
    expect(screen.queryByRole("button", { name: "Get my attempt marked" })).toBeNull();
    fireEvent.click(screen.getByTestId("tutor-tool-check"));
    expect(H.openCI).toHaveBeenCalledTimes(1);
  });
  it("★★ 'aur sawal do board jaise' + no tag still offers practice (one button)", () => {
    H.state = { messages: [u("aur sawal do board jaise"), t({ content: "Here is a worked example." })] };
    render(tree("/tutor/10/maths/trigonometry"));
    expect(screen.getByTestId("tutor-tool-practice").getAttribute("data-offered")).toBe("true");
    expect(screen.getByTestId("tutor-tool-check").getAttribute("data-offered")).toBeNull();
    expect(screen.queryByRole("button", { name: "Practise this" })).toBeNull();
  });
  it("CONTROL: an ordinary question with no tag offers nothing", () => {
    H.state = { messages: [u("why is sin 30 a half?"), t({})] };
    render(tree("/tutor/10/maths/trigonometry"));
    expect(screen.getByTestId("tutor-tool-check").getAttribute("data-offered")).toBeNull();
    expect(screen.getByTestId("tutor-tool-practice").getAttribute("data-offered")).toBeNull();
  });
});
