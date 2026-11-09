/**
 * myPacksBridgeLoader - BRIDGE-PANEL-1 (round 2, review #1645 B1). The light door PacksShop uses for the "Get your papers marked" panel.
 *
 * WHY NOT React.lazy: a lazy component suspends on its first render even when its module is already loaded, and React then holds the
 * reveal ~300 ms, so the panel landed in a second commit and then grew again when its reads arrived. Instead the panel's module AND
 * its data are fetched first (`prepareMyPacksBridge`); the panel then renders once, complete, and never changes size afterwards.
 * PacksShop shows it at the TOP of My packs and reveals My packs together with it, into space the device hint reserved (mineHint.ts).
 *
 * Only a pack OWNER pays for it: PacksShop calls this after `/api/packs/mine` returned at least one pack. Capped: if the module or the
 * reads take longer than BRIDGE_PREPARE_CAP_MS (or fail), the result is null and there is no panel this visit (it never pops in later).
 * A render error inside the panel renders nothing (boundary); My packs and its downloads keep working.
 */
import { Component, type ComponentType, type ReactNode } from "react";
import type { AuthUser } from "../../context/AuthContext";
import type { MyPacksBridgeProps } from "./MyPacksBridge";

/** The longest My packs waits for the panel (chunk + reads); past it My packs is revealed without it, and it never appears late. */
export const BRIDGE_PREPARE_CAP_MS = 2500;

export interface BridgeReady {
  Panel: ComponentType<MyPacksBridgeProps>;
  data: MyPacksBridgeProps["data"];
  /** PACKS-TIDY-1: the same chunk's per-pack paper rows (shown inside each owned pack's row) and the pure view that groups them. */
  PackPapers?: typeof import("./MyPacksBridge").PackPapers;
  view?: typeof import("./MyPacksBridge").bridgeView;
}

/** Fetch the panel's chunk and read its data. Resolves null on failure or after the cap. Never rejects. */
export function prepareMyPacksBridge(
  user: Pick<AuthUser, "uid" | "isLocalSession"> | null | undefined,
  cachedPaidPass: boolean,
  capMs: number = BRIDGE_PREPARE_CAP_MS,
): Promise<BridgeReady | null> {
  const work = import("./MyPacksBridge")
    .then(async (m) => {
      const data = await m.prepareBridgeData(user, cachedPaidPass);
      return data ? ({ Panel: m.default, data, PackPapers: m.PackPapers, view: m.bridgeView } as BridgeReady) : null;
    })
    .catch(() => null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cap = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), capMs);
  });
  return Promise.race([work, cap]).finally(() => clearTimeout(timer));
}

export class BridgeBoundary extends Component<{ children: ReactNode; /** PACKS-TIDY-1: what to show if the panel fails (the pack rows, so My packs' downloads never vanish). */ fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback ?? null : this.props.children;
  }
}
