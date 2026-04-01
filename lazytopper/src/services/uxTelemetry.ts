type UxEventName =
  | "login_google_click"
  | "login_phone_send_otp"
  | "login_phone_error"
  | "login_phone_verify_otp"
  | "trends_topic_teach_click"
  | "trends_topic_practice_click"
  | "trends_topic_more_click"
  | "topichub_open_practice"
  | "hpq_open_practice"
  | "hpq_open_topic_hub"
  | "practice_regenerate_click";

export type UxTelemetryEvent = {
  name: UxEventName;
  page: string;
  meta?: Record<string, string | number | boolean | null | undefined>;
  ts: string;
};

const UX_TELEMETRY_KEY = "lazytopper.ux.telemetry.v1";
const UX_TELEMETRY_MAX = 200;

function readEvents(): UxTelemetryEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(UX_TELEMETRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UxTelemetryEvent[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.name === "string");
  } catch {
    return [];
  }
}

function writeEvents(events: UxTelemetryEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(UX_TELEMETRY_KEY, JSON.stringify(events.slice(-UX_TELEMETRY_MAX)));
  } catch {
    // Ignore telemetry persistence failures.
  }
}

export function trackUxEvent(
  name: UxEventName,
  page: string,
  meta?: Record<string, string | number | boolean | null | undefined>
): void {
  const event: UxTelemetryEvent = {
    name,
    page,
    meta,
    ts: new Date().toISOString(),
  };
  const existing = readEvents();
  writeEvents([...existing, event]);
}

export function getUxTelemetryEvents(): UxTelemetryEvent[] {
  return readEvents();
}
