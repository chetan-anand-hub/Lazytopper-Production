import { useState } from "react";
import {
  WA_SAMPLE_DONE,
  WA_SAMPLE_FAILED,
  WA_SAMPLE_OPEN,
  WA_SAMPLE_SEND,
  isWaOptInClientEnabled,
  postSampleOptIn,
  waTenDigits,
} from "../../services/waOptIn";
import WhatsAppOptInFields from "./WhatsAppOptInFields";

/**
 * Under a free sample (WHATSAPP-OPTIN-1): the download stays one tap and ungated; this compact line expands to the number field,
 * the tick and "Send". Nothing is sent until "Send" is pressed with a valid number AND the tick on.
 */
export default function WhatsAppSampleOptIn({ packId }: { packId: string }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [ticked, setTicked] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "done" | "failed">("idle");
  if (!isWaOptInClientEnabled()) return null;
  const ten = waTenDigits(phone);
  const canSend = ticked && ten !== null && state !== "busy";
  async function send() {
    if (!ten || !ticked || state === "busy") return;
    setState("busy");
    setState((await postSampleOptIn(ten, packId)) ? "done" : "failed");
  }
  if (state === "done") {
    return <p className="lt-waopt__done" role="status" data-testid="wa-sample-done">{WA_SAMPLE_DONE}</p>;
  }
  if (!open) {
    return (
      <button type="button" className="lt-waopt__open" onClick={() => setOpen(true)} data-testid="wa-sample-open">
        {WA_SAMPLE_OPEN}
      </button>
    );
  }
  return (
    <div className="lt-waopt__sample" data-testid="wa-sample">
      <WhatsAppOptInFields phone={phone} ticked={ticked} onPhone={setPhone} onTick={setTicked} disabled={state === "busy"} testIdPrefix="wa-sample" />
      {state === "failed" && <p className="lt-waopt__error" role="alert" data-testid="wa-sample-failed">{WA_SAMPLE_FAILED}</p>}
      <button type="button" className="lt-waopt__send" disabled={!canSend} onClick={() => void send()} data-testid="wa-sample-send">
        {WA_SAMPLE_SEND}
      </button>
    </div>
  );
}
