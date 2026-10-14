/**
 * NcertChapterPicker — NCERT-BOOKS-1b (lane G, owner 14 Oct 15:44–15:45 IST): the desktop rail's
 * "NCERT Books" chooser.
 *
 *   Maths   → Chapter
 *   Science → Chemistry | Biology | Physics → Chapter
 *
 * "Read the chapter" lands on `/ncert-class-10?subject=<s>&read=<code>`, where the page opens that
 * chapter's on-site reader; "See all chapters" is the plain page. Same look as the Practice Hub's
 * CBQ / Chapter Test pop-card (the `ChapterPickerModal` grammar), but its own component: that shared
 * card has exactly two selects and lists topics.ts topics, while NCERT needs a third step for
 * Science and names Maths Ch 8 and Ch 9 separately (they share one topic). The shared card and its
 * three callers are untouched.
 *
 * ★ SEO. Nothing here is crawlable content: the picker renders only while open, and the rail entry
 * that opens it stays a real `<a href="/ncert-class-10">`. The query on the landing URL never forms
 * a second canonical (`canonicalPathFor` drops it).
 *
 * Portalled to document.body (the CBQ-ENTRY-1-FIX reason: a transformed ancestor would otherwise
 * become the containing block for `position: fixed`). Styles: `ncertChapterPicker.css`, scoped
 * `.lt-ncp`; no inline style objects.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";

import {
  NCERT_CLASS10_CHAPTERS,
  ncertCode,
  ncertReadPath,
  type NcertBookChapter,
} from "../../config/ncertBooks";
import "./ncertChapterPicker.css";

export type NcertPickSubject = "maths" | "science";
export type NcertScienceBranch = "chemistry" | "biology" | "physics";

/** Owner's order (15:45 IST): chem / bio / phy. */
export const NCERT_SCIENCE_BRANCHES: ReadonlyArray<{ key: NcertScienceBranch; label: string }> = [
  { key: "chemistry", label: "Chemistry" },
  { key: "biology", label: "Biology" },
  { key: "physics", label: "Physics" },
];

/** The chapters the picker lists for a choice, in NCERT order. */
export function ncertPickerChapters(subject: NcertPickSubject, branch: NcertScienceBranch): NcertBookChapter[] {
  return NCERT_CLASS10_CHAPTERS.filter((r) =>
    subject === "maths" ? r.book === "Maths" : r.book === "Science" && r.storageSubject === branch,
  );
}

/** Where "Read the chapter" lands: the page, with that chapter's reader open (defined in config). */
export { ncertReadPath };

export interface NcertChapterPickerProps {
  open: boolean;
  onClose: () => void;
}

export function NcertChapterPicker({ open, onClose }: NcertChapterPickerProps) {
  const navigate = useNavigate();
  const [subject, setSubject] = useState<NcertPickSubject>("maths");
  const [branch, setBranch] = useState<NcertScienceBranch>("chemistry");
  const [code, setCode] = useState("");
  const firstRef = useRef<HTMLSelectElement | null>(null);

  const chapters = useMemo(() => ncertPickerChapters(subject, branch), [subject, branch]);
  // The list changes with subject / branch; fall back to its first chapter so the choice stays valid.
  const selected = chapters.find((r) => ncertCode(r) === code) ?? chapters[0];

  useEffect(() => {
    if (open) firstRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const go = () => {
    if (!selected) return;
    onClose();
    navigate(ncertReadPath(selected));
  };

  return createPortal(
    <div
      className="lt-ncp"
      data-testid="ncert-picker"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="lt-ncp__pop"
        role="dialog"
        aria-modal="true"
        aria-label="NCERT Books"
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        <button type="button" className="lt-ncp__x" aria-label="Close" onClick={onClose}>
          ✕
        </button>
        <h2>NCERT Books</h2>
        <p className="lt-ncp__sub">Pick a subject and a chapter. It opens right here, on LazyTopper.</p>

        <div className="lt-ncp__fld">
          <label htmlFor="lt-ncp-subject">Subject</label>
          <select
            id="lt-ncp-subject"
            ref={firstRef}
            value={subject}
            onChange={(e) => setSubject(e.target.value as NcertPickSubject)}
            data-testid="ncert-picker-subject"
          >
            <option value="maths">Maths</option>
            <option value="science">Science</option>
          </select>
        </div>

        {subject === "science" && (
          <div className="lt-ncp__fld">
            <label htmlFor="lt-ncp-branch">Science part</label>
            <select
              id="lt-ncp-branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value as NcertScienceBranch)}
              data-testid="ncert-picker-branch"
            >
              {NCERT_SCIENCE_BRANCHES.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="lt-ncp__fld">
          <label htmlFor="lt-ncp-chapter">Chapter</label>
          <select
            id="lt-ncp-chapter"
            value={selected ? ncertCode(selected) : ""}
            onChange={(e) => setCode(e.target.value)}
            data-testid="ncert-picker-chapter"
          >
            {chapters.map((r) => (
              <option key={ncertCode(r)} value={ncertCode(r)}>
                Ch {r.chapter} · {r.title}
              </option>
            ))}
          </select>
        </div>

        <button type="button" className="lt-ncp__go" data-testid="ncert-picker-open" onClick={go}>
          Read the chapter →
        </button>
        <p className="lt-ncp__foot">
          <Link to="/ncert-class-10" onClick={onClose}>
            See all chapters, with notes and practice
          </Link>
        </p>
      </div>
    </div>,
    document.body,
  );
}
