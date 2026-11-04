/**
 * PackOwnerLine - PACK-OWNER-GATES-1. The gate's words for a student who already bought a PDF pack: "You already practise on paper with
 * your <pack>." and how the Answer Checker marks those answers. Its own lazy chunk (it carries the pack catalogue and the ownership
 * read); reached only through PackOwnerSlot.
 *
 * Server truth only (useOwnedPacks -> /api/packs/mine). Loading, a failed read, or no packs -> `fallback` (the gate's copy of today,
 * unchanged); nothing is stored in the browser and nothing is granted here. The gate's own buttons are never touched.
 */
import type { ReactNode } from "react";

import { useOwnedPacks } from "../packs/useOwnedPacks";
import { packOwnerLine, type PackOwnerPaper } from "./packOwnerModel";

export interface PackOwnerLineProps {
  uid: string;
  /** What the gate shows when the student is not a known pack owner (absent: nothing). */
  fallback?: ReactNode;
  /** The paper a wall is about: the pack it comes from is named first (fix 3). */
  paper?: PackOwnerPaper | null;
  /** The headline's element: a heading where the line takes the gate's title slot, else a paragraph. */
  heading?: "h2" | "h3" | "p";
  center?: boolean;
  /** "inherit": follow the host's own text colour (a page or card that may be dark); default: navy ink on a light sheet. */
  tone?: "ink" | "inherit";
}

export default function PackOwnerLine({ uid, fallback = null, paper = null, heading = "p", center = false, tone = "ink" }: PackOwnerLineProps) {
  const read = useOwnedPacks(uid, Boolean(uid));
  const line = read.phase === "ready" ? packOwnerLine(read.packs, paper) : null;
  if (!line) return <>{fallback}</>;
  const Head = heading;
  return (
    <div className={`lt-packowner${center ? " lt-packowner--center" : ""}${tone === "inherit" ? " lt-packowner--inherit" : ""}`} data-testid="pack-owner-line">
      <Head className="lt-packowner__h">{line.headline}</Head>
      <p className="lt-packowner__p">{line.body}</p>
    </div>
  );
}
