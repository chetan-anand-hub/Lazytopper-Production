/** PacksWallButton — PACKS-ENTRY-1 (a): the secondary "Chapter Pack" button of the download wall, in its own lazy chunk. */
import { Link, useLocation } from "react-router-dom";
import { CHAPTER_PACK_PRICE_INR, chapterFromLocation, firePackEntryClick, mockSubjectFromLocation, packsHref } from "./packEntry";

/** `light`: the trial wall, where the offer is a quiet text button and the Premium copy stays the prominent thing. `chapter`: the caller's own knowledge of the paper's chapter, else it is read from the page address, else plain /packs. */
export default function PacksWallButton({ chapter, light = false }: { chapter: string | null; light?: boolean }) {
  const location = useLocation();
  const slug = chapter ?? chapterFromLocation(location.pathname, location.search);
  // A Full Mock wall (no chapter) opens that subject's Mock Pack; a multi-topic worksheet or anything unknown opens plain /packs.
  const mock = slug ? null : mockSubjectFromLocation(location.pathname, location.search);
  return (
    <div className={light ? "lt-limit-pack lt-limit-pack--light" : "lt-limit-pack"} data-testid="wall-pack-link">
      <Link className="lt-limit-btn lt-limit-btn--pack" to={packsHref({ chapter: slug, mock })} onClick={() => firePackEntryClick("download_wall")}>
        Get the whole chapter on paper — Chapter Pack ₹{CHAPTER_PACK_PRICE_INR}
      </Link>
    </div>
  );
}
