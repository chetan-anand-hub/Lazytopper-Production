// conceptVisualCatalogue.test.ts
// Resolver behaviour + interactive-existence coverage (Stage 3). Runs under vitest (Vite,
// so import.meta.glob in getNoteAssetUrl resolves) — Codespaces / when [FU-CI-GATE-VITEST]
// lands; not on Windows. The CI-GATED data guard is the .mjs acceptance script; this test
// adds (a) the interactive-id existence check the Node guard can't do, and (b) the resolver
// contract (exact-match-or-nothing, questionId override, interactive-as-offer, honest gap).

import { describe, it, expect } from "vitest";
import {
  conceptFigureCatalogue,
} from "./conceptVisualCatalogue.data";
import {
  resolveConceptVisual,
  catalogueFiguresForTopic,
  conceptKeyForLabel,
} from "./conceptVisualCatalogue";
import { getNoteAssetUrl } from "../../components/notes/noteSpecRegistry";
import { getFiguresForQuestion, getAllConceptsList } from "../../data/visualConceptRegistry";

describe("★ base-path — the #448 live bug: registry paths must be browser-loadable", () => {
  // The app is served under Vite's `base: "/app/"`. Registry filePaths are root-relative
  // ("/visuals/…"), so rendering one raw resolves to the DOMAIN ROOT and the host serves its own
  // 404 page inside our iframe/img. The CI guard cannot see this — it checks DISK existence,
  // which is only a proxy for URL reachability. This is where that invariant is actually pinned.
  const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

  it("an interactive body's url carries the base and is not a raw registry path", () => {
    const row = conceptFigureCatalogue.find((r) => r.best.kind === "interactive")!;
    const v = resolveConceptVisual({
      subject: row.subject,
      topicKey: row.topicKey,
      conceptKey: row.conceptKey,
    });
    expect(v?.body.kind).toBe("interactive");
    if (v?.body.kind === "interactive") {
      expect(v.body.url.startsWith(`${BASE}/visuals/`)).toBe(true);
      // The exact production failure: a bare "/visuals/…" when a base is configured.
      if (BASE) expect(v.body.url.startsWith("/visuals/")).toBe(false);
    }
  });

  it("a bank-figure body's url carries the base too", () => {
    const row = conceptFigureCatalogue.find((r) => r.best.kind === "bank-figure");
    if (!row) return; // data-shaped guard
    const v = resolveConceptVisual({
      subject: row.subject,
      topicKey: row.topicKey,
      conceptKey: row.conceptKey,
    });
    if (v?.body.kind === "image") {
      expect(v.body.url.startsWith(`${BASE}/visuals/`)).toBe(true);
      if (BASE) expect(v.body.url.startsWith("/visuals/")).toBe(false);
    }
  });

  it("a notes-figure body's url is NEVER double-prefixed (it is already based by Vite)", () => {
    // getNoteAssetUrl() returns a Vite-bundled ?url that already carries the base. Prefixing it
    // would emit "/app/app/…" and break the rows that work today — the trap inside the fix.
    const row = conceptFigureCatalogue.find((r) => r.best.kind === "notes-figure")!;
    const v = resolveConceptVisual({
      subject: row.subject,
      topicKey: row.topicKey,
      conceptKey: row.conceptKey,
    });
    expect(v?.body.kind).toBe("image");
    if (v?.body.kind === "image") {
      expect(v.body.url).not.toContain("/app/app/");
      if (BASE) expect(v.body.url.startsWith(`${BASE}${BASE}`)).toBe(false);
    }
  });
});

describe("catalogue integrity — every curated best ref resolves to a real asset", () => {
  const interactiveIds = new Set(getAllConceptsList().map((c) => c.id));

  for (const row of conceptFigureCatalogue) {
    it(`${row.topicKey} / ${row.conceptLabel} — best.${row.best.kind} resolves`, () => {
      if (row.best.kind === "notes-figure") {
        expect(getNoteAssetUrl(row.best.ref)).toBeTruthy();
      } else if (row.best.kind === "bank-figure") {
        const figs = getFiguresForQuestion(row.best.ref);
        expect(figs.length).toBeGreaterThan(0);
        expect(figs[0].filePath).toBeTruthy();
      } else if (row.best.kind === "interactive") {
        // The check the Node guard cannot do: the computed interactive id really exists.
        expect(interactiveIds.has(row.best.ref)).toBe(true);
      } else {
        expect(row.gap).toBe(true); // kind "none" MUST be flagged gap:true
      }
    });
  }
});

describe("resolveConceptVisual — exact-match-or-nothing (D-TUT-15), never a guess", () => {
  const triSimilar = conceptFigureCatalogue.find(
    (r) => r.topicKey === "triangles" && r.best.kind === "notes-figure",
  )!;
  const anInteractive = conceptFigureCatalogue.find((r) => r.best.kind === "interactive")!;
  const aGap = conceptFigureCatalogue.find((r) => r.best.kind === "none")!;

  it("resolves a known concept by its stored conceptKey to an image body", () => {
    const v = resolveConceptVisual({
      subject: triSimilar.subject,
      topicKey: triSimilar.topicKey,
      conceptKey: triSimilar.conceptKey,
    });
    expect(v).not.toBeNull();
    expect(v!.body.kind).toBe("image");
    expect(v!.conceptLabel).toBe(triSimilar.conceptLabel);
  });

  it("resolves by exact conceptLabel too", () => {
    const v = resolveConceptVisual({
      subject: triSimilar.subject,
      topicKey: triSimilar.topicKey,
      conceptLabel: triSimilar.conceptLabel,
    });
    expect(v?.body.kind).toBe("image");
  });

  it("returns null for an unknown concept (never a substring/concepts[0] fallback)", () => {
    expect(
      resolveConceptVisual({ subject: "maths", topicKey: "triangles", conceptKey: "not-a-real-key" }),
    ).toBeNull();
    expect(
      resolveConceptVisual({ subject: "maths", topicKey: "triangles", conceptLabel: "Totally made up" }),
    ).toBeNull();
  });

  it("renders an interactive-best row as an OFFER body, never an auto-embedded image", () => {
    const v = resolveConceptVisual({
      subject: anInteractive.subject,
      topicKey: anInteractive.topicKey,
      conceptKey: anInteractive.conceptKey,
    });
    expect(v?.body.kind).toBe("interactive");
  });

  it("renders a gap row as an honest gap body (never a stretched figure)", () => {
    const v = resolveConceptVisual({
      subject: aGap.subject,
      topicKey: aGap.topicKey,
      conceptKey: aGap.conceptKey,
    });
    expect(v?.body.kind).toBe("gap");
  });
});

describe("questionId override (D-TUT-14 #2) — a specific question's figure outranks the generic", () => {
  // A bank-figure row: its own questionId in play should still yield an image body.
  const bankRow = conceptFigureCatalogue.find((r) => r.best.kind === "bank-figure");

  it("prefers the in-play question's exam figure when it resolves", () => {
    if (!bankRow) return; // catalogue may carry 0 bank-best rows; guard is data-shaped
    const v = resolveConceptVisual({
      subject: bankRow.subject,
      topicKey: bankRow.topicKey,
      conceptKey: bankRow.conceptKey,
      questionId: bankRow.best.ref, // the same question's id
    });
    expect(v?.body.kind).toBe("image");
    if (v?.body.kind === "image") expect(v.body.source).toBe("bank");
  });

  it("ignores a questionId with no figure (falls back to the curated best)", () => {
    const anyRow = conceptFigureCatalogue.find((r) => r.best.kind !== "none")!;
    const v = resolveConceptVisual({
      subject: anyRow.subject,
      topicKey: anyRow.topicKey,
      conceptKey: anyRow.conceptKey,
      questionId: "NO-SUCH-QUESTION-ID",
    });
    expect(v).not.toBeNull(); // did not blank — fell back to best
  });
});

describe("catalogueFiguresForTopic + conceptKeyForLabel — the sentinel plumbing", () => {
  it("returns key+label options for a topic, excluding gap rows", () => {
    const tri = catalogueFiguresForTopic({ subject: "maths", topicKey: "triangles" });
    expect(tri.length).toBeGreaterThan(0);
    for (const opt of tri) {
      expect(opt.key).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/); // regex-safe sentinel token
      expect(typeof opt.label).toBe("string");
    }
  });

  it("maps an exact label back to its stored conceptKey (for the arrival-concept override)", () => {
    const row = conceptFigureCatalogue[0];
    expect(conceptKeyForLabel({ topicKey: row.topicKey, conceptLabel: row.conceptLabel })).toBe(
      row.conceptKey,
    );
    expect(conceptKeyForLabel({ topicKey: row.topicKey, conceptLabel: "nope" })).toBeNull();
  });
});
