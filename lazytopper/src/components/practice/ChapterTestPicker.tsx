// src/components/practice/ChapterTestPicker.tsx
//
// CT-ENTRY-1 — the Practice Hub's "Chapter Tests" chooser (owner request 2026-10-10:
// Chapter Tests were reachable only through Exam Trends → Topic Hub → the bottom of the page).
//
// A THIN WRAPPER over the same subject/chapter pop-card the CBQ chooser uses
// (lib/desktop/homeDestinations.tsx ChapterPickerModal) — the same chooser and the same
// chapter list (`desktopTopicsBySubject`), never a second copy. "Go" opens exactly the URL
// Topic Hub's Chapter Test button opens (`buildDesktopChapterTestPath`, the one builder).
//
// No chapter is marked "coming soon": every one of the 26 chapters fills a full Chapter Test
// (runtime census of `drawChapterTest`, 2026-10-10, trunk 21c36be6: 26/26 `enoughQuestions`),
// and ChapterTestPage still says so honestly if a chapter ever runs short.

import { useNavigate } from "react-router-dom";
import { ChapterPickerModal } from "../../lib/desktop/homeDestinations";
import { buildDesktopChapterTestPath, type DesktopSubject } from "../../lib/desktop/navigation";

/** The hub's switch on /practice-hub: `?ct=1` opens this chooser (mirrors `?cbq=1`). */
export const CT_HUB_PARAM = "ct" as const;

/** The same Chapter Test URL Topic Hub opens, with the hub as the way back. */
export function chapterTestLandingPath(subject: DesktopSubject, topicKey: string): string {
  return buildDesktopChapterTestPath({ subject, topicKey, source: "practice", returnTo: "/practice-hub" });
}

export interface ChapterTestPickerProps {
  open: boolean;
  onClose: () => void;
}

export function ChapterTestPicker({ open, onClose }: ChapterTestPickerProps) {
  const navigate = useNavigate();
  return (
    <ChapterPickerModal
      open={open}
      onClose={onClose}
      title="Chapter Tests"
      sub="Pick a subject and a chapter. We'll open that chapter's test."
      goLabel="Start Chapter Test →"
      testId="ct-picker"
      idPrefix="lt-ct"
      onGo={(s, slug) => navigate(chapterTestLandingPath(s, slug))}
    />
  );
}

export default ChapterTestPicker;
