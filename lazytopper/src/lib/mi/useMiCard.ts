/**
 * MI-CONSISTENCY-1 — the React side of the ONE MI card. Reads the shared, memoised month read
 * (services/useMeHomeSummary — the SAME read Home and the sidebar already share) and runs the
 * selector (./miCardSummary) for every scope. The selector and the read model behind it load ON
 * DEMAND, so the cards' chunks never carry them; a failed load is an honest "error", never a guess.
 */
import { useEffect, useState } from "react";
import { useMeHome } from "../../services/useMeHomeSummary";
import type { MeHomeReader } from "../../services/meHomeSummary";
import type { DesktopRouteContext } from "../desktop/navigation";
import type { MiCardSummary } from "./miCardSummary";
import type { MiScope } from "./miScope";

export type MiCardStatus = "idle" | "loading" | "ok" | "error";

export function useMiCard(
  uid: string | null,
  gen: number,
  ctx: DesktopRouteContext,
  reader?: MeHomeReader,
): { status: MiCardStatus; cards: Record<MiScope, MiCardSummary> | null } {
  const { status, read } = useMeHome(uid, gen, reader);
  const [cards, setCards] = useState<{ for: unknown; value: Record<MiScope, MiCardSummary> } | null>(null);
  const [failed, setFailed] = useState<unknown>(null);
  const source = ctx.source;
  const returnTo = ctx.returnTo;
  useEffect(() => {
    const all = read?.all;
    if (!all) return;
    let cancelled = false;
    void (async () => {
      try {
        const { selectMiCards } = await import("./miCardSummary");
        if (!cancelled) setCards({ for: all, value: selectMiCards(all, { source, returnTo }) });
      } catch {
        if (!cancelled) setFailed(all);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [read, source, returnTo]);

  // No read to make (no real account, or the shared read reports nothing to read): the empty state.
  if (!uid || status === "idle") return { status: "idle", cards: null };
  if (status === "error") return { status: "error", cards: null };
  const all = read?.all ?? null;
  if (all && !all.mistakes.complete) return { status: "error", cards: null };
  if (all && failed === all) return { status: "error", cards: null };
  if (all && cards && cards.for === all) return { status: "ok", cards: cards.value };
  return { status: "loading", cards: null };
}
