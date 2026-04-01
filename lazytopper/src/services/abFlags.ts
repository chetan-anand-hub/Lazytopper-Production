export type HintVariant = "B_LOCAL" | "C_REFRESH";

const HINT_VARIANT_KEY = "lt_hint_variant";

function isValidHintVariant(value: string | null | undefined): value is HintVariant {
  return value === "B_LOCAL" || value === "C_REFRESH";
}

function getQueryOverride(): HintVariant | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search || "");
  const override = params.get("hintVariant");
  return isValidHintVariant(override) ? override : null;
}

export function setHintVariant(variant: HintVariant): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HINT_VARIANT_KEY, variant);
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

export function getHintVariant(): HintVariant {
  const override = getQueryOverride();
  if (override) {
    setHintVariant(override);
    return override;
  }

  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(HINT_VARIANT_KEY);
      if (isValidHintVariant(stored)) return stored;
    } catch {
      // Ignore storage failures; fall back to random assignment.
    }
  }

  const assigned: HintVariant = Math.random() < 0.5 ? "B_LOCAL" : "C_REFRESH";
  setHintVariant(assigned);
  return assigned;
}
