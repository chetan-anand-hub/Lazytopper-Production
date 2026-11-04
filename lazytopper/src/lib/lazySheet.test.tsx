/**
 * PERF-TRIM-1 — lazySheet (the slot recipe behind UpgradeModal and LinkSignInMethodModal) and
 * the guard that keeps the two sheets out of the entry chunk.
 *
 * Pins:
 *   - the sheet renders (with its props) once its chunk resolves;
 *   - a rejected chunk renders nothing, never reaches an outer (global-style) boundary, and calls
 *     onFailed; a second open retries (React.lazy alone would replay the cached rejection);
 *   - closed, the slots render nothing and fetch nothing;
 *   - GUARD: no non-test source statically imports UpgradeModalSheet or
 *     LinkSignInMethodModalSheet (a static import would pull them back into the entry chunk);
 *     the slots reach them only through a dynamic import().
 */
import { Component, useState, type ReactNode } from "react";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { lazySheet } from "./lazySheet";

class Outer extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <p>Something went wrong</p> : this.props.children;
  }
}

afterEach(cleanup);

describe("lazySheet", () => {
  it("renders the sheet with its props once the chunk resolves", async () => {
    const Sheet = lazySheet(() =>
      Promise.resolve({ default: ({ label }: { label: string }) => <div role="dialog" aria-label={label} /> }),
    );
    render(<Sheet label="Plans" onFailed={() => {}} />);
    expect(await screen.findByRole("dialog", { name: "Plans" })).toBeTruthy();
  });

  it("a rejected chunk renders nothing, stays inside the slot, calls onFailed, and a second open retries", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const loader = { fail: true, calls: 0 };
    const Ok = () => <div role="dialog" aria-label="Sheet" />;
    const Sheet = lazySheet(() => {
      loader.calls += 1;
      return loader.fail ? Promise.reject<{ default: typeof Ok }>(new Error("boom")) : Promise.resolve({ default: Ok });
    });
    function Host() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>open</button>
          <span data-testid="state">{open ? "open" : "closed"}</span>
          {open && <Sheet onFailed={() => setOpen(false)} />}
        </div>
      );
    }
    render(<Outer><Host /></Outer>);
    expect(loader.calls).toBe(0);

    fireEvent.click(screen.getByText("open"));
    await vi.waitFor(() => expect(screen.getByTestId("state").textContent).toBe("closed"));
    expect(screen.queryByText("Something went wrong")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();

    loader.fail = false;
    fireEvent.click(screen.getByText("open"));
    expect(await screen.findByRole("dialog", { name: "Sheet" })).toBeTruthy();
    expect(loader.calls).toBe(2);
    spy.mockRestore();
  });
});

describe("the slots, closed", () => {
  it("UpgradeModal and LinkSignInMethodModal render nothing while closed", async () => {
    vi.resetModules();
    vi.doMock("../hooks/useSubscription", () => ({ useSubscription: () => ({}) }));
    const { UpgradeModal } = await import("../components/UpgradeModal");
    const { default: LinkSignInMethodModal } = await import("../components/auth/LinkSignInMethodModal");
    const { container } = render(
      <div>
        <UpgradeModal open={false} onClose={() => {}} />
        <LinkSignInMethodModal open={false} onClose={() => {}} />
      </div>,
    );
    expect(container.firstElementChild?.childNodes.length).toBe(0);
    vi.doUnmock("../hooks/useSubscription");
  });
});

describe("GUARD — the sheets stay out of the entry chunk", () => {
  const SRC = resolve(process.cwd(), "src");
  const SHEETS = ["UpgradeModalSheet", "LinkSignInMethodModalSheet"];

  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full, out);
      else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
    }
    return out;
  }

  it("no non-test file statically imports a sheet (type-only imports are erased and allowed)", () => {
    const offenders: string[] = [];
    for (const abs of walk(SRC)) {
      const src = readFileSync(abs, "utf8");
      for (const m of src.matchAll(/(?:^|\n)\s*(import|export)\s+([^;]*?)\s+from\s+["']([^"']+)["']/g)) {
        const spec = m[3];
        if (!SHEETS.some((s) => spec.endsWith(`/${s}`))) continue;
        if (m[1] === "import" && /^type\b/.test(m[2])) continue;
        if (m[1] === "export" && /^type\b/.test(m[2])) continue;
        offenders.push(`${abs.slice(SRC.length + 1)}: ${m[0].trim()}`);
      }
      for (const m of src.matchAll(/(?:^|\n)\s*import\s+["']([^"']+)["']/g)) {
        if (SHEETS.some((s) => m[1].endsWith(`/${s}`))) offenders.push(`${abs.slice(SRC.length + 1)}: ${m[0].trim()}`);
      }
    }
    expect(offenders, `static sheet imports pull the sheet back into the entry chunk:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("CONTROL — each slot reaches its sheet through a dynamic import()", () => {
    expect(readFileSync(join(SRC, "components/UpgradeModal.tsx"), "utf8")).toContain('import("./UpgradeModalSheet")');
    expect(readFileSync(join(SRC, "components/auth/LinkSignInMethodModal.tsx"), "utf8")).toContain(
      'import("./LinkSignInMethodModalSheet")',
    );
  });
});
