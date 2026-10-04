// LOW-END-1 PR-1 (L4) — each notes page loads ONLY its own spec.
//
// noteSpecRegistry's glob used to be eager: all 26 specs (~780 KB of JSON) were bundled into
// every Notes and Topic Hub page. Each spec is now its own chunk, keyed by filename.
//
//   (a) every spec file's name equals its meta.topic_key and it is a valid spec — the lazy
//       registry keys by FILENAME, so a mismatch would silently lose a chapter's notes;
//   (b) loading one chapter loads that chapter only (fresh module, nothing preloaded);
//   (c) the specs glob is not eager (read from source with the TypeScript parser);
//   (d) /notes/:slug while its chunk is in flight shows the page header and NEVER "Notes not
//       found"; the note appears when the chunk lands. An unknown slug is "not found" at once.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

afterEach(cleanup);

type Registry = typeof import("./noteSpecRegistry");

async function freshRegistry(): Promise<Registry> {
  vi.resetModules();
  return import("./noteSpecRegistry");
}

const SPECS_DIR = resolve(__dirname, "../../../../notes/specs");
const SPEC_FILES = readdirSync(SPECS_DIR).filter((f) => f.endsWith(".json"));

describe("L4 — note specs load per chapter", () => {
  it("(a) every spec file is named after its meta.topic_key and is a valid spec", async () => {
    const registry = await freshRegistry();
    expect(SPEC_FILES).toHaveLength(26);
    expect(registry.noteSpecSlugs().sort()).toEqual(SPEC_FILES.map((f) => f.replace(/\.json$/, "")).sort());
    for (const file of SPEC_FILES) {
      const slug = file.replace(/\.json$/, "");
      const onDisk = JSON.parse(readFileSync(resolve(SPECS_DIR, file), "utf8")) as { meta: { topic_key: string } };
      expect(onDisk.meta.topic_key, file).toBe(slug);
      const spec = await registry.ensureNoteSpec(slug);
      expect(spec, `${file} loads as a valid spec`).not.toBeNull();
      expect(spec!.meta.topic_key).toBe(slug);
    }
  });

  it("(b) ★ loading one chapter loads THAT chapter only", async () => {
    const registry = await freshRegistry();
    const slugs = registry.noteSpecSlugs();
    expect(slugs.length).toBe(26);
    // Known without any download…
    expect(slugs.every((s) => registry.hasNoteSpec(s))).toBe(true);
    // …and nothing is loaded yet.
    expect(slugs.filter((s) => registry.isNoteSpecLoaded(s))).toEqual([]);
    expect(registry.getNoteSpecForTopic("trigonometry")).toBeNull();

    const spec = await registry.ensureNoteSpec("trigonometry");
    expect(spec?.meta.topic_key).toBe("trigonometry");
    expect(registry.getNoteSpecForTopic("trigonometry")).toBe(spec);
    expect(slugs.filter((s) => registry.isNoteSpecLoaded(s))).toEqual(["trigonometry"]);
    expect(registry.getNoteSpecForTopic("electricity")).toBeNull();
  });

  it("(b) a slug with no spec file needs nothing: settled, null, no spec", async () => {
    const registry = await freshRegistry();
    expect(registry.hasNoteSpec("does-not-exist")).toBe(false);
    expect(registry.isNoteSpecLoaded("does-not-exist")).toBe(true);
    await expect(registry.ensureNoteSpec("does-not-exist")).resolves.toBeNull();
  });

  it("(c) the specs glob is lazy — no `eager` option", () => {
    const file = resolve(__dirname, "noteSpecRegistry.ts");
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    const globs: Array<{ pattern: string; eager: boolean }> = [];
    const visit = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "glob" &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        const opts = node.arguments[1];
        const eager =
          !!opts &&
          ts.isObjectLiteralExpression(opts) &&
          opts.properties.some(
            (p) =>
              ts.isPropertyAssignment(p) &&
              ts.isIdentifier(p.name) &&
              p.name.text === "eager" &&
              p.initializer.kind === ts.SyntaxKind.TrueKeyword,
          );
        globs.push({ pattern: node.arguments[0].text, eager });
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    const specs = globs.filter((g) => g.pattern.includes("notes/specs/"));
    expect(specs).toEqual([{ pattern: "../../../../notes/specs/*.json", eager: false }]);
    // CONTROL — the reader does see `eager: true` where it is set (the figure-URL glob).
    expect(globs.some((g) => g.pattern.includes("notes/assets/") && g.eager)).toBe(true);
  });
});

describe("L4 — /notes/:slug awaits its own chunk", () => {
  async function renderFresh(path: string) {
    vi.resetModules();
    const { default: DesktopNotesPage } = await import("../../pages/desktop/DesktopNotesPage");
    const registry = await import("./noteSpecRegistry");
    const view = render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/notes/:topicSlug" element={<DesktopNotesPage />} />
        </Routes>
      </MemoryRouter>,
    );
    return { ...view, registry };
  }

  it("(d) ★ in flight: the header shows, 'Notes not found' never does; the note appears when the chunk lands", async () => {
    const { container, registry } = await renderFresh("/notes/trigonometry");
    expect(registry.isNoteSpecLoaded("trigonometry")).toBe(false);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Trigonometry");
    expect(screen.queryByText("Notes not found")).toBeNull();
    expect(container.querySelector(".lt-note")).toBeNull();

    await screen.findByRole("tablist");
    expect(container.querySelector(".lt-note")).not.toBeNull();
    expect(screen.queryByText("Notes not found")).toBeNull();
    // Only this chapter was fetched.
    expect(registry.noteSpecSlugs().filter((s) => registry.isNoteSpecLoaded(s))).toEqual(["trigonometry"]);
  });

  it("(d) CONTROL — an unknown slug is 'Notes not found' immediately (nothing to wait for)", async () => {
    await renderFresh("/notes/does-not-exist");
    expect(screen.getByText("Notes not found")).toBeInTheDocument();
  });
});
