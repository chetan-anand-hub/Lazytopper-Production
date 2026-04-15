import { useState, useRef, useEffect } from "react";
import { loadParentPinHash, verifyPin, hasParentPin } from "../services/parentPinService";
import ParentDashboardPage from "./ParentDashboardPage";

const LOCKOUT_KEY = "lazytopper.parentPin.lockout";
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000;

function getLockoutState(): { locked: boolean; attemptsLeft: number; unlockAt: number } {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    if (!raw) return { locked: false, attemptsLeft: MAX_ATTEMPTS, unlockAt: 0 };
    const data = JSON.parse(raw);
    if (data.lockedUntil && Date.now() < data.lockedUntil) {
      return { locked: true, attemptsLeft: 0, unlockAt: data.lockedUntil };
    }
    if (data.lockedUntil && Date.now() >= data.lockedUntil) {
      localStorage.removeItem(LOCKOUT_KEY);
      return { locked: false, attemptsLeft: MAX_ATTEMPTS, unlockAt: 0 };
    }
    return { locked: false, attemptsLeft: MAX_ATTEMPTS - (data.failures || 0), unlockAt: 0 };
  } catch { return { locked: false, attemptsLeft: MAX_ATTEMPTS, unlockAt: 0 }; }
}

function recordFailedAttempt(): { locked: boolean; attemptsLeft: number } {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    const data = raw ? JSON.parse(raw) : { failures: 0 };
    data.failures = (data.failures || 0) + 1;
    if (data.failures >= MAX_ATTEMPTS) {
      data.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      localStorage.setItem(LOCKOUT_KEY, JSON.stringify(data));
      return { locked: true, attemptsLeft: 0 };
    }
    localStorage.setItem(LOCKOUT_KEY, JSON.stringify(data));
    return { locked: false, attemptsLeft: MAX_ATTEMPTS - data.failures };
  } catch { return { locked: false, attemptsLeft: MAX_ATTEMPTS }; }
}

function clearLockout(): void {
  try { localStorage.removeItem(LOCKOUT_KEY); } catch {}
}

export default function ParentAccessPage() {
  const [pin, setPin] = useState(["", "", "", ""]);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [noPinSet, setNoPinSet] = useState(false);
  const [lockout, setLockout] = useState(getLockoutState);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!hasParentPin()) {
      setNoPinSet(true);
    }
  }, []);

  useEffect(() => {
    if (!lockout.locked) return;
    const interval = setInterval(() => {
      const state = getLockoutState();
      if (!state.locked) {
        setLockout(state);
        setError("");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockout.locked]);

  const handleDigit = (idx: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    if (lockout.locked) return;
    const next = [...pin];
    next[idx] = value;
    setPin(next);
    setError("");
    if (value && idx < 3) {
      inputRefs.current[idx + 1]?.focus();
    }
    if (next.every(d => d.length === 1)) {
      const fullPin = next.join("");
      const hash = loadParentPinHash();
      if (hash) {
        void verifyPin(fullPin, hash).then(ok => {
          if (ok) {
            clearLockout();
            setVerified(true);
          } else {
            const result = recordFailedAttempt();
            if (result.locked) {
              setError("Too many incorrect attempts. Locked for 5 minutes.");
              setLockout({ locked: true, attemptsLeft: 0, unlockAt: Date.now() + LOCKOUT_DURATION_MS });
            } else {
              setError(`Incorrect PIN. ${result.attemptsLeft} attempts remaining.`);
            }
            setPin(["", "", "", ""]);
            inputRefs.current[0]?.focus();
          }
        });
      }
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  if (noPinSet) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 400, padding: "32px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: "0 0 12px", fontFamily: "'Space Grotesk', sans-serif" }}>
            Parent Access Not Set Up
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
            Your child needs to set a Parent PIN in the app first. Ask them to set it up in their Profile settings.
          </p>
        </div>
      </div>
    );
  }

  if (!verified) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 400, padding: "32px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👨‍👩‍👧</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: "0 0 8px", fontFamily: "'Space Grotesk', sans-serif" }}>
            Parent Access
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 28px", lineHeight: 1.5 }}>
            Enter the 4-digit PIN set by your child
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 16 }}>
            {pin.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { inputRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigit(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                disabled={lockout.locked}
                style={{
                  width: 56, height: 64, textAlign: "center", fontSize: 28, fontWeight: 800,
                  borderRadius: 14, border: error ? "2px solid #ef4444" : "2px solid var(--text-muted)",
                  background: "var(--bg-card)", color: "var(--text)", outline: "none",
                  fontFamily: "'Space Grotesk', sans-serif",
                  opacity: lockout.locked ? 0.4 : 1,
                }}
              />
            ))}
          </div>
          {error && <p style={{ fontSize: 13, color: "#ef4444", fontWeight: 600 }}>{error}</p>}
        </div>
      </div>
    );
  }

  return <ParentDashboardPage />;
}
