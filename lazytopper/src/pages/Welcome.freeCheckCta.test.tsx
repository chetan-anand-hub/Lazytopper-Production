/**
 * FREE-CHECK-1b · Welcome.tsx grant (N19) — the ONE `START_URL` that feeds all three
 * landing CTAs points at /check-improve only when VITE_FREE_CHECK_ENABLED is on; off, it
 * is byte-for-byte the sign-up target it was (R11). The no-trial pins hold either way.
 *
 * START_URL is a module constant, so each case imports a FRESH copy of the module after
 * setting the env (vi.resetModules), exactly as a build with that env would produce.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function renderWithFlag(flag: string) {
  vi.stubEnv("VITE_FREE_CHECK_ENABLED", flag);
  vi.resetModules();
  const { default: Welcome } = await import("./Welcome");
  const { container } = render(
    <MemoryRouter>
      <Welcome />
    </MemoryRouter>,
  );
  return container;
}

/** The three primary CTAs share one class; the sign-in link is not one of them. */
function ctaHrefs(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("a.btn.solid")).map((a) => a.getAttribute("href") ?? "");
}

function visibleText(container: HTMLElement): string {
  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("style").forEach((el) => el.remove());
  return clone.textContent ?? "";
}

describe("landing CTAs — flag OFF (R11: unchanged)", () => {
  it("all three CTAs still go to sign-up", async () => {
    const hrefs = ctaHrefs(await renderWithFlag(""));
    expect(hrefs).toEqual(["/sign-up?redirect=%2F", "/sign-up?redirect=%2F", "/sign-up?redirect=%2F"]);
  });
});

describe("landing CTAs — flag ON", () => {
  it("all three CTAs go to /check-improve", async () => {
    const hrefs = ctaHrefs(await renderWithFlag("true"));
    expect(hrefs).toEqual(["/check-improve", "/check-improve", "/check-improve"]);
  });

  it("the no-trial pins still hold with the flag on", async () => {
    const text = visibleText(await renderWithFlag("true"));
    expect(text).not.toMatch(/\btrial\b/i);
    expect(text).not.toMatch(/7[\s-]?day/i);
  });
});
