// PERF-2 PR-B2 — the login / sign-up door is its own chunk, so it must be as early as it was when it sat in
// the entry, and it must never show a "Loading..." card:
//   (a) a direct visit to /login or /sign-up starts the chunk fetch the moment the entry evaluates;
//   (b) a visit anywhere else does NOT fetch it (the whole point: public pages stay lighter);
//   (c) pointing at, focusing or touching a link to /login or /sign-up starts it before the tap lands,
//       and a link to anything else does not;
//   (d) the four door routes wait on an EMPTY fallback (withBareSuspense), not the "Loading..." card.

import { describe, it, expect, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const loaded = vi.hoisted(() => ({ login: 0 }));

async function loadAppAt(path: string): Promise<void> {
  loaded.login = 0;
  window.history.pushState({}, "", path);
  vi.resetModules();
  // doMock (not mock): the factory must run again for every fresh module graph, so the counter sees each load
  vi.doMock("./pages/Login", () => {
    loaded.login += 1;
    return { default: () => null, AuthDoor: () => null };
  });
  await import("./App");
}

afterEach(() => {
  document.body.innerHTML = "";
  window.history.pushState({}, "", "/");
});

function linkTo(href: string): HTMLAnchorElement {
  const a = document.createElement("a");
  a.setAttribute("href", href);
  a.textContent = "x";
  document.body.appendChild(a);
  return a;
}

describe("login door chunk timing", () => {
  it("(a) a direct visit to /login, /login/x and /sign-up starts the chunk at entry", async () => {
    for (const path of ["/login", "/login/phone", "/sign-up"]) {
      await loadAppAt(path);
      await new Promise((r) => setTimeout(r, 80));
      expect(loaded.login, path).toBeGreaterThan(0);
    }
  });

  it("(b) CONTROL: a public page does not fetch it", async () => {
    for (const path of ["/", "/check-your-answer", "/notes/trigonometry", "/loginfoo"]) {
      await loadAppAt(path);
      await new Promise((r) => setTimeout(r, 80));
      expect(loaded.login, path).toBe(0);
    }
  });

  it("(c) intent on a link to the door starts it; intent on any other link does not", async () => {
    await loadAppAt("/pricing");
    expect(loaded.login).toBe(0);
    linkTo("/practice-hub").dispatchEvent(new Event("pointerover", { bubbles: true }));
    linkTo("/loginfoo").dispatchEvent(new Event("focusin", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 80));
    expect(loaded.login).toBe(0);
    linkTo("/login?returnTo=%2Fpractice-hub").dispatchEvent(new Event("pointerover", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 80));
    expect(loaded.login).toBeGreaterThan(0);

    await loadAppAt("/pricing");
    linkTo("/sign-up").dispatchEvent(new Event("touchstart", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 80));
    expect(loaded.login).toBeGreaterThan(0);
  });
});

describe("login door boundary", () => {
  it("(d) the four door routes use the bare boundary; the lazy loader is shared", () => {
    const src = readFileSync(resolve(__dirname, "App.tsx"), "utf8");
    for (const [path, comp] of [["/login", "Login"], ["/login/*", "Login"], ["/sign-up", "SignUpPage"], ["/sign-up/*", "SignUpPage"]]) {
      expect(src).toContain(`<Route path="${path}" element={withBareSuspense(<${comp} />)} />`);
    }
    expect(src).toContain("const Login = lazy(loadLoginDoor);");
    // CONTROL: the route boundary that shows the "Loading..." card is not used for the door
    expect(src).not.toMatch(/path="\/(login|sign-up)(\/\*)?" element=\{withRouteSuspense/);
  });
});
