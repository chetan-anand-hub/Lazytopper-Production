/**
 * ONE-MINUTE-1 step 3 — after the typed result, one quiet line to the existing Upload tab. Eager and tiny (no
 * sample data); the page owns what the tap does. Fires `one_min_photo_cta` once when it first shows.
 */
import { useEffect } from "react";
import { trackOneMinute } from "../../analytics/analytics";
import "./ciDemoDoor.css";

export const LADDER_PHOTO_COPY = "Got it on paper? Snap your own answer";

export default function LadderPhotoCta({ onTap }: { onTap: () => void }) {
  useEffect(() => {
    trackOneMinute("one_min_photo_cta");
  }, []);
  return (
    <div className="ci-ladder-photo">
      <button type="button" className="ci-ladder-photo__btn" data-testid="one-min-photo-cta" onClick={onTap}>
        {LADDER_PHOTO_COPY}
      </button>
    </div>
  );
}
