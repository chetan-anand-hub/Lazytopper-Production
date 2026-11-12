/**
 * packTemplateCore - SERVER-PDF-1 PR-A. The PURE half of the template plan: types, the file-id rule and the hashes.
 * Imports nothing at runtime, so the node generator, the server (PR-B) and the tests can all use it without dragging in the app.
 * See packTemplatePlan.ts for what a template, a unit and a group are.
 */
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";
import type { BridgePagesData } from "./packBridge";
import type { PackPaperReg } from "./packPaperRecord";
import type { PrintCoverProps } from "../../components/worksheet/PrintCover";

export type PlanCover = Pick<PrintCoverProps, "kicker" | "title" | "subtitle" | "stats" | "headline" | "types">;

export type TemplateUnit =
  | { kind: "chapter"; key: string }
  | { kind: "mocks"; key: "maths" | "science" }
  | { kind: "cbq"; key: "maths" | "science" };

export interface PlanPaper {
  code: string;
  reg: Omit<PackPaperReg, "paper" | "code">;
  /** The paper exactly as drawn (createdAt = the draw stamp, never a date): what the student's upload is graded against. */
  ws: PersistedWorksheet;
}

export interface PlanFile {
  templateId: string;
  unit: TemplateUnit;
  groupId: string;
  group: string;
  label: string;
  filename: string;
  mode: "questions" | "answers";
  /** The paper codes the file prints, in order (empty for a question-bank section / the CBQ intro). */
  codes: string[];
  cover?: PlanCover;
  /** Does the file carry bridge pages 2-3 at all? (Their content is per pack: see `planBridges`.) */
  hasBridge: boolean;
  papers: PlanPaper[];
  /** The worksheet of a paper-less file. */
  ws?: PersistedWorksheet;
}

/**
 * The template a buyer's file id maps to. A pack file id is `<packId>|<tail>`; the tail is the template id, except in a CBQ Pack
 * where it is prefixed by the subject (`intro` exists once per subject). PR-B's server uses this same rule.
 */
export function templateIdForPackFile(packId: string, fileId: string): string | null {
  if (!fileId.startsWith(`${packId}|`)) return null;
  const tail = fileId.slice(packId.length + 1);
  if (!tail) return null;
  if (packId.startsWith("pack_cbq:")) return `cbq-${packId.slice("pack_cbq:".length)}|${tail}`;
  return tail;
}

/** Pages 2-3 of every file of every pack, WITHOUT the Board Pass card (the card variant is the same data with boardPassCard true). */
export interface PlanBridge {
  packId: string;
  templateId: string;
  data: BridgePagesData;
}

/** Stable JSON (sorted keys, no whitespace): what every hash in the manifest is taken over. */
export function canonicalJson(value: unknown): string {
  const norm = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      return Object.keys(o)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          if (o[k] !== undefined) acc[k] = norm(o[k]);
          return acc;
        }, {});
    }
    return v;
  };
  return JSON.stringify(norm(value));
}

/** Everything that decides how a template's PDF looks, other than the renderer itself (that is `rendererVersion`). */
export function templateHashInput(f: PlanFile): unknown {
  return {
    templateId: f.templateId,
    mode: f.mode,
    filename: f.filename,
    cover: f.cover ?? null,
    hasBridge: f.hasBridge,
    papers: f.papers.map((p) => ({ code: p.code, reg: p.reg, ws: p.ws })),
    ws: f.ws ?? null,
  };
}

/** The bridge pages (2-3) of a file for one buyer variant: their own hash, because a pack's files share them. */
export function bridgeHashInput(b: BridgePagesData, boardPassCard: boolean): unknown {
  return { ...b, boardPassCard };
}

/** A shop pack as a list of units (its files are its units' files, in this order). */
export interface PackUnitsDef {
  packId: string;
  sku: "pack_chapter" | "pack_mock" | "pack_subject" | "pack_bundle" | "pack_cbq";
  target: string;
  units: TemplateUnit[];
}
