/**
 * PacksCbqCard - SEO-SELL-2: the subject CBQ Pack card at the end of a public page that has no chapter pack of its own (the Important
 * Question of the Day when a question names no pack chapter, and the Important Questions page, where it also links the Board Pass).
 * Lazy chunk (see packEntryLazy.tsx); the flag off or a paid Premium student: nothing (PacksEntryPoint). CBQs are sold on /cbq-packs, never the
 * free /cbq-class-10 page (owner ruling 14 Nov 2026). No price is stated here (the pricing page owns it).
 */
import "./packNoteCard.css";
import { Link } from "react-router-dom";
import { firePackEntryClick, type PackEntrySource } from "./packEntry";
import { cbqPacksSubjectHref } from "./PacksNoteCard";

export default function PacksCbqCard({
  subject,
  surface,
  boardPass = false,
}: {
  subject: string | null | undefined;
  surface: "iqotd" | "hpq";
  boardPass?: boolean;
}) {
  const s = (subject ?? "").trim().toLowerCase();
  const name = s === "maths" ? "Maths" : s === "science" ? "Science" : null;
  const end = `${surface}_end` as PackEntrySource;
  return (
    <aside className="lt-note__pack" data-testid="cbq-pack-card" aria-label="CBQ Pack">
      <h3 className="lt-note__pack-title">{`Practise ${name ? `${name} ` : ""}competency-based questions on paper`}</h3>
      <p className="lt-note__pack-sub">Step-wise worked solutions · printable PDF · yours to keep</p>
      <Link
        className="lt-note__pack-btn"
        to={cbqPacksSubjectHref(name)}
        data-testid="cbq-pack-card-link"
        onClick={() => firePackEntryClick(`${end}_cbq` as PackEntrySource)}
      >
        {name ? `See the ${name} CBQ Pack` : "See the CBQ Packs"}
      </Link>
      {boardPass ? (
        <p className="lt-note__pack-cbq">
          {"Want each answer marked step by step? See the "}
          <Link to="/pricing" data-testid="cbq-pack-card-boardpass" onClick={() => firePackEntryClick(end)}>
            Board Pass
          </Link>
        </p>
      ) : null}
    </aside>
  );
}
