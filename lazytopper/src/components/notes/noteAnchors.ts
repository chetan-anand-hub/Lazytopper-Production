/**
 * noteAnchors — the stable links of a note page (NOTES-FORMULA-3a, D208).
 *
 * A note page has FIVE section anchors and any number of per-item anchors:
 *
 *   #formulae  #shortcuts  #memory-tricks  #mindmap   -> the second tab ("Formulae & Tricks")
 *   #diagrams                                         -> the third tab, when it is the diagrams tab
 *   #<id>      a formula-strip item, a shortcut / memory trick, or a diagram that carries an `id`
 *
 * Loading `/notes/<chapter>#<anchor>` (or following an in-page link) must OPEN the tab that holds the
 * anchor and scroll to it. Every panel is always in the DOM and the prerendered HTML, so the anchors are
 * crawlable; but an inactive panel is `display:none`, so the browser cannot scroll to it by itself.
 *
 * An `id` is lower-kebab, unique within the page, and STABLE once shipped: a guard test
 * (`noteAnchors.guard.test.ts`) pins every shipped id in a committed file.
 */
import type { NoteShortcut, NoteSpec } from "./noteSpec.types";

export type AnchorTab = "mind" | "third";

export const SECTION_ANCHORS = {
  formulae: "formulae",
  shortcuts: "shortcuts",
  memoryTricks: "memory-tricks",
  mindmap: "mindmap",
  diagrams: "diagrams",
} as const;

/** Ids an item may NOT use: they are the section anchors. */
export const RESERVED_IDS: ReadonlySet<string> = new Set(Object.values(SECTION_ANCHORS));

export const NOTE_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The shortcuts shown in the "Shortcuts & Tricks" card (everything that is not a memory aid). */
export function shortcutsOf(spec: NoteSpec): NoteShortcut[] {
  return (spec.shortcuts ?? []).filter((s) => s.use !== "memory-aid");
}
/** The shortcuts shown in the "Memory Tricks" card. */
export function memoryTricksOf(spec: NoteSpec): NoteShortcut[] {
  return (spec.shortcuts ?? []).filter((s) => s.use === "memory-aid");
}
/** Does the chapter have any shortcut or memory trick? (decides the tab label and the Note-tab link) */
export function hasTricks(spec: NoteSpec): boolean {
  return (spec.shortcuts ?? []).length > 0;
}

/** The refs of the figures the diagrams tab shows (empty unless the third tab is the diagrams tab). */
function diagramRefs(spec: NoteSpec): string[] {
  const c = spec.third_tab_content;
  return c && c.kind === "diagrams" ? c.diagrams : [];
}

export interface AnchorEntry {
  id: string;
  kind: "formula" | "shortcut" | "diagram";
}

/** Every per-item id the spec declares, in page order. */
export function itemAnchors(spec: NoteSpec): AnchorEntry[] {
  const out: AnchorEntry[] = [];
  for (const f of spec.formula_strip ?? []) if (f.id) out.push({ id: f.id, kind: "formula" });
  for (const s of spec.shortcuts ?? []) out.push({ id: s.id, kind: "shortcut" });
  for (const ref of diagramRefs(spec)) {
    const fig = spec.figures?.[ref];
    if (fig?.id) out.push({ id: fig.id, kind: "diagram" });
  }
  return out;
}

/** Ids declared more than once on one page, or reserved, or not lower-kebab (empty = clean). */
export function anchorProblems(spec: NoteSpec): string[] {
  const seen = new Set<string>();
  const bad: string[] = [];
  for (const { id } of itemAnchors(spec)) {
    if (!NOTE_ID_RE.test(id)) bad.push(`${id}: not lower-kebab`);
    if (RESERVED_IDS.has(id)) bad.push(`${id}: reserved section anchor`);
    if (seen.has(id)) bad.push(`${id}: duplicate`);
    seen.add(id);
  }
  return bad;
}

/**
 * anchor -> the tab that holds it. Only anchors that EXIST on this page are in the map (an empty
 * Shortcuts card renders nothing, so `#shortcuts` is not an anchor there).
 */
export function anchorTabs(spec: NoteSpec): Map<string, AnchorTab> {
  const m = new Map<string, AnchorTab>();
  if ((spec.formula_strip ?? []).length > 0) m.set(SECTION_ANCHORS.formulae, "mind");
  if (shortcutsOf(spec).length > 0) m.set(SECTION_ANCHORS.shortcuts, "mind");
  if (memoryTricksOf(spec).length > 0) m.set(SECTION_ANCHORS.memoryTricks, "mind");
  m.set(SECTION_ANCHORS.mindmap, "mind");
  if (diagramRefs(spec).length > 0) m.set(SECTION_ANCHORS.diagrams, "third");
  for (const { id, kind } of itemAnchors(spec)) m.set(id, kind === "diagram" ? "third" : "mind");
  return m;
}

/** The anchor named by a `location.hash` ("#shortcuts" -> "shortcuts"), decoded; "" when none. */
export function anchorFromHash(hash: string): string {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
