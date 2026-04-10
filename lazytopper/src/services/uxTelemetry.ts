type UxEventName =
  | "login_google_click"
  | "login_phone_send_otp"
  | "login_phone_error"
  | "login_phone_verify_otp"
  | "trends_topic_teach_click"
  | "trends_topic_practice_click"
  | "trends_topic_more_click"
  | "topichub_open_practice"
  | "topichub_open_teach"
  | "hpq_open_practice"
  | "hpq_open_topic_hub"
  | "practice_regenerate_click"
  | "topichub_topic_mock_click"
  | "topic_mock_start"
  | "topic_mock_complete"
  | "exam_simulation_start"
  | "exam_simulation_complete"
  | "login_guest_explore"
  | "chapter_test_start"
  | "chapter_test_complete"
  | "break_reminder_shown"
  | "break_reminder_action"
  | "breathing_moment_complete"
  | "landing_page_visit"
  | "login_start"
  | "login_complete"
  | "onboarding_start"
  | "onboarding_complete"
  | "first_practice_start"
  | "first_practice_complete";

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
