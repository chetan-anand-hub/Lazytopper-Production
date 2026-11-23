/**
 * UI-E2E-1 — the KNOWN-ISSUES BASELINE (tests/e2e/baseline.json).
 *
 * The suite went live on pages that already had defects. Rather than fix product CSS in the
 * PR that adds the gate (out of scope) or switch a check off, each defect found on day one
 * is LISTED, one entry per element, and only NEW defects fail:
 *
 *   contrast      axe `color-contrast` (serious/critical) per page@viewport. An element is
 *                 keyed by its colours + its tag + its text (digits folded to #, so a price
 *                 change does not re-key it) — not by axe's nth-child CSS path, which shifts whenever an
 *                 unrelated element is added above it.
 *   ctaBelowFold  page@viewport whose primary CTA is known to sit below the first viewport.
 *
 * A listed entry that is no longer true is reported as an annotation (`baseline-stale`) so
 * the list can be trimmed; it never fails a run, so a PR that FIXES a defect stays green.
 *
 * Regenerate the contrast list (after a deliberate design change, never to silence a
 * regression):  E2E_WRITE_BASELINE=1 pnpm --filter lazytopper run test:e2e -- --workers=1
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const BASELINE_FILE = join(HERE, "..", "baseline.json");

export interface ContrastEntry {
  key: string;
  ratio: number;
  /** axe's selector when recorded — for a human to find the element; not used to match. */
  target: string;
}

export interface Baseline {
  _about: string;
  contrast: Record<string, ContrastEntry[]>;
  ctaBelowFold: Record<string, string>;
}

export function readBaseline(): Baseline {
  return JSON.parse(readFileSync(BASELINE_FILE, "utf8")) as Baseline;
}

export const writeMode = (): boolean => process.env.E2E_WRITE_BASELINE === "1";

/** Read-modify-write ONE page@viewport's contrast list. Run with --workers=1 in write mode. */
export function writeContrast(id: string, entries: ContrastEntry[]): void {
  const base = readBaseline();
  if (entries.length) base.contrast[id] = entries;
  else delete base.contrast[id];
  base.contrast = Object.fromEntries(Object.entries(base.contrast).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(BASELINE_FILE, `${JSON.stringify(base, null, 2)}\n`, "utf8");
}

interface AxeNodeLike {
  html: string;
  target: unknown[];
  any: Array<{ data?: { fgColor?: string; bgColor?: string; contrastRatio?: number } | null }>;
}

/** The stable identity of one contrast failure: colours + visible text. */
export function contrastEntry(node: AxeNodeLike): ContrastEntry {
  const data = node.any.find((c) => c.data && c.data.fgColor)?.data ?? {};
  const tag = /^<([a-z0-9-]+)/i.exec(node.html)?.[1]?.toLowerCase() ?? "?";
  const text = node.html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\d/g, "#")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return {
    key: `${data.fgColor ?? "?"} on ${data.bgColor ?? "?"} | <${tag}> ${text}`.trim(),
    ratio: Number(data.contrastRatio ?? 0),
    target: node.target.map(String).join(" >> "),
  };
}
