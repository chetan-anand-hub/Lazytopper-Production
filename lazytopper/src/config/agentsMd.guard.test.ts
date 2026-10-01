import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * AGENTS-MD-1 — pins the tool-neutral root `AGENTS.md` (read by contractors and non-Claude
 * agents) to `CLAUDE.md`, and pins the two `CLAUDE.md` §5 lines that used to contradict later
 * owner rulings (RAZORPAY-1 built; TRIAL-ON-SIGNUP-1 starts trials via `activateTrial`).
 *
 * Reads both files from disk at the repo root (src/config -> lazytopper -> root). Nothing here
 * reads the clock, so it passes identically at both CI test-clock instants.
 */
const ROOT = resolve(__dirname, "../../..");
const AGENTS_PATH = resolve(ROOT, "AGENTS.md");
const CLAUDE_PATH = resolve(ROOT, "CLAUDE.md");

const read = (p: string) => readFileSync(p, "utf-8").replace(/\r\n/g, "\n");

/** Bullet lines of the block starting at the first line matching `start`, up to the first blank line. */
function bulletsAfter(text: string, start: RegExp): string[] {
  const lines = text.split("\n");
  const i = lines.findIndex((l) => start.test(l));
  if (i < 0) return [];
  const out: string[] = [];
  let j = i + 1;
  while (j < lines.length && lines[j].trim() === "") j++;
  for (; j < lines.length && lines[j].startsWith("- "); j++) out.push(lines[j].trimEnd());
  return out;
}

const STALE_P2 = "No fake payment — payment is deferred; no client-side premium activation";
const STALE_P3 = "No fake trial activation — trial state must come from server/admin, never client UI";
const TAIL = "- and any file your task does not explicitly allow";

describe("AGENTS.md — tool-neutral rules for contractors and non-Claude agents", () => {
  it("exists at the repo root", () => {
    expect(existsSync(AGENTS_PATH)).toBe(true);
  });

  it("★ its protected-files list equals CLAUDE.md §4's globally-forbidden list, exactly", () => {
    const claudeList = bulletsAfter(read(CLAUDE_PATH), /^Globally forbidden across all PRs unless explicitly scoped:/);
    // CONTROL — the source list was actually found; an empty-vs-empty compare would pass silently.
    expect(claudeList.length).toBeGreaterThanOrEqual(8);
    expect(claudeList).toContain("- `lazytopper/src/App.tsx`");

    const agents = read(AGENTS_PATH);
    const section = agents.slice(agents.indexOf("## 3. Protected files"), agents.indexOf("## 4. Never"));
    expect(section.length).toBeGreaterThan(0);
    const agentsList = section.split("\n").filter((l) => l.startsWith("- ")).map((l) => l.trimEnd());

    expect(agentsList[agentsList.length - 1]).toBe(TAIL);
    expect(agentsList.slice(0, -1)).toEqual(claudeList);
  });

  it("names the trunk branch, the three production switches and MONTHLY_INLINE", () => {
    const agents = read(AGENTS_PATH);
    for (const needle of [
      "base/approved-thru-437",
      "`PAYMENTS_ENABLED`",
      "`VITE_PAYMENTS_ENABLED`",
      "`FAIR_USE_ENFORCE`",
      "MONTHLY_INLINE",
    ]) {
      expect(agents, needle).toContain(needle);
    }
  });

  it('★ says "subscription" only inside never "subscription", and carries no ₹599 literal', () => {
    const agents = read(AGENTS_PATH);
    // CONTROL — the allowed phrase is present, so the strip below has something to remove.
    expect(agents).toContain('never "subscription"');
    const stripped = agents.split('never "subscription"').join("");
    expect(stripped.toLowerCase()).not.toContain("subscription");
    expect(agents).not.toContain("₹599");
  });

  it("stays short (≤ 120 lines)", () => {
    expect(read(AGENTS_PATH).trimEnd().split("\n").length).toBeLessThanOrEqual(120);
  });
});

describe("CLAUDE.md — the two stale §5 lines are gone (AGENTS-MD-1 A2)", () => {
  it("★ no longer carries the stale payment or trial line", () => {
    const claude = read(CLAUDE_PATH);
    expect(claude).not.toContain(STALE_P2);
    expect(claude).not.toContain(STALE_P3);
  });

  it("carries the replacement lines word for word", () => {
    const claude = read(CLAUDE_PATH);
    expect(claude).toContain(
      "- No fake payment — Premium comes only from a server-verified Razorpay payment (`grantPass`) or an admin grant; never from client UI"
    );
    expect(claude).toContain(
      "- Trials — a new account's 7-day trial starts once at sign-up via `activateTrial` (owner ruling 2026-09-30, TRIAL-ON-SIGNUP-1) or by an explicit student tap; never on login, reload or mount"
    );
  });

  it("does not import AGENTS.md (Claude behaviour unchanged, A5)", () => {
    expect(read(CLAUDE_PATH)).not.toMatch(/@AGENTS\.md/);
  });
});
