/** PacksWallButton — PACKS-ENTRY-1 (a): the secondary "Chapter Pack" button of the download wall, in its own lazy chunk. */
import { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { chapterFromLocation, firePackEntryClick, mockSubjectFromLocation, packOfferFor, WallCoverContext } from "./packEntry";

/** `light`: the trial wall, where the offer is a quiet text button and the Premium copy stays the prominent thing. `chapter`: the caller's own knowledge of the paper's chapter, else it is read from the page address, else plain /packs. */
export default function PacksWallButton({ chapter, light = false }: { chapter: string | null; light?: boolean }) {
  const location = useLocation();
  // The wall's own cover (chapter / subject, or neither for a multi-chapter paper) wins; without one the page address is read.
  const cover = useContext(WallCoverContext);
  const slug = cover ? (cover.chapters.length === 1 ? cover.chapters[0] : null) : chapter ?? chapterFromLocation(location.pathname, location.search);
  // A Full Mock wall (no chapter) opens that subject's Mock Pack; a multi-topic worksheet or anything unknown opens plain /packs.
  const mock = slug ? null : cover ? cover.subject : mockSubjectFromLocation(location.pathname, location.search);
  const offer = packOfferFor({ chapters: slug ? [slug] : [], subject: mock });
  return (
    <div className={light ? "lt-limit-pack lt-limit-pack--light" : "lt-limit-pack"} data-testid="wall-pack-link">
      <Link className="lt-limit-btn lt-limit-btn--pack" to={offer.href} onClick={() => firePackEntryClick("download_wall")}>
        {offer.label}
      </Link>
    </div>
  );
}
