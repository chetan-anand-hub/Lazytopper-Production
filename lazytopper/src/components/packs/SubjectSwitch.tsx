import { subjectLabel, type PackSubject } from "../../services/packs";
import "./subjectSwitch.css";

/**
 * SubjectSwitch - PACKS-TIDY-1: the Maths / Science segmented switch on /packs (one card, one Buy, instead of two parallel blocks).
 * Two real radio inputs in a radiogroup (keyboard: arrow keys, screen readers: "Maths, radio button, 1 of 2, selected"); each target
 * is 44px or taller and the selected one is marked by a check mark and a filled pill, not by colour alone. Presentation only: the
 * caller decides what the chosen subject changes.
 */
export default function SubjectSwitch({
  value,
  onChange,
  label,
  tone = "light",
  testPrefix,
}: {
  value: PackSubject;
  onChange: (next: PackSubject) => void;
  label: string;
  tone?: "light" | "on-dark";
  testPrefix: string;
}) {
  /* a fixed name per switch (testPrefix is unique on a page): useId() counts mounts, which differ run to run and made the prerender non-deterministic */
  const name = `lt-ss-${testPrefix}`;
  return (
    <div role="radiogroup" aria-label={label} className={tone === "on-dark" ? "lt-ss lt-ss--dark" : "lt-ss"}>
      {(["maths", "science"] as const).map((s) => (
        <label key={s} className={value === s ? "lt-ss__opt lt-ss__opt--on" : "lt-ss__opt"}>
          <input type="radio" className="lt-ss__in" name={name} value={s} checked={value === s} onChange={() => onChange(s)} data-testid={`${testPrefix}-${s}`} />
          <span className="lt-ss__txt">
            {value === s && <span className="lt-ss__tick" aria-hidden="true">&#10003;</span>}
            {subjectLabel(s)}
          </span>
        </label>
      ))}
    </div>
  );
}
