/**
 * PostPayGst - GST-AFTER-PAY-1 (owner 13 Nov 2026): "For your GST invoice". The state + PIN the GST invoice needs are asked HERE, on
 * the paid screen, never before Razorpay. State select + PIN + Save. It never blocks "Who will use this?" and never gates the files:
 * a buyer who skips it is paid as normal and the order waits for the invoice details (nothing is lost, nothing is guessed).
 * Renders nothing with VITE_GST_STATE_FIELD off. Plain classes (postPayGst.css); works at 360 px.
 */
import { useEffect, useId, useState } from "react";
import { gstStateFieldOn } from "../../services/gstBuyerOrder";
import { GST_STATES, gstAfterPayError, gstPrefill, saveGstDetails, type GstTarget } from "../../services/gstAfterPay";
import "./postPayGst.css";

export const POSTPAY_GST_TITLE = "For your GST invoice";
export const POSTPAY_GST_LEDE = "Your state and PIN code go on the invoice.";
export const POSTPAY_GST_SAVED = "Saved ✓ Your GST invoice will be sent to you.";
export const POSTPAY_GST_EXPIRED = "This can no longer be added here. Message us and we will add it.";
export const POSTPAY_GST_FAILED = "That did not save. Try again.";

export default function PostPayGst({ target, saveImpl = saveGstDetails }: { target: GstTarget; saveImpl?: typeof saveGstDetails }) {
  const uid = useId();
  const [stateCode, setStateCode] = useState("");
  const [pin, setPin] = useState("");
  const [touched, setTouched] = useState(false);
  const [phase, setPhase] = useState<"idle" | "saving" | "saved" | "expired" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);
  const on = gstStateFieldOn();

  // The pre-fill (the account's remembered state + PIN, else the IP region's state): only fills an EMPTY field, never overwrites typing.
  useEffect(() => {
    if (!on) return undefined;
    let alive = true;
    void (async () => {
      let headers: Record<string, string> = {};
      if (target.kind === "account") {
        try {
          headers = await (await import("../../services/checkout")).authHeaders();
        } catch {
          headers = {};
        }
      }
      const p = await gstPrefill(headers);
      if (!alive) return;
      setStateCode((s) => s || p.stateCode);
      setPin((v) => v || p.pin);
    })();
    return () => {
      alive = false;
    };
    // The target is fixed for the block's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);

  if (!on) return null;
  if (phase === "saved") {
    return (
      <section className="lt-ppg" data-testid="postpay-gst">
        <h3 className="lt-ppg__title">{POSTPAY_GST_TITLE}</h3>
        <p className="lt-ppg__ok" role="status" data-testid="postpay-gst-saved">{POSTPAY_GST_SAVED}</p>
      </section>
    );
  }
  const busy = phase === "saving";
  async function save() {
    const bad = gstAfterPayError(stateCode, pin);
    setTouched(true);
    if (bad) {
      setError(bad);
      return;
    }
    setError(null);
    setPhase("saving");
    const out = await saveImpl(target, { stateCode, pin });
    if (out.status === "saved") setPhase("saved");
    else if (out.status === "expired") setPhase("expired");
    else if (out.status === "bad_input") {
      setPhase("idle");
      setError(gstAfterPayError(out.field === "state" ? "" : stateCode, out.field === "pin" ? "" : pin) ?? POSTPAY_GST_FAILED);
    } else setPhase("failed");
  }
  return (
    <section className="lt-ppg" data-testid="postpay-gst">
      <h3 className="lt-ppg__title">{POSTPAY_GST_TITLE}</h3>
      <p className="lt-ppg__lede">{POSTPAY_GST_LEDE}</p>
      {phase === "expired" ? (
        <p className="lt-ppg__bad" role="alert" data-testid="postpay-gst-expired">{POSTPAY_GST_EXPIRED}</p>
      ) : (
        <form
          className="lt-ppg__form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) void save();
          }}
        >
          <label className="lt-ppg__label" htmlFor={`${uid}-state`}>State</label>
          <select id={`${uid}-state`} className="lt-ppg__input" value={stateCode} disabled={busy} onChange={(e) => setStateCode(e.target.value)} data-testid="postpay-gst-state">
            <option value="">Choose your state</option>
            {GST_STATES.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
          <label className="lt-ppg__label" htmlFor={`${uid}-pin`}>PIN code</label>
          <input
            id={`${uid}-pin`}
            className="lt-ppg__input"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={6}
            value={pin}
            disabled={busy}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            data-testid="postpay-gst-pin"
          />
          {(error && touched) || phase === "failed" ? (
            <p className="lt-ppg__bad" role="alert" data-testid="postpay-gst-error">{phase === "failed" ? POSTPAY_GST_FAILED : error}</p>
          ) : null}
          <button type="submit" className="lt-ppg__save" disabled={busy} data-testid="postpay-gst-save">
            {busy ? "Saving…" : "Save"}
          </button>
        </form>
      )}
    </section>
  );
}
