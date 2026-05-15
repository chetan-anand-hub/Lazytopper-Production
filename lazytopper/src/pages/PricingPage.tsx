import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ReturnContextBar from "../components/ux/ReturnContextBar";

const WAITLIST_KEY = "lazytopper.waitlist.v1";

interface WaitlistEntry {
  contact: string;
  board: string;
  ts: string;
}

function saveWaitlistEntry(entry: WaitlistEntry): void {
  try {
    const raw = localStorage.getItem(WAITLIST_KEY);
    const list: WaitlistEntry[] = raw ? JSON.parse(raw) : [];
    list.push(entry);
    localStorage.setItem(WAITLIST_KEY, JSON.stringify(list));
  } catch {}
}

const FREE_FEATURES = [
  { label: "Browse Home, Exam Trends, and topic surfaces", included: true },
  { label: "Practice picker and limited practice", included: true },
  { label: "Limited worksheet generation", included: true },
  { label: "Basic topic insights", included: true },
  { label: "Solution Checker / Check & Improve", included: false },
  { label: "Deep Mistake Intelligence", included: false },
  { label: "Full mocks and predicted-question execution", included: false },
  { label: "Richer Me / Progress recommendations", included: false },
];

const PREMIUM_FEATURES = [
  { label: "Everything in Basic", included: true },
  { label: "Solution Checker / Check & Improve access", included: true },
  { label: "Mistake Intelligence from checked evidence", included: true },
  { label: "Full mocks and predicted-question execution", included: true },
  { label: "Richer Me / Progress recommendations", included: true },
  { label: "Stronger practice and worksheet quotas", included: true },
];

const BOARDS_COMING = [
  { name: "ICSE Board", icon: "🏛️" },
  { name: "State Boards", icon: "🗺️" },
  { name: "Class 12 CBSE", icon: "🎓" },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const [waitlistContact, setWaitlistContact] = useState("");
  const [waitlistBoard, setWaitlistBoard] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);

  const handleStartTrial = () => {
    navigate(`/login?reason=start-trial&redirect=${encodeURIComponent("/pricing")}`);
  };

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistContact.trim()) return;
    saveWaitlistEntry({
      contact: waitlistContact.trim(),
      board: waitlistBoard || "not specified",
      ts: new Date().toISOString(),
    });
    setWaitlistSubmitted(true);
    setWaitlistContact("");
    setWaitlistBoard("");
  };

  return (
    <div className="dark-page">
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px 16px 100px" }}>
        <ReturnContextBar backTo="/" backLabel="Back to home" />

        <div style={{ textAlign: "center", marginTop: 24, marginBottom: 32 }}>
          <h1 className="font-display" style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--text)", marginBottom: 8 }}>
            Simple, Student-Friendly Plans
          </h1>
          <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", maxWidth: 500, margin: "0 auto" }}>
            Browse first, sign in for a 7-day trial, and choose Premium when
            you need checked answers, deeper Mistake Intelligence, and full
            mock workflows. Payment checkout is not automated in this build.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginBottom: 40 }}>

          <div style={{
            borderRadius: 20, padding: "28px 24px",
            background: "var(--bg-card)",
            border: "1px solid var(--bg-card-border)",
          }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
              Basic
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: "2.5rem", fontWeight: 900, color: "var(--text)" }}>₹0</span>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>/forever</span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 20 }}>
              Browse the product and use limited learning tools without paid access.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {FREE_FEATURES.map(f => (
                <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem" }}>
                  <span style={{ color: f.included ? "#22c55e" : "var(--text-muted)", fontSize: "0.9rem" }}>
                    {f.included ? "✓" : "—"}
                  </span>
                  <span style={{ color: f.included ? "var(--text)" : "var(--text-muted)" }}>
                    {f.label}
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate("/login")}
              style={{
                width: "100%", marginTop: 24, padding: "12px", borderRadius: 12,
                background: "var(--bg-card)", border: "1px solid var(--bg-card-border)",
                color: "var(--text)", fontWeight: 800, fontSize: "0.88rem",
                cursor: "pointer",
              }}
            >
              Start free
            </button>
          </div>

          <div style={{
            borderRadius: 20, padding: "28px 24px",
            background: "linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(59,130,246,0.06) 100%)",
            border: "2px solid rgba(34,197,94,0.3)",
            position: "relative",
          }}>
            <div style={{
              position: "absolute", top: -12, right: 20,
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              color: "var(--text)", fontWeight: 800, fontSize: "0.7rem",
              padding: "4px 12px", borderRadius: 999,
              textTransform: "uppercase", letterSpacing: 0.5,
            }}>
              Premium
            </div>
            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#22c55e", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
              Premium
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: "2.5rem", fontWeight: 900, color: "var(--text)" }}>Manual</span>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}> activation</span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 20 }}>
              Premium access is activated manually until checkout is connected.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PREMIUM_FEATURES.map(f => (
                <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem" }}>
                  <span style={{ color: "#22c55e", fontSize: "0.9rem" }}>✓</span>
                  <span style={{ color: "var(--text)" }}>{f.label}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleStartTrial}
              style={{
                width: "100%", marginTop: 24, padding: "12px", borderRadius: 12,
                background: "#22c55e", border: "none", borderBottom: "3px solid #16a34a",
                color: "var(--text)", fontWeight: 800, fontSize: "0.88rem",
                cursor: "pointer",
              }}
            >
              Start trial / request activation
            </button>
            <p style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 8 }}>
              No credit card required for the trial. Premium is not activated automatically.
            </p>
          </div>
        </div>

        <div style={{
          borderRadius: 20, padding: "28px 24px", marginBottom: 32,
          background: "var(--bg-card)",
          border: "1px solid var(--bg-card-border)",
          textAlign: "center",
        }}>
          <h2 className="font-display" style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>
            Frequently Asked Questions
          </h2>
          <div style={{ textAlign: "left", maxWidth: 600, margin: "16px auto 0", display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { q: "Is Basic really free?", a: "Yes. Basic keeps browse-first access and limited practice tools available without paid activation." },
              { q: "What happens after the trial ends?", a: "You keep using the free plan. Nothing is charged automatically; you choose when to upgrade." },
              { q: "Can I pay here?", a: "Not yet. Payment checkout is not connected in this build, so Premium activation stays manual." },
              { q: "Is this only for CBSE Class 10?", a: "Currently yes. We're expanding to ICSE, State Boards, and Class 12 soon!" },
            ].map(faq => (
              <div key={faq.q} style={{
                padding: "12px 16px", borderRadius: 12,
                background: "var(--bg-card)", border: "1px solid var(--bg-card-border)",
              }}>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text)", marginBottom: 4 }}>{faq.q}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{faq.a}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          borderRadius: 20, padding: "28px 24px",
          background: "linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(59,130,246,0.06) 100%)",
          border: "1px solid rgba(168,85,247,0.15)",
        }}>
          <h2 className="font-display" style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text)", marginBottom: 6, textAlign: "center" }}>
            Coming Soon
          </h2>
          <p style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 20 }}>
            We're expanding to more boards and classes. Join the waitlist to get early access.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
            {BOARDS_COMING.map(b => (
              <div key={b.name} style={{
                padding: "10px 16px", borderRadius: 12,
                background: "var(--bg-card)", border: "1px solid var(--bg-card-border)",
                fontSize: "0.85rem", color: "var(--text)", fontWeight: 600,
              }}>
                {b.icon} {b.name}
              </div>
            ))}
          </div>
          {waitlistSubmitted ? (
            <div style={{
              textAlign: "center", padding: "16px", borderRadius: 12,
              background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
            }}>
              <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>🎉</div>
              <div style={{ fontWeight: 700, color: "#22c55e", fontSize: "0.88rem" }}>You're on the waitlist!</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>We'll notify you when we launch.</div>
            </div>
          ) : (
            <form onSubmit={handleWaitlistSubmit} style={{ display: "flex", gap: 8, maxWidth: 500, margin: "0 auto", flexWrap: "wrap" }}>
              <input
                type="text"
                value={waitlistContact}
                onChange={e => setWaitlistContact(e.target.value)}
                placeholder="Email or phone number"
                style={{
                  flex: "1 1 200px", padding: "10px 14px", borderRadius: 10,
                  background: "var(--bg-card)", border: "1px solid var(--bg-card-border)",
                  color: "var(--text)", fontSize: "0.85rem", outline: "none",
                }}
              />
              <select
                value={waitlistBoard}
                onChange={e => setWaitlistBoard(e.target.value)}
                style={{
                  flex: "0 1 140px", padding: "10px 10px", borderRadius: 10,
                  background: "var(--bg-card)", border: "1px solid var(--bg-card-border)",
                  color: waitlistBoard ? "#fff" : "var(--text-muted)", fontSize: "0.82rem", outline: "none",
                }}
              >
                <option value="">Board...</option>
                <option value="icse">ICSE</option>
                <option value="state">State Board</option>
                <option value="cbse12">CBSE Class 12</option>
              </select>
              <button
                type="submit"
                style={{
                  flex: "0 0 auto", padding: "10px 20px", borderRadius: 10,
                  background: "#a855f7", border: "none", borderBottom: "2px solid #7c3aed",
                  color: "var(--text)", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer",
                }}
              >
                Join Waitlist
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
