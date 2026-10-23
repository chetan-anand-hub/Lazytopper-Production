/**
 * MI-CONSISTENCY-1 — what Ziggy / Byte may say about the ONE MI card: its own view, projected to
 * the character row's input (components/guide/mi, unchanged). Every number the character says is a
 * string the card itself prints:
 *   - untyped (marks lost, no type)  → the headline figure (`marksFigure(lost)`, printed in "N marks lost");
 *   - biggest chance to gain         → `chance.amount`, printed beside the type;
 *   - thin / empty                   → no number at all.
 * No new read, no new rounding.
 */
import type { MiVoiceInput } from "../guide/mi/miVoiceModel";
import { marksFigure } from "../../lib/mi/miScope";
import type { MiCardSummary } from "../../lib/mi/miCardSummary";
import type { MiCardStatus } from "../../lib/mi/useMiCard";

export function miVoiceInputForCard(status: MiCardStatus | "signed-out", summary: MiCardSummary | null): MiVoiceInput {
  if (status === "signed-out") return { kind: "signed-out" };
  if (status === "error") return { kind: "error" };
  if (!summary) return { kind: "loading" };
  if (summary.state === "empty") return { kind: "no-data" };
  if (summary.state === "thin") return { kind: "with-data", namesWeakness: false, topLoss: null };
  if (summary.lost > 0 && summary.typed === 0) {
    return { kind: "untyped", lost: summary.lost, lostText: marksFigure(summary.lost) };
  }
  return {
    kind: "with-data",
    namesWeakness: true,
    topLoss: summary.chance ? { group: summary.chance.group, amount: summary.chance.amount } : null,
  };
}
