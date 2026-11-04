/**
 * PackOwnerSlot - PACK-OWNER-GATES-1. The one door every Premium gate uses for the pack-owner line. Light on purpose (gates such as
 * RequirePremium sit near the entry chunk): the line, its pack catalogue and the ownership read load in their own chunk, only for a
 * signed-in student the gate says is not Premium. While that chunk loads, if it cannot load, or while ownership is unknown, the slot shows
 * `fallback` - the gate's copy of today - so nothing changes for a student who owns no pack.
 */
import { Component, Suspense, type ReactNode } from "react";

import { lazyWithRetry } from "../../lib/lazyWithRetry";
import type { PackOwnerLineProps } from "./PackOwnerLine";
import "./packOwner.css";

const PackOwnerLine = lazyWithRetry(() => import("./PackOwnerLine"));

class SlotBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function PackOwnerSlot({ enabled, ...props }: PackOwnerLineProps & { enabled: boolean }) {
  const fallback = props.fallback ?? null;
  if (!enabled || !props.uid) return <>{fallback}</>;
  return (
    <SlotBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <PackOwnerLine {...props} />
      </Suspense>
    </SlotBoundary>
  );
}
