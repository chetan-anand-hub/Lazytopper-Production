/**
 * myPacksBridgeLoader - BRIDGE-PANEL-1 (round 2, review #1645 B1). The light door PacksShop uses for the "Get your papers marked" panel.
 *
 * WHY NOT React.lazy: a lazy component suspends on its first render even when its module is already loaded, and React then holds the
 * reveal ~300 ms, so the panel landed in a SECOND commit after the pack cards and pushed the page down (CLS +0.17..0.42). Instead the
 * panel's module AND its data are fetched first (`prepareMyPacksBridge`), and PacksShop reveals My packs only when that settles - the
 * pack cards and the panel then appear in ONE commit and nothing in the panel changes size afterwards.
 *
 * Only a pack OWNER pays for it: PacksShop calls this after `/api/packs/mine` returned at least one pack. Capped: if the module or the
 * reads take longer than BRIDGE_PREPARE_CAP_MS (or fail), the result is null and My packs is revealed WITHOUT the panel for this visit
 * (it never pops in later). A render error inside the panel renders nothing (boundary); My packs and its downloads keep working.
 */
import { Component, type ComponentType, type ReactNode } from "react";
import type { AuthUser } from "../../context/AuthContext";
import type { MyPacksBridgeProps } from "./MyPacksBridge";

/** The longest My packs waits for the panel before it is revealed without it. */
export const BRIDGE_PREPARE_CAP_MS = 2500;

export interface BridgeReady {
  Panel: ComponentType<MyPacksBridgeProps>;
  data: MyPacksBridgeProps["data"];
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
      return data ? ({ Panel: m.default, data } as BridgeReady) : null;
    })
    .catch(() => null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cap = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), capMs);
  });
  return Promise.race([work, cap]).finally(() => clearTimeout(timer));
}

export class BridgeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
