// CBQ-ENTRY-1 — the Practice Hub's "Competency-based questions" card and its chooser.
//
// Router-mounted, the REAL hub at /practice-hub with a probe on /practice/:grade/:subject,
// so a routing claim is proven by where the app actually lands (the #484 lesson).
// (a) the card renders at phone and desktop width, above the scope card; (b) Maths →
// Triangles lands on the E3 URL; (e) `?cbq=1` arrives with the chooser open; and the
// chooser lists a chapter with no real CBQs as "coming soon" and will not open it.
// The per-chapter CBQ answer (SPEED-HUB-1: the precomputed manifest read by
// cbqChapterManifest, pinned to the real bank in cbqAvailability.test.ts) is stubbed here so
// this suite controls which chapters have CBQs.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useParams } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

const avail = vi.hoisted(() => ({ without: new Set<string>(), calls: [] as string[] }));
const auth = vi.hoisted(() => ({ user: null as null | { uid: string }, loading: false }));
const sale = vi.hoisted(() => ({ calls: [] as Array<[string, Record<string, unknown>]> }));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: auth.user, loading: auth.loading }),
}));
vi.mock("../../analytics/analytics", async (orig) => ({
  ...(await orig<typeof import("../../analytics/analytics")>()),
  trackSaleMoment: (name: string, slug: Record<string, unknown>) => {
    sale.calls.push([name, slug]);
  },
}));
vi.mock("../../services/mistakeLogService", () => ({
  getMistakeLogs: async () => [],
}));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../../components/practice/cbqChapterManifest", () => ({
  cbqChapterComingSoon: (subject: string, slug: string) => {
    avail.calls.push(subject);
    return avail.without.has(slug);
  },
}));

import DesktopPracticePage from "./DesktopPracticePage";

function PracticeRouteProbe() {
  const params = useParams<"grade" | "subject">();
  const location = useLocation();
  return (
    <div data-testid="practice-route" data-search={location.search}>
      {`${params.grade}/${params.subject}`}
    </div>
  );
}

function renderHub(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/practice-hub" element={<DesktopPracticePage />} />
        <Route path="/practice/:grade/:subject" element={<PracticeRouteProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

const TITLE = "Competency-based questions (CBQs)";
// AMENDED (MI-COPY C, owner ask 16 Oct 2026) — was "Case-based questions like the board paper's
// Section E — pick a chapter": the card opens a chapter's CBQs of EVERY mark value (preset=comp →
// style "cbq" → buildCbqPracticePool, all isCbq rows interleaved by mark), not Section E only.
const LINE =
  "Board-style competency questions at every mark value — MCQs, assertion-reason, short answers and case studies. Pick a chapter.";
const OLD_LINE = /Section E/;
const card = () => screen.getByRole("button", { name: (name) => name.startsWith(TITLE) });

beforeEach(() => {
  avail.without = new Set();
  avail.calls = [];
  auth.user = null;
  auth.loading = false;
  sale.calls = [];
});
afterEach(cleanup);

describe("CBQ-ENTRY-1 (E1) — the card", () => {
  it.each([
    ["390 (phone)", false],
    ["1440 (desktop)", true],
  ])("★ (a) renders at %s with the spec's words, above the scope card, chooser closed", (_w, desktop) => {
    setMatchMediaMatches(desktop);
    renderHub("/practice-hub");
    const c = card();
    expect(c).toHaveTextContent(TITLE);
    expect(c).toHaveTextContent(LINE);
    expect(c.textContent).not.toMatch(OLD_LINE);
    // Above Step 1 ("What to work on") in document order — the top of the page.
    const step1 = screen.getByText("What to work on");
    expect(c.compareDocumentPosition(step1) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: TITLE })).toBeNull();
  });

  it("tapping the card opens the subject/chapter chooser", () => {
    setMatchMediaMatches(true);
    renderHub("/practice-hub");
    fireEvent.click(card());
    const dialog = screen.getByRole("dialog", { name: TITLE });
    expect(within(dialog).getByLabelText("Subject")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Chapter")).toBeInTheDocument();
  });
});

describe("CBQ-ENTRY-1 (E4) / CBQ-LANDING-1 — the ad link", () => {
  it("★ signed-in: /practice-hub?cbq=1 still arrives with the chooser already open", () => {
    auth.user = { uid: "u1" };
    setMatchMediaMatches(false);
    renderHub("/practice-hub?cbq=1");
    expect(screen.getByRole("dialog", { name: TITLE })).toBeInTheDocument();
    expect(screen.queryByTestId("cbq-try-free")).toBeNull();
  });

  it("signed-in whose auth settles after the first render: opens once", () => {
    auth.loading = true;
    setMatchMediaMatches(false);
    const r = renderHub("/practice-hub?cbq=1");
    expect(screen.queryByRole("dialog", { name: TITLE })).toBeNull();
    expect(screen.queryByTestId("cbq-try-free")).toBeNull(); // nothing flashes while auth loads
    auth.loading = false;
    auth.user = { uid: "u1" };
    r.rerender(
      <MemoryRouter initialEntries={["/practice-hub?cbq=1"]}>
        <Routes>
          <Route path="/practice-hub" element={<DesktopPracticePage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole("dialog", { name: TITLE })).toBeInTheDocument();
  });

  it.each([
    ["390 (phone)", false],
    ["1280 (desktop)", true],
  ])("★ signed-out at %s: no chooser on load, the free-chapter button is there, a tap opens it and is counted", (_w, desktop) => {
    setMatchMediaMatches(desktop);
    renderHub("/practice-hub?cbq=1");
    expect(screen.queryByRole("dialog", { name: TITLE })).toBeNull();
    const btn = screen.getByTestId("cbq-try-free");
    expect(btn).toHaveTextContent("Try CBQs free — pick a chapter");
    fireEvent.click(btn);
    expect(screen.getByRole("dialog", { name: TITLE })).toBeInTheDocument();
    expect(sale.calls).toContainEqual(["sale_moment_tap", { surface: "landing-practice-cbq", offer: "cbq_free_picker" }]);
  });

  it("without cbq=1 it does not open and shows no free-chapter button", () => {
    setMatchMediaMatches(false);
    renderHub("/practice-hub?cbq=0");
    expect(screen.queryByRole("dialog", { name: TITLE })).toBeNull();
    expect(screen.queryByTestId("cbq-try-free")).toBeNull();
  });

  it("without any param, signed-in: unchanged (closed)", () => {
    auth.user = { uid: "u1" };
    setMatchMediaMatches(true);
    renderHub("/practice-hub");
    expect(screen.queryByRole("dialog", { name: TITLE })).toBeNull();
  });
});

describe("CBQ-FREE-FIRST-1 — signed-out ad landing order (reverses the CBQ-LANDING-1 order)", () => {
  // Document order of two elements: -1 when a precedes b.
  const before = (a: Element, b: Element) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
  const mountSignedOut = async (desktop: boolean) => {
    vi.stubEnv("VITE_PACKS_ENABLED", "1"); // the offer renders only with packs on (as in production)
    window.history.replaceState(null, "", "/practice-hub?cbq=1"); // the offer reads the live URL
    setMatchMediaMatches(desktop);
    renderHub("/practice-hub?cbq=1");
    const offer = await screen.findByTestId("landing-offer");
    return { offer, free: screen.getByTestId("cbq-try-free") };
  };
  afterEach(() => {
    vi.unstubAllEnvs();
    window.history.replaceState(null, "", "/");
  });

  it.each([
    ["360 (phone)", false],
    ["1280 (desktop)", true],
  ])("★ at %s: heading, then the free-chapter button, then the pack offer, then the CBQ / Chapter Test cards", async (_w, desktop) => {
    const { offer, free } = await mountSignedOut(desktop);
    const heading = screen.getByRole("heading", { name: "What shall we practise?" });
    expect(before(heading, free)).toBe(true);
    expect(before(free, offer)).toBe(true);
    expect(before(offer, card())).toBe(true);
    // nothing sits between the button and the offer
    expect(free.nextElementSibling).toBe(offer);
  });

  it("the pack offer stays fully there: both buy buttons, free sample and Board Pass line; the picker is still closed", async () => {
    const { offer } = await mountSignedOut(false);
    expect(within(offer).getByTestId("landing-offer-buy-maths")).toBeInTheDocument();
    expect(within(offer).getByTestId("landing-offer-buy-science")).toBeInTheDocument();
    expect(within(offer).getByTestId("landing-offer-board-pass")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: TITLE })).toBeNull(); // no surprise modal on mount
  });

  it("while auth settles: no button yet (nothing flashes), a same-height slot holds the place, the offer is below it", () => {
    auth.loading = true;
    setMatchMediaMatches(false);
    const { container } = renderHub("/practice-hub?cbq=1");
    expect(screen.queryByTestId("cbq-try-free")).toBeNull();
    const slot = container.querySelector(".lt-cbq-tryfree-slot");
    expect(slot).not.toBeNull();
    expect(before(slot as Element, card())).toBe(true);
  });

  it("signed-out WITHOUT ?cbq=1 keeps the old place: the offer (if any) is under the entry cards, no free button", async () => {
    vi.stubEnv("VITE_PACKS_ENABLED", "1");
    window.history.replaceState(null, "", "/practice-hub");
    setMatchMediaMatches(false);
    const { container } = renderHub("/practice-hub");
    expect(screen.queryByTestId("cbq-try-free")).toBeNull();
    expect(container.querySelector(".lt-cbq-tryfree-slot")).toBeNull();
  });
});

describe("CBQ-ENTRY-1-FIX — the chooser opens on the viewport, not inside the page", () => {
  it("★ on a phone the overlay is portalled to document.body, outside the page's transformed <main>", () => {
    setMatchMediaMatches(false); // 390: MobileShell, whose <main class="animate-float-up"> keeps a transform
    const { container } = renderHub("/practice-hub?cbq=1");
    fireEvent.click(screen.getByTestId("cbq-try-free"));
    // CONTROL — the trap is present in this tree: the card lives inside the transformed main.
    expect(card().closest("main.animate-float-up"), "the phone page no longer renders inside <main class=animate-float-up>").not.toBeNull();
    const overlay = screen.getByTestId("cbq-picker");
    // A position:fixed overlay inside that <main> resolves against the main, not the
    // viewport — it opened page-tall with the chapter select and go button below the fold.
    expect(overlay.parentElement, "the CBQ overlay is not a direct child of document.body").toBe(document.body);
    expect(overlay.closest("main"), "the CBQ overlay is inside a <main>").toBeNull();
    expect(container.contains(overlay)).toBe(false);
  });
});

describe("CBQ-ENTRY-1 (E2) — the chooser", () => {
  it.each([
    ["390 (phone)", false],
    ["1440 (desktop)", true],
  ])("★ (b) at %s: Maths → Triangles lands on /practice/10/Maths?topic=triangles&preset=comp", async (_w, desktop) => {
    setMatchMediaMatches(desktop);
    renderHub("/practice-hub");
    fireEvent.click(card());
    const dialog = screen.getByRole("dialog", { name: TITLE });
    fireEvent.change(within(dialog).getByLabelText("Subject"), { target: { value: "Maths" } });
    fireEvent.change(within(dialog).getByLabelText("Chapter"), { target: { value: "triangles" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Open CBQs →" }));
    const probe = await screen.findByTestId("practice-route");
    expect(probe).toHaveTextContent("10/Maths");
    expect(probe.getAttribute("data-search")).toBe("?topic=triangles&preset=comp");
  });

  it("Science chapters land on the Science route", async () => {
    setMatchMediaMatches(true);
    auth.user = { uid: "u1" };
    renderHub("/practice-hub?cbq=1");
    const dialog = screen.getByRole("dialog", { name: TITLE });
    fireEvent.change(within(dialog).getByLabelText("Subject"), { target: { value: "Science" } });
    fireEvent.change(within(dialog).getByLabelText("Chapter"), { target: { value: "electricity" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Open CBQs →" }));
    const probe = await screen.findByTestId("practice-route");
    expect(probe).toHaveTextContent("10/Science");
    expect(probe.getAttribute("data-search")).toBe("?topic=electricity&preset=comp");
  });

  it("★ (d) a chapter with no real CBQs is listed 'coming soon' and cannot be opened", async () => {
    avail.without = new Set(["circles"]);
    setMatchMediaMatches(true);
    auth.user = { uid: "u1" };
    renderHub("/practice-hub?cbq=1");
    const dialog = screen.getByRole("dialog", { name: TITLE });
    // The check ran for the subject on screen, from the manifest (stubbed here).
    await waitFor(() => expect(avail.calls).toContain("Maths"));
    const circles = await within(dialog).findByRole("option", { name: "Circles — coming soon" });
    expect((circles as HTMLOptionElement).disabled).toBe(true);
    // The other chapters are unmarked and choosable.
    expect(within(dialog).getByRole("option", { name: "Triangles" })).not.toHaveProperty("disabled", true);

    // Even forced, the chooser never opens a coming-soon chapter.
    fireEvent.change(within(dialog).getByLabelText("Chapter"), { target: { value: "circles" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Open CBQs →" }));
    const probe = await screen.findByTestId("practice-route");
    expect(probe.getAttribute("data-search")).not.toContain("topic=circles");
  });

  it("CONTROL — with every chapter available, nothing is marked 'coming soon'", async () => {
    setMatchMediaMatches(true);
    auth.user = { uid: "u1" };
    renderHub("/practice-hub?cbq=1");
    const dialog = screen.getByRole("dialog", { name: TITLE });
    await waitFor(() => expect(avail.calls).toContain("Maths"));
    expect(within(dialog).getByRole("option", { name: "Circles" })).toBeInTheDocument();
    expect(within(dialog).queryByText(/coming soon/)).toBeNull();
  });
});
