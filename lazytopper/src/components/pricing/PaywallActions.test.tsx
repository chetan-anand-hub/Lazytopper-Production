/**
 * PAYWALL-PAY-1 — the three paywall actions: "Pay", "Share QR code", "Forward link to parents".
 *
 * Labels exact; never "Ask" next to parents (rendered AND in every pay surface's source, with
 * a control that proves the scan bites); the switches gate each action; the QR goes out as a
 * PNG FILE through the share sheet, else on screen with Download QR + wa.me; Forward goes out as
 * TEXT, else wa.me + Copy link; one link per tap-session; analytics carries action + surface only.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackPaywallAction: vi.fn() };
});
const authState: { user: { uid: string } | null } = { user: { uid: "uid-paywall-1" } };
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: authState.user, loading: false }),
}));

import PaywallActions, {
  FORWARD_LABEL,
  PAY_LABEL,
  PaywallActionsView,
  QR_ALT,
  QR_FILENAME,
  QR_LABEL,
  dataUrlToBlob,
  trackPricingPayTap,
  type ParentShareDeps,
  type QrImage,
} from "./PaywallActions";
import * as analytics from "../../analytics/analytics";
import type { MintedParentLink } from "../../services/parentPay";

const track = analytics.trackPaywallAction as unknown as ReturnType<typeof vi.fn>;
const TOKEN = "T".repeat(43);
const NOW = Date.parse("2026-10-22T10:00:00Z");
const LINK = `https://www.lazytopper.com/pricing#pp=${TOKEN}`;
const MINTED: MintedParentLink = {
  token: TOKEN,
  expiresAt: new Date(NOW + 72 * 3600e3).toISOString(),
  prices: { month: 599, till_boards: 2396 },
};
// A 1x1 PNG.
const PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function err(name: string): Error {
  const e = new Error(name);
  e.name = name;
  return e;
}

function deps(over: Partial<ParentShareDeps> = {}): ParentShareDeps {
  return {
    mint: vi.fn(async () => MINTED),
    loadCheckedCount: vi.fn(async () => 4 as number | null),
    makeQr: vi.fn(async (): Promise<QrImage> => ({ dataUrl: PNG_DATA_URL, blob: dataUrlToBlob(PNG_DATA_URL) })),
    nav: undefined,
    origin: "https://www.lazytopper.com",
    base: "/",
    now: () => NOW,
    openWindow: vi.fn(() => ({ opener: {} as unknown })),
    copyText: vi.fn(async () => undefined),
    download: vi.fn(),
    ...over,
  };
}

function view(d: ParentShareDeps, props: { showParent?: boolean; onPay?: () => void } = {}) {
  render(
    <MemoryRouter>
      <PaywallActionsView surface="lock" onPay={props.onPay ?? vi.fn()} showParent={props.showParent ?? true} deps={d} />
    </MemoryRouter>,
  );
}

async function tap(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
}

function flags(payments: boolean, parent: boolean) {
  vi.stubEnv("VITE_PAYMENTS_ENABLED", payments ? "1" : "");
  vi.stubEnv("VITE_PARENT_PAY_ENABLED", parent ? "1" : "");
}

/** The owner's ruling, as one pattern: the word "ask" anywhere before "parent" on a line. */
const ASK_PARENT = /\bask\b[^\n"'`]*parent/i;

beforeEach(() => {
  track.mockClear();
  authState.user = { uid: "uid-paywall-1" };
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("labels — exactly the owner's three", () => {
  it("Pay, Share QR code, Forward link to parents — in that order", () => {
    view(deps());
    const names = screen.getAllByRole("button").map((b) => b.textContent);
    expect(names).toEqual(["Pay", "Share QR code", "Forward link to parents"]);
    expect([PAY_LABEL, QR_LABEL, FORWARD_LABEL]).toEqual(["Pay", "Share QR code", "Forward link to parents"]);
  });
});

describe("switches", () => {
  const fallback = <button type="button">See plans</button>;
  function mount(props: { payTo?: string; onPay?: () => void } = { payTo: "/pricing" }) {
    render(
      <MemoryRouter>
        <PaywallActions surface="upgrade_sheet" {...props} fallback={fallback} />
      </MemoryRouter>,
    );
  }

  it("payments dark: the surface's own control, unchanged, and nothing else", () => {
    flags(false, true);
    mount();
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["See plans"]);
    expect(screen.queryByTestId("paywall-actions")).toBeNull();
  });

  it("payments on, parent pay dark: Pay only (no QR, no Forward)", () => {
    flags(true, false);
    mount();
    expect(screen.getByRole("link", { name: "Pay" })).toHaveAttribute("href", "/pricing");
    expect(screen.queryByRole("button", { name: QR_LABEL })).toBeNull();
    expect(screen.queryByRole("button", { name: FORWARD_LABEL })).toBeNull();
    expect(screen.queryByText("See plans")).toBeNull();
  });

  it("both on: all three; signed out: the parent actions are not offered (a link is per account)", () => {
    flags(true, true);
    mount();
    expect(screen.getByRole("link", { name: "Pay" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: QR_LABEL })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: FORWARD_LABEL })).toBeInTheDocument();
    cleanup();
    authState.user = null;
    mount();
    expect(screen.getByRole("link", { name: "Pay" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: QR_LABEL })).toBeNull();
  });

  it("/pricing (no Pay given): the two parent actions only — the pass tiles carry Pay", () => {
    flags(true, true);
    mount({});
    expect(screen.queryByTestId("paywall-pay")).toBeNull();
    expect(screen.getByRole("button", { name: QR_LABEL })).toBeInTheDocument();
  });
});

describe("Pay", () => {
  it("calls the surface's own plans path and counts ONE pay action", async () => {
    const onPay = vi.fn();
    view(deps(), { onPay });
    await tap("Pay");
    expect(onPay).toHaveBeenCalledTimes(1);
    expect(track.mock.calls).toEqual([["pay", "lock"]]);
  });

  it("on /pricing a tap on a pass's Pay button counts as pay/pricing; other taps do not", () => {
    const btn = document.createElement("button");
    btn.className = "lt-pricing-cta lt-pricing-pay lt-pricing-pay--month";
    const inner = document.createElement("span");
    btn.appendChild(inner);
    const other = document.createElement("div");
    trackPricingPayTap({ target: inner });
    trackPricingPayTap({ target: other });
    trackPricingPayTap({ target: null });
    expect(track.mock.calls).toEqual([["pay", "pricing"]]);
  });
});

describe("Share QR code", () => {
  it("phones: the QR goes out as a PNG FILE with the message through the share sheet", async () => {
    const share = vi.fn(async () => undefined);
    const canShare = vi.fn(() => true);
    const d = deps({ nav: { share, canShare } });
    view(d);
    await tap(QR_LABEL);
    expect(d.mint).toHaveBeenCalledTimes(1);
    expect(d.makeQr).toHaveBeenCalledWith(LINK);
    expect(share).toHaveBeenCalledTimes(1);
    const arg = (share.mock.calls[0] as unknown as [{ files: File[]; text: string }])[0];
    expect(arg.files).toHaveLength(1);
    expect(arg.files[0].name).toBe(QR_FILENAME);
    expect(arg.files[0].type).toBe("image/png");
    expect(arg.text).toContain(LINK);
    expect(arg.text).toContain("₹599 for a month");
    expect(screen.queryByTestId("parent-share-panel")).toBeNull();
    expect(track.mock.calls).toEqual([["qr", "lock"]]);
  });

  it("no file sharing (desktop): the QR on screen, Download QR, and a wa.me link with TEXT only", async () => {
    const d = deps({ nav: { share: vi.fn(), canShare: () => false } });
    view(d);
    await tap(QR_LABEL);
    const img = screen.getByAltText(QR_ALT);
    expect(img).toHaveAttribute("src", PNG_DATA_URL);
    await tap("Download QR");
    expect(d.download).toHaveBeenCalledWith(expect.any(Blob), QR_FILENAME);
    const wa = screen.getByTestId("parent-share-whatsapp");
    const u = new URL(wa.getAttribute("href") || "");
    expect(u.origin + u.pathname).toBe("https://wa.me/");
    expect([...u.searchParams.keys()]).toEqual(["text"]);
    expect(u.searchParams.get("text")).toContain(LINK);
    fireEvent.click(wa);
    expect(d.openWindow).toHaveBeenCalledWith(wa.getAttribute("href"), "_blank");
  });

  it("an expired tap (NotAllowedError): one more tap shares — still ONE qr action counted", async () => {
    const share = vi.fn(async (): Promise<void> => {
      throw err("NotAllowedError");
    });
    const d = deps({ nav: { share, canShare: () => true } });
    view(d);
    await tap(QR_LABEL);
    share.mockImplementationOnce(async () => undefined);
    await tap("Share");
    expect(share).toHaveBeenCalledTimes(2);
    expect(d.makeQr).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("parent-share-panel")).toBeNull();
    expect(track.mock.calls).toEqual([["qr", "lock"]]);
  });

  it("a dismissed share sheet is a cancel: no error, no panel", async () => {
    const d = deps({ nav: { share: vi.fn(async () => { throw err("AbortError"); }), canShare: () => true } });
    view(d);
    await tap(QR_LABEL);
    expect(screen.queryByTestId("parent-share-panel")).toBeNull();
    expect(screen.queryByTestId("parent-share-failed")).toBeNull();
  });
});

describe("Forward link to parents", () => {
  it("share sheet: the message as TEXT (no file)", async () => {
    const share = vi.fn(async () => undefined);
    const d = deps({ nav: { share, canShare: () => true } });
    view(d);
    await tap(FORWARD_LABEL);
    const arg = (share.mock.calls[0] as unknown as [{ files?: File[]; text: string }])[0];
    expect(arg.files).toBeUndefined();
    expect(arg.text).toContain(LINK);
    expect(arg.text).toContain("I've had 4 answers checked");
    expect(track.mock.calls).toEqual([["forward", "lock"]]);
  });

  it("no share sheet: the message shown, wa.me, and Copy link copies the LINK", async () => {
    const d = deps();
    view(d);
    await tap(FORWARD_LABEL);
    expect(screen.getByTestId("parent-share-message").textContent).toContain(LINK);
    await tap("Copy link");
    expect(d.copyText).toHaveBeenCalledWith(LINK);
    expect(screen.getByTestId("parent-share-notice")).toHaveTextContent("Link copied.");
    fireEvent.click(screen.getByRole("button", { name: "हिंदी" }));
    expect(screen.getByTestId("parent-share-message").textContent).toContain("4 उत्तर");
  });

  it("QR then Forward reuse ONE minted link", async () => {
    const d = deps();
    view(d);
    await tap(QR_LABEL);
    await tap(FORWARD_LABEL);
    expect(d.mint).toHaveBeenCalledTimes(1);
  });

  it("a failed mint (e.g. the server's parent pay is dark -> 404): an honest line, nothing sent; a second tap retries", async () => {
    const mint = vi.fn(async (): Promise<MintedParentLink> => {
      throw new Error("404");
    });
    const share = vi.fn(async () => undefined);
    const d = deps({ mint, nav: { share, canShare: () => true } });
    view(d);
    await tap(FORWARD_LABEL);
    expect(screen.getByTestId("parent-share-failed")).toBeInTheDocument();
    expect(share).not.toHaveBeenCalled();
    mint.mockImplementationOnce(async () => MINTED);
    await tap(FORWARD_LABEL);
    expect(share).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("parent-share-failed")).toBeNull();
  });

  it("analytics never carries the link, token or message", async () => {
    view(deps());
    await tap(QR_LABEL);
    await tap(FORWARD_LABEL);
    await tap("Pay");
    for (const call of track.mock.calls) {
      expect(JSON.stringify(call)).not.toContain(TOKEN);
      expect(call).toHaveLength(2);
    }
  });
});

describe("★ never the word 'Ask' next to parents (owner ruling 22 Oct 2026)", () => {
  it("rendered: every state of the actions (idle, QR panel, Forward panel, Hindi, failed)", async () => {
    view(deps());
    const seen: string[] = [document.body.textContent || ""];
    await tap(QR_LABEL);
    seen.push(document.body.textContent || "");
    await tap(FORWARD_LABEL);
    seen.push(document.body.textContent || "");
    fireEvent.click(screen.getByRole("button", { name: "हिंदी" }));
    seen.push(document.body.textContent || "");
    cleanup();
    view(deps({ mint: vi.fn(async () => { throw new Error("x"); }) }));
    await tap(QR_LABEL);
    seen.push(document.body.textContent || "");
    for (const text of seen) {
      expect(text).not.toMatch(ASK_PARENT);
      expect(text).not.toContain("½");
    }
  });

  const HERE = path.dirname(fileURLToPath(import.meta.url));
  const SRC = path.join(HERE, "..", "..");
  const PAY_SURFACES = [
    "components/pricing/PaywallActions.tsx",
    "components/pricing/PassCheckout.tsx",
    "components/pricing/ParentPayPanel.tsx",
    "components/pricing/BasicFreeList.tsx",
    "components/pricing/parentShare.css",
    "components/UpgradeModal.tsx",
    "components/subscription/UpgradeSheet.tsx",
    "components/usage/FairUseLimitPanel.tsx",
    "components/usage/fairUseGate.ts",
    "components/auth/RequireAuth.tsx",
    "components/feedback/feedbackPromptModel.ts",
    "pages/PricingPage.tsx",
    "services/parentPay.ts",
    "config/pricing.ts",
    "config/pricingCompare.ts",
  ];

  /** The source minus comments: what can reach a student (strings, JSX text). */
  function code(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
  }

  it.each(PAY_SURFACES)("source: %s", (rel) => {
    const src = code(readFileSync(path.join(SRC, rel), "utf8"));
    expect(src).not.toMatch(ASK_PARENT);
    expect(src).not.toContain("½");
  });

  it("CONTROL: the same scan catches the old label, in any case", () => {
    for (const bad of [
      'const L = "Ask your parents to pay";',
      "<button>ask parents</button>",
      "label: 'Ask Mummy and your parents'",
    ]) {
      expect(code(bad)).toMatch(ASK_PARENT);
    }
    // ...and is not fooled into flagging "ask the tutor" or a comment.
    expect(code('const t = "upgrade to ask the tutor";')).not.toMatch(ASK_PARENT);
    expect(code('// "Ask your parents to pay" was the old label\nconst x = 1;')).not.toMatch(ASK_PARENT);
  });

  it("the prerendered pages carry no 'Ask ... parents' either", () => {
    const dir = path.join(SRC, "..", "prerendered");
    const files = readdirSync(dir, { recursive: true }) as string[];
    const html = files.filter((f) => String(f).endsWith(".html"));
    expect(html.length).toBeGreaterThan(0);
    for (const f of html) expect(readFileSync(path.join(dir, String(f)), "utf8")).not.toMatch(/\bask\b[^<]{0,40}parent/i);
  });
});
