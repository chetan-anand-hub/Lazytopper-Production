// src/components/startHere/startHereAvailabilitySource.ts
//
// QP-SCORECARD-2 D3 — the SOURCE of the precomputed Start-here availability map.
//
// ⚠ BANK-REACHING. Imported ONLY by the generator (scripts/generateStartHereAvailability.mjs, via vitest)
// and the D3 guard in startHereBank.test.ts — never by the card, never by a page.
// The card reads the frozen output, ./startHereAvailability.generated.ts, which is plain data.

import { desktopTopicsBySubject } from "../../lib/desktop/topics";
import type { DesktopSubject } from "../../lib/desktop/navigation";
import { startHereAvailability, type StartHereAvailability } from "./startHereBank";

export const START_HERE_SUBJECTS = ["Maths", "Science"] as const satisfies readonly DesktopSubject[];
export type StartHereAvailabilityMap = Record<(typeof START_HERE_SUBJECTS)[number], StartHereAvailability>;

/** The runtime computation over the real bank, for every chapter the card lists. */
export async function computeStartHereAvailabilityMap(): Promise<StartHereAvailabilityMap> {
  const out = {} as StartHereAvailabilityMap;
  for (const subject of START_HERE_SUBJECTS) {
    out[subject] = await startHereAvailability(
      subject,
      desktopTopicsBySubject(subject).map((t) => t.slug),
    );
  }
  return out;
}

/** The generated file's exact text (LF, chapter order = the card's list order). */
export function renderStartHereAvailabilityFile(map: StartHereAvailabilityMap): string {
  const lines: string[] = [
    "// src/components/startHere/startHereAvailability.generated.ts",
    "//",
    "// GENERATED. DO NOT EDIT. Regenerate from `lazytopper/` with:",
    "//     node scripts/generateStartHereAvailability.mjs --write",
    "// Guarded by the D3 block of startHereBank.test.ts (equals the runtime computation over the real bank).",
    "//",
    "// QP-SCORECARD-2 D3: per subject -> chapter slug -> how many isCbq four-option MCQs (mcq) and",
    "// Assertion-Reason items (ar) the chapter has, so the Start-here card lists chapters and",
    "// question types with NO bank download. The bank is fetched only on Start.",
    "",
    "export const START_HERE_AVAILABILITY = {",
  ];
  for (const subject of START_HERE_SUBJECTS) {
    lines.push(`  ${subject}: {`);
    for (const [slug, c] of Object.entries(map[subject])) {
      lines.push(`    ${JSON.stringify(slug)}: { mcq: ${c.mcq}, ar: ${c.ar} },`);
    }
    lines.push("  },");
  }
  lines.push("} as const satisfies Record<\"Maths\" | \"Science\", Record<string, { mcq: number; ar: number }>>;");
  lines.push("");
  return lines.join("\n");
}
