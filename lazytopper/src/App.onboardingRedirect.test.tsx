// CLEANUP-2 (C1) — Onboarding is retired. /onboarding redirects to Home ("/"), signed out
// AND signed in, and no module imports pages/Onboarding (the file is gone).
//
// Mounts the REAL <App /> routes in a MemoryRouter at /onboarding, with a probe outside the
// route table recording every pathname the router passes through. The landing (Welcome) and
// the desktop home are stubbed: this pins where /onboarding SENDS a visitor, not what Home
// renders (Home's own tests own that).

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import ts from "typescript";
import { setMatchMediaMatches } from "./test/setup";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string; email: string } }));

vi.mock("./context/AuthContext", () => ({
  useAuth: () => ({ user: auth.user, loading: false }),
}));
vi.mock("./hooks/useSubscription", () => ({
  useSubscription: () => ({
    isPremium: false,
    isTrialActive: false,
    isTrialExpired: false,
    daysLeftInTrial: 0,
    status: { tier: "free" },
  }),
}));
vi.mock("./context/vibeModeContext", () => ({ useVibeMode: () => ({ mode: "calm", setMode: () => {} }) }));
vi.mock("./pages/Welcome", () => ({ default: () => <div data-testid="stub-landing">landing</div> }));
vi.mock("./pages/desktop/DesktopHome", () => ({ default: () => <div data-testid="stub-desktop-home">home</div> }));
vi.mock("./pages/app/MobileHome", () => ({ default: () => <div data-testid="stub-mobile-home">home</div> }));
vi.mock("./pages/Login", () => ({ default: () => <div data-testid="stub-login">login</div> }));

import App from "./App";

const seen: string[] = [];
function PathProbe() {
  const loc = useLocation();
  useEffect(() => {
    if (seen[seen.length - 1] !== loc.pathname) seen.push(loc.pathname);
  }, [loc.pathname]);
  return <div data-testid="path">{loc.pathname}</div>;
}

function mountAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <PathProbe />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  seen.length = 0;
  auth.user = null;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("C1 — /onboarding redirects to Home", () => {
  it("CONTROL: the probe records a real route change (/login stays /login, /onboarding does not)", async () => {
    setMatchMediaMatches(true);
    mountAt("/login");
    expect(await screen.findByTestId("stub-login")).toBeInTheDocument();
    expect(seen).toEqual(["/login"]);
  });

  it("signed OUT: /onboarding -> / (the landing), never the sign-in page", async () => {
    setMatchMediaMatches(true);
    mountAt("/onboarding");
    expect(await screen.findByTestId("stub-landing")).toBeInTheDocument();
    expect(screen.getByTestId("path")).toHaveTextContent(/^\/$/);
    expect(seen).toEqual(["/onboarding", "/"]);
    expect(screen.queryByTestId("stub-login")).toBeNull();
  });

  it("signed IN (desktop): /onboarding -> / (the student's home)", async () => {
    auth.user = { uid: "u-1", email: "s@example.com" };
    setMatchMediaMatches(true);
    mountAt("/onboarding");
    expect(await screen.findByTestId("stub-desktop-home")).toBeInTheDocument();
    expect(seen).toEqual(["/onboarding", "/"]);
  });

  it("signed IN (mobile): /onboarding -> / -> /browse (Home's own mobile hop, unchanged)", async () => {
    auth.user = { uid: "u-1", email: "s@example.com" };
    setMatchMediaMatches(false);
    mountAt("/onboarding");
    await waitFor(() => expect(screen.getByTestId("path")).toHaveTextContent(/^\/browse$/));
    expect(seen).toEqual(["/onboarding", "/", "/browse"]);
  });
});

describe("C1 — no module imports pages/Onboarding", () => {
  const SRC = resolve(process.cwd(), "src");
  const ONBOARDING = resolve(SRC, "pages/Onboarding");

  function walk(dir: string, out: string[] = []): string[] {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = resolve(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
    }
    return out;
  }
  function specifiers(file: string, source = readFileSync(file, "utf8")): string[] {
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const out: string[] = [];
    const visit = (n: ts.Node): void => {
      if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
        out.push(n.moduleSpecifier.text);
      } else if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) {
        out.push(n.arguments[0].text);
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
    return out;
  }
  const importsOnboarding = (file: string, source?: string) =>
    specifiers(file, source).some((s) => s.startsWith(".") && resolve(dirname(file), s).replace(/\.(tsx?|jsx?)$/, "") === ONBOARDING);

  it("CONTROL: the matcher fires on a static or lazy import of pages/Onboarding", () => {
    // App.tsx imported it statically at the base SHA; both forms must be caught.
    const app = resolve(SRC, "App.tsx");
    expect(importsOnboarding(app, `import Onboarding from "./pages/Onboarding";\n`)).toBe(true);
    expect(importsOnboarding(app, `const O = lazy(() => import("./pages/Onboarding"));\n`)).toBe(true);
    expect(importsOnboarding(app, `import Login from "./pages/Login";\n`)).toBe(false);
  });

  it("pages/Onboarding.tsx is gone and nothing under src/ imports it", () => {
    expect(existsSync(`${ONBOARDING}.tsx`)).toBe(false);
    const files = walk(SRC).filter((f) => !f.includes(`${sep}node_modules${sep}`));
    expect(files.length).toBeGreaterThan(200);
    expect(files.filter((f) => importsOnboarding(f)).map((f) => f.slice(SRC.length + 1))).toEqual([]);
  });
});
