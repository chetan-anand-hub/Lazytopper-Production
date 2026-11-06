/**
 * PACK-PREVIEW-1 - each pack previews pages of ITS OWN kind and subject.
 *
 *   1. the catalogue: every pack kind has its preview set(s), ids and captions are unique, every committed image exists and is small
 *   2. packPreviewFor: a chapter pack follows its chapter's subject, the Maths/Science toggle picks the set
 *   3. the pop-up: each pack id shows its own images and caption (no-preview fallback: PackDialog.noPreview.test.tsx)
 *   4. syllabus guard: the real worksheets the previews come from carry no banned 2026-27 text (same scan as the generator)
 *   5. the previews code is reachable only from the lazy pop-up (the entry chunk does not grow)
 */
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "u1" }, loading: false }) }));
vi.mock("../../components/packs/PackSampleLink", () => ({ default: () => <a href="/sample">See a free sample</a> }));

import PackDialog from "../../pages/PackDialog";
import { PACK_SKUS, PACK_SUBJECTS, chaptersOfSubject, packIdOf, type PackSku, type PackSubject } from "../../services/packs";
import {
  PACK_PREVIEWS,
  PREVIEW_FALLBACK_CAPTION,
  PREVIEW_PAGES,
  PREVIEW_SIZES,
  packPreviewFor,
  previewCaption,
  previewChapterSlug,
  previewImage,
  previewShows,
} from "./packPreviews";
import { SURFACE_BANNED_PHRASES, scanContentForPhrases } from "../../../../scripts/src/syllabusGuard";

const PUBLIC = path.resolve(__dirname, "../../../public");
const MAX_BYTES = 110 * 1024;

afterEach(() => cleanup());

describe("the preview catalogue", () => {
  it("has a set for every pack kind: Maths and Science for chapter, mock, subject and CBQ, one for the bundle", () => {
    for (const sku of PACK_SKUS) {
      const sets = PACK_PREVIEWS.filter((p) => p.sku === sku);
      expect(sets.map((p) => p.target).sort(), sku).toEqual(sku === "pack_bundle" ? ["all"] : ["maths", "science"]);
    }
    expect(new Set(PACK_PREVIEWS.map((p) => p.id)).size).toBe(PACK_PREVIEWS.length);
    expect(new Set(PACK_PREVIEWS.map(previewCaption)).size).toBe(PACK_PREVIEWS.length);
  });

  it("every image exists, is a small WebP, and nothing else sits in public/packs/previews", () => {
    const want = new Set<string>();
    for (const spec of PACK_PREVIEWS) {
      for (const page of PREVIEW_PAGES) {
        for (const size of PREVIEW_SIZES) {
          const url = previewImage(spec, page, size);
          want.add(path.basename(url));
          const file = path.join(PUBLIC, url);
          expect(fs.existsSync(file), url).toBe(true);
          const buf = fs.readFileSync(file);
          expect(buf.length, url).toBeLessThan(MAX_BYTES);
          expect(buf.subarray(0, 4).toString("latin1") + buf.subarray(8, 12).toString("latin1"), url).toBe("RIFFWEBP");
        }
      }
    }
    expect(fs.readdirSync(path.join(PUBLIC, "packs", "previews")).sort()).toEqual([...want].sort());
  });

  it("each caption names the pack kind and (except the bundle) the subject, and what the pages are", () => {
    for (const spec of PACK_PREVIEWS) {
      const c = previewCaption(spec);
      expect(c, spec.id).toContain(previewShows(spec));
      if (spec.sku !== "pack_bundle") expect(c, spec.id).toContain(spec.subject === "maths" ? "Maths" : "Science");
      expect(c, spec.id).not.toMatch(/premium|refund/i);
    }
    expect(previewCaption(PACK_PREVIEWS.find((p) => p.sku === "pack_bundle")!)).toContain("Maths + Science Bundle");
  });

  it("the page of a set comes from a chapter of ITS subject", () => {
    for (const spec of PACK_PREVIEWS.filter((p) => p.sku !== "pack_mock")) {
      expect(chaptersOfSubject(spec.subject)).toContain(previewChapterSlug(spec));
    }
    expect(previewChapterSlug(PACK_PREVIEWS.find((p) => p.sku === "pack_mock")!)).toBeNull();
  });
});

describe("packPreviewFor", () => {
  it("maps every pack id (sku + subject) to its own set", () => {
    const seen = new Map<string, string>();
    for (const sku of PACK_SKUS) {
      for (const subject of PACK_SUBJECTS) {
        const spec = packPreviewFor(sku, subject);
        expect(spec, `${sku}:${subject}`).not.toBeNull();
        expect(spec!.sku).toBe(sku);
        seen.set(packIdOf(sku, subject), spec!.id);
      }
    }
    expect(new Set(seen.values()).size).toBe(PACK_PREVIEWS.length);
  });

  it("a chapter pack follows its picked chapter's subject, not the toggle", () => {
    const sci = chaptersOfSubject("science")[3];
    const mat = chaptersOfSubject("maths")[3];
    expect(packPreviewFor("pack_chapter", "maths", sci)?.id).toBe("chapter-science");
    expect(packPreviewFor("pack_chapter", "science", mat)?.id).toBe("chapter-maths");
    expect(packPreviewFor("pack_chapter", "science", "")?.id).toBe("chapter-science");
  });

  it("an unknown pack kind has no preview", () => {
    expect(packPreviewFor("pack_nope" as PackSku, "maths")).toBeNull();
  });
});

function dialog(sku: PackSku, subject: PackSubject, chapter = "") {
  return render(
    <MemoryRouter>
      <PackDialog sku={sku} chapter={chapter} subject={subject} onChapter={vi.fn()} onSubject={vi.fn()} questions={null} buy={<button type="button">Buy</button>} onClose={vi.fn()} />
    </MemoryRouter>,
  );
}

describe("the pop-up", () => {
  it.each(PACK_PREVIEWS.map((p) => [p.id, p] as const))("%s shows its own three pages, lazy-loaded, with alt text and its own caption", (_id, spec) => {
    dialog(spec.sku, spec.subject, spec.sku === "pack_chapter" ? chaptersOfSubject(spec.subject)[5] : "");
    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>(".lt-pkd__slide img"));
    expect(imgs.map((i) => i.getAttribute("src"))).toEqual(PREVIEW_PAGES.map((pg) => previewImage(spec, pg, 480)));
    for (const img of imgs) {
      expect(img.getAttribute("srcset")).toMatch(/480w, .*-827\.webp 827w$/);
      expect(img.getAttribute("alt")).toContain(previewShows(spec));
      expect(img.getAttribute("width")).toBe("827");
    }
    expect(imgs.slice(1).every((i) => i.getAttribute("loading") === "lazy")).toBe(true);
    expect(screen.getByTestId("pack-preview-caption").textContent).toBe(previewCaption(spec));
  });
});

describe("syllabus guard on the real previewed worksheets", () => {
  it("none of the files the previews come from carries banned 2026-27 text", async () => {
    const { chapterFiles, cbqFiles, mockFiles } = await import("./buildPackFiles");
    const texts: string[] = [];
    for (const spec of PACK_PREVIEWS) {
      const slug = previewChapterSlug(spec) ?? chaptersOfSubject(spec.subject)[0];
      const target = spec.sku === "pack_chapter" ? slug : spec.sku === "pack_bundle" ? "all" : spec.subject;
      const packId = packIdOf(spec.sku, target);
      const ctx = {
        licensee: { name: "Sample Student", email: "sample@lazytopper.com" },
        owned: [],
        nowIso: () => "2026-10-25T00:00:00.000Z",
        exportPdf: async (ws: unknown) => {
          texts.push(JSON.stringify(ws));
          return "x.pdf";
        },
      };
      const files =
        spec.sku === "pack_mock"
          ? await mockFiles(spec.subject, packId, spec.sku, ctx)
          : spec.sku === "pack_cbq"
          ? await cbqFiles(spec.subject, packId, spec.sku, ctx)
          : await chapterFiles(slug, packId, spec.sku, ctx);
      for (const suffix of [spec.questionsSuffix, spec.answersSuffix]) {
        const hit = files.find((f) => f.id.endsWith(`|${suffix}`) && (spec.sku === "pack_mock" || f.id.includes(`|${slug}|`)));
        expect(hit, `${spec.id} ${suffix}`).toBeTruthy();
        await hit!.build();
      }
    }
    expect(texts).toHaveLength(PACK_PREVIEWS.length * 2);
    const hits = scanContentForPhrases(texts.join("\n"), SURFACE_BANNED_PHRASES);
    expect([...hits.keys()]).toEqual([]);
  }, 180000);
});

describe("entry-chunk budget", () => {
  it("packPreviews is imported only by the lazy pop-up (and tests/scripts), never by an entry-chunk module", () => {
    const src = path.resolve(__dirname, "../..");
    const importers: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) && /packPreviews["']/.test(fs.readFileSync(p, "utf8"))) importers.push(path.relative(src, p).replace(/\\/g, "/"));
      }
    };
    walk(src);
    expect(importers).toEqual(["pages/PackDialog.tsx"]);
  });
});
