import type {
  DesktopPaperScope,
  DesktopStream,
  DesktopSubject,
} from "../../../lib/desktop/navigation";
import type { DesktopTopicSummary } from "../../../lib/desktop/topics";

/**
 * Desktop Level 2 — ScopeBuilder
 *
 * Reference (final desktop prototype):
 *   chetan-anand-hub/topic-focus-lite — src/components/ScopeBuilder.tsx
 *
 * Controlled UI for picking the study scope:
 *   - Subject (Maths / Science)
 *   - Stream (Science only: All / Physics / Chemistry / Biology)
 *   - Scope mode (single topic / multi-topic / full subject)
 *   - Topic(s) — single radio or multi checkbox depending on scope
 *
 * Pure controlled component — all state lives in the parent.
 *
 * Design contract (matches existing DesktopShell / DesktopHome styles):
 *   - No Tailwind, no lucide. Inline styles only.
 *   - No data fetching. Topic catalog comes in via `topics` prop.
 */

const CARD_BG = "hsl(0, 0%, 100%)";
const CARD_BORDER = "hsl(215, 25%, 90%)";
const TEXT = "hsl(220, 45%, 14%)";
const TEXT_MUTED = "hsl(220, 15%, 45%)";
const ACCENT = "hsl(152, 55%, 45%)";
const ACCENT_BG = "hsl(152, 55%, 95%)";
const PILL_BG = "hsl(210, 33%, 96%)";
const FONT_DISPLAY = "'Fraunces', Georgia, serif";

const SUBJECTS: DesktopSubject[] = ["Maths", "Science"];
const STREAMS: DesktopStream[] = ["All", "Physics", "Chemistry", "Biology"];
const SCOPES: { value: DesktopPaperScope; label: string }[] = [
  { value: "topic", label: "Single topic" },
  { value: "multi-topic", label: "Multi-topic" },
  { value: "full-subject", label: "Full subject" },
];

export interface DesktopScopeValue {
  subject: DesktopSubject;
  stream: DesktopStream;
  scope: DesktopPaperScope;
  topicSlug: string | null;
  selectedTopicSlugs: string[];
}

interface ScopeBuilderProps {
  topics: DesktopTopicSummary[];
  value: DesktopScopeValue;
  onChange: (next: DesktopScopeValue) => void;
  title?: string;
}

const segmentStyle = (active: boolean): React.CSSProperties => ({
  padding: "6px 12px",
  borderRadius: 8,
  border: `1px solid ${active ? ACCENT : CARD_BORDER}`,
  background: active ? ACCENT_BG : CARD_BG,
  color: active ? ACCENT : TEXT,
  fontSize: 13,
  fontWeight: active ? 600 : 500,
  cursor: "pointer",
});

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: TEXT_MUTED,
  marginBottom: 8,
};

const sectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

export function ScopeBuilder({ topics, value, onChange, title = "Study scope" }: ScopeBuilderProps) {
  const filteredTopics = topics.filter((t) => {
    if (t.subject !== value.subject) return false;
    if (value.subject !== "Science" || value.stream === "All") return true;
    return t.stream === value.stream;
  });

  const setSubject = (subject: DesktopSubject) => {
    onChange({
      subject,
      stream: subject === "Maths" ? "All" : value.stream,
      scope: value.scope,
      topicSlug: null,
      selectedTopicSlugs: [],
    });
  };

  const setStream = (stream: DesktopStream) => {
    if (value.subject === "Maths") {
      onChange({ ...value, stream: "All" });
      return;
    }
    onChange({
      ...value,
      stream,
      topicSlug: null,
      selectedTopicSlugs: [],
    });
  };

  const setScope = (scope: DesktopPaperScope) => {
    onChange({
      ...value,
      scope,
      topicSlug: scope === "topic" ? value.topicSlug : null,
      selectedTopicSlugs: scope === "multi-topic" ? value.selectedTopicSlugs : [],
    });
  };

  const setSingleTopic = (slug: string) => {
    onChange({ ...value, topicSlug: slug });
  };

  const toggleTopic = (slug: string) => {
    const exists = value.selectedTopicSlugs.includes(slug);
    const next = exists
      ? value.selectedTopicSlugs.filter((s) => s !== slug)
      : [...value.selectedTopicSlugs, slug];
    onChange({ ...value, selectedTopicSlugs: next });
  };

  return (
    <section
      style={{
        background: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: 16,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <h3
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 18,
          fontWeight: 600,
          color: TEXT,
          margin: 0,
        }}
      >
        {title}
      </h3>

      {/* Subject */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Subject</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SUBJECTS.map((subject) => (
            <button
              key={subject}
              type="button"
              onClick={() => setSubject(subject)}
              style={segmentStyle(value.subject === subject)}
            >
              {subject}
            </button>
          ))}
        </div>
      </div>

      {/* Stream — Science only */}
      {value.subject === "Science" ? (
        <div style={sectionStyle}>
          <div style={labelStyle}>Stream</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {STREAMS.map((stream) => (
              <button
                key={stream}
                type="button"
                onClick={() => setStream(stream)}
                style={segmentStyle(value.stream === stream)}
              >
                {stream}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Scope */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Scope</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SCOPES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setScope(s.value)}
              style={segmentStyle(value.scope === s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Topics */}
      {value.scope !== "full-subject" ? (
        <div style={sectionStyle}>
          <div style={labelStyle}>
            {value.scope === "topic" ? "Topic" : "Topics (pick 2 or more)"}
          </div>

          {filteredTopics.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: TEXT_MUTED }}>
              No topics available for this subject/stream combination.
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 8,
              }}
            >
              {filteredTopics.map((topic) => {
                const checked =
                  value.scope === "topic"
                    ? value.topicSlug === topic.slug
                    : value.selectedTopicSlugs.includes(topic.slug);
                return (
                  <li key={topic.slug}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        padding: "10px 12px",
                        border: `1px solid ${checked ? ACCENT : CARD_BORDER}`,
                        background: checked ? ACCENT_BG : PILL_BG,
                        borderRadius: 10,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type={value.scope === "topic" ? "radio" : "checkbox"}
                        name={value.scope === "topic" ? "scope-topic" : `scope-topics-${topic.slug}`}
                        checked={checked}
                        onChange={() =>
                          value.scope === "topic"
                            ? setSingleTopic(topic.slug)
                            : toggleTopic(topic.slug)
                        }
                        style={{ marginTop: 3, accentColor: ACCENT }}
                      />
                      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: checked ? ACCENT : TEXT,
                            lineHeight: 1.3,
                          }}
                        >
                          {topic.name}
                        </span>
                        <span style={{ fontSize: 11, color: TEXT_MUTED }}>
                          {topic.marks} • {topic.trendTier} trend
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <p
          style={{
            margin: 0,
            padding: "10px 12px",
            border: `1px dashed ${CARD_BORDER}`,
            background: PILL_BG,
            borderRadius: 10,
            fontSize: 13,
            color: TEXT_MUTED,
          }}
        >
          Full subject scope — covers every {value.subject} topic in the catalogue.
        </p>
      )}
    </section>
  );
}
