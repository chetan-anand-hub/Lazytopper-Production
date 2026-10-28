import "./founderBadge.css";

export const FOUNDER_BADGE_TEXT = "Made by an IITian (IIT Kanpur)";

type FounderBadgeProps = {
  /** "dark" is for a navy background (the /packs hero, the /pricing band); "light" for a pale one. */
  tone: "light" | "dark";
};

export default function FounderBadge({ tone }: FounderBadgeProps) {
  return (
    <p className={`lt-founder-badge lt-founder-badge--${tone}`} data-testid="founder-badge">
      <svg className="lt-founder-badge__icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path d="M12 3 1 9l11 6 9-4.9V17h2V9L12 3z" fill="currentColor" />
        <path d="M5 13.2V17c0 1.7 3.1 3 7 3s7-1.3 7-3v-3.8l-7 3.8-7-3.8z" fill="currentColor" />
      </svg>
      <span className="lt-founder-badge__text">{FOUNDER_BADGE_TEXT}</span>
    </p>
  );
}
