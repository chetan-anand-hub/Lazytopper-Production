import { useEffect, useState } from "react";
import { isWaOptInClientEnabled, setPendingWaOptIn, waTenDigits } from "../../services/waOptIn";
import WhatsAppOptInFields from "./WhatsAppOptInFields";

/**
 * The block ABOVE a Buy / Pay button (WHATSAPP-OPTIN-1): no extra tap on the Buy path. It only keeps the typed number and the tick
 * in memory (services/waOptIn); the order-create request carries them when the number is valid AND the tick is on. Leaving it empty,
 * or unticked, changes nothing about Buy. Unmounting clears the pending value.
 */
export default function WhatsAppOptInCheckout({ testIdPrefix = "wa" }: { testIdPrefix?: string }) {
  const [phone, setPhone] = useState("");
  const [ticked, setTicked] = useState(false);
  useEffect(() => {
    const ten = waTenDigits(phone);
    setPendingWaOptIn(ticked && ten ? ten : null);
  }, [phone, ticked]);
  useEffect(() => () => setPendingWaOptIn(null), []);
  if (!isWaOptInClientEnabled()) return null;
  return <WhatsAppOptInFields phone={phone} ticked={ticked} onPhone={setPhone} onTick={setTicked} testIdPrefix={testIdPrefix} />;
}
