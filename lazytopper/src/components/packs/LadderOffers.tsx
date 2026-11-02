import { isPacksEntryEnabled } from "../../lib/packs/packEntryLazy";
import { showPackLine } from "../limits/packLine";
import OffersBlock from "./OffersBlock";
import { BOARD_PASS_BENEFIT } from "./offersCopy";
import { useKnownStatus, useOptionalUid } from "./PackPromoCard";

/**
 * LadderOffers - OFFERS-V2. The buying block under the first-minute ladder's verdict (the MCQ tap). It shows to a signed-out visitor (who owns
 * nothing and has paid for nothing: no status read, no ownership read) and to a KNOWN non-paid student; never to paid Premium and never while
 * the record is not yet known (no flash for a paid student). Same packs switch as before: dark -> nothing at all. Rows are this chapter's.
 */
export default function LadderOffers({ chapterSlug, chapterName }: { chapterSlug: string; chapterName: string }) {
  const uid = useOptionalUid();
  const [status, known] = useKnownStatus(uid);
  if (!isPacksEntryEnabled()) return null;
  const visible = !uid || showPackLine(status, known);
  if (!visible) return null;
  return (
    <OffersBlock
      surface="ladder"
      ctx={{ kind: "ladder", chapterSlug, chapterName }}
      uid={uid}
      showPacks
      benefit={BOARD_PASS_BENEFIT.ladder}
    />
  );
}
