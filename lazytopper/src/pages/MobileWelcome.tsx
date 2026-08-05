import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";

/**
 * MobileWelcome — the mobile (<1024px) public landing for `/welcome`.
 *
 * Per-platform counterpart to the (untouched) desktop `Welcome`. The `/welcome`
 * route branches `isDesktop ? <Welcome/> : <MobileWelcome/>`; signed-out mobile
 * users are redirected here. `/welcome` is full-bleed (not shell-wrapped, BottomNav
 * hidden), so this draws its own minimal top bar.
 *
 * CTAs match the desktop landing EXACTLY (verified in Welcome.tsx):
 *   - Explore / "Start free" → navigate(user ? "/" : "/browse")  (no login gate)
 *   - Sign in                → navigate("/login?reason=login&redirect=%2F")
 *
 * The landing's only job is to get the visitor to /browse; the reason-coded login
 * gate already exists downstream. Trial copy is honest: Basic is always free, a
 * 7-day Premium trial, then free Basic — never "then paid".
 *
 * The four cards are PRESENTATIONAL (not entry points) and use the owner-frozen v4
 * illustrations verbatim. The carousel is native CSS scroll-snap (no gesture lib).
 */

const SIGN_IN_URL = "/login?reason=login&redirect=%2F";

type Slide = {
  num: string;
  title: string;
  tag: string;
  art: React.ReactNode;
};

// ── FROZEN v4 CARD ART (verbatim — do not restyle) ──────────────
const ArtTrends = (
  <svg viewBox="0 0 192 170" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="hsl(152,55%,52%)"/><stop offset="1" stopColor="hsl(152,60%,32%)"/>
    </linearGradient></defs>
    <rect width="192" height="170" fill="url(#g1)"/>
    <g opacity=".18" stroke="#fff" strokeWidth="1">
      <line x1="20" y1="135" x2="172" y2="135"/><line x1="20" y1="100" x2="172" y2="100"/><line x1="20" y1="65" x2="172" y2="65"/>
    </g>
    <g fill="#fff" opacity=".95">
      <rect x="34" y="100" width="20" height="35" rx="3"/><rect x="64" y="80" width="20" height="55" rx="3"/>
      <rect x="94" y="58" width="20" height="77" rx="3"/><rect x="124" y="34" width="20" height="101" rx="3"/>
    </g>
    <path d="M40 112 L74 92 L104 70 L138 44" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"/>
    <path d="M128 40 L140 42 L138 54" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="138" cy="44" r="5" fill="#fff"/>
  </svg>
);

const ArtPredicted = (
  <svg viewBox="0 0 192 170" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="hsl(280,65%,64%)"/><stop offset="1" stopColor="hsl(262,58%,40%)"/></linearGradient>
      <radialGradient id="orb" cx=".4" cy=".35">
        <stop offset="0" stopColor="#fff" stopOpacity=".9"/><stop offset="1" stopColor="#fff" stopOpacity=".25"/></radialGradient>
    </defs>
    <rect width="192" height="170" fill="url(#g2)"/>
    <g opacity=".5" fill="#fff"><circle cx="40" cy="40" r="2"/><circle cx="150" cy="55" r="2.5"/><circle cx="160" cy="120" r="2"/><circle cx="30" cy="120" r="1.6"/></g>
    <circle cx="96" cy="82" r="42" fill="url(#orb)"/>
    <circle cx="96" cy="82" r="42" fill="none" stroke="#fff" strokeWidth="2" opacity=".8"/>
    <text x="96" y="95" fontFamily="Georgia,serif" fontSize="40" fontWeight="700" fill="hsl(262,58%,42%)" textAnchor="middle">?</text>
    <ellipse cx="96" cy="132" rx="46" ry="9" fill="#fff" opacity=".35"/>
    <text x="150" y="44" fontFamily="Georgia,serif" fontSize="20" fontWeight="700" fill="#fff" opacity=".85" textAnchor="middle">?</text>
    <text x="42" y="70" fontFamily="Georgia,serif" fontSize="15" fontWeight="700" fill="#fff" opacity=".7" textAnchor="middle">?</text>
  </svg>
);

const ArtCheck = (
  <svg viewBox="0 0 192 170" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="g3" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="hsl(30,92%,60%)"/><stop offset="1" stopColor="hsl(18,80%,42%)"/></linearGradient></defs>
    <rect width="192" height="170" fill="url(#g3)"/>
    <g transform="rotate(-8 70 90)">
      <rect x="34" y="44" width="74" height="92" rx="5" fill="#fff"/>
      <line x1="44" y1="62" x2="98" y2="62" stroke="#d9c3a8" strokeWidth="3" strokeLinecap="round"/>
      <line x1="44" y1="76" x2="92" y2="76" stroke="#d9c3a8" strokeWidth="3" strokeLinecap="round"/>
      <line x1="44" y1="90" x2="98" y2="90" stroke="#d9c3a8" strokeWidth="3" strokeLinecap="round"/>
      <line x1="44" y1="104" x2="82" y2="104" stroke="#d9c3a8" strokeWidth="3" strokeLinecap="round"/>
    </g>
    <rect x="104" y="52" width="58" height="98" rx="11" fill="hsl(222,55%,16%)" stroke="#fff" strokeWidth="2"/>
    <rect x="111" y="62" width="44" height="66" rx="5" fill="hsl(30,92%,72%)" opacity=".5"/>
    <circle cx="133" cy="138" r="4" fill="#fff" opacity=".8"/>
    <circle cx="150" cy="60" r="16" fill="hsl(152,55%,45%)" stroke="#fff" strokeWidth="2.5"/>
    <path d="M143 60 l5 5 l9 -10" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ArtMistake = (
  <svg viewBox="0 0 192 170" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="g4" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="hsl(214,80%,60%)"/><stop offset="1" stopColor="hsl(222,55%,28%)"/></linearGradient></defs>
    <rect width="192" height="170" fill="url(#g4)"/>
    <g transform="translate(60 30)" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity=".95">
      <path d="M34 8 C20 4 8 14 10 28 C2 34 4 50 16 52 C18 64 36 64 38 52 L38 10 C38 4 40 6 34 8Z"/>
      <path d="M38 8 C52 4 64 14 62 28 C70 34 68 50 56 52 C54 64 40 64 38 52"/>
      <path d="M24 24 q8 4 0 10 M48 24 q-8 4 0 10" strokeWidth="2.2"/>
    </g>
    <path d="M28 138 L70 126 L104 104 L150 64" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"/>
    <g stroke="hsl(0,75%,68%)" strokeWidth="3" strokeLinecap="round"><path d="M25 135 l6 6 M31 135 l-6 6"/></g>
    <path d="M150 56 l3.2 6.6 l7.2 1 l-5.2 5.1 l1.2 7.2 l-6.4 -3.4 l-6.4 3.4 l1.2 -7.2 l-5.2 -5.1 l7.2 -1 Z" fill="#fff"/>
  </svg>
);

const SLIDES: Slide[] = [
  { num: "01", title: "Exam Trends", tag: "What scores most", art: ArtTrends },
  { num: "02", title: "Predicted Questions", tag: "Likely in 2027", art: ArtPredicted },
  { num: "03", title: "Check & Improve", tag: "Photo → graded", art: ArtCheck },
  { num: "04", title: "Mistake Intelligence", tag: "Mistakes → mastery", art: ArtMistake },
];

const CSS = `
.lt-welcome {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: hsl(210, 40%, 98%);
  color: hsl(220, 25%, 12%);
  font-family: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
}
.lt-welcome-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
}
.lt-welcome-brand {
  font-family: "Fraunces", Georgia, serif;
  font-size: 18px;
  font-weight: 700;
  color: hsl(222, 47%, 18%);
}
.lt-welcome-signin {
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  border: 1px solid hsl(220, 18%, 88%);
  border-radius: 999px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 600;
  color: hsl(220, 25%, 22%);
  cursor: pointer;
}
.lt-welcome-hook {
  padding: 8px 20px 4px;
}
.lt-welcome-hook h1 {
  margin: 0;
  font-family: "Fraunces", Georgia, serif;
  font-size: 27px;
  line-height: 1.18;
  font-weight: 600;
  color: hsl(220, 30%, 12%);
}
.lt-welcome-hook h1 b { color: hsl(152, 60%, 32%); font-weight: 700; }
.lt-welcome-hook p {
  margin: 8px 0 0;
  font-size: 13.5px;
  color: hsl(220, 15%, 42%);
}
.lt-welcome-rail {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  padding: 18px 20px 6px;
  scrollbar-width: none;
}
.lt-welcome-rail::-webkit-scrollbar { display: none; }
.lt-welcome-slide {
  flex: 0 0 clamp(228px, 76vw, 300px);
  scroll-snap-align: center;
  background: #fff;
  border: 1px solid hsl(220, 18%, 90%);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 8px 24px -16px hsla(222, 40%, 20%, 0.25);
}
.lt-welcome-art {
  position: relative;
  width: 100%;
  height: 170px;
}
.lt-welcome-art svg { width: 100%; height: 100%; display: block; }
.lt-welcome-num {
  position: absolute;
  top: 10px;
  left: 12px;
  font-family: "Fraunces", Georgia, serif;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.04em;
}
.lt-welcome-foot { padding: 13px 15px 15px; }
.lt-welcome-foot h3 {
  margin: 0;
  font-family: "Fraunces", Georgia, serif;
  font-size: 17px;
  font-weight: 600;
  color: hsl(220, 30%, 12%);
}
.lt-welcome-tag {
  margin-top: 3px;
  font-size: 11.5px;
  font-weight: 600;
  color: hsl(220, 15%, 45%);
}
.lt-welcome-dots {
  display: flex;
  justify-content: center;
  gap: 7px;
  padding: 10px 0 4px;
}
.lt-welcome-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  border: none;
  padding: 0;
  background: hsl(220, 16%, 80%);
  cursor: pointer;
  transition: background 0.18s, width 0.18s;
}
.lt-welcome-dot.is-active { background: hsl(152, 55%, 45%); width: 18px; }
.lt-welcome-cta {
  margin-top: auto;
  position: sticky;
  bottom: 0;
  padding: 14px 20px calc(16px + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, hsla(210,40%,98%,0) 0%, hsl(210,40%,98%) 22%);
}
.lt-welcome-start {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  border: none;
  border-radius: 14px;
  padding: 15px 18px;
  background: hsl(152, 55%, 45%);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}
.lt-welcome-sub {
  margin: 9px 0 0;
  text-align: center;
  font-size: 12px;
  color: hsl(220, 15%, 45%);
}
.lt-welcome-member {
  margin: 8px 0 0;
  text-align: center;
  font-size: 12.5px;
  color: hsl(220, 15%, 42%);
}
.lt-welcome-member button {
  appearance: none;
  -webkit-appearance: none;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  font-weight: 700;
  color: hsl(152, 60%, 32%);
  text-decoration: underline;
  cursor: pointer;
}
`;

export default function MobileWelcome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const railRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  // Same explore behavior as the desktop landing — no login gate.
  const onExplore = () => {
    navigate(user ? "/" : "/browse");
  };
  const onSignIn = () => navigate(SIGN_IN_URL);

  // Track the centered slide for the dot indicator (no gesture lib).
  const onRailScroll = () => {
    const rail = railRef.current;
    if (!rail) return;
    const slideWidth = rail.scrollWidth / SLIDES.length;
    const idx = Math.round(rail.scrollLeft / slideWidth);
    setActive(Math.max(0, Math.min(SLIDES.length - 1, idx)));
  };

  const goToSlide = (i: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const slideWidth = rail.scrollWidth / SLIDES.length;
    rail.scrollTo({ left: slideWidth * i, behavior: "smooth" });
    setActive(i);
  };

  return (
    <main className="lt-welcome" aria-label="LazyTopper landing">
      <style>{CSS}</style>

      <header className="lt-welcome-topbar">
        <span className="lt-welcome-brand">LazyTopper</span>
        <button type="button" className="lt-welcome-signin" onClick={onSignIn}>
          Sign in
        </button>
      </header>

      <div className="lt-welcome-hook">
        <h1>
          Study smarter for <b>CBSE Class 10</b>
        </h1>
        <p>Swipe to see what you get →</p>
      </div>

      <div
        className="lt-welcome-rail"
        ref={railRef}
        onScroll={onRailScroll}
        aria-label="What you get"
      >
        {SLIDES.map((s) => (
          <article className="lt-welcome-slide" key={s.num}>
            <div className="lt-welcome-art">
              <span className="lt-welcome-num">{s.num}</span>
              {s.art}
            </div>
            <div className="lt-welcome-foot">
              <h3>{s.title}</h3>
              <div className="lt-welcome-tag">{s.tag}</div>
            </div>
          </article>
        ))}
      </div>

      <div className="lt-welcome-dots" role="tablist" aria-label="Slide indicator">
        {SLIDES.map((s, i) => (
          <button
            key={s.num}
            type="button"
            className={i === active ? "lt-welcome-dot is-active" : "lt-welcome-dot"}
            aria-label={`Go to ${s.title}`}
            aria-selected={i === active}
            onClick={() => goToSlide(i)}
          />
        ))}
      </div>

      <div className="lt-welcome-cta">
        <button type="button" className="lt-welcome-start" onClick={onExplore}>
          Start free
        </button>
        <p className="lt-welcome-sub">
          7-day Premium trial — then free Basic, upgrade anytime.
        </p>
        <p className="lt-welcome-member">
          Already a member?{" "}
          <button type="button" onClick={onSignIn}>
            Sign in
          </button>
        </p>
      </div>

      {/* [FU-LEGAL-FOOTER-LINK] — the mobile public landing carries no app chrome
          (isPublicLandingRoute suppresses the global navbar), so this row is the
          only route from the landing to the policies. */}
      <PublicLegalFooter />
    </main>
  );
}
