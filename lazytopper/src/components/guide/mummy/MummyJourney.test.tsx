import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const trackOnboardingEvent = vi.hoisted(() => vi.fn());
vi.mock("../../../analytics/analytics", () => ({ trackOnboardingEvent, trackGuideVariantAssigned: vi.fn() }));
// The rig needs a real layout engine; a stub that shows the pose it was given is what this suite
// needs (the rig's own drawing is covered by rig.test.ts / rigCast.test.ts).
vi.mock("../BlobCharacter", () => ({
  default: ({ kind, pose, onTap }: { kind: string; pose: string; onTap?: () => void }) => (
    <span data-testid={`blob-${kind}`} data-pose={pose} onPointerUp={() => onTap?.()} />
  ),
}));

import MummyJourney from "./MummyJourney";
import {
  MUMMY_BEATS,
  MUMMY_COPY,
  MUMMY_LAUGH_MS,
  __resetMummySeenForTests,
  mummyPreviewActive,
  shouldDrawMummy,
} from "./mummyModel";
import { GUIDE_PREVIEW_KEY, GUIDE_PREVIEW_MS } from "../guideVariant";

/**
 * MUMMY-1 — Mummy's four-beat journey on /for-parents: every beat's words in the static HTML,
 * Next and the dots move the story, beat 4 shows the page's own actions, tap → laugh for 1.5 s,
 * the figure is drawn after idle and never in an automated browser, the events, and the copy rules.
 */
const ROOT = process.cwd(); // vitest runs with cwd = lazytopper/
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");
const ACTIONS = (
  <>
    <a href="https://wa.me/?text=x" data-testid="fp-share-journey">
      Send LazyTopper to my child
    </a>
    <a href="/check-improve" data-testid="fp-free-check-journey">
      Check one answer free
    </a>
  </>
);

function setWebdriver(v: boolean) {
  Object.defineProperty(window.navigator, "webdriver", { configurable: true, value: v });
}

/** A controllable IntersectionObserver (jsdom has none): `fire(true)` = the section scrolled into view. */
class FakeIO {
  static all: FakeIO[] = [];
  observed: Element[] = [];
  disconnected = false;
  private readonly cb: (entries: Array<{ isIntersecting: boolean }>) => void;
  constructor(cb: (entries: Array<{ isIntersecting: boolean }>) => void) {
    this.cb = cb;
    FakeIO.all.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  disconnect() {
    this.disconnected = true;
  }
  fire(isIntersecting: boolean) {
    if (!this.disconnected) this.cb([{ isIntersecting }]);
  }
}
const seenCalls = () => trackOnboardingEvent.mock.calls.filter((c) => c[0] === "mummy_seen");

beforeEach(() => {
  trackOnboardingEvent.mockClear();
  __resetMummySeenForTests();
  setWebdriver(false);
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("MUMMY-1 · the static HTML (what the prerender keeps)", () => {
  const html = renderToStaticMarkup(<MummyJourney actions={ACTIONS} />);

  it("carries every beat's line, title and text, with beats 2–4 hidden", () => {
    for (const b of MUMMY_BEATS) {
      for (const s of [b.line, b.title, b.text]) expect(html).toContain(s.replace(/'/g, "&#x27;"));
    }
    expect(html).toContain(`<h2 id="fp-mummy" class="lt-mj__h">${MUMMY_COPY.heading}</h2>`);
    expect(html).toMatch(/data-testid="mummy-beat-1"(?![^>]*hidden)/);
    for (const n of [2, 3, 4]) expect(html).toMatch(new RegExp(`data-testid="mummy-beat-${n}" hidden=""`));
  });

  it("draws NO figure in the static HTML: the fixed slot is there and empty", () => {
    expect(html).toContain('<div class="lt-mj__fig" data-testid="mummy-slot" aria-hidden="true"></div>');
    expect(html).not.toContain("<svg");
  });

  it("beat 4 holds the page's own actions; beats 1–3 a Next button", () => {
    const four = html.slice(html.indexOf('data-testid="mummy-beat-4"'));
    expect(four).toContain('data-testid="fp-share-journey"');
    expect(four).toContain('data-testid="fp-free-check-journey"');
    for (const b of MUMMY_BEATS.slice(0, 3)) expect(html).toContain(`>${b.next?.replace(/'/g, "&#x27;")}</button>`);
  });
});

describe("MUMMY-1 · moving the story", () => {
  it("Next walks 1 → 4, each beat its pose; the dots follow and can go back", async () => {
    render(<MummyJourney actions={ACTIONS} />);
    const fig = await screen.findByTestId("blob-mummy");
    expect(fig.dataset.pose).toBe("worried");
    expect(screen.getByTestId("mummy-dot-1").getAttribute("aria-current")).toBe("step");
    const poses = ["surprised", "mhappy", "mproud"];
    for (let i = 1; i <= 3; i += 1) {
      fireEvent.click(screen.getByTestId(`mummy-next-${i}`));
      expect(screen.getByTestId("mummy-journey").dataset.beat).toBe(String(i + 1));
      expect(screen.getByTestId("blob-mummy").dataset.pose).toBe(poses[i - 1]);
      expect(screen.getByTestId("mummy-line").textContent).toBe(MUMMY_BEATS[i].line);
      expect(screen.getByTestId(`mummy-dot-${i + 1}`).getAttribute("aria-current")).toBe("step");
    }
    expect(screen.getByTestId("mummy-beat-4").hidden).toBe(false);
    expect(screen.getByTestId("mummy-beat-1").hidden).toBe(true);
    expect(screen.getByTestId("fp-share-journey")).toBeTruthy();
    fireEvent.click(screen.getByTestId("mummy-dot-2"));
    expect(screen.getByTestId("blob-mummy").dataset.pose).toBe("surprised");
  });

  it("mummy_beat { beat } once per beat per mount; the first view sends nothing", async () => {
    render(<MummyJourney actions={ACTIONS} />);
    await screen.findByTestId("blob-mummy");
    expect(trackOnboardingEvent).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("mummy-next-1"));
    fireEvent.click(screen.getByTestId("mummy-dot-1"));
    fireEvent.click(screen.getByTestId("mummy-dot-2"));
    fireEvent.click(screen.getByTestId("mummy-next-2"));
    expect(trackOnboardingEvent.mock.calls).toEqual([
      ["mummy_beat", { beat: 2 }],
      ["mummy_beat", { beat: 1 }],
      ["mummy_beat", { beat: 3 }],
    ]);
  });

  it("tap → laugh (with her tap line) for 1.5 s, then back to the beat's pose; sends mummy_tap", async () => {
    render(<MummyJourney actions={ACTIONS} />);
    await screen.findByTestId("blob-mummy");
    vi.useFakeTimers();
    fireEvent.pointerUp(screen.getByTestId("blob-mummy"));
    expect(screen.getByTestId("blob-mummy").dataset.pose).toBe("laugh");
    expect(screen.getByTestId("mummy-line").textContent).toBe(MUMMY_COPY.tapLine);
    expect(trackOnboardingEvent).toHaveBeenCalledWith("mummy_tap", {});
    act(() => vi.advanceTimersByTime(MUMMY_LAUGH_MS - 1));
    expect(screen.getByTestId("blob-mummy").dataset.pose).toBe("laugh");
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByTestId("blob-mummy").dataset.pose).toBe("worried");
    expect(screen.getByTestId("mummy-line").textContent).toBe(MUMMY_BEATS[0].line);
    expect(MUMMY_LAUGH_MS).toBe(1500);
  });

  it("a beat change while she laughs ends the laugh at once", async () => {
    render(<MummyJourney actions={ACTIONS} />);
    await screen.findByTestId("blob-mummy");
    fireEvent.pointerUp(screen.getByTestId("blob-mummy"));
    fireEvent.click(screen.getByTestId("mummy-next-1"));
    expect(screen.getByTestId("blob-mummy").dataset.pose).toBe("surprised");
  });

  it("★ an automated browser (the prerender capture) never draws her: the slot stays empty", async () => {
    setWebdriver(true);
    expect(shouldDrawMummy()).toBe(false);
    render(<MummyJourney actions={ACTIONS} />);
    await act(() => new Promise((r) => setTimeout(r, 50)));
    expect(screen.queryByTestId("blob-mummy")).toBeNull();
    expect(screen.getByTestId("mummy-slot").childElementCount).toBe(0);
    expect(screen.getByText(MUMMY_BEATS[0].title)).toBeTruthy();
  });

  it("no preview on this browser: the seam is off and the events fire (see above)", () => {
    expect(mummyPreviewActive()).toBe(false);
  });
});

describe("MUMMY-1 · PREVIEW-1 — an admin's guide preview suppresses ONLY the mummy_* events", () => {
  const setPreview = (until: number) =>
    window.localStorage.setItem(GUIDE_PREVIEW_KEY, JSON.stringify({ arm: "guide", until }));

  async function walkAndTap() {
    render(<MummyJourney actions={ACTIONS} />);
    await screen.findByTestId("blob-mummy");
    fireEvent.click(screen.getByTestId("mummy-next-1"));
    fireEvent.click(screen.getByTestId("mummy-next-2"));
    fireEvent.click(screen.getByTestId("mummy-next-3"));
    fireEvent.pointerUp(screen.getByTestId("blob-mummy"));
  }

  it("★ under a VALID preview: no mummy_beat, no mummy_tap — and the story still works", async () => {
    setPreview(Date.now() + GUIDE_PREVIEW_MS);
    expect(mummyPreviewActive()).toBe(true);
    await walkAndTap();
    expect(screen.getByTestId("mummy-journey").dataset.beat).toBe("4");
    expect(screen.getByTestId("blob-mummy").dataset.pose).toBe("laugh");
    expect(trackOnboardingEvent).not.toHaveBeenCalled();
  });

  it("CONTROL — an EXPIRED preview is no preview: every mummy_* event fires", async () => {
    setPreview(Date.now() - 1);
    expect(mummyPreviewActive()).toBe(false);
    await walkAndTap();
    expect(trackOnboardingEvent.mock.calls).toEqual([
      ["mummy_beat", { beat: 2 }],
      ["mummy_beat", { beat: 3 }],
      ["mummy_beat", { beat: 4 }],
      ["mummy_tap", {}],
    ]);
  });
});

describe("MUMMY-1 · review F3 — mummy_seen { beat: 1 }, once per page load, on first view", () => {
  beforeEach(() => {
    FakeIO.all = [];
    vi.stubGlobal("IntersectionObserver", FakeIO);
  });
  afterEach(() => vi.unstubAllGlobals());

  const io = () => FakeIO.all.find((o) => o.observed.some((el) => (el as HTMLElement).dataset.testid === "mummy-journey"));

  it("★ nothing until the section enters the viewport; then exactly one mummy_seen { beat: 1 }", () => {
    render(<MummyJourney actions={ACTIONS} />);
    expect(io()).toBeDefined();
    io()!.fire(false);
    expect(seenCalls()).toEqual([]);
    io()!.fire(true);
    io()!.fire(true);
    expect(seenCalls()).toEqual([["mummy_seen", { beat: 1 }]]);
    expect(io()!.disconnected).toBe(true);
  });

  it("once per PAGE LOAD: a re-mount in the same load does not send it again", () => {
    const first = render(<MummyJourney actions={ACTIONS} />);
    io()!.fire(true);
    first.unmount();
    FakeIO.all = [];
    render(<MummyJourney actions={ACTIONS} />);
    io()!.fire(true);
    expect(seenCalls()).toHaveLength(1);
  });

  it("★ suppressed under a valid preview (and the preview view does not use up the load's send)", () => {
    window.localStorage.setItem(GUIDE_PREVIEW_KEY, JSON.stringify({ arm: "guide", until: Date.now() + GUIDE_PREVIEW_MS }));
    const r = render(<MummyJourney actions={ACTIONS} />);
    io()!.fire(true);
    expect(seenCalls()).toEqual([]);
    r.unmount();
    window.localStorage.clear();
    FakeIO.all = [];
    render(<MummyJourney actions={ACTIONS} />);
    io()!.fire(true);
    expect(seenCalls()).toEqual([["mummy_seen", { beat: 1 }]]);
  });

  it("no IntersectionObserver at all → no event, no error", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<MummyJourney actions={ACTIONS} />);
    expect(seenCalls()).toEqual([]);
  });
});

describe("MUMMY-1 · the copy rules and the chunk boundary", () => {
  const words = [
    MUMMY_COPY.heading,
    MUMMY_COPY.steps,
    MUMMY_COPY.tapLine,
    MUMMY_COPY.stepLabel(1),
    ...MUMMY_BEATS.flatMap((b) => [b.line, b.title, b.text, b.next ?? ""]),
  ].join("\n");

  it("never 'Ask', no '½', no price, no seat count, no deadline", () => {
    expect(words).not.toMatch(/\bask\b/i);
    expect(words).not.toContain("½");
    expect(words).not.toMatch(/₹|\bRs\.?\s?\d|\bINR\b/i);
    expect(words).not.toMatch(/\bseats?\b|\bonly \d+\b|\bspots?\b/i);
    expect(words).not.toMatch(/\bdeadline\b|\blast date\b|\bhurry\b|\btoday only\b|\bends\b/i);
  });

  it("review F1/F2/F5 — beat 4 says what the button really does; no repeated heading; 'And then?'", () => {
    const four = MUMMY_BEATS[3];
    expect(four.title).toBe("Your child's turn");
    expect(four.text).toBe("One tap opens WhatsApp with a message and a link. Your child tries a free check on their own phone.");
    expect(MUMMY_BEATS.map((b) => b.next)).toEqual(["See the report", "What next?", "And then?", null]);
    expect(MUMMY_BEATS.some((b) => b.title === "Hand it to your child")).toBe(false);
  });

  it("four beats in order, respectful poses only (never `stern`)", () => {
    expect(MUMMY_BEATS.map((b) => [b.beat, b.pose])).toEqual([
      [1, "worried"],
      [2, "surprised"],
      [3, "mhappy"],
      [4, "mproud"],
    ]);
    for (const f of ["MummyJourney.tsx", "mummyModel.ts", "mummyChunk.tsx"]) {
      expect(read(`src/components/guide/mummy/${f}`), f).not.toMatch(/["']stern["']/);
    }
  });

  it("CONTROL — the copy detectors fire on violating text", () => {
    expect("Ask your child").toMatch(/\bask\b/i);
    expect("₹599").toMatch(/₹|\bRs\.?\s?\d|\bINR\b/i);
    expect("Only 20 seats left").toMatch(/\bseats?\b|\bonly \d+\b|\bspots?\b/i);
    expect("Offer ends Sunday").toMatch(/\bdeadline\b|\blast date\b|\bhurry\b|\btoday only\b|\bends\b/i);
  });

  it("★ the rig reaches the page ONLY through the lazy mummy chunk", () => {
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const journey = strip(read("src/components/guide/mummy/MummyJourney.tsx"));
    const model = strip(read("src/components/guide/mummy/mummyModel.ts"));
    const page = strip(read("src/pages/ForParentsPage.tsx"));
    for (const [name, src] of [["MummyJourney", journey], ["mummyModel", model], ["ForParentsPage", page]] as const) {
      expect(src, name).not.toMatch(/from\s+["'][^"']*\/(?:rig|BlobCharacter|rigMummy|guideChunk)["']/);
      // a type-only import is erased; a value import would pull the rig into the page chunk
      expect(src, name).not.toMatch(/import\s+(?!type\b)[^("']*from\s+["']\.\/mummyChunk["']/);
    }
    expect(journey).toContain('import("./mummyChunk")');
    expect(page.match(/<MummyJourney\b/g)?.length).toBe(1);
  });
});
