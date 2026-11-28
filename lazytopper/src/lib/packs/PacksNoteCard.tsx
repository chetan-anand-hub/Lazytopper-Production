/**
 * PacksNoteCard — PACKS-ENTRY-1 (b) + SEO-SELL-1: the Chapter Pack card on a notes page and on an NCERT solutions / exemplar page
 * (lazy chunk, see packEntryLazy.tsx). `position` "top" is the compact card near the top (its height reserved by the Suspense
 * placeholder in packEntryLazy), "end" the original card at the end. Both fire the same event with a position marker.
 */
import "./packNoteCard.css";
import { Link } from "react-router-dom";
import { chapterPackPriceTag, firePackEntryClick, isPackChapterSlug, packsHref, type PackEntrySource } from "./packEntry";

export type PackCardSurface = "notes" | "ncert" | "freemcq" | "iqotd";
export type PackCardPosition = "top" | "end";

/** CBQ packs are sold on /cbq-packs (owner ruling 14 Nov: never the free /cbq-class-10 page); `?subject=` selects the switch. */
export function cbqPacksSubjectHref(subject: string | null | undefined): string {
  const s = (subject ?? "").trim().toLowerCase();
  return s === "maths" || s === "science" ? `/cbq-packs?subject=${s}` : "/cbq-packs";
}

/** Trigonometry's note spans two NCERT chapters (Ch 8 + Ch 9). Renders nothing for a topic that is not one of the 26 chapters. */
export default function PacksNoteCard({
  topicKey,
  title,
  subject,
  surface = "notes",
  position = "end",
}: {
  topicKey: string;
  title: string;
  subject?: string | null;
  surface?: PackCardSurface;
  position?: PackCardPosition;
}) {
  if (!isPackChapterSlug(topicKey)) return null;
  const name = topicKey === "trigonometry" ? "Trigonometry (Ch 8 + Ch 9)" : title;
  const from = `${surface}_${position}` as PackEntrySource;
  const top = position === "top";
  const s = (subject ?? "").trim().toLowerCase();
  const subjectName = s === "maths" ? "Maths" : s === "science" ? "Science" : null;
  return (
    <aside
      className={`lt-note__pack${top ? " lt-note__pack--top" : ""}`}
      data-testid={top ? "note-pack-link-top" : "note-pack-link"}
      aria-label="Chapter Pack"
    >
      <h3 className="lt-note__pack-title">{`Practise every ${name} question on paper`}</h3>
      <p className="lt-note__pack-sub">{`Worked solutions · ${chapterPackPriceTag()} · yours to keep`}</p>
      <Link className="lt-note__pack-btn" to={packsHref({ chapter: topicKey })} onClick={() => firePackEntryClick(from)}>
        See the Chapter Pack
      </Link>
      {top ? (
        <p className="lt-note__pack-cbq">
          {"Also: "}
          <Link
            to={cbqPacksSubjectHref(subjectName)}
            data-testid="note-pack-cbq-link"
            onClick={() => firePackEntryClick(`${from}_cbq` as PackEntrySource)}
          >
            {subjectName ? `${subjectName} CBQ Pack` : "CBQ Pack"}
          </Link>
          {", competency-based questions with step-wise worked solutions"}
        </p>
      ) : null}
    </aside>
  );
}
