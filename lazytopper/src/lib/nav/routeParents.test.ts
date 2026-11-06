/**
 * NAV-1 (owner, 4 Nov 2026) - "child-parent navigation from every page, plus an option of going to Home".
 * The ONE route -> parent map covers every <Route path> in App.tsx; Back goes back in-app history first, else to the
 * parent; Home and the focused flows show no Back bar; every target is internal.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { isRouteNavHidden } from "./routeNavHidden";
import { ROUTE_PARENTS, findRouteEntry, isInternalNavPath, resolveBackTarget, targetLabel } from "./routeParents";

const APP = readFileSync(resolve(__dirname, "../../App.tsx"), "utf8");
const appPaths = [...new Set([...APP.matchAll(/\bpath="([^"]+)"/g)].map((m) => m[1]))];

describe("NAV-1 route -> parent map", () => {
  it("reads a sane number of routes out of App.tsx (the parser still works)", () => {
    expect(appPaths.length).toBeGreaterThan(40);
    expect(appPaths).toContain("/packs");
  });

  it("every route in App.tsx has its own entry (add one to lib/nav/routeParents.ts when you add a route)", () => {
    const mapped = new Set(ROUTE_PARENTS.map(([p]) => p));
    const missing = appPaths.filter((p) => !mapped.has(p));
    expect(missing).toEqual([]);
  });

  it("each App.tsx route resolves to its own entry (no earlier pattern shadows it)", () => {
    const sample = (p: string) => p.replace(/:([A-Za-z]+)/g, "x-$1").replace(/\/\*$/, "/deep");
    for (const [pattern, entry] of ROUTE_PARENTS) {
      if (pattern === "*") continue;
      expect(findRouteEntry(sample(pattern)), pattern).toBe(entry);
    }
  });

  it("the eager hidden-check (entry chunk) agrees with the map on every route", () => {
    const sample = (p: string) => p.replace(/:([A-Za-z]+)/g, "x-$1").replace(/\/\*$/, "/deep");
    for (const [pattern] of ROUTE_PARENTS) {
      if (pattern === "*") continue;
      const path = sample(pattern);
      expect(isRouteNavHidden(path), pattern).toBe(resolveBackTarget(path, 0) === null);
    }
    expect(isRouteNavHidden("/loginx")).toBe(false);
    expect(isRouteNavHidden("/u")).toBe(false);
  });

  it("every parent is an internal path and the map has no external URL", () => {
    for (const [pattern, entry] of ROUTE_PARENTS) {
      if (entry.home || entry.noBack) continue;
      const to = typeof entry.parent === "function" ? entry.parent({ grade: "10", subject: "Maths", topicSlug: "triangles" }) : entry.parent;
      expect(isInternalNavPath(to ?? ""), pattern).toBe(true);
    }
    expect(isInternalNavPath("https://evil.example")).toBe(false);
    expect(isInternalNavPath("//evil.example")).toBe(false);
    expect(isInternalNavPath("/\\evil.example")).toBe(false);
  });
});

describe("NAV-1 Back target - arrived directly (no in-app history)", () => {
  const parent = (path: string) => resolveBackTarget(path, 0);

  it("goes to the page's parent with the parent's short name", () => {
    expect(parent("/packs")).toMatchObject({ kind: "parent", to: "/pricing", label: "Pricing", showHome: true });
    expect(parent("/cbq-class-10/triangles")).toMatchObject({ to: "/cbq-class-10", label: "CBQ" });
    // NCERT-HUB-1: an unknown chapter slug falls back to the bare hub; a real one returns to its chapter card.
    expect(parent("/ncert-solutions/jemh108")).toMatchObject({ to: "/ncert-class-10", label: "NCERT Hub" });
    expect(parent("/ncert-exemplar/jemh108")).toMatchObject({ to: "/ncert-class-10", label: "NCERT Hub" });
    expect(parent("/ncert-solutions/triangles")).toMatchObject({ to: "/ncert-class-10?subject=maths&ch=triangles", label: "NCERT Hub" });
    expect(parent("/ncert-exemplar/some-applications-of-trigonometry")).toMatchObject({
      to: "/ncert-class-10?subject=maths&ch=some-applications-of-trigonometry",
      label: "NCERT Hub",
    });
    expect(parent("/ncert-solutions/electricity")).toMatchObject({ to: "/ncert-class-10?subject=science&ch=electricity", label: "NCERT Hub" });
    expect(parent("/notes/triangles")).toMatchObject({ to: "/topic-hub/triangles", label: "Topic Hub" });
    expect(parent("/practice/10/Maths")).toMatchObject({ to: "/practice-hub", label: "Practice" });
    expect(parent("/practice/worksheets")).toMatchObject({ to: "/practice-hub", label: "Practice" });
    expect(parent("/practice/worksheets/ready")).toMatchObject({ to: "/practice/worksheets", label: "Worksheets" });
    expect(parent("/highly-probable/10/Science")).toMatchObject({ to: "/practice-hub" });
    // NAV-FIX-1: straight to Exam Trends (the bare /topic-hub/10/Maths only redirects there).
    expect(parent("/topic-hub/10/Maths/triangles")).toMatchObject({ to: "/exam-trends", label: "Exam Trends" });
    expect(parent("/admin/funnel")).toMatchObject({ to: "/admin/students", label: "Students" });
  });

  it("a page whose parent is Home shows ONE control, '← Home' (not Home twice)", () => {
    for (const p of ["/pricing", "/me", "/check-improve", "/exam-trends", "/practice-hub", "/admin/students", "/contact"]) {
      expect(parent(p), p).toMatchObject({ kind: "parent", to: "/", label: "Home", showHome: false });
    }
  });

  it("an unknown page goes Home", () => {
    expect(parent("/no-such-page/at/all")).toMatchObject({ to: "/", label: "Home" });
  });

  it("history state unreadable (null) behaves as a direct arrival", () => {
    expect(resolveBackTarget("/packs", null)).toMatchObject({ kind: "parent", to: "/pricing" });
  });
});

describe("NAV-1 Back target - arrived from inside the app (history idx > 0)", () => {
  it("goes one step back, labelled '← Back', with Home beside it; the link still points at the parent", () => {
    expect(resolveBackTarget("/packs", 3)).toEqual({ kind: "history", to: "/pricing", label: "Back", showHome: true });
    expect(resolveBackTarget("/me", 1)).toEqual({ kind: "history", to: "/", label: "Back", showHome: true });
  });
});

describe("NAV-1 hidden on Home and on focused flows", () => {
  it("Home and its aliases show no Back bar", () => {
    for (const p of ["/", "/welcome", "/browse"]) expect(resolveBackTarget(p, 0), p).toBeNull();
  });

  it("an in-progress test or mock, sign-in and the bare full-screen surfaces show no Back bar, with or without history", () => {
    const focused = [
      "/chapter-test/10/Maths/triangles",
      "/full-mock/10/Science",
      "/topic-mock/10/Maths/triangles",
      "/exam-simulation",
      "/tutor/10/Maths",
      "/tutor/10/Maths/triangles",
      "/u/abc123",
      "/login",
      "/login/sso-callback",
      "/sign-up",
      "/intent",
    ];
    for (const p of focused) {
      expect(resolveBackTarget(p, 0), p).toBeNull();
      expect(resolveBackTarget(p, 5), p).toBeNull();
    }
  });

  it("the short names never say Premium", () => {
    for (const [, entry] of ROUTE_PARENTS) {
      if (typeof entry.parent === "string") expect(targetLabel(entry.parent)).not.toMatch(/premium/i);
    }
  });
});
