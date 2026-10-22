/**
 * MOMENTS-1 PART 0 — the "turn them back on" control for "Hide mascots", on /me (the account page:
 * /settings was retired, SETTINGS-1). One switch, this device only (../guide/mascotsMute.ts).
 *
 * Shown to a GUIDE-arm student, or to anyone whose mascots are hidden on this device (a device that
 * hid them from a signed-out moment still needs the way back). The control arm with nothing hidden
 * sees nothing — exactly today's page. Eager and tiny: no character is drawn here.
 */
import { useId } from "react";
import { resolveGuideVariant } from "./guideVariant";
import { hideMascots, showMascots, useMascotsHidden } from "./mascotsMute";
import "./mascotsSetting.css";

export const MASCOTS_SETTING_COPY = {
  heading: "Settings",
  label: "Show Byte and Ziggy",
  sub: "The two mascots who guide you. This device only.",
} as const;

export default function MascotsSetting({ uid }: { uid: string | null | undefined }) {
  const hidden = useMascotsHidden();
  const headingId = useId();
  const labelId = useId();
  if (!hidden && resolveGuideVariant(uid) !== "guide") return null;
  return (
    <section className="lt-mascots-set" aria-labelledby={headingId} data-testid="mascots-setting">
      <h2 className="lt-mascots-set__h" id={headingId}>
        {MASCOTS_SETTING_COPY.heading}
      </h2>
      <div className="lt-mascots-set__row">
        <div className="lt-mascots-set__tx">
          <span className="lt-mascots-set__label" id={labelId}>
            {MASCOTS_SETTING_COPY.label}
          </span>
          <span className="lt-mascots-set__sub">{MASCOTS_SETTING_COPY.sub}</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!hidden}
          aria-labelledby={labelId}
          className={hidden ? "lt-mascots-set__sw" : "lt-mascots-set__sw is-on"}
          data-testid="mascots-switch"
          onClick={() => (hidden ? showMascots() : hideMascots())}
        >
          <span className="lt-mascots-set__knob" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
