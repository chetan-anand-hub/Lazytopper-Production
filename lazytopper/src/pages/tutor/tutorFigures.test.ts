// TUTOR-FIX-2 T4.1 — the client offers the model ONLY figure keys the panel can render, so a
// server-valid [[figure:key]] always means a diagram the student can see. Planted fault: every
// notes-figure asset is missing (getNoteAssetUrl → null), so those concepts resolve to the honest
// "gap" — they must never be offered, while catalogueFiguresForTopic (the old offer) still lists them.

import { describe, it, expect, vi } from "vitest";

vi.mock("../../components/notes/noteSpecRegistry", () => ({ getNoteAssetUrl: () => null }));

import { catalogueFiguresForTopic, resolveConceptVisual } from "./conceptVisualCatalogue";
import { conceptFigureCatalogue } from "./conceptVisualCatalogue.data";
import { renderableFiguresForTopic } from "./tutorFigures";

const topics = [...new Set(conceptFigureCatalogue.map((r) => `${r.subject}\n${r.topicKey}`))].map((s) => {
  const [subject, topicKey] = s.split("\n");
  return { subject: subject as "maths" | "science", topicKey };
});

describe("T4.1 · renderableFiguresForTopic", () => {
  it("★★ an unresolvable (gap) key is NEVER offered — and the old offer did list it (RED on catalogueFiguresForTopic)", () => {
    let dropped = 0;
    for (const t of topics) {
      const all = catalogueFiguresForTopic(t).map((f) => f.key);
      const offered = renderableFiguresForTopic(t).map((f) => f.key);
      for (const key of offered) {
        const v = resolveConceptVisual({ ...t, conceptKey: key });
        expect(v, `${t.topicKey}/${key}`).not.toBeNull();
        expect(v!.body.kind, `${t.topicKey}/${key}`).not.toBe("gap");
      }
      for (const key of all) {
        const v = resolveConceptVisual({ ...t, conceptKey: key });
        if (!v || v.body.kind === "gap") {
          expect(offered, `${t.topicKey}/${key}`).not.toContain(key);
          dropped++;
        }
      }
    }
    // The planted fault really produced unrenderable keys in the old offer.
    expect(dropped).toBeGreaterThan(0);
  });

  it("CONTROL: a renderable key is still offered (the filter is not 'offer nothing')", () => {
    const offeredSomewhere = topics.some((t) => renderableFiguresForTopic(t).length > 0);
    expect(offeredSomewhere).toBe(true);
  });
});
