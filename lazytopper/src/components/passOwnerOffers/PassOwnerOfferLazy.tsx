/**
 * PassOwnerOfferLazy - PASS-OWNER-PACKS-1. The only thing a host page imports: the packs flag read and ONE lazy wrapper, so the
 * offer, its CSS and the owned-pack read live in their own chunk (PERF-3: nothing added to the entry). Flag off: renders and loads
 * nothing.
 */
import { lazy, Suspense } from "react";
import type { PassOwnerOfferProps } from "./PassOwnerOffer";

const PassOwnerOffer = lazy(() => import("./PassOwnerOffer"));

function packsOn(): boolean {
  try {
    return String(import.meta.env.VITE_PACKS_ENABLED ?? "").trim() === "1";
  } catch {
    return false;
  }
}

export default function PassOwnerOfferLazy(props: PassOwnerOfferProps) {
  if (!packsOn()) return null;
  return (
    <Suspense fallback={null}>
      <PassOwnerOffer {...props} />
    </Suspense>
  );
}
