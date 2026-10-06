// src/components/practice/CbqChapterPicker.tsx
//
// CBQ-ENTRY-1 (E2) — the Practice Hub's "Competency-based questions" chooser.
//
// A THIN WRAPPER over the tutor's subject/chapter pop-card (P5:
// lib/desktop/homeDestinations.tsx ChapterPickerModal) — the same chooser and the same
// chapter list (`desktopTopicsBySubject`), never a second copy. It supplies the words and
// what "go" does: open the chapter on Practice with the Competency preset (E3).
//
// P6: while open it checks, for the subject on screen, which chapters have real CBQs
// (cbqAvailability, loaded with import() so the hub stays bank-free). CBQ-1 PR-1: a CBQ
// is `isCbq` (src/lib/cbq/cbqClassification.ts) — every mark value 1-5, and the landing
// serves them mixed-marks (no longer the 4-mark Section-E case studies only). A chapter without
// any is listed "coming soon" and cannot be chosen. Until the check lands nothing is
// marked — the landing (PracticePage, `preset=comp`) gates on the same check itself, so
// an unchecked choice still never reaches an empty set.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChapterPickerModal } from "../../lib/desktop/homeDestinations";
import type { DesktopSubject } from "../../lib/desktop/navigation";
import { desktopTopicsBySubject } from "../../lib/desktop/topics";

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
  const [subject, setSubject] = useState<DesktopSubject>("Maths");
  // Per subject: the slugs WITH real CBQs. Absent = not checked yet → nothing marked.
  const [withCbqs, setWithCbqs] = useState<Partial<Record<DesktopSubject, ReadonlySet<string>>>>({});

  useEffect(() => {
    if (!open || withCbqs[subject]) return;
    let live = true;
    const slugs = desktopTopicsBySubject(subject).map((t) => t.slug);
    import("./cbqAvailability")
      .then((m) => m.chaptersWithCbqs(subject, slugs))
      .then((found) => {
        if (live) setWithCbqs((prev) => ({ ...prev, [subject]: found }));
      })
      .catch(() => {
        // Honest degrade: nothing is marked, and the landing still gates per chapter.
      });
    return () => {
      live = false;
    };
  }, [open, subject, withCbqs]);

  return (
    <ChapterPickerModal
      open={open}
      onClose={onClose}
      title="Competency-based questions (CBQs)"
      sub="Pick a subject and a chapter. We'll open that chapter's CBQs."
      goLabel="Open CBQs →"
      testId="cbq-picker"
      idPrefix="lt-cbq"
      onSubjectChange={setSubject}
      isComingSoon={(s, slug) => {
        const found = withCbqs[s];
        return found !== undefined && !found.has(slug);
      }}
      onGo={(s, slug) => navigate(cbqLandingPath(s, slug))}
    />
  );
}

export default CbqChapterPicker;
