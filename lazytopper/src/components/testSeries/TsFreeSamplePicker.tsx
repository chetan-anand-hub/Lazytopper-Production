/**
 * TS-FREE-PICKER (owner, 26 Nov 2026) - /test-series, SIGNED OUT only: "Take 1 test free". #1897 (TS-FREE-SIGNEDOUT) lets a signed-out
 * visitor sit the four sample papers (SIGNED_OUT_SAMPLES: the first chapter test and the first full-length test of each subject) and
 * asks for an account only to MARK them; until now the page gave them no way to find those four. This is that way: four links, built
 * from SIGNED_OUT_SAMPLES (never typed here), each to the exact paper URL the Chapter Test / Full Mock page opens signed out.
 *
 * Nothing here grants, pins or marks anything: the paper pages decide (isSignedOutSample + their own start rules). The copy says only
 * what is true signed out - sit it now, sign in when you submit to get it marked - and, after sign-in, the account's normal one-free-test
 * rule applies (seriesStartDecision on the paper page).
 *
 * Hidden when the papers would NOT open signed out (VITE_TS_FREE_SIGNEDOUT_DISABLED, VITE_TEST_SERIES_DISABLED): "no sign-in" would be
 * false then. Kill switch: VITE_TS_FREE_PICKER_DISABLED=1 -> the page exactly as before.
 * Event: `ts_free_sample_pick { code, surface: "ts_hero" }` (vendor-only, like the onboarding events: a paper code, never a uid).
 */
import { Link } from "react-router-dom";
import { trackOnboardingEvent } from "../../analytics/analytics";
import { SIGNED_OUT_SAMPLES, tsFreeSignedOutDisabled } from "../../lib/testSeries/signedOutAttempt";

declare module "../../analytics/analytics" {
  interface OnboardingEventParams {
    ts_free_sample_pick: { code: string; surface: string };
  }
}

export const TS_FREE_PICKER_TITLE = "Take 1 test free";
export const TS_FREE_PICKER_LINE = "Start now, no sign-in needed. Sign in when you submit to get it marked.";
export const TS_FREE_PICKER_SURFACE = "ts_hero";

/** Is the picker on? Off under its own kill switch, and whenever the sample papers would not open signed out. */
export function tsFreePickerOn(): boolean {
  try {
    // Only "1" turns the kill switch on, like the other TS_* switches (VITE_TS_FREE_SIGNEDOUT_DISABLED, VITE_TS_PARENT_FORWARD_DISABLED).
    if (import.meta.env?.VITE_TS_FREE_PICKER_DISABLED === "1") return false;
    if (import.meta.env.VITE_TEST_SERIES_DISABLED === "1") return false;
  } catch {
    return false;
  }
  return !tsFreeSignedOutDisabled();
}

/** The four picks, chapter tests first then full papers, Maths before Science (a 2 x 2 grid: one row per kind). */
export function freeSamplePicks(): Array<{ code: string; href: string; title: string; detail: string }> {
  const kindRank = (k: string) => (k === "chapter" ? 0 : 1);
  const subjRank = (s: string) => (s === "Maths" ? 0 : 1);
  return [...SIGNED_OUT_SAMPLES]
    .sort((a, b) => kindRank(a.kind) - kindRank(b.kind) || subjRank(a.subject) - subjRank(b.subject))
    .map((s) => ({
      code: s.code,
      href: s.href,
      title: `${s.subject} ${s.kind === "chapter" ? "chapter test" : "full paper"}`,
      // The sample's own label ends with the paper's name ("Real Numbers", "Full-Length Test 1").
      detail: s.label.split(" · ").pop() ?? "",
    }));
}

/** `hidden`: the box is on the page but not shown yet (auth still loading) - its links leave the tab order and a tap sends nothing. */
export default function TsFreeSamplePicker({ hidden = false }: { hidden?: boolean }) {
  const picks = freeSamplePicks();
  return (
    <div className="lt-ts-free" data-testid="ts-free-picker">
      <p className="lt-ts-free__title" id="ts-free-title">
        {TS_FREE_PICKER_TITLE}
      </p>
      <p className="lt-ts-free__line">{TS_FREE_PICKER_LINE}</p>
      <ul className="lt-ts-free__grid" aria-labelledby="ts-free-title">
        {picks.map((p) => (
          <li key={p.code}>
            <Link
              className="lt-ts-free__pick"
              to={p.href}
              data-testid={`ts-free-pick-${p.code}`}
              data-code={p.code}
              tabIndex={hidden ? -1 : undefined}
              onClick={(e) => {
                // never a signed-out pick from a box that is not shown (auth loading): no event, no navigation
                if (hidden) {
                  e.preventDefault();
                  return;
                }
                try {
                  trackOnboardingEvent("ts_free_sample_pick", { code: p.code, surface: TS_FREE_PICKER_SURFACE });
                } catch {
                  /* analytics must never block the paper */
                }
              }}
            >
              <span className="lt-ts-free__name">{p.title}</span>
              <span className="lt-ts-free__detail">{p.detail}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
