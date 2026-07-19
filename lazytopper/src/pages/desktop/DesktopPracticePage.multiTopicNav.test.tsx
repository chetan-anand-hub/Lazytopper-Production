// DesktopPracticePage — QP MULTI-TOPIC entry nav proof [FU-PRACTICEHUB-MULTITOPIC].
// Renders the REAL hub at /practice-hub in a MemoryRouter, seeds a multi-topic scope via
// the URL (?scope=multi-topic&topics=a,b — the hub's own PR-K1B pre-select), and proves
// the end-to-end nav chain the build fixes: the "Start quick practice" CTA now carries the
// FULL topic SET (`topics=real-numbers,polynomials`) to /practice/:grade/:subject, instead
// of the old collapse to selectedTopicSlugs[0].
//
// This is the #484 lesson in practice: a ROUTING claim ("the URL carries the set") is
// proven router-mounted, not by the pure helper alone (the composition core has its own
// pure suite in components/practice/multiTopicPractice.test.ts).
//
// Signed-out mount on purpose: no focus context → the QP CTA navigates directly (no login
// wrapper), so the asserted URL is the raw practice path.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useParams } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));
vi.mock("../../services/mistakeLogService", () => ({
  getMistakeLogs: async () => [],
}));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));

import DesktopPracticePage from "./DesktopPracticePage";

afterEach(cleanup);

/** Probe standing in for App.tsx's real /practice/:grade/:subject route — captures the
 *  grade/subject params AND the raw query string so we can assert `topics=`. */
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

const startQuickPractice = () => screen.getByRole("button", { name: /start quick practice/i });

describe("Practice hub QP multi-topic entry (FU-PRACTICEHUB-MULTITOPIC)", () => {
  it("multi-topic scope → the QP CTA carries the FULL topic set (topics=a,b), not just the first", () => {
    setMatchMediaMatches(true);
    renderHub("/practice-hub?scope=multi-topic&topics=real-numbers,polynomials");
    fireEvent.click(startQuickPractice());
    const probe = screen.getByTestId("practice-route");
    expect(probe).toHaveTextContent("10/Maths");
    const search = probe.getAttribute("data-search") ?? "";
    const params = new URLSearchParams(search);
    // The SET is carried — the whole point of the fix.
    expect(params.get("topics")).toBe("real-numbers,polynomials");
    // And it did NOT collapse to a single-topic `topic=` param.
    expect(params.get("topic")).toBeNull();
    // The preset chooser is still reachable (source=practice is the discriminator).
    expect(params.get("source")).toBe("practice");
  });

  it("mobile: the SAME responsive hub carries the set (reflow is CSS-only)", () => {
    setMatchMediaMatches(false);
    renderHub("/practice-hub?scope=multi-topic&topics=real-numbers,polynomials");
    fireEvent.click(startQuickPractice());
    const params = new URLSearchParams(
      screen.getByTestId("practice-route").getAttribute("data-search") ?? "",
    );
    expect(params.get("topics")).toBe("real-numbers,polynomials");
  });

  it("Science multi-topic scope carries its own set to /practice/10/Science", () => {
    setMatchMediaMatches(true);
    renderHub(
      "/practice-hub?subject=Science&scope=multi-topic&topics=chemical-reactions-and-equations,life-processes",
    );
    fireEvent.click(startQuickPractice());
    const probe = screen.getByTestId("practice-route");
    expect(probe).toHaveTextContent("10/Science");
    const params = new URLSearchParams(probe.getAttribute("data-search") ?? "");
    expect(params.get("topics")).toBe("chemical-reactions-and-equations,life-processes");
  });

  it("single-topic scope is UNCHANGED — it still carries topic= (byte-identical path)", () => {
    setMatchMediaMatches(true);
    renderHub("/practice-hub?scope=topic&topic=real-numbers");
    fireEvent.click(startQuickPractice());
    const params = new URLSearchParams(
      screen.getByTestId("practice-route").getAttribute("data-search") ?? "",
    );
    expect(params.get("topic")).toBe("real-numbers");
    expect(params.get("topics")).toBeNull(); // no plural param on the single-topic path
  });
});
