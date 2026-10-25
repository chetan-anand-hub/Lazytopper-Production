import TrialEndScreen from "./TrialEndScreen";
import TrialCountdownBar from "./TrialCountdownBar";

/** ASK-FIX-1 - the two trial asks together. Loaded lazily by ./TrialAsk so the entry chunk carries none of it. */
export default function TrialAskInner() {
  return (
    <>
      <TrialEndScreen />
      <TrialCountdownBar />
    </>
  );
}
