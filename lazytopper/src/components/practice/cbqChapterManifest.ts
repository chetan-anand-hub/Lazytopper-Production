// src/components/practice/cbqChapterManifest.ts
//
// SPEED-HUB-1 — the CBQ chooser's "coming soon" answer, read from the precomputed manifest
// (./cbqChapters.generated.ts, plain data, a few hundred bytes). BANK-FREE: importing this
// never downloads a question. The manifest is pinned to the bank by the drift guard in
// cbqAvailability.test.ts, so it can only say what `chaptersWithCbqs` would say at runtime.

import type { DesktopSubject } from "../../lib/desktop/navigation";
import { CBQ_CHAPTERS } from "./cbqChapters.generated";

/**
 * True when the manifest says this chapter has NO real CBQ (the chooser lists it "coming soon"
 * and will not open it). A chapter missing from the manifest is not marked: the landing
 * (PracticePage, preset=comp) gates on the chapter's own pool, so it never reaches an empty set.
 */
export function cbqChapterComingSoon(subject: DesktopSubject, slug: string): boolean {
  const bySubject = CBQ_CHAPTERS[subject] as Record<string, boolean | undefined>;
  return bySubject[slug] === false;
}
