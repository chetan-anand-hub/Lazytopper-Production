/**
 * PACKS-CONVERT-1 review - the wall's lazy WallPackBuy chunk fails to load (offline, a deploy mid-session). The download wall must
 * stay up with the old generic packs link, and nothing may throw to an outer error boundary.
 *
 * A separate file because the chunk is mocked to REJECT for every import here.
 */
import { Component, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "stu-1" }, loading: false }) }));
// Every import of the chunk rejects (vitest wraps the throw; the retry itself is covered by lazyWithRetry's own tests).
vi.mock("./WallPackBuy", () => {
  throw new Error("Importing a module script failed.");
});

import DownloadLimitWall from "./DownloadLimitWall";

class Boundary extends Component<{ onError: (e: unknown) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? <p>Something went wrong</p> : this.props.children;
  }
}

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("WallPackBuy chunk failure", () => {
  it("a rejected import renders the old generic packs link; the wall stays and no outer boundary fires", async () => {
    vi.stubEnv("VITE_PACKS_ENABLED", "1");
    const onError = vi.fn();
    render(
      <Boundary onError={onError}>
        <MemoryRouter initialEntries={["/notes/triangles"]}>
          <DownloadLimitWall variant="blocked" resetAt={null} onClose={() => {}} />
        </MemoryRouter>
      </Boundary>,
    );
    const link = await screen.findByTestId("wall-pack-link", {}, { timeout: 4000 });
    expect(link.querySelector("a")!.getAttribute("href")).toBe("/pricing?chapter=triangles#packs");
    expect(screen.getByTestId("download-wall")).toBeTruthy();
    expect(screen.queryByTestId("wall-pack-buy")).toBeNull();
    expect(screen.queryByText("Something went wrong")).toBeNull();
    expect(onError).not.toHaveBeenCalled();
  });
});
