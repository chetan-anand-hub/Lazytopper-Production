/**
 * MI-CONSISTENCY-1 — the ONE MI card as Home (desktop) and phone Home mount it: the shared scope,
 * the shared memoised read (lib/mi/useMiCard) and the light-variant card. The desktop sidebar
 * mounts the same card itself (components/desktop/MistakeIntelCard), dark, with Ziggy's row.
 */
import { MiCard } from "./MiCard";
import { useMiCard } from "../../lib/mi/useMiCard";
import { useMiScope } from "../../lib/mi/miScope";
import type { DesktopRouteContext } from "../../lib/desktop/navigation";

function hrefWith(path: string, ctx: DesktopRouteContext): string {
  const params = new URLSearchParams();
  if (ctx.source) params.set("source", ctx.source);
  if (ctx.returnTo) params.set("returnTo", ctx.returnTo);
  const q = params.toString();
  return q ? `${path}?${q}` : path;
}

export interface MiCardHostProps {
  /** A REAL signed-in uid (never a local / browse session — Me's own rule); null → empty state. */
  uid: string | null;
  /** Bumps after the cloud mistake history hydrates (AuthContext `mistakeLogsHydrated`). */
  gen: number;
  /** The host page (Home "/" or phone Home "/browse") — every action carries it back. */
  returnTo: string;
  testId?: string;
}

export function MiCardHost({ uid, gen, returnTo, testId = "home-mi-card" }: MiCardHostProps) {
  const [scope, setScope] = useMiScope();
  const ctx: DesktopRouteContext = { source: "home", returnTo };
  const { status, cards } = useMiCard(uid, gen, ctx);
  return (
    <MiCard
      variant="light"
      status={status}
      summary={cards ? cards[scope] : null}
      scope={scope}
      onScope={setScope}
      meHref={hrefWith("/me", ctx)}
      checkHref={hrefWith("/check-improve", ctx)}
      testId={testId}
    />
  );
}
