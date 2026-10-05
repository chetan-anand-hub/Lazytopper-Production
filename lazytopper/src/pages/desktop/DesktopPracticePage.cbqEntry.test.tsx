// CBQ-ENTRY-1 — the Practice Hub's "Competency-based questions" card and its chooser.
//
// Router-mounted, the REAL hub at /practice-hub with a probe on /practice/:grade/:subject,
// so a routing claim is proven by where the app actually lands (the #484 lesson).
// (a) the card renders at phone and desktop width, above the scope card; (b) Maths →
// Triangles lands on the E3 URL; (e) `?cbq=1` arrives with the chooser open; and the
// chooser lists a chapter with no real CBQs as "coming soon" and will not open it.
// The per-chapter CBQ check (cbqAvailability, real-bank tested in its own suite) is
// stubbed here so this suite controls which chapters have CBQs.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useParams } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

const avail = vi.hoisted(() => ({ without: new Set<string>(), calls: [] as string[] }));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));
vi.mock("../../services/mistakeLogService", () => ({
  getMistakeLogs: async () => [],
}));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../../components/practice/cbqAvailability", () => ({
  chaptersWithCbqs: async (subject: string, slugs: readonly string[]) => {
    avail.calls.push(subject);
    return new Set(slugs.filter((s) => !avail.without.has(s)));
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
const LINE = "Case-based questions like the board paper's Section E — pick a chapter";
const card = () => screen.getByRole("button", { name: (name) => name.startsWith(TITLE) });

beforeEach(() => {
  avail.without = new Set();
  avail.calls = [];
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

describe("CBQ-ENTRY-1 (E4) — the ad link", () => {
  it("★ (e) /practice-hub?cbq=1 arrives with the chooser already open", () => {
    setMatchMediaMatches(false);
    renderHub("/practice-hub?cbq=1");
    expect(screen.getByRole("dialog", { name: TITLE })).toBeInTheDocument();
  });

  it("without cbq=1 it does not open", () => {
    setMatchMediaMatches(false);
    renderHub("/practice-hub?cbq=0");
    expect(screen.queryByRole("dialog", { name: TITLE })).toBeNull();
  });
});

describe("CBQ-ENTRY-1-FIX — the chooser opens on the viewport, not inside the page", () => {
  it("★ on a phone the overlay is portalled to document.body, outside the page's transformed <main>", () => {
    setMatchMediaMatches(false); // 390: MobileShell, whose <main class="animate-float-up"> keeps a transform
    const { container } = renderHub("/practice-hub?cbq=1");
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
    renderHub("/practice-hub?cbq=1");
    const dialog = screen.getByRole("dialog", { name: TITLE });
    // The check ran for the subject on screen, from the bank (stubbed here).
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
    renderHub("/practice-hub?cbq=1");
    const dialog = screen.getByRole("dialog", { name: TITLE });
    await waitFor(() => expect(avail.calls).toContain("Maths"));
    expect(within(dialog).getByRole("option", { name: "Circles" })).toBeInTheDocument();
    expect(within(dialog).queryByText(/coming soon/)).toBeNull();
  });
});
