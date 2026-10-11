/**
 * NOTES-LEDGER-COLLAPSE-1 (cofounder D48c) — the Source ledger on every notes page is a CLOSED native
 * <details> whose summary reads "Sources: NCERT 2026-27 (tap to view)".
 *
 *  L1  closed by default (no `open` attribute) — on every chapter's note.
 *  L2  the ledger content is still in the DOM AND in the server-rendered HTML (prerendered pages): one table
 *      row per spec.source_ledger entry, so it stays crawlable and the trust signal survives.
 *  L3  it toggles open and closed.
 *  L4  the ledger text itself is unchanged: every row's item and source string is still present.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { Note } from "./Note";
import { ensureAllNoteSpecs, getNoteSpecForTopic } from "./noteSpecRegistry";

await ensureAllNoteSpecs();
afterEach(cleanup);

const TOPICS = ["trigonometry", "polynomials", "metals-and-non-metals", "electricity", "heredity"];

const specOf = (topic: string) => {
  const spec = getNoteSpecForTopic(topic);
  if (!spec) throw new Error("no note spec for " + topic);
  return spec;
};
const mount = (topic: string) =>
  render(
    <MemoryRouter>
      <Note spec={specOf(topic)} />
    </MemoryRouter>,
  );

describe("Source ledger disclosure", () => {
  it.each(TOPICS)("%s: closed by default, summary text exact", (topic) => {
    const { container } = mount(topic);
    const details = container.querySelector<HTMLDetailsElement>("details.lt-note__ledger-details");
    expect(details, "the ledger disclosure").not.toBeNull();
    expect(details!.hasAttribute("open")).toBe(false);
    expect(details!.querySelector("summary")!.textContent).toBe("Sources: NCERT 2026-27 (tap to view)");
  });

  it.each(TOPICS)("%s: the whole ledger is still in the DOM while closed", (topic) => {
    const spec = specOf(topic);
    const { container } = mount(topic);
    const rows = container.querySelectorAll("details.lt-note__ledger-details table.lt-note__ledger tbody tr");
    expect(rows.length).toBe(spec.source_ledger.length);
    expect(rows.length).toBeGreaterThan(0);
  });

  it.each(TOPICS)("%s: the prerendered (server) HTML carries a closed disclosure with every ledger row", (topic) => {
    const spec = specOf(topic);
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Note spec={spec} />
      </MemoryRouter>,
    );
    expect(html).toMatch(/<details class="lt-note__ledger-details">/); // no `open`
    expect(html).toContain("Sources: NCERT 2026-27 (tap to view)");
    const rowCount = (html.match(/<tr>/g) ?? []).length;
    expect(rowCount).toBeGreaterThanOrEqual(spec.source_ledger.length);
    for (const row of spec.source_ledger) expect(html, row.source).toContain(row.source.replace(/&/g, "&amp;").split(" ")[0]);
  });

  it("toggles open and closed", () => {
    const { container } = mount("trigonometry");
    const details = container.querySelector<HTMLDetailsElement>("details.lt-note__ledger-details")!;
    const summary = details.querySelector("summary")!;
    fireEvent.click(summary);
    expect(details.open).toBe(true);
    fireEvent.click(summary);
    expect(details.open).toBe(false);
  });

  it("CONTROL: a note with an EMPTY ledger renders no disclosure at all", () => {
    const spec = { ...specOf("trigonometry"), source_ledger: [] };
    const { container } = render(
      <MemoryRouter>
        <Note spec={spec} />
      </MemoryRouter>,
    );
    expect(container.querySelector("details.lt-note__ledger-details")).toBeNull();
  });

  it("the ledger rows keep their item text (nothing reworded)", () => {
    const spec = specOf("metals-and-non-metals");
    const { container } = mount("metals-and-non-metals");
    const text = container.querySelector("table.lt-note__ledger")!.textContent ?? "";
    for (const row of spec.source_ledger.slice(0, 6)) expect(text).toContain(row.item.split("<")[0].split("&")[0].slice(0, 12));
  });
});
