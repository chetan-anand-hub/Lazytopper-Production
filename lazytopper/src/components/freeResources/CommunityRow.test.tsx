/** SOCIAL-2 - the community row on /cbse/class-10: three plain links to the internal short links; gone under the kill switch. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import CommunityRow, { COMMUNITY_ROW_LEAD } from "./CommunityRow";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("CommunityRow", () => {
  it("one line: the lead + WhatsApp, Telegram, Discord linking to /whatsapp /telegram /discord", () => {
    render(<CommunityRow />);
    const row = screen.getByTestId("community-row");
    expect(row.textContent).toBe(`${COMMUNITY_ROW_LEAD} WhatsApp · Telegram · Discord`);
    const links = Array.from(row.querySelectorAll("a"));
    expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["WhatsApp", "/whatsapp"],
      ["Telegram", "/telegram"],
      ["Discord", "/discord"],
    ]);
    for (const a of links) {
      expect(a.getAttribute("rel")).toBe("noopener");
      expect(a.getAttribute("style")).toBeNull();
    }
    expect(row.textContent).not.toMatch(/\bAI\b|answer key|optional/i);
  });

  it("VITE_COMMUNITY_ROW_DISABLED=1 renders nothing", () => {
    vi.stubEnv("VITE_COMMUNITY_ROW_DISABLED", "1");
    const { container } = render(<CommunityRow />);
    expect(container.innerHTML).toBe("");
  });

  it("is mounted on /cbse/class-10 right after the free-practice block", () => {
    const src = readFileSync(path.join(process.cwd(), "src/pages/Cbse2027Page.tsx"), "utf8");
    expect(src).toMatch(/<FreeResourcesBlock \/>[\s\S]{0,200}<CommunityRow \/>/);
  });
});
