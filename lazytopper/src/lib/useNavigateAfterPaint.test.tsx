// SPEED-HUB-3 (review F2) — useNavigateAfterPaint: one push per gesture, and a pending push is
// CANCELLED when the component unmounts or the location changes before it fires.
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Suspense, lazy, useState } from "react";
import { useNavigateAfterPaint } from "./useNavigateAfterPaint";

afterEach(cleanup);

/** Resolves after the deferral would have fired (rAF + task + the 100 ms fallback). */
const settle = () => act(() => new Promise<void>((r) => setTimeout(r, 200)));

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname}</div>;
}

function Tapper({ to }: { to: string }) {
  const go = useNavigateAfterPaint();
  return (
    <button type="button" onClick={() => go(to)}>
      go
    </button>
  );
}

function Harness() {
  const [show, setShow] = useState(true);
  const navigate = useNavigate();
  return (
    <>
      {show ? <Tapper to="/dest" /> : null}
      <button type="button" onClick={() => setShow(false)}>
        unmount
      </button>
      <button type="button" onClick={() => navigate("/elsewhere")}>
        elsewhere
      </button>
      <button type="button" onClick={() => navigate(-1)}>
        back
      </button>
      <Where />
    </>
  );
}

function renderAt(path = "/start") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<Harness />} />
      </Routes>
    </MemoryRouter>,
  );
}
const where = () => screen.getByTestId("where").textContent;

describe("useNavigateAfterPaint", () => {
  it("navigates after the paint, not inside the tap; a double tap pushes once", async () => {
    renderAt();
    fireEvent.click(screen.getByRole("button", { name: "go" }));
    fireEvent.click(screen.getByRole("button", { name: "go" }));
    expect(where()).toBe("/start");
    await settle();
    expect(where()).toBe("/dest");
    fireEvent.click(screen.getByRole("button", { name: "back" }));
    expect(where()).toBe("/start");
  });

  it("CANCELS a pending navigation when the component unmounts first", async () => {
    renderAt();
    fireEvent.click(screen.getByRole("button", { name: "go" }));
    fireEvent.click(screen.getByRole("button", { name: "unmount" }));
    await settle();
    expect(where()).toBe("/start");
  });

  it("CANCELS a pending navigation when the location changes first (another navigation)", async () => {
    renderAt();
    fireEvent.click(screen.getByRole("button", { name: "go" }));
    fireEvent.click(screen.getByRole("button", { name: "elsewhere" }));
    await settle();
    expect(where()).toBe("/elsewhere");
  });

  it("after a cancelled navigation the next tap works again", async () => {
    renderAt();
    fireEvent.click(screen.getByRole("button", { name: "go" }));
    fireEvent.click(screen.getByRole("button", { name: "elsewhere" }));
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "go" }));
    await settle();
    expect(where()).toBe("/dest");
  });
});

// ★ B1 (#1632 delta review) — the PRODUCTION router. BrowserRouter commits location changes in a
// transition: while the other destination's route is still loading, the URL has moved but this
// component is still mounted with the OLD location, so the effect cleanup has not cancelled the
// pending push. The hook must still drop it (it compares the browser's own location).
const NeverLoads = lazy(() => new Promise<{ default: () => null }>(() => {}));

function BrowserHarness() {
  const go = useNavigateAfterPaint();
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => go("/dest")}>
        go
      </button>
      <button type="button" onClick={() => navigate("/elsewhere")}>
        elsewhere
      </button>
    </>
  );
}

function renderBrowser() {
  render(
    <BrowserRouter>
      <Suspense fallback={<p>loading</p>}>
        <Routes>
          <Route path="/start" element={<BrowserHarness />} />
          <Route path="/elsewhere" element={<NeverLoads />} />
          <Route path="/back-target" element={<NeverLoads />} />
          <Route path="/dest" element={<p>dest</p>} />
        </Routes>
      </Suspense>
    </BrowserRouter>,
  );
}

describe("useNavigateAfterPaint — BrowserRouter with the other route still loading", () => {
  it("another navigation started before the deferred push fires: the push is dropped", async () => {
    window.history.replaceState(null, "", "/start");
    renderBrowser();
    fireEvent.click(screen.getByRole("button", { name: "go" }));
    fireEvent.click(screen.getByRole("button", { name: "elsewhere" }));
    await act(() => new Promise<void>((r) => setTimeout(r, 250)));
    expect(window.location.pathname).toBe("/elsewhere");
  });

  it("Back (popstate) before the deferred push fires: the push is dropped", async () => {
    window.history.replaceState(null, "", "/back-target");
    window.history.pushState({ idx: 1, key: "start" }, "", "/start");
    renderBrowser();
    fireEvent.click(screen.getByRole("button", { name: "go" }));
    await act(async () => {
      window.history.back();
      await new Promise<void>((r) => setTimeout(r, 250));
    });
    expect(window.location.pathname).toBe("/back-target");
  });

  it("CONTROL: with nothing in between, the deferred push still lands on BrowserRouter", async () => {
    window.history.replaceState(null, "", "/start");
    renderBrowser();
    fireEvent.click(screen.getByRole("button", { name: "go" }));
    await act(() => new Promise<void>((r) => setTimeout(r, 250)));
    expect(window.location.pathname).toBe("/dest");
  });
});
