/**
 * LOW-END-3 PR-2 (e) — the hydration building blocks in `lib/prerenderHydration.ts`.
 *   - `lazyWithPreload`: once preloaded, the first render does not suspend (so a hydrating route
 *     boundary is never left dehydrated for an early update to throw away).
 *   - `insertRouteSuspenseMarkers`: the comments React's Suspense hydration expects, around
 *     exactly the route region, and nothing when there is no region.
 *   - `useHydrated`: false only while hydrating; true on a client render.
 */
import { describe, it, expect, afterEach } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { Suspense } from "react";
import { hydrateRoot } from "react-dom/client";
import { insertRouteSuspenseMarkers, lazyWithPreload, useHydrated } from "./prerenderHydration";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("lazyWithPreload", () => {
  it("before preload it suspends like React.lazy; after preload it renders in the same pass", async () => {
    let loads = 0;
    const Page = lazyWithPreload(async () => {
      loads += 1;
      return { default: () => <p>real page</p> };
    });
    // Not preloaded: the first render shows the fallback.
    const first = render(
      <Suspense fallback={<p>fallback</p>}>
        <Page />
      </Suspense>,
    );
    expect(first.container.textContent).toBe("fallback");
    await act(async () => {
      await Page.preload();
    });
    expect(first.container.textContent).toBe("real page");
    first.unmount();

    // A second lazy, preloaded BEFORE its first render: no fallback at any point.
    const Preloaded = lazyWithPreload(async () => ({ default: () => <p>ready</p> }));
    await Preloaded.preload();
    const second = render(
      <Suspense fallback={<p>fallback</p>}>
        <Preloaded />
      </Suspense>,
    );
    expect(second.container.textContent).toBe("ready");
    expect(loads).toBe(1);
  });

  it("a failed load can be retried (the pending promise is dropped)", async () => {
    let attempt = 0;
    const Page = lazyWithPreload(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error("boom");
      return { default: () => <p>ok</p> };
    });
    await expect(Page.preload()).rejects.toThrow("boom");
    await expect(Page.preload()).resolves.toBeUndefined();
  });
});

describe("insertRouteSuspenseMarkers", () => {
  function root(inner: string): HTMLElement {
    const el = document.createElement("div");
    el.innerHTML = inner;
    return el;
  }

  it("wraps start mark .. LAST end mark among the siblings, and nothing else", () => {
    const el = root(
      '<header>chrome</header><main><template data-lt-route="start"></template><p>a</p>' +
        '<template data-lt-route="end"></template><p>b</p><template data-lt-route="end"></template></main><nav>x</nav>',
    );
    expect(insertRouteSuspenseMarkers(el)).toBe(true);
    expect(el.innerHTML).toBe(
      '<header>chrome</header><main><!--$--><template data-lt-route="start"></template><p>a</p>' +
        '<template data-lt-route="end"></template><p>b</p><template data-lt-route="end"></template><!--/$--></main><nav>x</nav>',
    );
  });

  it("touches nothing without a complete region (the empty shell, an unpaired mark)", () => {
    const shell = root("");
    expect(insertRouteSuspenseMarkers(shell)).toBe(false);
    expect(shell.innerHTML).toBe("");
    const unpaired = root('<template data-lt-route="start"></template><p>x</p>');
    expect(insertRouteSuspenseMarkers(unpaired)).toBe(false);
    expect(unpaired.innerHTML).toBe('<template data-lt-route="start"></template><p>x</p>');
  });
});

describe("useHydrated", () => {
  function Probe() {
    return <span>{useHydrated() ? "client" : "hydrating"}</span>;
  }

  it("is true on a client (createRoot) render", () => {
    const { container } = render(<Probe />);
    expect(container.textContent).toBe("client");
  });

  it("is false while hydrating (so the markup matches the capture) and true right after", async () => {
    const host = document.createElement("div");
    host.innerHTML = "<span>hydrating</span>";
    document.body.appendChild(host);
    const span = host.querySelector("span");
    const errors: unknown[] = [];
    await act(async () => {
      hydrateRoot(host, <Probe />, { onRecoverableError: (error) => errors.push(error) });
    });
    expect(errors).toEqual([]);
    expect(host.textContent).toBe("client");
    expect(host.querySelector("span")).toBe(span);
  });
});
