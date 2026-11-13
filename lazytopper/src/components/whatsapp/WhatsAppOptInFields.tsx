import { WA_BAD_NUMBER, WA_NUMBER_LABEL, WA_OPTIN_LABEL, waTenDigits } from "../../services/waOptIn";
import "./whatsAppOptIn.css";

/**
 * The WhatsApp number field + the consent tick (WHATSAPP-OPTIN-1). Presentational: the number is Indian (+91 shown, ten digits),
 * the tick is UNTICKED by default (the parent owns the state) and its label is the owner-approved text, verbatim.
 */
export interface WhatsAppOptInFieldsProps {
  phone: string;
  ticked: boolean;
  onPhone: (v: string) => void;
  onTick: (v: boolean) => void;
  disabled?: boolean;
  testIdPrefix?: string;
}

export default function WhatsAppOptInFields({ phone, ticked, onPhone, onTick, disabled, testIdPrefix = "wa" }: WhatsAppOptInFieldsProps) {
  // Deterministic (the static-body capture renders the page twice and compares the DOM): one fixed id per surface (testIdPrefix), never useId / counters.
  const id = `lt-waopt-${testIdPrefix}`;
  const showError = phone.trim() !== "" && waTenDigits(phone) === null;
  return (
    <div className="lt-waopt" data-testid={`${testIdPrefix}-optin`}>
      <label className="lt-waopt__label" htmlFor={`${id}-num`}>{WA_NUMBER_LABEL}</label>
      <div className="lt-waopt__field">
        <span className="lt-waopt__prefix" aria-hidden="true">+91</span>
        <input
          id={`${id}-num`}
          className="lt-waopt__input"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={16}
          placeholder="98765 43210"
          value={phone}
          disabled={disabled}
          onChange={(e) => onPhone(e.target.value)}
          aria-invalid={showError ? true : undefined}
          data-testid={`${testIdPrefix}-number`}
        />
      </div>
      {showError && <p className="lt-waopt__error" role="alert" data-testid={`${testIdPrefix}-number-error`}>{WA_BAD_NUMBER}</p>}
      <label className="lt-waopt__tick">
        <input type="checkbox" checked={ticked} disabled={disabled} onChange={(e) => onTick(e.target.checked)} data-testid={`${testIdPrefix}-consent`} />
        <span>{WA_OPTIN_LABEL}</span>
      </label>
    </div>
  );
}
