/**
 * SPEED-SITE-1b — the first MobileShell of a PRERENDERED document must not fade the content the student is
 * already reading out and back in (the static first paint has no entrance animation; applyPrerendered strips it).
 * Every other mount keeps the animate-float-up entrance exactly as before.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

async function loadShell(servedPrerendered: boolean) {
  vi.resetModules();
  document.body.innerHTML = servedPrerendered
    ? '<div id="root"><div class="phone-shell"><main><template data-lt-route="start"></template><p>Notes</p><template data-lt-route="end"></template></main></div></div>'
    : '<div id="root"></div>';
  return import("./MobileShell");
}

function mount(MobileShell: typeof import("./MobileShell").MobileShell) {
  return render(
    <MemoryRouter>
      <MobileShell>
        <p>content</p>
      </MobileShell>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("SPEED-SITE-1b MobileShell entrance animation", () => {
  it("a prerendered document: the FIRST shell does not fade; a later mount does", async () => {
    const mod = await loadShell(true);
    expect(mod.SERVED_PRERENDERED).toBe(true);
    const first = mount(mod.MobileShell);
    expect(first.container.querySelector("main")?.className ?? "").not.toContain("animate-float-up");
    first.unmount();
    const later = mount(mod.MobileShell);
    expect(later.container.querySelector("main")).toHaveClass("animate-float-up");
  });

  it("control: a document served WITHOUT a prerendered body fades in on the first mount, as before", async () => {
    const mod = await loadShell(false);
    expect(mod.SERVED_PRERENDERED).toBe(false);
    const first = mount(mod.MobileShell);
    expect(first.container.querySelector("main")).toHaveClass("animate-float-up");
  });
});
