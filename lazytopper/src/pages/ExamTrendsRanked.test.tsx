// ExamTrendsRanked — guards for the presentation-only design uplift.
//
// The uplift restyled every pixel of this page (rows → cards, per-band accents,
// the ⋯ inline row → an anchored popover). Nothing about the RANKING was allowed
// to move. These assertions pin the things a restyle can silently break.
//
// ── On the band-membership golden (the anti-re-tier guard) ──────────────────
// EXPECTED_BANDS below was CAPTURED BY RENDERING TRUNK (base/approved-thru-437,
// 45ab803) before a single line of the uplift was written, then frozen here. It
// is deliberately NOT derived from BAND_BY_SLUG: asserting the render against
// the same map it renders from is a tautology that stays green while someone
// re-tiers the map. An independent transcription is the only thing that fails
// when the owner-signed tier data is edited.
//
// BAND_BY_SLUG is transcribed verbatim from
// LazyTopper_LOCKED_ExamTrends_Tiers_2026-06-05.md and is owner-signed
// authority. If a change to it makes this file red, the change is wrong — not
// the test.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";
import { desktopTopicBySlug } from "../lib/desktop/topics";

import ExamTrendsRanked from "./ExamTrendsRanked";

afterEach(cleanup);

/** Frozen from a TRUNK render (45ab803) — see header. Order is significant. */
const EXPECTED_BANDS: Record<string, Record<string, string[]>> = {
  Maths: {
    "must-crack": [
      "Trigonometry",
      "Triangles",
      "Surface Areas and Volumes",
      "Polynomials",
      "Circles",
    ],
    "high-roi": [
      "Real Numbers",
      "Quadratic Equations",
      "Coordinate Geometry",
      "Statistics",
      "Probability",
    ],
    "good-to-do": [
      "Pair of Linear Equations",
      "Arithmetic Progression",
      "Areas Related to Circles",
    ],
  },
  Science: {
    "must-crack": [
      "Life Processes",
      "Light - Reflection & Refraction",
      "Electricity",
      "Chemical Reactions & Equations",
      "Acids Bases & Salts",
      "Heredity",
    ],
    "high-roi": [
      "Carbon & its Compounds",
      "Metals & Non-metals",
      "Magnetic Effects of Electric Current",
      "Control & Coordination",
      "How do Organisms Reproduce",
    ],
    "good-to-do": ["Human Eye & Colourful World", "Our Environment"],
  },
};

function Probe() {
  const loc = useLocation();
  return <div data-testid="probe" data-url={`${loc.pathname}${loc.search}`} />;
}

async function renderPage() {
  setMatchMediaMatches(true);
  await act(async () => {
    render(
      <MemoryRouter initialEntries={["/exam-trends"]}>
        <Routes>
          <Route path="/exam-trends" element={<ExamTrendsRanked />} />
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

const bands = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>("[data-band]"));

const bandEl = (band: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-band="${band}"]`);
  if (!el) throw new Error(`band ${band} not rendered`);
  return el;
};

/** Chapter names rendered inside a band, in DOM order. */
const chaptersIn = (band: string): string[] =>
  Array.from(bandEl(band).querySelectorAll<HTMLElement>("[data-topic-slug] .lt-et-title")).map(
    (n) => n.textContent?.trim() ?? "",
  );

const headBtn = (band: string): HTMLElement =>
  bandEl(band).querySelector<HTMLElement>("button[aria-expanded]")!;

async function expand(band: string) {
  if (headBtn(band).getAttribute("aria-expanded") === "false") {
    await act(async () => {
      fireEvent.click(headBtn(band));
    });
  }
}

async function switchSubject(subject: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: subject }));
  });
}

describe("ExamTrendsRanked — band structure", () => {
  it("renders all three bands in BAND_ORDER with Must-crack open by default", async () => {
    await renderPage();

    expect(bands().map((b) => b.getAttribute("data-band"))).toEqual([
      "must-crack",
      "high-roi",
      "good-to-do",
    ]);

    expect(headBtn("must-crack")).toHaveAttribute("aria-expanded", "true");
    expect(headBtn("high-roi")).toHaveAttribute("aria-expanded", "false");
    expect(headBtn("good-to-do")).toHaveAttribute("aria-expanded", "false");

    // A collapsed band renders no cards; expanding it reveals them.
    expect(chaptersIn("high-roi")).toEqual([]);
    await expand("high-roi");
    expect(chaptersIn("high-roi").length).toBeGreaterThan(0);
  });

  it("band membership matches the owner-signed tiers exactly, for BOTH subjects", async () => {
    for (const subject of ["Maths", "Science"]) {
      cleanup();
      await renderPage();
      if (subject === "Science") await switchSubject("Science");

      for (const band of ["must-crack", "high-roi", "good-to-do"]) {
        await expand(band);
        expect(chaptersIn(band)).toEqual(EXPECTED_BANDS[subject][band]);
      }
    }
  });
});

describe("ExamTrendsRanked — data honesty", () => {
  it("renders Expect: only where the locked doc supplies a sub-pattern", async () => {
    await renderPage();
    await expand("high-roi");

    // Every must-crack chapter carries one.
    const mustCrack = bandEl("must-crack");
    const mustCrackCards = mustCrack.querySelectorAll("[data-topic-slug]");
    expect(mustCrackCards.length).toBe(EXPECTED_BANDS.Maths["must-crack"].length);
    mustCrackCards.forEach((card) => {
      expect(within(card as HTMLElement).getByText("Expect")).toBeInTheDocument();
    });

    // High-ROI rows show NONE rather than an invented shape. This is the
    // fabrication guard — if a future edit "helpfully" fills these in, it fails.
    const highRoiCards = bandEl("high-roi").querySelectorAll("[data-topic-slug]");
    expect(highRoiCards.length).toBeGreaterThan(0);
    highRoiCards.forEach((card) => {
      expect(within(card as HTMLElement).queryByText("Expect")).toBeNull();
    });
    expect(bandEl("high-roi").querySelectorAll(".lt-et-expect").length).toBe(0);
  });

  // A restyle must not quietly drop rendered content. The uplift's first cut did
  // exactly that with the blurb; this pins it back.
  it("still renders each chapter's real catalogue blurb", async () => {
    await renderPage();

    const card = document.querySelector<HTMLElement>('[data-topic-slug="trigonometry"]')!;
    const blurb = card.querySelector<HTMLElement>(".lt-et-blurb");
    expect(blurb).toBeTruthy();
    expect(blurb!.textContent?.trim()).toBe(
      desktopTopicBySlug("trigonometry")!.blurb,
    );

    // Every rendered card carries one — not just the one we sampled.
    const cards = document.querySelectorAll("[data-topic-slug]");
    expect(cards.length).toBeGreaterThan(0);
    cards.forEach((c) => {
      const slug = c.getAttribute("data-topic-slug")!;
      expect(c.querySelector(".lt-et-blurb")?.textContent?.trim()).toBe(
        desktopTopicBySlug(slug)!.blurb,
      );
    });
  });

  it("shows the trend tier as High/Medium/Low, never a percentage", async () => {
    await renderPage();
    const tiers = Array.from(
      document.querySelectorAll<HTMLElement>(".lt-et-tier"),
    ).map((n) => n.textContent?.trim());
    expect(tiers.length).toBeGreaterThan(0);
    tiers.forEach((t) => expect(["High", "Medium", "Low"]).toContain(t));
    expect(bandEl("must-crack").textContent).not.toMatch(/\d%/);
  });
});

describe("ExamTrendsRanked — CTAs", () => {
  it("the per-row primary CTA reads 'Learn' and lands on the Topic Hub", async () => {
    await renderPage();

    const card = document.querySelector<HTMLElement>('[data-topic-slug="trigonometry"]')!;
    const learn = within(card).getByRole("button", { name: /Learn/ });
    expect(learn).toHaveTextContent("Learn");
    // The retired label must be gone.
    expect(within(card).queryByRole("button", { name: /^Open$/ })).toBeNull();

    await act(async () => {
      fireEvent.click(learn);
    });

    expect(screen.getByTestId("probe").getAttribute("data-url")).toBe(
      "/topic-hub/trigonometry?source=trends&returnTo=%2Fexam-trends",
    );
  });
});

describe("ExamTrendsRanked — the ⋯ menu (§5 regression guard)", () => {
  it("renders inside its OWN card's subtree, anchored to its own button", async () => {
    await renderPage();

    const card = document.querySelector<HTMLElement>('[data-topic-slug="circles"]')!;
    const more = within(card).getByRole("button", { name: /More actions/ });

    expect(document.querySelector('[role="menu"]')).toBeNull();
    await act(async () => {
      fireEvent.click(more);
    });

    const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
    expect(menu).toBeTruthy();

    // THE guard: the popover lives inside the card that opened it — not adrift
    // in a sibling, and not below the whole card in document order.
    expect(card.contains(menu)).toBe(true);
    // ...and inside the position:relative wrapper that anchors it, which also
    // holds the ⋯ button itself.
    const wrap = menu.closest("[data-lt-et-menu-wrap]");
    expect(wrap).toBeTruthy();
    expect(wrap!.contains(more)).toBe(true);

    // Exactly one menu open at a time.
    expect(document.querySelectorAll('[role="menu"]').length).toBe(1);
    expect(
      Array.from(menu.querySelectorAll('[role="menuitem"]')).map((b) =>
        b.textContent?.trim(),
      ),
    ).toEqual(["Practice this chapter", "Build a worksheet", "Predicted questions"]);
  });

  it("opening another card's menu closes the first; an outside click closes all", async () => {
    await renderPage();

    const circles = document.querySelector<HTMLElement>('[data-topic-slug="circles"]')!;
    const triangles = document.querySelector<HTMLElement>('[data-topic-slug="triangles"]')!;

    await act(async () => {
      fireEvent.click(within(circles).getByRole("button", { name: /More actions/ }));
    });
    expect(within(circles).queryByRole("menu")).toBeTruthy();

    await act(async () => {
      fireEvent.click(within(triangles).getByRole("button", { name: /More actions/ }));
    });
    expect(within(circles).queryByRole("menu")).toBeNull();
    expect(within(triangles).queryByRole("menu")).toBeTruthy();

    await act(async () => {
      fireEvent.mouseDown(document.body);
    });
    expect(document.querySelector('[role="menu"]')).toBeNull();
  });

  it("collapsing a band closes any open menu", async () => {
    await renderPage();
    const circles = document.querySelector<HTMLElement>('[data-topic-slug="circles"]')!;
    await act(async () => {
      fireEvent.click(within(circles).getByRole("button", { name: /More actions/ }));
    });
    expect(document.querySelector('[role="menu"]')).toBeTruthy();

    await act(async () => {
      fireEvent.click(headBtn("must-crack"));
    });
    expect(document.querySelector('[role="menu"]')).toBeNull();
  });

  it("a menu item routes to the existing destination with source=trends", async () => {
    await renderPage();
    const card = document.querySelector<HTMLElement>('[data-topic-slug="circles"]')!;
    await act(async () => {
      fireEvent.click(within(card).getByRole("button", { name: /More actions/ }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("menuitem", { name: /Predicted questions/ }));
    });
    expect(screen.getByTestId("probe").getAttribute("data-url")).toBe(
      "/highly-probable/10/Maths?topic=circles&source=trends&returnTo=%2Fexam-trends",
    );
  });
});

describe("ExamTrendsRanked — multi-select tray", () => {
  it("selecting a chapter reveals the tray with its real name", async () => {
    await renderPage();
    const card = document.querySelector<HTMLElement>('[data-topic-slug="circles"]')!;

    await act(async () => {
      fireEvent.click(within(card).getByRole("button", { name: /Add Circles to selection/ }));
    });

    expect(screen.getByText(/Selected/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Practice selected/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Predicted Qs/ })).toBeInTheDocument();
  });
});

// Silence is not evidence — assert the suite actually mounted something.
describe("ExamTrendsRanked — sanity", () => {
  it("mounts the real page, not an empty shell", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await renderPage();
    expect(screen.getByRole("heading", { name: "Exam Trends" })).toBeInTheDocument();
    expect(document.querySelectorAll("[data-topic-slug]").length).toBeGreaterThan(0);
  });
});
