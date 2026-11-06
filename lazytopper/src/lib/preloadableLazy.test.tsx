import { describe, expect, it } from "vitest";
import { Suspense } from "react";
import { act, render, screen } from "@testing-library/react";
import { preloadableLazy } from "./preloadableLazy";

function Hello({ who }: { who: string }) {
  return <p data-testid="hello">hello {who}</p>;
}

describe("SPEED-SITE-2a preloadableLazy", () => {
  it("once preloaded, the FIRST render is direct: no Suspense fallback is ever committed", async () => {
    const C = preloadableLazy(() => Promise.resolve({ default: Hello }));
    expect(C.isLoaded()).toBe(false);
    await C.preload();
    expect(C.isLoaded()).toBe(true);
    render(
      <Suspense fallback={<p data-testid="fallback">loading</p>}>
        <C who="asha" />
      </Suspense>,
    );
    // Synchronous: rendered in the first commit, the fallback never appeared.
    expect(screen.getByTestId("hello").textContent).toBe("hello asha");
    expect(screen.queryByTestId("fallback")).toBeNull();
  });

  it("not preloaded: behaves like React.lazy under the nearest Suspense", async () => {
    let release: (m: { default: typeof Hello }) => void = () => {};
    const C = preloadableLazy(() => new Promise<{ default: typeof Hello }>((r) => (release = r)));
    render(
      <Suspense fallback={<p data-testid="fallback">loading</p>}>
        <C who="ravi" />
      </Suspense>,
    );
    expect(screen.getByTestId("fallback")).toBeTruthy();
    await act(async () => release({ default: Hello }));
    expect(screen.getByTestId("hello").textContent).toBe("hello ravi");
  });

  it("fetches the module once, however many preloads and renders ask", async () => {
    let calls = 0;
    const C = preloadableLazy(() => {
      calls += 1;
      return Promise.resolve({ default: Hello });
    });
    await Promise.all([C.preload(), C.preload()]);
    render(<C who="x" />);
    render(<C who="y" />);
    expect(calls).toBe(1);
  });

  it("a failed preload never rejects, and a later preload tries again", async () => {
    let calls = 0;
    const C = preloadableLazy(() => {
      calls += 1;
      return calls === 1 ? Promise.reject(new Error("boom")) : Promise.resolve({ default: Hello });
    });
    await expect(C.preload()).resolves.toBeUndefined();
    expect(C.isLoaded()).toBe(false);
    await C.preload();
    expect(C.isLoaded()).toBe(true);
  });
});
