/** PacksNoteCard — PACKS-ENTRY-1 (b): the Chapter Pack card at the end of a notes page (lazy chunk, see packEntryLazy.ts). */
import { Link } from "react-router-dom";
import { CHAPTER_PACK_PRICE_INR, firePackEntryClick, isPackChapterSlug, packsHref } from "./packEntry";

/** Trigonometry's note spans two NCERT chapters (Ch 8 + Ch 9). Renders nothing for a topic that is not one of the 26 chapters. */
export default function PacksNoteCard({ topicKey, title }: { topicKey: string; title: string }) {
  if (!isPackChapterSlug(topicKey)) return null;
  const name = topicKey === "trigonometry" ? "Trigonometry (Ch 8 + Ch 9)" : title;
  return (
    <aside className="lt-note__pack" data-testid="note-pack-link" aria-label="Chapter Pack">
      <h3 className="lt-note__pack-title">{`Practise every ${name} question on paper`}</h3>
      <p className="lt-note__pack-sub">{`Worked solutions · ₹${CHAPTER_PACK_PRICE_INR} · yours to keep`}</p>
      <Link className="lt-note__pack-btn" to={packsHref({ chapter: topicKey })} onClick={() => firePackEntryClick("notes")}>
        See the Chapter Pack
      </Link>
    </aside>
  );
}
