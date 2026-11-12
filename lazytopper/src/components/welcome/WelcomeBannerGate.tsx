/**
 * WelcomeBannerGate — SELFPAY-ATTACH-1: the ONLY thing Home / My packs carry in their own chunk. It reads `?welcome=` and, only when
 * it is there, loads the banner lazily (nothing for anyone else). No param -> renders nothing and costs nothing.
 */
import { Suspense, lazy, useState } from "react";
import { useLocation } from "react-router-dom";

const WelcomeBanner = lazy(() => import("./WelcomeBanner"));

export type WelcomeKind = "board_pass" | "pack";

export function readWelcome(search: string): WelcomeKind | null {
  const v = new URLSearchParams(search).get("welcome");
  return v === "board_pass" || v === "pack" ? v : null;
}

/** F5: the bought pack's id from `?pack=` (a catalogue id, not personal data); anything odd is "no pack" (so no banner). */
export function readWelcomePack(search: string): string {
  const v = new URLSearchParams(search).get("pack") || "";
  return /^[a-z_]+:[a-z0-9_-]+$/i.test(v) ? v : "";
}

export default function WelcomeBannerGate() {
  const { search } = useLocation();
  // Kept once seen: the banner removes the param from the URL itself and must not vanish with it.
  const found = readWelcome(search);
  const [kind, setKind] = useState<WelcomeKind | null>(found);
  if (found && found !== kind) setKind(found);
  const foundPack = readWelcomePack(search);
  const [packId, setPackId] = useState(foundPack);
  if (foundPack && foundPack !== packId) setPackId(foundPack);
  if (!kind) return null;
  return (
    <Suspense fallback={null}>
      <WelcomeBanner kind={kind} packId={packId} />
    </Suspense>
  );
}
