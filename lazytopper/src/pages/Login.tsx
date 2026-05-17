import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { SignIn } from "@clerk/react";
import { useAuth } from "../context/AuthContext";
import { trackUxEvent } from "../services/uxTelemetry";
import { getLoginPrompt } from "../lib/desktop/loginPrompts";

type LocationState = { from?: string };

function isSafeInternalPath(path: string | null | undefined): path is string {
  if (!path) return false;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) return false;
  if (trimmed.startsWith("//")) return false;
  if (trimmed.startsWith("/\\")) return false;
  if (trimmed.startsWith("\\")) return false;
  if (trimmed.includes("\\")) return false;
  if (/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return false;
  return true;
}

const LOGIN_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@600;700;800&display=swap');

  .lt-login-page,
  .lt-login-page * {
    box-sizing: border-box;
  }

  html:has(.lt-login-page),
  body:has(.lt-login-page),
  #root:has(.lt-login-page),
  #root > div:has(.lt-login-page) {
    background: var(--lt-login-bg);
  }

  #root > div:has(.lt-login-page) {
    padding-bottom: 0 !important;
  }

  #root:has(.lt-login-page) > div[style*="position: fixed"][style*="bottom: 0px"] {
    display: none !important;
  }

  .lt-login-page {
    --lt-navy: #071a3d;
    --lt-navy-2: #092858;
    --lt-green: #16b96a;
    --lt-green-dark: #0b8f50;
    --lt-ink: #071a3d;
    --lt-muted: #49627f;
    --lt-soft: #f6fbff;
    --lt-line: rgba(7, 26, 61, 0.12);
    --lt-card: rgba(255, 255, 255, 0.94);
    --lt-login-bg: #f7fbff;

    min-height: 100vh;
    width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(460px, 0.95fr);
    overflow-x: hidden;
    color: var(--lt-ink);
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background:
      radial-gradient(circle at 71% 21%, rgba(22, 185, 106, 0.12) 0, rgba(22, 185, 106, 0) 24%),
      radial-gradient(circle at 18% 26%, rgba(125, 220, 255, 0.20) 0, rgba(125, 220, 255, 0) 23%),
      linear-gradient(180deg, #fbfdff 0%, #f6fbff 62%, #eef7ff 100%);
  }

  .lt-login-page[data-login-theme="dark"] {
    --lt-ink: #f8fafc;
    --lt-muted: #b8c6d8;
    --lt-soft: #0b203a;
    --lt-card: rgba(10, 31, 55, 0.92);
    --lt-line: rgba(255, 255, 255, 0.14);
    --lt-login-bg: #051733;
    background:
      radial-gradient(circle at 71% 21%, rgba(22, 185, 106, 0.12) 0, rgba(22, 185, 106, 0) 24%),
      linear-gradient(180deg, #071a3d 0%, #051733 100%);
  }

  .lt-login-brand-panel {
    position: relative;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 44px;
    padding: 42px 56px 36px;
    overflow: hidden;
    color: #f8fafc;
    background:
      radial-gradient(circle at 22% 24%, rgba(53, 242, 160, 0.18) 0, rgba(53, 242, 160, 0) 22%),
      radial-gradient(circle at 82% 33%, rgba(125, 220, 255, 0.18) 0, rgba(125, 220, 255, 0) 24%),
      linear-gradient(145deg, #082958 0%, #071a3d 54%, #051733 100%);
  }

  .lt-login-brand-panel:after {
    content: "";
    position: absolute;
    left: 56px;
    right: 56px;
    bottom: 118px;
    height: 1px;
    background: linear-gradient(90deg, rgba(53, 242, 160, 0), rgba(53, 242, 160, 0.55), rgba(125, 220, 255, 0));
    opacity: 0.72;
  }

  .lt-login-home-link,
  .lt-login-mobile-brand,
  .lt-login-back-link {
    text-decoration: none;
  }

  .lt-login-home-link {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    align-self: flex-start;
    color: #f8fafc;
  }

  .lt-login-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    border-radius: 12px;
    background: var(--lt-green);
    color: #06281b;
    font-weight: 900;
    box-shadow: 0 18px 38px rgba(22, 185, 106, 0.28);
  }

  .lt-login-wordmark {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: 0;
  }

  .lt-login-promise {
    position: relative;
    z-index: 1;
    max-width: 610px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .lt-login-kicker {
    display: inline-flex;
    width: fit-content;
    align-items: center;
    gap: 8px;
    min-height: 30px;
    padding: 0 12px;
    border-radius: 999px;
    color: #dffff0;
    background: rgba(22, 185, 106, 0.13);
    border: 1px solid rgba(53, 242, 160, 0.24);
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .lt-login-title {
    margin: 0;
    color: #ffffff;
    font-family: 'Fraunces', Georgia, serif;
    font-size: 3.7rem;
    line-height: 1.02;
    font-weight: 700;
    letter-spacing: 0;
    max-width: 650px;
  }

  .lt-login-lede {
    max-width: 560px;
    margin: 0;
    color: #d8e4ef;
    font-size: 1.02rem;
    line-height: 1.6;
    font-weight: 500;
  }

  .lt-login-benefits {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    max-width: 580px;
    margin-top: 8px;
  }

  .lt-login-benefit {
    min-height: 54px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.13);
    background: rgba(255, 255, 255, 0.08);
    color: #edf7ff;
    font-size: 0.84rem;
    font-weight: 800;
    line-height: 1.25;
  }

  .lt-login-benefit-dot {
    width: 10px;
    height: 10px;
    flex: 0 0 auto;
    border-radius: 999px;
    background: var(--lt-green);
    box-shadow: 0 0 0 5px rgba(22, 185, 106, 0.14);
  }

  .lt-login-loop {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    color: #adc1d5;
    font-size: 0.82rem;
    font-weight: 800;
  }

  .lt-login-loop span {
    display: inline-flex;
    min-height: 32px;
    align-items: center;
    border-radius: 999px;
    padding: 0 12px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .lt-login-loop strong {
    color: #dffff0;
    font-weight: 900;
  }

  .lt-login-auth-panel {
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 34px 48px;
  }

  .lt-login-gate {
    width: 100%;
    max-width: 470px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .lt-login-mobile-brand {
    display: none;
    align-items: center;
    gap: 10px;
    align-self: flex-start;
    color: var(--lt-ink);
  }

  .lt-login-mobile-brand-sub {
    display: block;
    margin-top: 2px;
    color: var(--lt-muted);
    font-size: 0.78rem;
    font-weight: 700;
  }

  .lt-login-prompt {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .lt-login-reason-chip {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 0 11px;
    border-radius: 999px;
    color: var(--lt-green-dark);
    background: rgba(22, 185, 106, 0.12);
    border: 1px solid rgba(22, 185, 106, 0.24);
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .lt-login-heading {
    margin: 0;
    color: var(--lt-ink);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 2rem;
    line-height: 1.15;
    font-weight: 800;
    letter-spacing: 0;
  }

  .lt-login-subcopy {
    margin: 0;
    color: var(--lt-muted);
    font-size: 0.96rem;
    line-height: 1.55;
    font-weight: 500;
  }

  .lt-login-clerk-frame {
    width: 100%;
    padding: 14px;
    border-radius: 18px;
    border: 1px solid var(--lt-line);
    background: var(--lt-card);
    box-shadow: 0 24px 80px rgba(7, 26, 61, 0.12);
    backdrop-filter: blur(18px);
  }

  .lt-login-clerk-frame > div {
    width: 100%;
  }

  .lt-login-helper {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    gap: 11px;
    align-items: start;
    padding: 13px 14px;
    border-radius: 14px;
    color: var(--lt-muted);
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid var(--lt-line);
    font-size: 0.84rem;
    line-height: 1.45;
    font-weight: 600;
  }

  .lt-login-page[data-login-theme="dark"] .lt-login-helper {
    background: rgba(255, 255, 255, 0.08);
  }

  .lt-login-helper-icon {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 9px;
    color: #06281b;
    background: #c9f4df;
    font-weight: 900;
  }

  .lt-login-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    color: var(--lt-muted);
    font-size: 0.78rem;
    font-weight: 700;
  }

  .lt-login-back-link {
    color: var(--lt-muted);
    font-weight: 800;
    white-space: nowrap;
  }

  .lt-login-terms {
    text-align: right;
    line-height: 1.35;
  }

  @media (max-width: 1180px) {
    .lt-login-page {
      grid-template-columns: minmax(0, 0.95fr) minmax(430px, 1.05fr);
    }

    .lt-login-brand-panel {
      padding: 38px 40px 34px;
    }

    .lt-login-brand-panel:after {
      left: 40px;
      right: 40px;
    }

    .lt-login-title {
      font-size: 3.05rem;
    }

    .lt-login-auth-panel {
      padding: 36px 34px;
    }
  }

  @media (min-width: 1024px) and (max-height: 820px) {
    .lt-login-brand-panel {
      gap: 28px;
      padding-top: 30px;
      padding-bottom: 26px;
    }

    .lt-login-brand-panel:after {
      bottom: 92px;
    }

    .lt-login-promise {
      gap: 13px;
    }

    .lt-login-title {
      font-size: 3rem;
    }

    .lt-login-lede {
      font-size: 0.95rem;
      line-height: 1.48;
    }

    .lt-login-benefit {
      min-height: 44px;
      padding: 8px 11px;
      font-size: 0.8rem;
    }

    .lt-login-loop span {
      min-height: 28px;
    }

    .lt-login-auth-panel {
      padding-top: 24px;
      padding-bottom: 24px;
    }

    .lt-login-gate {
      gap: 12px;
    }

    .lt-login-heading {
      font-size: 1.72rem;
    }

    .lt-login-subcopy {
      font-size: 0.9rem;
      line-height: 1.45;
    }

    .lt-login-clerk-frame {
      padding: 10px;
    }

    .lt-login-helper {
      padding: 10px 12px;
      font-size: 0.8rem;
    }
  }

  @media (max-width: 1023px) {
    .lt-login-page {
      min-height: 100svh;
      display: flex;
      align-items: stretch;
      justify-content: center;
      padding: 20px;
      background:
        radial-gradient(circle at 18% 12%, rgba(125, 220, 255, 0.22) 0, rgba(125, 220, 255, 0) 28%),
        radial-gradient(circle at 86% 20%, rgba(22, 185, 106, 0.14) 0, rgba(22, 185, 106, 0) 28%),
        linear-gradient(180deg, #fbfdff 0%, #eef7ff 100%);
    }

    .lt-login-page[data-login-theme="dark"] {
      background: linear-gradient(180deg, #071a3d 0%, #051733 100%);
    }

    .lt-login-brand-panel {
      display: none;
    }

    .lt-login-auth-panel {
      width: 100%;
      padding: 0;
      align-items: center;
    }

    .lt-login-gate {
      max-width: 500px;
      gap: 16px;
      padding: 24px;
      border-radius: 20px;
      border: 1px solid var(--lt-line);
      background: var(--lt-card);
      box-shadow: 0 22px 70px rgba(7, 26, 61, 0.13);
      backdrop-filter: blur(18px);
    }

    .lt-login-mobile-brand {
      display: inline-flex;
    }

    .lt-login-heading {
      font-size: 1.55rem;
    }

    .lt-login-subcopy {
      font-size: 0.92rem;
    }

    .lt-login-clerk-frame {
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
      backdrop-filter: none;
    }
  }

  @media (max-width: 520px) {
    .lt-login-page {
      padding: 14px;
    }

    .lt-login-gate {
      padding: 20px 16px;
      border-radius: 18px;
    }

    .lt-login-foot {
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 8px;
    }

    .lt-login-terms {
      text-align: center;
    }
  }
`;

/**
 * Login page (`/login`).
 *
 * Production responsibilities preserved:
 * - Real Clerk `<SignIn>` widget drives the auth flow.
 * - Redirect priority stays `?redirect`, `location.state.from`, then
 *   profile/onboarding fallback.
 * - The page stays standalone, without DesktopShell/sidebar chrome.
 * - No guest CTA or fake trial activation is exposed from Login.
 */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [isLight, setIsLight] = useState(
    () => document.documentElement.getAttribute("data-theme") === "light"
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const reason = searchParams.get("reason");
  const isStartTrial = reason === "start-trial";
  const prompt = useMemo(() => getLoginPrompt(reason), [reason]);

  const nextPath = useMemo(() => {
    if (searchParams.has("redirect")) {
      const explicitRedirect = searchParams.get("redirect");
      return isSafeInternalPath(explicitRedirect) ? explicitRedirect : "/";
    }
    const st = (location.state || {}) as LocationState;
    if (st.from) return isSafeInternalPath(st.from) ? st.from : "/";
    const hasProfile =
      typeof window !== "undefined" && !!window.localStorage.getItem("lazytopper.profile.v2");
    return hasProfile ? "/dashboard" : "/onboarding";
  }, [location.state, searchParams]);

  useEffect(() => {
    trackUxEvent("login_start", "login", {
      reason: reason ?? "unspecified",
    });
  }, [reason]);

  useEffect(() => {
    if (user) {
      trackUxEvent("login_complete", "login", {
        reason: reason ?? "unspecified",
      });
      navigate(nextPath, { replace: true });
    }
  }, [user, nextPath, navigate, reason]);

  const themeVars = {
    "--lt-login-bg": isLight ? "#f7fbff" : "#051733",
  } as CSSProperties;

  const mark = (size: number, fontSize: number) => (
    <span
      className="lt-login-mark"
      style={{ width: size, height: size, fontSize }}
      aria-hidden="true"
    >
      L
    </span>
  );

  const clerkAppearance = {
    options: {
      unsafe_disableDevelopmentModeWarnings: true,
    },
    variables: {
      colorPrimary: "#071a3d",
      colorBackground: "#ffffff",
      colorText: "#071a3d",
      colorInputBackground: "#ffffff",
      colorInputText: "#071a3d",
      borderRadius: "12px",
      fontFamily: "'Inter', system-ui, sans-serif",
    },
    elements: {
      rootBox: { width: "100%" },
      cardBox: {
        width: "100%",
        background: "transparent",
        boxShadow: "none",
        border: "none",
      },
      card: {
        width: "100%",
        background: "transparent",
        boxShadow: "none",
        border: "none",
        padding: 0,
      },
      main: { background: "transparent", boxShadow: "none" },
      footer: { background: "transparent", boxShadow: "none" },
      header: { display: "none" },
      headerTitle: { display: "none" },
      headerSubtitle: { display: "none" },
      socialButtonsBlockButton: {
        minHeight: "46px",
        background: "#ffffff",
        border: "1px solid rgba(7, 26, 61, 0.14)",
        color: "#071a3d",
        borderRadius: "13px",
        fontWeight: 800,
        boxShadow: "0 8px 18px rgba(7, 26, 61, 0.06)",
      },
      formFieldInput: {
        minHeight: "44px",
        border: "1px solid rgba(7, 26, 61, 0.16)",
        borderRadius: "12px",
      },
      formButtonPrimary: {
        minHeight: "46px",
        background: "#071a3d",
        color: "#ffffff",
        fontWeight: 800,
        borderRadius: "13px",
        boxShadow: "0 16px 28px rgba(7, 26, 61, 0.20)",
      },
      footerActionLink: { color: "#071a3d", fontWeight: 800 },
      dividerLine: { background: "rgba(7, 26, 61, 0.12)" },
      dividerText: { color: "#49627f", fontWeight: 700 },
      identityPreviewEditButton: { color: "#071a3d" },
    },
  };

  return (
    <main
      className="lt-login-page"
      data-login-theme={isLight ? "light" : "dark"}
      style={themeVars}
      aria-label="LazyTopper sign in"
    >
      <style dangerouslySetInnerHTML={{ __html: LOGIN_CSS }} />

      <section className="lt-login-brand-panel" aria-label="LazyTopper exam companion">
        <Link to="/" aria-label="Back to LazyTopper home" className="lt-login-home-link">
          {mark(42, 17)}
          <span className="lt-login-wordmark">LazyTopper</span>
        </Link>

        <div className="lt-login-promise">
          <span className="lt-login-kicker">CBSE Class 10 study cockpit</span>
          <h1 className="lt-login-title">Sign in when your work needs saving.</h1>
          <p className="lt-login-lede">
            LazyTopper can keep attempts, checked answers, progress, and Mistake
            Intelligence evidence connected to your account only after real sign-in.
          </p>

          <div className="lt-login-benefits" aria-label="What sign-in protects">
            <div className="lt-login-benefit">
              <span className="lt-login-benefit-dot" />
              Saved practice attempts
            </div>
            <div className="lt-login-benefit">
              <span className="lt-login-benefit-dot" />
              Checked-answer history
            </div>
            <div className="lt-login-benefit">
              <span className="lt-login-benefit-dot" />
              Progress tied to account
            </div>
            <div className="lt-login-benefit">
              <span className="lt-login-benefit-dot" />
              Mistake Intelligence evidence
            </div>
          </div>
        </div>

        <div className="lt-login-loop" aria-label="LazyTopper product loop">
          <span>Exam Trends</span>
          <strong>to</strong>
          <span>Practice</span>
          <strong>to</strong>
          <span>Check & Improve</span>
          <strong>to</strong>
          <span>Me / Progress</span>
        </div>
      </section>

      <section className="lt-login-auth-panel" aria-label="Sign in">
        <div className="lt-login-gate">
          <Link to="/" aria-label="Back to LazyTopper home" className="lt-login-mobile-brand">
            {mark(42, 17)}
            <span>
              <span className="lt-login-wordmark">LazyTopper</span>
              <span className="lt-login-mobile-brand-sub">CBSE Class 10 Board Exam Prep</span>
            </span>
          </Link>

          <div className="lt-login-prompt">
            <span className="lt-login-reason-chip">{prompt.chip}</span>
            <h2 className="lt-login-heading">{prompt.headline}</h2>
            <p className="lt-login-subcopy">{prompt.subCopy}</p>
          </div>

          <div className="lt-login-clerk-frame">
            <SignIn
              routing="path"
              path={import.meta.env.BASE_URL + "login"}
              signUpUrl={import.meta.env.BASE_URL + "sign-up"}
              appearance={clerkAppearance}
            />
          </div>

          <div className="lt-login-helper">
            <span className="lt-login-helper-icon" aria-hidden="true">
              i
            </span>
            <span>
              Use the same Google, email, or phone account you want LazyTopper to
              remember. Sign-in is required for saved learning actions.
            </span>
          </div>

          <div className="lt-login-foot">
            <Link to="/" className="lt-login-back-link">
              {isStartTrial ? "<- Back to landing" : "<- Back to home"}
            </Link>
            <span className="lt-login-terms">By signing in, you agree to our Terms of Service</span>
          </div>
        </div>
      </section>
    </main>
  );
}
