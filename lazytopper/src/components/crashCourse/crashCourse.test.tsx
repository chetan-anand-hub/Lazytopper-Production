import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Cc27Chip from "./Cc27Chip";
import Cc27DetailBlock from "./Cc27DetailBlock";
import Cc27Rows from "./Cc27Rows";
import CrashCourse2027Page from "../../pages/CrashCourse2027Page";
import { cc27FileLabel, groupCc27, isCc27FileKey } from "../../config/crashCourse";
import { SEO_PAGE_SPECS, CRASH_COURSE_PATH, SEO_PAGE_TITLE_CAP, SEO_PAGE_DESCRIPTION_CAP } from "../seoPages/seoPages";

afterEach(() => vi.unstubAllEnvs());

describe("CC27-SITE-1 chips and blocks", () => {
  it("a chip renders on every product with its scope, and nothing when VITE_CC27_DISABLED=1", () => {
    for (const [p, scope] of [["pass", "Maths & Science"], ["ts", "Maths & Science"], ["bundle", "Maths & Science"], ["cbq", "for your subject"], ["subject", "for your subject"], ["chapter", "chapter sheet"]] as const) {
      const { unmount } = render(<Cc27Chip product={p} />);
      expect(screen.getByTestId(`cc27-chip-${p}`).textContent).toContain(`+ Crash Course 2027 · ${scope}`);
      unmount();
    }
    vi.stubEnv("VITE_CC27_DISABLED", "1");
    const { container } = render(<Cc27Chip product="pass" />);
    expect(container.textContent).toBe("");
  });
  it("the detail block says included free with this purchase, shows no price and no 'AI'", () => {
    render(<Cc27DetailBlock product="pass" />);
    const t = screen.getByTestId("cc27-block-pass").textContent ?? "";
    expect(t).toContain("Bonus: Crash Course 2027");
    expect(t).toContain("Included free with the Board Pass");
    expect(t).not.toMatch(/₹|\bAI\b|answer key|solutions/i);
    expect(t.match(/free/gi)?.length).toBe(1);
  });
});

describe("CC27-SITE-1 rows", () => {
  it("rows appear only for keys the server listed; empty / malformed -> nothing", () => {
    const { container, unmount } = render(<Cc27Rows keys={undefined} />);
    expect(container.textContent).toBe("");
    unmount();
    const none = render(<Cc27Rows keys={["junk", "ch:maths-"]} />);
    expect(none.container.textContent).toBe("");
    none.unmount();
    render(<Cc27Rows keys={["book:maths", "ch:maths-triangles", "ch:science-electricity"]} />);
    expect(screen.getByTestId("cc27-row-book:maths")).toBeTruthy();
    expect(screen.getByTestId("cc27-row-ch:maths-triangles")).toBeTruthy();
    expect(screen.queryByTestId("cc27-row-book:science")).toBeNull();
  });
  it("key helpers", () => {
    expect(isCc27FileKey("book:science")).toBe(true);
    expect(isCc27FileKey("book:english")).toBe(false);
    expect(cc27FileLabel("ch:maths-trigonometry-intro")).toBe("Trigonometry intro (PDF)");
    expect(groupCc27(["ch:science-life-processes", "book:maths", "x"])).toEqual({ books: ["book:maths"], maths: [], science: ["ch:science-life-processes"] });
  });
});

describe("CC27-SITE-1 landing", () => {
  it("head strings fit the caps, carry no price, and the page links the samples and the ladder", () => {
    const spec = SEO_PAGE_SPECS[CRASH_COURSE_PATH];
    expect(spec.title.length).toBeLessThanOrEqual(SEO_PAGE_TITLE_CAP);
    expect(spec.description.length).toBeLessThanOrEqual(SEO_PAGE_DESCRIPTION_CAP);
    render(<MemoryRouter><CrashCourse2027Page /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Crash Course 2027");
    expect(screen.getByTestId("cc27-ladder-table")).toBeTruthy();
    expect(screen.getByTestId("cc27-sample-start").getAttribute("href")).toBe("/crash-course/cc27-start-here.pdf");
    expect(screen.getByTestId("cc27-sample-chapter").getAttribute("href")).toBe("/crash-course/cc27-maths-triangles-sample.pdf");
    expect(screen.getAllByText(/Made by an IITian/).length).toBeGreaterThan(0);
    expect(screen.getByTestId("cc27-buy-bundle").getAttribute("href")).toContain("buy=pack_bundle");
  });
});
