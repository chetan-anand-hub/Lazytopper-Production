// LEGACY-RETIRED 2026-06-08 - disconnected from product; safe to delete in clean-branch pass.
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import { useTheme, type AppTheme } from "../context/ThemeContext";
import { isFocusTrackingEnabled, setFocusTrackingEnabled } from "../services/focusTracker";
import {
  loadPaceProfile,
  setManualOverride,
  clearManualOverride,
  getProfileConfig,
  type PaceProfileType,
  type StoredPaceProfile,
} from "../services/paceProfileService";
import { hasParentPin, hashPin, saveParentPinHash, clearParentPin } from "../services/parentPinService";
import { resetData as resetAllStudentData } from "../services/studentDataService";

const COUNTDOWN_KEY = "lazytopper.hideCountdown";

function isCountdownHidden(): boolean {
  try {
    const stored = localStorage.getItem(COUNTDOWN_KEY);
    if (stored !== null) return stored === "1";
    const profile = loadPaceProfile();
    if (profile && (profile.type === "crash" || profile.type === "sprint")) return true;
    return false;
  } catch { return false; }
}

function ToggleSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      style={{
        width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
        background: on ? "#22c55e" : "var(--text-muted)",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: "50%", background: "#fff",
        position: "absolute", top: 3,
        left: on ? 25 : 3, transition: "left 0.2s",
      }} />
    </button>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 16px", borderBottom: "1px solid var(--bg-card-border)",
    }}>
      <div style={{ flex: 1, marginRight: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.4 }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ padding: "16px 16px 6px", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8 }}>
      {title}
    </div>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--bg-card)", borderRadius: 14,
      border: "1px solid var(--bg-card-border)", overflow: "hidden", marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const opts: { value: AppTheme; label: string; icon: string }[] = [
    { value: "dark", label: "Dark", icon: "🌙" },
    { value: "light", label: "Light", icon: "☀️" },
  ];
  return (
    <div style={{ padding: "14px 16px" }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>Appearance</div>
      <div style={{ display: "flex", gap: 8 }}>
        {opts.map(opt => (
          <button key={opt.value} type="button" onClick={() => setTheme(opt.value)} style={{
            flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer",
            background: theme === opt.value ? "#58cc02" : "var(--bg-card-border)",
            color: theme === opt.value ? "#fff" : "var(--text)",
            fontWeight: 700, fontSize: 13, transition: "background 0.2s",
          }}>
            {opt.icon} {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StudyModeSection() {
  const [mode, setMode] = useState(() => { try { return localStorage.getItem("vibeMode") || "beast"; } catch { return "beast"; } });
  const opts = [{ value: "beast", label: "🔥 Challenge" }, { value: "zombie", label: "😌 Relaxed" }];
  return (
    <div style={{ padding: "14px 16px", borderTop: "1px solid var(--bg-card-border)" }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>Study Mode</div>
      <div style={{ display: "flex", gap: 8 }}>
        {opts.map(opt => (
          <button key={opt.value} type="button" onClick={() => {
            try { localStorage.setItem("vibeMode", opt.value); } catch {}
            setMode(opt.value);
            window.location.reload();
          }} style={{
            flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer",
            background: mode === opt.value ? "#1cb0f6" : "var(--bg-card-border)",
            color: mode === opt.value ? "#fff" : "var(--text)",
            fontWeight: 700, fontSize: 13, transition: "background 0.2s",
          }}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PaceProfileSection() {
  const [paceProfile, setPaceProfile] = useState<StoredPaceProfile | null>(() => loadPaceProfile());
  if (!paceProfile) return null;
  const profileColors: Record<string, string> = { marathon: "#3b82f6", sprint: "#f97316", crash: "#ef4444" };
  return (
    <div style={{ padding: "14px 16px", borderTop: "1px solid var(--bg-card-border)" }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Study Pace</div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 10px", lineHeight: 1.4 }}>
        {paceProfile.isManualOverride
          ? `Manual override. Auto-detected: ${getProfileConfig(paceProfile.detectedType).label}.`
          : `Auto-detected from ${paceProfile.daysLeft} days to exam.`}
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        {(["marathon", "sprint", "crash"] as PaceProfileType[]).map((pt) => {
          const color = profileColors[pt];
          const cfg = getProfileConfig(pt);
          const isActive = paceProfile.type === pt;
          return (
            <button key={pt} type="button" onClick={() => {
              const updated = setManualOverride(pt);
              setPaceProfile(updated);
            }} style={{
              flex: 1, padding: "8px 4px", borderRadius: 10, cursor: "pointer",
              border: isActive ? `2px solid ${color}` : "1px solid var(--bg-card-border)",
              background: isActive ? `${color}20` : "var(--bg-card-border)",
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: isActive ? color : "var(--text-muted)", textTransform: "uppercase" }}>{cfg.label}</div>
              <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>{cfg.tagline}</div>
            </button>
          );
        })}
      </div>
      {paceProfile.isManualOverride && (
        <button type="button" onClick={() => {
          const updated = clearManualOverride();
          if (updated) setPaceProfile(updated);
        }} style={{
          marginTop: 8, padding: "6px 12px", borderRadius: 8, border: "none", width: "100%",
          background: "var(--bg-card-border)", color: "var(--text-muted)",
          fontSize: 11, fontWeight: 600, cursor: "pointer",
        }}>
          Reset to auto-detect
        </button>
      )}
    </div>
  );
}

function ParentPinSection() {
  const { profile, setProfileAndCompute } = useProfile();
  const [hasPinState, setHasPinState] = useState(hasParentPin);
  const [editing, setEditing] = useState(false);
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [saved, setSaved] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleDigit = (idx: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[idx] = value;
    setDigits(next);
    if (value && idx < 3) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) refs.current[idx - 1]?.focus();
  };

  const handleSave = async () => {
    const full = digits.join("");
    if (full.length !== 4) return;
    const hash = await hashPin(full);
    saveParentPinHash(hash);
    if (profile) setProfileAndCompute({ ...profile, parentPinHash: hash });
    setHasPinState(true);
    setEditing(false);
    setDigits(["", "", "", ""]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleRemove = () => {
    clearParentPin();
    if (profile) {
      const next = { ...profile };
      delete next.parentPinHash;
      setProfileAndCompute(next);
    }
    setHasPinState(false);
    setEditing(false);
  };

  return (
    <div style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>🔑</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Parent PIN</span>
        </div>
        {hasPinState && !editing && <span style={{ fontSize: 12, fontWeight: 600, color: "#22c55e" }}>Active</span>}
      </div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 10px", lineHeight: 1.4 }}>
        {hasPinState ? "Parents can view progress at /parent using this PIN." : "Set a 4-digit PIN for parent access."}
      </p>
      {saved && <p style={{ fontSize: 12, color: "#22c55e", fontWeight: 700, margin: "0 0 8px" }}>PIN saved!</p>}
      {editing ? (
        <div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
            {digits.map((d, i) => (
              <input key={i} ref={(el) => { refs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1}
                value={d} onChange={(e) => handleDigit(i, e.target.value)} onKeyDown={(e) => handleKeyDown(i, e)}
                style={{
                  width: 44, height: 48, textAlign: "center", fontSize: 22, fontWeight: 800,
                  borderRadius: 10, border: "2px solid var(--bg-card-border)",
                  background: "var(--bg-card-border)", color: "var(--text)", outline: "none",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={handleSave} disabled={digits.join("").length !== 4} style={{
              flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer",
              background: digits.join("").length === 4 ? "#22c55e" : "var(--bg-card-border)",
              color: digits.join("").length === 4 ? "#fff" : "var(--text-muted)",
              fontWeight: 700, fontSize: 13,
            }}>Save PIN</button>
            <button type="button" onClick={() => { setEditing(false); setDigits(["", "", "", ""]); }} style={{
              flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid var(--bg-card-border)",
              background: "transparent", color: "var(--text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setEditing(true)} style={{
            flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer",
            background: hasPinState ? "rgba(59,130,246,0.15)" : "#a855f7",
            color: hasPinState ? "#60a5fa" : "#fff",
            fontWeight: 700, fontSize: 13,
          }}>{hasPinState ? "Change PIN" : "Set PIN"}</button>
          {hasPinState && (
            <button type="button" onClick={handleRemove} style={{
              padding: "9px 16px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)",
              background: "rgba(239,68,68,0.06)", color: "#f87171",
              fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}>Remove</button>
          )}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [focusEnabled, setFocusEnabled] = useState(isFocusTrackingEnabled);
  const [countdownHidden, setCountdownHidden] = useState(isCountdownHidden);

  useEffect(() => {
    document.title = "Settings — LazyTopper";
  }, []);

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "0 0 100px" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "var(--bg)", padding: "16px 16px 12px",
        borderBottom: "1px solid var(--bg-card-border)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <button type="button" onClick={() => navigate("/profile")} style={{
          width: 36, height: 36, borderRadius: 10, border: "none",
          background: "var(--bg-card-border)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, color: "var(--text)",
        }}>←</button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--text)" }}>Settings</h1>
      </div>

      <div style={{ padding: "12px 16px 0" }}>

        <SectionHeader title="Appearance & Study" />
        <SettingsCard>
          <AppearanceSection />
          <StudyModeSection />
          <PaceProfileSection />
        </SettingsCard>

        <SectionHeader title="Dashboard" />
        <SettingsCard>
          <SettingRow label="Hide Exam Countdown" desc="Hide the days-left timer from Dashboard">
            <ToggleSwitch on={countdownHidden} onToggle={() => {
              const next = !countdownHidden;
              try { localStorage.setItem(COUNTDOWN_KEY, next ? "1" : "0"); } catch {}
              setCountdownHidden(next);
            }} />
          </SettingRow>
          <SettingRow label="Focus Tracking" desc="Track active vs idle study time">
            <ToggleSwitch on={focusEnabled} onToggle={() => {
              const next = !focusEnabled;
              setFocusTrackingEnabled(next);
              setFocusEnabled(next);
            }} />
          </SettingRow>
        </SettingsCard>

        <SectionHeader title="Family" />
        <SettingsCard>
          <ParentPinSection />
        </SettingsCard>

        <SectionHeader title="Resources" />
        <SettingsCard>
          <button type="button" onClick={() => navigate("/night-before")} style={{
            width: "100%", padding: "14px 16px", background: "transparent", border: "none",
            display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
            borderBottom: "1px solid var(--bg-card-border)",
          }}>
            <span style={{ fontSize: 20 }}>🌙</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#22c55e" }}>Night Before Exam</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Key formulas, predicted questions & tips</div>
            </div>
            <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 16 }}>›</span>
          </button>
          <button type="button" onClick={() => navigate("/weekly-digest")} style={{
            width: "100%", padding: "14px 16px", background: "transparent", border: "none",
            display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
            borderBottom: "1px solid var(--bg-card-border)",
          }}>
            <span style={{ fontSize: 20 }}>📊</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1cb0f6" }}>Weekly Progress Digest</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>View and share your weekly summary</div>
            </div>
            <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 16 }}>›</span>
          </button>
          <div style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Feeling overwhelmed?</div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.5 }}>
              Board exams can be stressful — it's okay to ask for help.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <a href="tel:9152987821" style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)",
                borderRadius: 10, textDecoration: "none",
              }}>
                <span style={{ fontSize: 18 }}>📞</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa" }}>iCall — TISS</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>9152987821 · Mon–Sat 8am–10pm</div>
                </div>
              </a>
              <a href="tel:18602662345" style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)",
                borderRadius: 10, textDecoration: "none",
              }}>
                <span style={{ fontSize: 18 }}>💜</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#c084fc" }}>Vandrevala Foundation</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>1860-2662-345 · 24/7</div>
                </div>
              </a>
            </div>
          </div>
        </SettingsCard>

        <SectionHeader title="Account" />
        <SettingsCard>
          <button type="button" onClick={() => navigate("/parent-dashboard")} style={{
            width: "100%", padding: "14px 16px", background: "transparent", border: "none",
            display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
            borderBottom: "1px solid var(--bg-card-border)",
          }}>
            <span style={{ fontSize: 20 }}>👪</span>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", textAlign: "left" }}>Share Progress Report</div>
            <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 16 }}>›</span>
          </button>
          {user && (
            <button type="button" onClick={async () => {
              try { resetAllStudentData(); await logout(); } catch {}
              window.location.href = import.meta.env.BASE_URL + "login";
            }} style={{
              width: "100%", padding: "14px 16px", background: "transparent", border: "none",
              display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
            }}>
              <span style={{ fontSize: 20 }}>🚪</span>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#f87171", textAlign: "left" }}>Log out</div>
            </button>
          )}
        </SettingsCard>

        <div style={{ padding: "8px 0 16px", textAlign: "center", fontSize: 11, color: "var(--text-muted)" }}>
          LazyTopper · CBSE Class 10 Board Prep
        </div>
      </div>
    </div>
  );
}
