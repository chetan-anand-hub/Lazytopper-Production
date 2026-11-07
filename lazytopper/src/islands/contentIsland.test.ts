import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  activateTab,
  describe as describeControl,
  handleOwned,
  hasAuthRecordSync,
  isReactOwned,
  onClick,
  openAnchor,
  resolve,
  BOTTOM_NAV_ROUTES,
  nav,
} from "./contentIsland";

/**
 * SPEED-ISLANDS-1 — the island's controls against markup shaped like the prerendered pages (Note.tsx,
 * NoteMindmapTree.tsx, SolutionsPage.tsx, App.tsx's bottom bar). Rule b: an owned control works here; anything
 * else is a navigation or is held for the app — never swallowed.
 */

const NOTE = `
<div id="root">
  <div class="lt-notes-page">
    <div class="lt-note">
      <div class="lt-note__tabbar"><div class="lt-note__tabs" role="tablist">
        <button type="button" role="tab" aria-selected="true" class="lt-note__tab lt-note__tab--active">Note</button>
        <button type="button" role="tab" aria-selected="false" class="lt-note__tab">Formulae &amp; Tricks</button>
        <button type="button" role="tab" aria-selected="false" class="lt-note__tab">Proof</button>
        <button type="button" role="tab" aria-selected="false" class="lt-note__tab">Competency-based questions</button>
      </div><button type="button" class="lt-note__pdf-btn">Download PDF</button></div>
      <div class="lt-note__panel lt-note__panel--active"><p class="lt-note__tricks-link"><a href="#shortcuts">Shortcuts</a></p>
        <div class="lt-note__ex"><button type="button" class="lt-note__ex-head" aria-expanded="false">Example 1</button></div></div>
      <div class="lt-note__panel"><section id="shortcuts">S</section>
        <ul><li><button type="button" class="lt-note__mm-node lt-note__mm-node--toggle" aria-expanded="true"><span class="lt-note__mm-caret lt-note__mm-caret--open">▸</span>Branch</button><ul class="lt-note__mm-kids"><li>leaf</li></ul></li></ul></div>
      <div class="lt-note__panel">P</div>
      <div class="lt-note__panel">Q</div>
    </div>
  </div>
  <article id="q1" class="lt-ncs__q">
    <div class="lt-ncs__hintbox"><button type="button" class="lt-ncs__hintbtn" aria-expanded="false" aria-controls="ncs-hint-q1">Stuck? Show a hint</button>
    <div id="ncs-hint-q1" class="lt-ncs__hint" hidden="">Step 1</div></div>
    <ol class="lt-ncs__opts"><li><button type="button" class="lt-ncs__opt" aria-pressed="false">(a) 1</button></li></ol>
  </article>
  <a id="plain" href="/notes/polynomials">Polynomials</a>
  <div data-lt-bottomnav=""><button>Home</button><button>Practice</button><button>Pricing</button></div>
</div>`;

const click = (el: Element) => {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
  Object.defineProperty(event, "target", { value: el });
  onClick(event);
  return event;
};

beforeEach(() => {
  document.body.innerHTML = NOTE;
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("owned controls", () => {
  it("tabs show their panel and only their panel (Note.tsx: panels render unconditionally)", () => {
    const tabs = document.querySelectorAll('[role="tab"]');
    expect(handleOwned(tabs[2])).toBe(true);
    const panels = [...document.querySelectorAll(".lt-note__panel")];
    expect(panels.map((p) => p.classList.contains("lt-note__panel--active"))).toEqual([false, false, true, false]);
    expect([...tabs].map((t) => t.getAttribute("aria-selected"))).toEqual(["false", "false", "true", "false"]);
  });

  it("a mind-map branch collapses and expands its children (NoteMindmapTree: CSS-hidden, never unmounted)", () => {
    const node = document.querySelector(".lt-note__mm-node--toggle") as HTMLElement;
    handleOwned(node);
    expect(node.getAttribute("aria-expanded")).toBe("false");
    expect(node.nextElementSibling?.classList.contains("lt-note__mm-kids--collapsed")).toBe(true);
    expect(node.querySelector(".lt-note__mm-caret")?.classList.contains("lt-note__mm-caret--open")).toBe(false);
    handleOwned(node);
    expect(node.nextElementSibling?.classList.contains("lt-note__mm-kids--collapsed")).toBe(false);
  });

  it("a hint shows its step (the step is in the markup, hidden)", () => {
    const btn = document.querySelector(".lt-ncs__hintbtn") as HTMLElement;
    expect(handleOwned(btn)).toBe(true);
    expect((document.getElementById("ncs-hint-q1") as HTMLElement).hidden).toBe(false);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
  });

  it("print", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    expect(handleOwned(document.querySelector(".lt-note__pdf-btn") as Element)).toBe(true);
    expect(print).toHaveBeenCalledOnce();
  });

  it("an anchor on a hidden tab opens that tab and scrolls to it; one on no tab is left to the browser", () => {
    expect(openAnchor("shortcuts")).toBe(true);
    expect(document.querySelectorAll(".lt-note__panel")[1].classList.contains("lt-note__panel--active")).toBe(true);
    expect(openAnchor("nope")).toBe(false);
  });

  it("the shortcuts link is handled without a URL change (Note.tsx writes none)", () => {
    const event = click(document.querySelector('a[href="#shortcuts"]') as Element);
    expect(event.defaultPrevented).toBe(true);
    expect(document.querySelectorAll(".lt-note__panel")[1].classList.contains("lt-note__panel--active")).toBe(true);
  });
});

describe("rule b — nothing the island does not own is swallowed", () => {
  it("a plain link is a real navigation (not prevented)", () => {
    expect(click(document.getElementById("plain") as Element).defaultPrevented).toBe(false);
  });

  it("bottom-bar items navigate to the app's routes; Pricing (tracked) is held for the app", () => {
    const assign = vi.spyOn(nav, "go").mockImplementation(() => undefined);
    const [home, practice] = document.querySelectorAll("[data-lt-bottomnav] button");
    click(home);
    click(practice);
    expect(assign.mock.calls.map((c) => c[0])).toEqual([BOTTOM_NAV_ROUTES.Home, BOTTOM_NAV_ROUTES.Practice]);
    expect(BOTTOM_NAV_ROUTES).not.toHaveProperty("Pricing");
  });

  it("a control React already owns is never touched", () => {
    const opt = document.querySelector(".lt-ncs__opt") as Element;
    (opt as unknown as Record<string, unknown>)["__reactFiber$abc"] = {};
    expect(isReactOwned(opt)).toBe(true);
    expect(click(opt).defaultPrevented).toBe(false);
  });
});

describe("finding the same control in the app's render", () => {
  it("describe → resolve returns the React-owned twin, never the served copy", () => {
    const head = document.querySelector(".lt-note__ex-head") as Element;
    const d = describeControl(head);
    expect(resolve(d)).toBeNull(); // only the served (non-React) copy exists
    const twin = head.cloneNode(true) as Element;
    (twin as unknown as Record<string, unknown>)["__reactFiber$x"] = {};
    head.parentElement?.appendChild(twin);
    expect(resolve(d)).toBe(twin);
  });

  it("scoped by the nearest id: the option of question q1", () => {
    const opt = document.querySelector(".lt-ncs__opt") as Element;
    const d = describeControl(opt);
    expect(d.scopeId).toBe("q1");
    expect(d.ordinal).toBe(0);
  });
});

describe("rule a — a signed-in record means the full app", () => {
  it("Firebase's localStorage persistence and the local dev session count; nothing else does", () => {
    expect(hasAuthRecordSync()).toBe(false);
    window.localStorage.setItem("lazytopper.theme", "light");
    expect(hasAuthRecordSync()).toBe(false);
    window.localStorage.setItem("firebase:authUser:key:[DEFAULT]", "{}");
    expect(hasAuthRecordSync()).toBe(true);
    window.localStorage.clear();
    window.sessionStorage.setItem("firebase:authUser:key:[DEFAULT]", "{}");
    expect(hasAuthRecordSync()).toBe(true);
    window.sessionStorage.clear();
    window.localStorage.setItem("lazytopper.auth.local.v1", "{}");
    expect(hasAuthRecordSync()).toBe(true);
  });
});

describe("activateTab", () => {
  it("ignores an index the note does not have", () => {
    const root = document.querySelector(".lt-note") as Element;
    activateTab(root, 9);
    expect(document.querySelectorAll(".lt-note__panel")[0].classList.contains("lt-note__panel--active")).toBe(true);
  });
});
