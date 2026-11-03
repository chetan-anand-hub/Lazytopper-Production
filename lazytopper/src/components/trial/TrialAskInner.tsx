import TrialEndScreen from "./TrialEndScreen";
import TrialCountdownBar from "./TrialCountdownBar";
import TrialEarlyStrip from "./TrialEarlyStrip";

/** ASK-FIX-1 - the trial asks together (TRIAL-SELL-1 adds the desktop day 1-3 strip). Loaded lazily by ./TrialAsk so the entry chunk carries none of it. */
export default function TrialAskInner() {
  return (
    <>
      <TrialEndScreen />
      <TrialEarlyStrip />
      <TrialCountdownBar />
    </>
  );
}
