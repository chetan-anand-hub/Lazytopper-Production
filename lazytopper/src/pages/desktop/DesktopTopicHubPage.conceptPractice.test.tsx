import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import DesktopTopicHubPage from "./DesktopTopicHubPage";
import { conceptForSubtopic } from "../../data/concepts/conceptLabelMap";
import { bankRowMeta } from "../../data/bankChapters/bankIdIndex";

/**
 * CONCEPT-MAP-FILL-1 PR-2 — the Topic Hub card's Practise serves EXACTLY its concept's rows.
 * Mounted through the real route table (the page, ConceptSpine and the path builder together), on the
 * Metals and Non-metals hub, which carries both new cards (Alloys) and keyed existing cards.
 */
vi.mock("../../components/progress/TopicProgressTrend", () => {
  const Stub = () => null;
  return { TopicProgressTrend: Stub, default: Stub };
});

afterEach(cleanup);

const SLUG = "metals-and-non-metals";

function renderAt(search = "") {
  const utils = render(
    <MemoryRouter initialEntries={[`/topic-hub/10/Science/${SLUG}${search}`]}>
      <Routes>
        <Route path="/topic-hub/:grade/:subject/:topicKey" element={<DesktopTopicHubPage />} />
      </Routes>
    </MemoryRouter>,
  );
  return utils;
}

/** The Practise link of the concept row whose title is `name` (rows are `.lt-spine__row`). */
function rowOf(container: HTMLElement, name: string): HTMLElement {
  const row = [...container.querySelectorAll<HTMLElement>(".lt-spine__row")].find((r) => r.textContent?.includes(name));
  if (!row) throw new Error(`no row for ${name}`);
  return row;
}
function practiseParams(container: HTMLElement, name: string): URLSearchParams {
  const link = rowOf(container, name).querySelector<HTMLAnchorElement>("a.lt-spine__btn--practise");
  if (!link) throw new Error(`no Practise link on ${name}`);
  const href = link.getAttribute("href") ?? "";
  return new URL(href, "http://x").searchParams;
}

describe("Topic Hub card Practise — exact concept rows", () => {
  it("a NEW card (Alloys) practises exactly the rows that resolve to Alloys — strict focus, no mark band", () => {
    const { container } = renderAt();
    const p = practiseParams(container, "Alloys");
    const ids = (p.get("focusBankIds") ?? "").split(",").filter(Boolean);
    expect(ids.length).toBeGreaterThanOrEqual(5);
    expect(p.get("strictFocus")).toBe("true");
    expect(p.get("count")).toBe(String(Math.min(ids.length, 50)));
    expect(p.get("marksMin")).toBeNull();
    for (const id of ids) {
      const meta = bankRowMeta(id)!;
      expect(meta.topicKey).toBe(SLUG);
      expect(conceptForSubtopic(SLUG, meta.subtopic.trim())).toBe("Alloys");
    }
  });

  it("an EXISTING card tied by conceptKeys (physical properties) practises only that concept's rows", () => {
    const { container } = renderAt();
    const p = practiseParams(container, "Physical properties of metals vs non-metals");
    const ids = (p.get("focusBankIds") ?? "").split(",").filter(Boolean);
    expect(ids.length).toBeGreaterThanOrEqual(5);
    for (const id of ids)
      expect(conceptForSubtopic(SLUG, bankRowMeta(id)!.subtopic.trim())).toBe("Physical Properties of Metals and Non-metals");
  });

  it("a card with TWO keys (extraction + refining) serves the union of both concepts' rows", () => {
    const { container } = renderAt();
    const ids = (practiseParams(container, "Extraction of metals").get("focusBankIds") ?? "").split(",").filter(Boolean);
    const seen = new Set(ids.map((id) => conceptForSubtopic(SLUG, bankRowMeta(id)!.subtopic.trim())));
    expect(seen).toEqual(new Set(["Basic Metallurgical Processes", "Refining of Metals"]));
  });

  it("CONTROL: a card WITHOUT conceptKeys keeps the old route — name + mark band, no id list", () => {
    const { container } = renderAt();
    const p = practiseParams(container, "Reactivity series");
    expect(p.get("focusBankIds")).toBeNull();
    expect(p.get("strictFocus")).toBeNull();
    expect(p.get("marksMin")).not.toBeNull();
    expect(p.get("focus")).toMatch(/^Reactivity series/);
  });
});

describe("Topic Hub arrival (?concept=) resolves a concept name to the card that stands for it", () => {
  it("a tracking concept name lands on the existing card that carries it", () => {
    const { container } = renderAt(`?concept=${encodeURIComponent("Basic Metallurgical Processes")}`);
    const marked = container.querySelectorAll('[data-arrival-concept="true"]');
    expect(marked).toHaveLength(1);
    expect(marked[0].textContent).toContain("Extraction of metals");
  });

  it("a card's own name still wins, and an unknown name marks nothing", () => {
    expect(renderAt(`?concept=Alloys`).container.querySelectorAll('[data-arrival-concept="true"]')).toHaveLength(1);
    cleanup();
    expect(renderAt(`?concept=${encodeURIComponent("Not A Concept")}`).container.querySelectorAll('[data-arrival-concept="true"]')).toHaveLength(0);
  });
});
