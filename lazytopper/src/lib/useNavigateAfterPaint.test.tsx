// SPEED-HUB-3 (review F2) — useNavigateAfterPaint: one push per gesture, and a pending push is
// CANCELLED when the component unmounts or the location changes before it fires.
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
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
