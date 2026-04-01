const DEFAULT_GATE_COOLDOWN_MS = 90_000;
let mentorServerBlockedUntilMs = 0;

function isTruthyFlag(value: string): boolean {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function readDisableMentorServerFlag(): boolean {
  return isTruthyFlag(String(import.meta.env.VITE_DISABLE_MENTOR_SERVER || ""));
}

export function canUseMentorServer(): boolean {
  if (readDisableMentorServerFlag()) return false;
  return Date.now() >= mentorServerBlockedUntilMs;
}

export function markMentorServerUnavailable(cooldownMs = DEFAULT_GATE_COOLDOWN_MS): void {
  const safeCooldown = Math.max(5_000, Number(cooldownMs) || DEFAULT_GATE_COOLDOWN_MS);
  const nextBlockedUntil = Date.now() + safeCooldown;
  if (nextBlockedUntil > mentorServerBlockedUntilMs) {
    mentorServerBlockedUntilMs = nextBlockedUntil;
  }
}

export function isMentorNetworkFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || "");
  return /failed to fetch|networkerror|network request failed|econnrefused|timed out|timeout/i.test(
    message
  );
}

export function getMentorServerBlockRemainingMs(): number {
  return Math.max(0, mentorServerBlockedUntilMs - Date.now());
}
