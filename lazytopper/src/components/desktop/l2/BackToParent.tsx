import { Link, useLocation } from "react-router-dom";
import type { DesktopActionSource } from "../../../lib/desktop/navigation";

/**
 * Desktop Level 2 — BackToParent
 *
 * Reference (final desktop prototype):
 *   chetan-anand-hub/topic-focus-lite — src/components/BackToParent.tsx
 *
 * Resolves a parent-aware "back" link from URL state in this priority:
 *   1. ?returnTo=<absolute-path>  + ?source=<sourceKey>  (explicit override)
 *   2. ?source=<sourceKey>                                (mapped to parent)
 *   3. fallbackPath / fallbackLabel  (caller-provided)
 *
 * Mapped paths target real LazyTopper desktop routes (not topic-focus-lite's
 * /app/* prefix). All values come from the URL — no React context required.
 */

const TEXT_MUTED = "hsl(220, 15%, 45%)";
const TEXT_HOVER = "hsl(220, 45%, 14%)";

interface BackToParentProps {
  fallbackPath?: string;
  fallbackLabel?: string;
}

const SOURCE_MAP: Record<DesktopActionSource, { path: string; label: string }> = {
  home: { path: "/", label: "Back to Home" },
  practice: { path: "/practice-hub", label: "Back to Practice" },
  worksheet: { path: "/practice/worksheets", label: "Back to Worksheet" },
  trends: { path: "/exam-trends", label: "Back to Exam Trends" },
  topicHub: { path: "/topic-hub", label: "Back to Topic Hub" },
  check: { path: "/check-improve", label: "Back to Check & Improve" },
  me: { path: "/me", label: "Back to Me" },
};

const isKnownSource = (value: string | null): value is DesktopActionSource => {
  if (!value) return false;
  return value in SOURCE_MAP;
};

function ArrowLeftIcon({ size = 14 }: { size?: number }) {
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
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

export function BackToParent({ fallbackPath, fallbackLabel }: BackToParentProps = {}) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const returnTo = params.get("returnTo");
  const sourceParam = params.get("source");
  const source = isKnownSource(sourceParam) ? sourceParam : null;

  let path: string | null = null;
  let label: string | null = null;

  if (returnTo) {
    path = returnTo;
    label = source ? SOURCE_MAP[source].label : "Back";
  } else if (source) {
    path = SOURCE_MAP[source].path;
    label = SOURCE_MAP[source].label;
  } else if (fallbackPath) {
    path = fallbackPath;
    label = fallbackLabel ?? "Back";
  }

  if (!path || !label) return null;

  return (
    <Link
      to={path}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        fontWeight: 500,
        color: TEXT_MUTED,
        textDecoration: "none",
        marginBottom: 8,
        transition: "color 120ms ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.color = TEXT_HOVER;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.color = TEXT_MUTED;
      }}
    >
      <ArrowLeftIcon />
      <span>{label}</span>
    </Link>
  );
}
