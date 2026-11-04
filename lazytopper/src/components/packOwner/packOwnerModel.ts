/**
 * packOwnerModel - PACK-OWNER-GATES-1 (owner approved 4 Nov 2026). PURE: the words every Premium gate says to a student who already
 * BOUGHT a PDF pack (a customer), and which pack those words name. No React, no I/O, no clock.
 *
 * Ownership is the SERVER's list (`/api/packs/mine` via useOwnedPacks); nothing here decides it. The paper rules mirror the server's
 * (packProducts.cjs ownsChapter / ownsMocks through services/packs): a Subject Pack or the Bundle covers chapters and mocks.
 */
import { BUNDLE_NAME, packChapterLabel } from "../../lib/packs/packLabels";
import { ownsChapter, ownsMocks, type OwnedPack, type PackSubject } from "../../services/packs";

/** The body under the headline (owner-approved wording, 4 Nov 2026). */
export const PACK_OWNER_BODY =
  "Now get those answers marked like a CBSE examiner. Photograph any page you've written, and the Answer Checker shows where every mark went.";

export interface PackOwnerLine {
  headline: string;
  body: string;
}

/** A pack's name in a sentence: "Real Numbers Chapter Pack", "Maths Mock Pack", "Science CBQ Pack", "Maths + Science Bundle". */
export function packOwnerName(p: Pick<OwnedPack, "sku" | "target">): string {
  const subject = p.target === "science" ? "Science" : "Maths";
  switch (p.sku) {
    case "pack_chapter":
      return `${packChapterLabel(p.target)} Chapter Pack`;
    case "pack_mock":
      return `${subject} Mock Pack`;
    case "pack_subject":
      return `${subject} Subject Pack`;
    case "pack_cbq":
      return `${subject} CBQ Pack`;
    case "pack_bundle":
      return BUNDLE_NAME;
    default:
      return "PDF pack";
  }
}

/** The most recently bought pack (largest paidAt; the server's order breaks a tie). Null for none. */
export function mostRecentPack<T extends Pick<OwnedPack, "paidAt">>(packs: readonly T[]): T | null {
  let best: T | null = null;
  for (const p of packs) {
    if (!best || (Number.isFinite(p.paidAt) ? p.paidAt : 0) > (Number.isFinite(best.paidAt) ? best.paidAt : 0)) best = p;
  }
  return best;
}

/** The paper a wall is about, when the host knows it. */
export interface PackOwnerPaper {
  kind: "full-mock" | "chapter-test" | "worksheet" | string;
  subject?: PackSubject | null;
  chapterSlug?: string | null;
}

/**
 * The owned pack this paper comes from (server truth, same rules as packProducts.cjs): a chapter test / worksheet of an owned chapter
 * (Chapter Pack, its Subject Pack or the Bundle), a full mock of an owned subject's mocks (Mock Pack, Subject Pack or the Bundle).
 * The most specific owned pack is named. Null when the paper is not from an owned pack (or is not known).
 */
export function packForPaper(packs: readonly OwnedPack[], paper: PackOwnerPaper | null | undefined): OwnedPack | null {
  if (!paper) return null;
  const find = (packId: string) => packs.find((p) => p.packId === packId) ?? null;
  if ((paper.kind === "chapter-test" || paper.kind === "worksheet") && paper.chapterSlug && ownsChapter(packs, paper.chapterSlug)) {
    const subject = paper.subject ?? null;
    return (
      find(`pack_chapter:${paper.chapterSlug}`) ??
      packs.find((p) => p.sku === "pack_subject" && (!subject || p.target === subject) && ownsChapter([p], paper.chapterSlug as string)) ??
      find("pack_bundle:all")
    );
  }
  if (paper.kind === "full-mock" && (paper.subject === "maths" || paper.subject === "science") && ownsMocks(packs, paper.subject)) {
    return find(`pack_mock:${paper.subject}`) ?? find(`pack_subject:${paper.subject}`) ?? find("pack_bundle:all");
  }
  return null;
}

/**
 * The pack-owner line for a gate, or null (no packs: the gate keeps today's copy). Names the pack the paper comes from when the wall is
 * about one the student owns (fix 3), else the most recently bought pack.
 */
export function packOwnerLine(packs: readonly OwnedPack[], paper?: PackOwnerPaper | null): PackOwnerLine | null {
  if (packs.length === 0) return null;
  const named = packForPaper(packs, paper) ?? mostRecentPack(packs);
  if (!named) return null;
  return { headline: `You already practise on paper with your ${packOwnerName(named)}.`, body: PACK_OWNER_BODY };
}

/** Does the student own the pack this paper comes from? (fix 3: then the wall never says "marked with the Board Pass" as a stranger.) */
export function ownsPaperPack(packs: readonly OwnedPack[], paper: PackOwnerPaper | null | undefined): boolean {
  return packForPaper(packs, paper) !== null;
}
