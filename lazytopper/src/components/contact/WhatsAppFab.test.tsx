import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const tracked: string[] = [];
vi.mock("../../analytics/analytics", () => ({
  trackWhatsAppContactTap: (placement: string) => {
    tracked.push(placement);
  },
}));

import WhatsAppFab from "./WhatsAppFab";

/** WA-CONTACT-1 — the floating button: where it renders, its link, and the overlay hide. */

function at(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <WhatsAppFab />
    </MemoryRouter>,
  );
}

const FAB = { name: "Message LazyTopper on WhatsApp" };

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
  tracked.length = 0;
});

describe("WhatsAppFab", () => {
  it("renders on a browse page as a new-tab wa.me link with the chapter in the message", () => {
    at("/topic-hub/triangles");
    const link = screen.getByRole("link", FAB);
    const href = link.getAttribute("href") ?? "";
    expect(href.startsWith("https://wa.me/919714568948?text=")).toBe(true);
    expect(new URL(href).searchParams.get("text")).toBe("Hi LazyTopper, I have a doubt about Triangles");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("renders nothing on a test / practice route", () => {
    at("/chapter-test/10/Maths/triangles");
    expect(screen.queryByRole("link", FAB)).toBeNull();
    cleanup();
    at("/practice/10/Maths");
    expect(screen.queryByRole("link", FAB)).toBeNull();
    cleanup();
    at("/check-improve");
    expect(screen.queryByRole("link", FAB)).toBeNull();
  });

  it("hides while an overlay is open and comes back when it closes", async () => {
    at("/practice-hub");
    expect(screen.getByRole("link", FAB)).toBeTruthy();

    const modal = document.createElement("div");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    await act(async () => {
      document.body.appendChild(modal);
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(screen.queryByRole("link", FAB)).toBeNull();

    await act(async () => {
      modal.remove();
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(screen.getByRole("link", FAB)).toBeTruthy();
  });

  it("is hidden on first render when an overlay is already open", () => {
    document.body.style.overflow = "hidden";
    at("/practice-hub");
    expect(screen.queryByRole("link", FAB)).toBeNull();
  });

  it("a tap records whatsapp_contact_tap with placement fab", () => {
    at("/");
    act(() => {
      screen.getByRole("link", FAB).click();
    });
    expect(tracked).toEqual(["fab"]);
  });
});
