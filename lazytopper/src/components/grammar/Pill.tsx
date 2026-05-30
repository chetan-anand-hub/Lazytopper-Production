import type { ReactNode } from "react";
import {
  BORDER,
  CARD_BG,
  FG,
  GREEN_DARK,
  GREEN_RING,
  GREEN_SOFT,
  MUTED,
  PILL_BG,
} from "./tokens";

export type PillTone = "neutral" | "green";

/**
 * Pill — pill-shaped chip button (999px radius), matching the existing
 * ChipToggle/PillButton look. Presentational state via props:
 *   active   — emphasized/selected styling (+ `is-active` class)
 *   disabled — non-interactive, dimmed (+ `is-disabled` class, aria-disabled)
 *   tone     — "neutral" | "green" (+ `tone-green` / `tone-neutral` class)
 *
 * Class hooks are stable so pages and tests can target state without reading
 * inline styles.
 */
export function Pill({
  children,
  active = false,
  disabled = false,
  tone = "neutral",
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  tone?: PillTone;
  onClick?: () => void;
}) {
  const className = [
    "lt-grammar-pill",
    `tone-${tone}`,
    active ? "is-active" : null,
    disabled ? "is-disabled" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const greenActive = active && tone === "green";
  const background = greenActive ? GREEN_SOFT : active ? PILL_BG : CARD_BG;
  const color = disabled ? MUTED : greenActive ? GREEN_DARK : FG;
  const borderColor = greenActive ? GREEN_RING : active ? BORDER : BORDER;

  return (
    <button
      type="button"
      className={className}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      style={{
        appearance: "none",
        WebkitAppearance: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        background,
        color,
        border: `1px solid ${borderColor}`,
        padding: "5px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        opacity: disabled ? 0.55 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}
