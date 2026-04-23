import { useNavigate } from "react-router-dom";
import MobileShell from "../../components/mobile/MobileShell";
import { useAuth } from "../../context/AuthContext";
import { useSubjectContext } from "../../hooks/useSubjectContext";
import { useSubscription } from "../../hooks/useSubscription";

function readLocalInt(key: string, fallback = 0): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (typeof parsed === "number") return parsed;
    if (typeof parsed === "object" && parsed !== null) {
      return Number(parsed.count ?? parsed.value ?? fallback);
    }
    return Number(raw) || fallback;
  } catch {
    return fallback;
  }
}

const COMMON_MISTAKES = [
  { cat: "Sign errors in algebra", lost: 12, pct: 70 },
  { cat: "Skipping justification steps", lost: 8, pct: 45 },
  { cat: "Unit mistakes in numericals", lost: 5, pct: 28 },
];

export default function Me() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subject } = useSubjectContext();
  const { isTrialActive, isPremium, daysLeftInTrial } = useSubscription();

  const streak = readLocalInt("lazytopper.streak");
  const xp = readLocalInt("lazytopper.xp");

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Student";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const trialLabel = isPremium
    ? "Premium"
    : isTrialActive
    ? `${daysLeftInTrial}d trial left`
    : "Free";

  const trialBg = isPremium
    ? "rgba(34,197,94,0.12)"
    : isTrialActive
    ? "rgba(34,197,94,0.1)"
    : "rgba(156,163,175,0.12)";
  const trialColor = isPremium || isTrialActive ? "var(--mob-success)" : "var(--mob-fg-muted)";

  return (
    <MobileShell
      title="Me"
      subtitle={user ? "Your progress" : "Preview · sign in to save"}
      showNav
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Profile card */}
        <div
          className="card-soft"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "16px",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "var(--mob-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "1.15rem",
              color: "#ffffff",
              flexShrink: 0,
            }}
          >
            {initials || "S"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "1rem",
                color: "var(--mob-fg)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName} · Class 10
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--mob-fg-muted)", marginTop: 2 }}>
              CBSE · {subject || "Maths + Science"}
            </div>
          </div>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: 20,
              background: trialBg,
              color: trialColor,
              fontSize: "0.7rem",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {trialLabel}
          </span>
        </div>

        {/* Compact analytics — 3 tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            {
              iconPath: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3",
              value: `${streak}d`,
              label: "Streak",
            },
            {
              iconPath: "M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2",
              value: `${xp} XP`,
              label: "Total XP",
            },
            {
              iconPath: "M22 12h-4l-3 9L9 3l-3 9H2",
              value: subject === "Science" ? "3" : "2",
              label: "Weak topics",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="card-soft"
              style={{
                padding: "12px 10px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: "var(--mob-muted)",
                  color: "var(--mob-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={stat.iconPath} />
                </svg>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: "1rem",
                  color: "var(--mob-fg)",
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: "0.62rem", color: "var(--mob-fg-muted)" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Where you lose marks */}
        <div>
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--mob-fg-muted)",
              marginBottom: 10,
            }}
          >
            Where you lose marks
          </div>
          <div className="card-soft" style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {COMMON_MISTAKES.map((r) => (
                <div key={r.cat}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color: "var(--mob-fg)",
                      }}
                    >
                      {r.cat}
                    </span>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--mob-fg-muted)",
                      }}
                    >
                      −{r.lost} marks
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 3,
                      background: "var(--mob-muted)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 3,
                        background: "var(--mob-danger, #ef4444)",
                        width: `${r.pct}%`,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recommended next action */}
        <div>
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--mob-fg-muted)",
              marginBottom: 10,
            }}
          >
            Recommended next
          </div>
          <button
            className="tap"
            onClick={() => navigate("/practice/worksheets")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              width: "100%",
              padding: "16px",
              borderRadius: 16,
              background: "var(--mob-primary)",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              color: "#ffffff",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 11,
                background: "rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  marginBottom: 2,
                }}
              >
                Generate a worksheet
              </div>
              <div style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.72)" }}>
                Board-style · targets your weak areas
              </div>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Check & Improve CTA */}
        <button
          className="card-soft tap"
          onClick={() => navigate("/check-improve")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 16px",
            border: "1px solid var(--mob-card-border)",
            background: "var(--mob-card)",
            cursor: "pointer",
            textAlign: "left",
            width: "100%",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(139,92,246,0.1)",
              color: "hsl(280,60%,50%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="13 2 13 9 20 9" />
              <path d="m9 15 2 2 4-4" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: "0.88rem",
                color: "var(--mob-fg)",
                marginBottom: 2,
              }}
            >
              Check & Improve
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--mob-fg-muted)" }}>
              Upload your answers · get board-style grading
            </div>
          </div>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--mob-fg-muted)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Sign-in nudge (logged out) */}
        {!user && (
          <button
            className="tap"
            onClick={() => navigate("/login")}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 14,
              border: "1.5px dashed var(--mob-card-border)",
              background: "transparent",
              cursor: "pointer",
              fontSize: "0.82rem",
              color: "var(--mob-fg-muted)",
              textAlign: "center",
            }}
          >
            Sign in to save your progress →
          </button>
        )}
      </div>
    </MobileShell>
  );
}
