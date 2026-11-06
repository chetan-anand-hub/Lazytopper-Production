// src/components/practice/CbqChapterPicker.tsx
//
// CBQ-ENTRY-1 (E2) — the Practice Hub's "Competency-based questions" chooser.
//
// A THIN WRAPPER over the tutor's subject/chapter pop-card (P5:
// lib/desktop/homeDestinations.tsx ChapterPickerModal) — the same chooser and the same
// chapter list (`desktopTopicsBySubject`), never a second copy. It supplies the words and
// what "go" does: open the chapter on Practice with the Competency preset (E3).
//
// P6: a chapter without any real CBQ is listed "coming soon" and cannot be chosen. CBQ-1
// PR-1: a CBQ is `isCbq` (src/lib/cbq/cbqClassification.ts) — every mark value 1-5, and the
// landing serves them mixed-marks.
//
// SPEED-HUB-1 (6 Nov 2026): the "coming soon" answer comes from a small precomputed manifest
// (cbqChapterManifest → cbqChapters.generated.ts, pinned to the bank by the drift guard in
// cbqAvailability.test.ts), so opening the chooser downloads NO question. It used to import
// cbqAvailability on open, which loaded all 13 chapters of the subject (~5.5 MB of JS) and
// froze a throttled phone for ~5 s — on the CBQ ad's landing page. The bank is fetched only
// after a chapter is chosen, by the landing (PracticePage, `preset=comp`), for that ONE
// chapter; the landing still gates on the chapter's own pool, so a chapter can never reach an
// empty set even if the manifest were stale.

import { useNavigate } from "react-router-dom";
import { ChapterPickerModal } from "../../lib/desktop/homeDestinations";
import type { DesktopSubject } from "../../lib/desktop/navigation";
import { cbqChapterComingSoon } from "./cbqChapterManifest";

/** The ad link's switch on /practice-hub (E4): `?cbq=1` opens this chooser. */
export const CBQ_HUB_PARAM = "cbq" as const;

/** The E3 landing: that chapter on Practice, Competency preset selected and built. */
export function cbqLandingPath(subject: DesktopSubject, topicKey: string): string {
  const sp = new URLSearchParams();
  sp.set("topic", topicKey);
  sp.set("preset", "comp");
  return `/practice/10/${subject}?${sp.toString()}`;
}

export interface CbqChapterPickerProps {
  open: boolean;
  onClose: () => void;
}

export function CbqChapterPicker({ open, onClose }: CbqChapterPickerProps) {
  const navigate = useNavigate();
  return (
    <ChapterPickerModal
      open={open}
      onClose={onClose}
      title="Competency-based questions (CBQs)"
      sub="Pick a subject and a chapter. We'll open that chapter's CBQs."
      goLabel="Open CBQs →"
      testId="cbq-picker"
      idPrefix="lt-cbq"
      isComingSoon={cbqChapterComingSoon}
      onGo={(s, slug) => navigate(cbqLandingPath(s, slug))}
    />
  );
}

export default CbqChapterPicker;
