import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Suspense } from "react";

/**
 * ASSET-RELOAD-1 (B) — the boundary + lazy wiring. The reload helper is wrapped so the clock,
 * and the reload itself, are injected (jsdom cannot navigate, and the repo's clock guard keeps
 * wall-clock reads out of tests that are not on the date-sensitive list). The REAL helper runs.
 */
const NOW = 1_000_000;
const reload = vi.fn();
vi.mock("./chunkReload", async () => {
  const actual = await vi.importActual<typeof import("./chunkReload")>("./chunkReload");
  return {
    ...actual,
    recoverFromChunkError: (error: unknown) =>
      actual.recoverFromChunkError(error, {
        now: () => NOW,
        reload,
        fetchFn: async () => ({}),
        timeoutMs: 20,
      }),
  };
});

import { ErrorBoundary } from "../components/ErrorBoundary";
import { lazyWithRetry } from "./lazyWithRetry";
import { CHUNK_RELOAD_KEY, resetChunkReloadPending } from "./chunkReload";

const chunkError = () =>
  new TypeError("Failed to fetch dynamically imported module: https://www.lazytopper.com/assets/PricingPage-BvCbdRTL.js?retry=2");

function Failing(): never {
  throw chunkError();
}

afterEach(() => {
  cleanup();
  reload.mockReset();
  resetChunkReloadPending();
  window.sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  vi.restoreAllMocks();
});

describe("ErrorBoundary + lazyWithRetry (jsdom)", () => {
  it("a lost chunk shows a neutral status, reloads once, and never paints 'Something went wrong'", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <ErrorBoundary level="global">
        <Failing />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).toBeNull();
    expect(window.sessionStorage.getItem(CHUNK_RELOAD_KEY)).toBe(String(NOW));
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it("the guard has already fired: the normal error screen shows and nothing reloads", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(NOW - 1000));
    render(
      <ErrorBoundary level="global">
        <Failing />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 60));
    expect(reload).not.toHaveBeenCalled();
  });

  it("a non-chunk render error keeps today's error screen and never touches the guard", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    function Boom(): never {
      throw new Error("render bug");
    }
    render(
      <ErrorBoundary level="global">
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(window.sessionStorage.getItem(CHUNK_RELOAD_KEY)).toBeNull();
    expect(reload).not.toHaveBeenCalled();
  });

  it("a lazyWithRetry route whose chunk is gone reaches the boundary, which reloads once (call-site proof)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const Gone = lazyWithRetry(() => Promise.reject(new TypeError("Importing a module script failed.")));
    render(
      <ErrorBoundary level="section">
        <Suspense fallback={<p>loading</p>}>
          <Gone />
        </Suspense>
      </ErrorBoundary>,
    );
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(screen.queryByText("This section ran into an issue")).toBeNull();
  });

  it("a second boundary catching a chunk error on the same page shows the updating state, not its section error, and the page reloads once", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <>
        <ErrorBoundary level="global">
          <Failing />
        </ErrorBoundary>
        <ErrorBoundary level="section">
          <Failing />
        </ErrorBoundary>
      </>,
    );
    expect(screen.getAllByRole("status")).toHaveLength(2);
    expect(screen.queryByText("This section ran into an issue")).toBeNull();
    expect(screen.queryByText("Something went wrong")).toBeNull();
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 60));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("the updating state carries the CSS class (global level adds the full-height modifier), no inline style", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <ErrorBoundary level="global">
        <Failing />
      </ErrorBoundary>,
    );
    const node = screen.getByRole("status");
    expect(node.className).toContain("error-boundary-updating");
    expect(node.className).toContain("error-boundary-updating--global");
    expect(node.getAttribute("style")).toBeNull();
  });
});
