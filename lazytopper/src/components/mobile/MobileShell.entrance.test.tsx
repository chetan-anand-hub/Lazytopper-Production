/**
 * LOW-END-3 PR-2 (e) — the page load's own route does not fade its content in.
 *
 * Starting the prerendered content at opacity 0 kept it out of LCP until a later repaint (Notes,
 * Predicted Questions). The fade-in stays for in-app navigation. The class is kept on every shell
 * (other tests and the fixed-position notes rely on it); only the animation is switched off, and the
 * settled transform is kept so `position: fixed` descendants keep the same containing block.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { MobileShell } from "./MobileShell";

// The account menu reads auth; it is not what this file pins.
vi.mock("./MobileAccountMenu", () => ({ MobileAccountMenu: () => null }));

function Go({ to }: { to: string }) {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(to)}>
      go
    </button>
  );
}

function app(start = "/a") {
  return (
    <MemoryRouter initialEntries={[start]}>
      <Go to="/b" />
      <Routes>
        <Route path="/a" element={<MobileShell title="A"><p>page a</p></MobileShell>} />
        <Route path="/b" element={<MobileShell title="B"><p>page b</p></MobileShell>} />
        <Route path="/plain" element={<p>no shell here</p>} />
      </Routes>
    </MemoryRouter>
  );
}

afterEach(cleanup);

describe("MobileShell entrance animation", () => {
  it("the page load's own route: class kept, animation off, settled transform kept", () => {
    render(app());
    const main = screen.getByText("page a").closest("main") as HTMLElement;
    expect(main.className).toBe("animate-float-up");
    expect(main.style.animation).toBe("none");
    expect(main.style.transform).toBe("translateY(0)");
  });

  it("a shell MOUNTED by an in-app navigation fades in, exactly as before", async () => {
    render(app("/plain"));
    await act(async () => {
      fireEvent.click(screen.getByText("go"));
    });
    const main = screen.getByText("page b").closest("main") as HTMLElement;
    expect(main.className).toBe("animate-float-up");
    expect(main.style.animation).toBe("");
    expect(main.style.transform).toBe("");
  });

  it("a shell KEPT across an in-app navigation keeps its mount-time decision (no late fade-in)", async () => {
    render(app("/a"));
    const before = screen.getByText("page a").closest("main") as HTMLElement;
    await act(async () => {
      fireEvent.click(screen.getByText("go"));
    });
    const main = screen.getByText("page b").closest("main") as HTMLElement;
    // React kept the same shell (same position, same type): today it does not replay the
    // animation on such a navigation, and it still does not.
    expect(main).toBe(before);
    expect(main.style.animation).toBe("none");
  });
});
