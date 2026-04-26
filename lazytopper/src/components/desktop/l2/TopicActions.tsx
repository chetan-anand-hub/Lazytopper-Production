import { Link } from "react-router-dom";
import type { DesktopActionSource } from "../../../lib/desktop/navigation";
import {
  buildDesktopCheckPath,
  buildDesktopPracticePath,
  buildDesktopTopicHubPath,
  buildDesktopWorksheetPath,
} from "../../../lib/desktop/navigation";
import type { DesktopTopicSummary } from "../../../lib/desktop/topics";

/**
 * Desktop Level 2 — TopicActions
 *
 * Reference (final desktop prototype):
 *   chetan-anand-hub/topic-focus-lite — src/components/TopicActions.tsx
 *
 * Renders a row of primary actions for a focused topic:
 *   - Practice    → /practice-hub?...
 *   - Worksheet   → /practice/worksheets?...
 *   - Topic Hub   → /topic-hub/<slug>
 *   - Check       → /check-improve?topic=...
 *
 * Each action carries `source` so the destination page's BackToParent can
 * resolve correctly. Pure presentational — no router hooks beyond `Link`.
 *
 * Design contract (matches existing DesktopShell / DesktopHome styles):
 *   - No Tailwind, no lucide. Inline styles + inline SVG only.
 */

const CARD_BG = "hsl(0, 0%, 100%)";
const CARD_BORDER = "hsl(215, 25%, 90%)";
const TEXT = "hsl(220, 45%, 14%)";
const TEXT_MUTED = "hsl(220, 15%, 45%)";
const ACCENT = "hsl(152, 55%, 45%)";
const ACCENT_BG = "hsl(152, 55%, 95%)";
const SHADOW_SM = "0 1px 2px hsla(222, 40%, 20%, 0.04)";

function DumbbellIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.4 14.4 9.6 9.6" />
      <path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z" />
      <path d="m21.5 21.5-1.4-1.4" />
      <path d="M3.9 3.9 2.5 2.5" />
      <path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z" />
    </svg>
  );
}

function FileTextIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </svg>
  );
}

function CompassIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function ScanLineIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M7 12h10" />
    </svg>
  );
}

function ArrowRightIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

interface TopicActionsProps {
  topic: DesktopTopicSummary;
  source?: DesktopActionSource;
  /** Optional explicit returnTo pathname/query the destination should bounce back to. */
  returnTo?: string;
  title?: string;
}

interface ActionConfig {
  key: string;
  label: string;
  blurb: string;
  to: string;
  Icon: (props: { size?: number }) => React.ReactElement;
  primary?: boolean;
}

export function TopicActions({
  topic,
  source = "topicHub",
  returnTo,
  title = "Take action on this topic",
}: TopicActionsProps) {
  const ctx = { source, returnTo };

  const actions: ActionConfig[] = [
    {
      key: "practice",
      label: "Practice",
      blurb: "Run a focused practice set on this topic.",
      to: buildDesktopPracticePath({
        scope: "topic",
        subject: topic.subject,
        stream: topic.stream,
        topic: topic.slug,
        mode: "practice-set",
        ...ctx,
      }),
      Icon: DumbbellIcon,
      primary: true,
    },
    {
      key: "worksheet",
      label: "Worksheet",
      blurb: "Generate a printable worksheet for this topic.",
      to: buildDesktopWorksheetPath({
        scope: "topic",
        subject: topic.subject,
        stream: topic.stream,
        topic: topic.slug,
        ...ctx,
      }),
      Icon: FileTextIcon,
    },
    {
      key: "topic-hub",
      label: "Topic Hub",
      blurb: "Open the full topic hub for notes and resources.",
      to: buildDesktopTopicHubPath(topic.slug, ctx),
      Icon: CompassIcon,
    },
    {
      key: "check",
      label: "Check & Improve",
      blurb: "Diagnose mistakes for this topic and get a fix plan.",
      to: buildDesktopCheckPath(topic.slug, ctx),
      Icon: ScanLineIcon,
    },
  ];

  return (
    <section
      style={{
        background: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: 16,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        boxShadow: SHADOW_SM,
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: ACCENT,
          }}
        >
          {title}
        </span>
        <span style={{ fontSize: 14, color: TEXT_MUTED }}>{topic.name}</span>
      </header>

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {actions.map(({ key, label, blurb, to, Icon, primary }) => (
          <li key={key}>
            <Link
              to={to}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: 14,
                borderRadius: 12,
                border: `1px solid ${primary ? ACCENT : CARD_BORDER}`,
                background: primary ? ACCENT_BG : CARD_BG,
                color: TEXT,
                textDecoration: "none",
                transition: "border-color 120ms ease, background 120ms ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = ACCENT;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = primary
                  ? ACCENT
                  : CARD_BORDER;
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: ACCENT,
                }}
              >
                <Icon />
                <ArrowRightIcon />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{label}</span>
                <span style={{ fontSize: 12, color: TEXT_MUTED, lineHeight: 1.4 }}>{blurb}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
