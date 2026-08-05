import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";

const NAVY = "#071a3d";
const NAVY_2 = "#092858";
const GREEN = "#16b96a";
const GREEN_DARK = "#0b8f50";
const TEXT = "#071a3d";
const MUTED = "#49627f";
const BORDER = "rgba(7, 26, 61, 0.12)";
const CARD = "rgba(255, 255, 255, 0.92)";
const SHADOW = "0 22px 70px rgba(7, 26, 61, 0.13)";

export default function Welcome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const signInUrl = "/login?reason=login&redirect=%2F";
  const onExplore = () => {
    navigate(user ? "/" : "/browse");
  };

  return (
    <main className="lt-frozen-landing" aria-label="LazyTopper public landing">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');

            .lt-frozen-landing,
            .lt-frozen-landing * {
              box-sizing: border-box;
            }

            html:has(.lt-frozen-landing),
            body:has(.lt-frozen-landing),
            #root:has(.lt-frozen-landing),
            #root > div:has(.lt-frozen-landing) {
              background: #051733;
            }

            .lt-frozen-landing {
              min-height: 100vh;
              overflow-x: hidden;
              color: ${TEXT};
              font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background:
                radial-gradient(circle at 50% 39%, rgba(22,185,106,0.16) 0, rgba(22,185,106,0) 25%),
                radial-gradient(circle at 15% 23%, rgba(125,220,255,0.26) 0, rgba(125,220,255,0) 20%),
                radial-gradient(circle at 86% 25%, rgba(125,220,255,0.20) 0, rgba(125,220,255,0) 22%),
                linear-gradient(180deg, #fbfdff 0%, #f7fbff 56%, #0a2a55 82%, #051733 100%);
            }

            .lt-landing-viewport {
              position: relative;
              min-height: 100vh;
              padding: 24px clamp(20px, 3vw, 48px) 28px;
            }

            .lt-landing-stage {
              position: relative;
              z-index: 2;
            }

            /* [FU-LEGAL-FOOTER-LINK] — per-page contrast for PublicLegalFooter, via
               the \`className\` hook the component exposes for exactly this. Its
               default palette is tuned for a light surface; the bottom of this
               landing is #051733. MEASURED in the browser, not assumed: the default
               rest colour rgb(118,128,147) scores 4.49:1 (under AA for 12px) and the
               default hover/:focus-visible colour rgb(32,50,90) scores 1.42:1 — the
               link VISUALLY DISAPPEARS when hovered or keyboard-focused. Selectors
               are prefixed with .lt-frozen-landing to out-specify the component's own
               rules, which would otherwise win the tie on document order. */
            .lt-frozen-landing .lt-landing-legal {
              /* Opaque on purpose: an rgba() here would report as "rgba(255,255,255,.58)"
                 in getComputedStyle, so any future contrast check would measure white
                 rather than the composited pixel. #969ea9 IS the composited result. */
              color: #969ea9;
            }

            .lt-frozen-landing .lt-landing-legal a:hover,
            .lt-frozen-landing .lt-landing-legal a:focus-visible {
              color: #ffffff;
            }

            .lt-landing-viewport:after {
              content: "";
              position: absolute;
              z-index: 1;
              left: 0;
              right: 0;
              bottom: -2px;
              height: 18px;
              pointer-events: none;
              background: linear-gradient(180deg, rgba(5,23,51,0), #051733 45%, #051733 100%);
            }

            .lt-landing-viewport:before {
              content: "";
              position: absolute;
              inset: 120px 0 auto;
              height: 520px;
              pointer-events: none;
              background:
                radial-gradient(circle at 10% 50%, rgba(255,255,255,0.8) 0 2px, transparent 3px),
                radial-gradient(circle at 14% 34%, rgba(255,255,255,0.8) 0 2px, transparent 3px),
                radial-gradient(circle at 88% 40%, rgba(255,255,255,0.85) 0 2px, transparent 3px),
                radial-gradient(circle at 92% 58%, rgba(255,255,255,0.8) 0 2px, transparent 3px);
              opacity: 0.86;
            }

            .lt-landing-header {
              position: relative;
              z-index: 3;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 20px;
              max-width: 1540px;
              margin: 0 auto;
            }

            .lt-brand {
              display: inline-flex;
              align-items: center;
              gap: 12px;
              font-weight: 800;
              font-size: 25px;
              color: ${NAVY};
            }

            .lt-brand svg {
              color: ${GREEN};
            }

            .lt-signin,
            .lt-explore {
              appearance: none;
              border: 0;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              color: #fff;
              background: linear-gradient(180deg, ${NAVY_2}, ${NAVY});
              box-shadow: 0 16px 34px rgba(7, 26, 61, 0.25), inset 0 0 0 1px rgba(255,255,255,0.14);
              transition: transform 160ms ease, box-shadow 160ms ease;
            }

            .lt-signin:hover,
            .lt-explore:hover {
              transform: translateY(-1px);
              box-shadow: 0 20px 38px rgba(7, 26, 61, 0.30), inset 0 0 0 1px rgba(255,255,255,0.18);
            }

            .lt-signin {
              height: 50px;
              padding: 0 22px;
              border-radius: 13px;
              gap: 12px;
              font-size: 16px;
              font-weight: 700;
            }

            .lt-hero {
              position: relative;
              z-index: 2;
              max-width: 1540px;
              margin: 0 auto;
              text-align: center;
              padding-top: 2px;
            }

            .lt-title-wrap {
              position: relative;
              display: block;
              width: fit-content;
              max-width: 100%;
              margin: 2px auto 0;
            }

            .lt-title {
              margin: 0;
              color: ${NAVY};
              font-family: 'Fraunces', Georgia, serif;
              font-size: 56px;
              line-height: 1.02;
              letter-spacing: 0;
              font-weight: 700;
            }

            .lt-title-accent {
              position: relative;
              color: ${GREEN_DARK};
              white-space: nowrap;
            }

            .lt-title-accent:after {
              content: "";
              position: absolute;
              left: 2%;
              right: 2%;
              bottom: -5px;
              height: 8px;
              border-radius: 999px;
              background: linear-gradient(90deg, rgba(22,185,106,0), rgba(22,185,106,0.55), rgba(22,185,106,0));
            }

            .lt-head-sparkle {
              position: absolute;
              right: -44px;
              top: -4px;
              color: ${GREEN};
            }

            .lt-explore {
              margin-top: 0;
              min-width: 244px;
              height: 52px;
              border-radius: 19px;
              gap: 16px;
              font-size: 21px;
              font-weight: 800;
              box-shadow:
                0 20px 44px rgba(7, 26, 61, 0.25),
                0 0 0 5px rgba(22,185,106,0.12),
                0 0 34px rgba(22,185,106,0.38),
                inset 0 0 0 1px rgba(255,255,255,0.16);
            }

            .lt-post-card-cta {
              position: relative;
              z-index: 5;
              display: flex;
              justify-content: center;
              align-items: center;
              width: 100%;
              margin: 24px auto 0;
            }

            .lt-story {
              position: relative;
              z-index: 2;
              max-width: 1560px;
              margin: 4px auto 0;
            }

            .lt-story-bg-lines {
              position: absolute;
              inset: -56px -24px 0;
              pointer-events: none;
              opacity: 0.82;
            }

            .lt-story-rail {
              position: relative;
              z-index: 2;
              display: grid;
              grid-template-columns: minmax(210px,1fr) 42px minmax(210px,1fr) 42px minmax(210px,1fr) 42px minmax(210px,1fr);
              gap: 18px;
              align-items: start;
            }

            .lt-stage {
              display: flex;
              flex-direction: column;
              gap: 16px;
              min-width: 0;
            }

            .lt-stage-heading {
              display: flex;
              align-items: center;
              gap: 12px;
              min-height: 38px;
              padding-left: 46px;
              text-align: left;
            }

            .lt-stage-number {
              display: grid;
              place-items: center;
              width: 36px;
              height: 36px;
              border-radius: 50%;
              flex: 0 0 auto;
              background: #c9f4df;
              color: ${NAVY};
              font-weight: 800;
              font-size: 16px;
              box-shadow: 0 8px 20px rgba(22,185,106,0.18);
            }

            .lt-stage-title {
              font-family: 'Fraunces', Georgia, serif;
              font-size: 19px;
              font-weight: 700;
              line-height: 1.05;
            }

            .lt-flow-arrow {
              width: 42px;
              height: 42px;
              border-radius: 50%;
              display: grid;
              place-items: center;
              color: #fff;
              background: radial-gradient(circle at 35% 28%, #1a65d4, ${NAVY});
              box-shadow: 0 12px 24px rgba(7,26,61,0.25), 0 0 0 5px rgba(255,255,255,0.74);
              align-self: center;
              margin-top: 56px;
            }

            .lt-story-card {
              min-height: 335px;
              border-radius: 19px;
              background: ${CARD};
              border: 1px solid ${BORDER};
              box-shadow: ${SHADOW};
              padding: 17px;
              text-align: left;
              backdrop-filter: blur(16px);
            }

            .lt-card-top {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
              margin-bottom: 14px;
              font-size: 12px;
              font-weight: 800;
              color: ${NAVY};
            }

            .lt-chip {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              min-width: 22px;
              height: 22px;
              border-radius: 7px;
              background: #e8f5ff;
              color: #2361dd;
              font-weight: 800;
              font-size: 12px;
            }

            .lt-topic-row {
              display: grid;
              grid-template-columns: 24px minmax(0, 1fr) 40px;
              align-items: center;
              gap: 8px;
              margin: 8px 0;
              font-size: 12px;
              color: ${NAVY};
            }

            .lt-progress-track {
              display: block;
              height: 4px;
              border-radius: 999px;
              background: #e7edf4;
              overflow: hidden;
              margin-top: 5px;
            }

            .lt-progress-fill {
              height: 100%;
              border-radius: inherit;
            }

            .lt-mini-grid {
              display: grid;
              grid-template-columns: 38px repeat(9, 14px);
              gap: 6px;
              align-items: center;
              margin-top: 10px;
              color: #60718c;
              font-size: 10px;
            }

            .lt-dot {
              width: 14px;
              height: 14px;
              border-radius: 4px;
              background: #d9f5e7;
            }

            .lt-card-action {
              height: 38px;
              margin-top: 10px;
              border-radius: 9px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 22px;
              color: ${NAVY};
              background: #eef5ff;
              border: 1px solid #d8e4f5;
              font-weight: 800;
              font-size: 12px;
            }

            .lt-question {
              color: ${NAVY};
              font-weight: 800;
              line-height: 1.45;
              font-size: 13px;
              margin: 14px 0 10px;
            }

            .lt-option {
              min-height: 34px;
              border-radius: 9px;
              border: 1px solid #dce5ef;
              background: #fbfdff;
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 8px 10px;
              margin-top: 7px;
              color: #405270;
              font-size: 11px;
              font-weight: 600;
            }

            .lt-option.correct {
              border-color: rgba(22,185,106,0.55);
              background: rgba(22,185,106,0.08);
              color: ${NAVY};
            }

            .lt-option-letter {
              width: 22px;
              height: 22px;
              display: grid;
              place-items: center;
              border-radius: 50%;
              border: 1px solid #d5dfec;
              color: #52627d;
              font-weight: 800;
              font-size: 11px;
            }

            .lt-option.correct .lt-option-letter {
              background: ${GREEN};
              border-color: ${GREEN};
              color: #fff;
            }

            .lt-practice-footer,
            .lt-check-pill-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
            }

            .lt-practice-footer {
              height: 38px;
              margin-top: 14px;
              border-radius: 9px;
              background: #f4f8fd;
              border: 1px solid #dce5ef;
              padding: 0 12px;
              color: ${NAVY};
              font-size: 12px;
              font-weight: 800;
            }

            .lt-answer-line {
              display: grid;
              grid-template-columns: 92px minmax(0, 1fr);
              align-items: center;
              gap: 8px;
              margin-bottom: 10px;
              font-size: 12px;
              font-weight: 800;
            }

            .lt-answer-box {
              min-height: 34px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 6px 10px;
              font-size: 11px;
              font-weight: 700;
            }

            .lt-answer-box.good {
              border: 1px solid rgba(22,185,106,0.48);
              background: rgba(22,185,106,0.08);
              color: ${NAVY};
            }

            .lt-answer-box.bad {
              border: 1px solid rgba(239,68,68,0.34);
              background: rgba(239,68,68,0.06);
              color: ${NAVY};
            }

            .lt-explanation {
              display: grid;
              grid-template-columns: 78px minmax(0, 1fr);
              gap: 12px;
              padding: 10px;
              border-radius: 10px;
              border: 1px solid #dfe7f1;
              background: #fbfdff;
              color: #405270;
              font-size: 12px;
              line-height: 1.45;
            }

            .lt-lungs {
              width: 64px;
              height: 64px;
              border-radius: 18px;
              background: radial-gradient(circle at 50% 45%, #ffd5d5 0, #ffd5d5 34%, #fff2f2 35%, #fff 100%);
              display: grid;
              place-items: center;
              color: #e4667f;
            }

            .lt-wrong-list {
              margin-top: 9px;
              border-radius: 10px;
              border: 1px solid #dfe7f1;
              background: #fbfdff;
              padding: 10px 12px;
              font-size: 11px;
              color: #52627d;
              line-height: 1.45;
            }

            .lt-next-question {
              height: 36px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 18px;
              margin-top: 10px;
              background: rgba(22,185,106,0.11);
              border: 1px solid rgba(22,185,106,0.42);
              color: ${GREEN_DARK};
              font-size: 12px;
              font-weight: 800;
            }

            .lt-progress-card {
              background: linear-gradient(135deg, ${NAVY}, #04285f);
              color: #fff;
              border-radius: 12px;
              padding: 14px;
              display: grid;
              grid-template-columns: 105px minmax(0, 1fr);
              gap: 12px;
              min-height: 108px;
              box-shadow: inset 0 0 0 1px rgba(255,255,255,0.10);
            }

            .lt-ring {
              width: 86px;
              height: 86px;
              border-radius: 50%;
              display: grid;
              place-items: center;
              background:
                radial-gradient(circle at center, ${NAVY} 0 47%, transparent 48%),
                conic-gradient(${GREEN} 0 76%, rgba(255,255,255,0.24) 76% 100%);
              margin: auto;
              text-align: center;
            }

            .lt-stat-row {
              display: grid;
              grid-template-columns: 1fr 46px;
              gap: 8px;
              margin: 10px 0;
              font-size: 13px;
              font-weight: 700;
            }

            .lt-strength-grid {
              display: grid;
              grid-template-columns: repeat(4, minmax(0,1fr));
              gap: 8px;
              margin-top: 12px;
            }

            .lt-strength-tile {
              min-height: 54px;
              border-radius: 9px;
              display: grid;
              place-items: center;
              text-align: center;
              font-size: 11px;
              font-weight: 800;
            }

            .lt-chart {
              margin-top: 10px;
              height: 86px;
              border-radius: 10px;
              border: 1px solid #dfe7f1;
              background: #fbfdff;
              position: relative;
              overflow: hidden;
            }

            .lt-mi-area {
              position: relative;
              z-index: 2;
              min-height: 154px;
              margin-top: -10px;
              display: grid;
              grid-template-columns: 1fr;
              place-items: center;
              color: #fff;
            }

            .lt-connector-glow {
              position: absolute;
              left: 4%;
              right: 4%;
              top: 84px;
              height: 74px;
              pointer-events: none;
              background:
                radial-gradient(ellipse at center, rgba(22,185,106,0.40), rgba(22,185,106,0) 50%),
                linear-gradient(90deg, rgba(22,185,106,0), rgba(22,185,106,0.95), rgba(125,220,255,0.95), rgba(22,185,106,0));
              filter: blur(9px);
              opacity: 0.78;
            }

            .lt-connector-lines {
              position: absolute;
              left: 0;
              right: 0;
              top: 38px;
              height: 140px;
              pointer-events: none;
              opacity: 0.9;
            }

            .lt-mi-hub {
              position: relative;
              z-index: 3;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 12px;
            }

            .lt-brain-orbit {
              width: 86px;
              height: 86px;
              border-radius: 50%;
              display: grid;
              place-items: center;
              color: #dffff0;
              background:
                radial-gradient(circle at center, rgba(22,185,106,0.25) 0 42%, rgba(11,143,80,0.12) 43% 61%, transparent 62%),
                rgba(7,26,61,0.42);
              border: 2px solid rgba(171,255,215,0.74);
              box-shadow:
                0 0 0 12px rgba(22,185,106,0.10),
                0 0 48px rgba(22,185,106,0.78),
                inset 0 0 28px rgba(22,185,106,0.34);
            }

            .lt-mi-title {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 12px;
              color: #fff;
              font-size: 24px;
              font-weight: 800;
              white-space: nowrap;
            }

            .lt-mi-subtitle {
              margin-top: -6px;
              color: #31f294;
              font-size: 15px;
              font-weight: 800;
            }

            .lt-benefits {
              position: relative;
              z-index: 3;
              max-width: 1320px;
              margin: 0 auto;
              color: #fff;
              display: grid;
              grid-template-columns: repeat(5, minmax(0,1fr));
              align-items: center;
              gap: 22px;
              padding: 8px 0 0;
            }

            .lt-benefit {
              min-height: 68px;
              display: grid;
              grid-template-columns: 44px minmax(0,1fr);
              align-items: center;
              gap: 12px;
              position: relative;
            }

            .lt-benefit + .lt-benefit:before {
              content: "";
              position: absolute;
              left: -12px;
              height: 50px;
              width: 1px;
              background: rgba(255,255,255,0.36);
            }

            .lt-benefit-icon {
              width: 42px;
              height: 42px;
              display: grid;
              place-items: center;
              color: #fff;
            }

            .lt-benefit-text {
              font-size: 15px;
              line-height: 1.45;
              font-weight: 500;
            }

            @media (min-width: 1180px) {
              .lt-story-rail {
                grid-template-columns: repeat(4, minmax(0, 1fr));
              }

              .lt-flow-arrow {
                display: grid;
              }
            }

            @media (min-width: 1180px) {
              html,
              body,
              #root,
              #root > div {
                height: 100vh;
                height: 100svh;
                min-height: 0;
                overflow: hidden;
                background: #051733;
              }

              #root > div {
                padding-bottom: 0 !important;
              }

              .lt-frozen-landing {
                width: 100%;
                max-width: 100vw;
                height: 100vh;
                height: 100svh;
                min-height: 0;
                overflow: hidden;
                background:
                  radial-gradient(circle at 50% 34%, rgba(22,185,106,0.16) 0, rgba(22,185,106,0) 24%),
                  radial-gradient(circle at 15% 20%, rgba(125,220,255,0.24) 0, rgba(125,220,255,0) 18%),
                  radial-gradient(circle at 86% 22%, rgba(125,220,255,0.18) 0, rgba(125,220,255,0) 20%),
                  linear-gradient(180deg, #fbfdff 0%, #f8fbff 56%, #0a2a55 80%, #051733 100%);
              }

              .lt-landing-viewport {
                width: min(1600px, calc(100vw - clamp(24px, 3.2vw, 54px)));
                max-width: 100%;
                margin: 0 auto;
                height: 100%;
                min-height: 0;
                overflow: hidden;
                display: grid;
                grid-template-rows: auto auto minmax(0, 1fr) auto auto;
                gap: 0;
                padding: clamp(13px, 1.7svh, 18px) 0 clamp(12px, 1.6svh, 18px);
              }

              .lt-landing-viewport:before {
                inset: 86px 0 auto;
                height: 430px;
              }

              .lt-landing-stage {
                display: contents;
              }

              .lt-landing-header {
                width: 100%;
                min-height: 46px;
              }

              .lt-brand {
                gap: 10px;
                font-size: 22px;
              }

              .lt-brand svg {
                width: 30px;
                height: 30px;
              }

              .lt-signin {
                height: 42px;
                padding: 0 18px;
                border-radius: 12px;
                gap: 9px;
                font-size: 15px;
              }

              .lt-signin svg {
                width: 19px;
                height: 19px;
              }

              .lt-hero {
                width: 100%;
                padding-top: 0;
              }

              .lt-title-wrap {
                margin-top: -6px;
              }

              .lt-title {
                font-size: 45px;
                line-height: 0.98;
              }

              .lt-title-accent:after {
                bottom: -4px;
                height: 6px;
              }

              .lt-head-sparkle {
                right: -34px;
                top: -3px;
              }

              .lt-head-sparkle svg {
                width: 27px;
                height: 27px;
              }

              .lt-explore {
                min-width: 214px;
                height: 46px;
                border-radius: 18px;
                gap: 13px;
                font-size: 19px;
              }

              .lt-explore svg {
                width: 23px;
                height: 23px;
              }

              .lt-story {
                width: 100%;
                max-width: 100%;
                min-height: 0;
                margin-top: clamp(76px, 8.4svh, 96px);
                overflow: visible;
              }

              .lt-story-bg-lines {
                inset: -36px 0 -22px;
                width: 100%;
                opacity: 0.74;
              }

              .lt-story-rail {
                width: 100%;
                min-width: 0;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 20px;
              }

              .lt-stage {
                gap: 12px;
                min-width: 0;
              }

              .lt-story-rail > .lt-stage:nth-child(1) {
                grid-column: 1;
              }

              .lt-story-rail > .lt-stage:nth-child(3) {
                grid-column: 2;
              }

              .lt-story-rail > .lt-stage:nth-child(5) {
                grid-column: 3;
              }

              .lt-story-rail > .lt-stage:nth-child(7) {
                grid-column: 4;
              }

              .lt-stage-heading {
                min-height: 30px;
                gap: 8px;
                padding-left: 38px;
              }

              .lt-stage-number {
                width: 28px;
                height: 28px;
                font-size: 13px;
              }

              .lt-stage-title {
                font-size: 16.5px;
                line-height: 1;
              }

              .lt-flow-arrow {
                position: absolute;
                z-index: 4;
                width: 38px;
                height: 38px;
                top: clamp(153px, 17.6svh, 183px);
                left: auto;
                transform: translateX(-50%);
                margin-top: 0;
                box-shadow: 0 10px 20px rgba(7,26,61,0.23), 0 0 0 4px rgba(255,255,255,0.76);
              }

              .lt-flow-arrow:nth-child(2) {
                left: 25%;
              }

              .lt-flow-arrow:nth-child(4) {
                left: 50%;
              }

              .lt-flow-arrow:nth-child(6) {
                left: 75%;
              }

              .lt-story-card {
                height: clamp(246px, 29svh, 306px);
                min-height: 0;
                min-width: 0;
                width: 100%;
                max-width: 100%;
                overflow: hidden;
                border-radius: 16px;
                padding: 12px 13px;
              }

              .lt-post-card-cta {
                margin-top: clamp(10px, 1.4svh, 16px);
              }

              .lt-card-top {
                margin-bottom: 8px;
                font-size: 11px;
              }

              .lt-card-top svg {
                width: 16px;
                height: 16px;
              }

              .lt-chip {
                min-width: 20px;
                height: 20px;
                border-radius: 6px;
                font-size: 11px;
              }

              .lt-topic-row {
                grid-template-columns: 22px minmax(0, 1fr) 34px;
                gap: 6px;
                margin: 5px 0;
                font-size: 11px;
              }

              .lt-progress-track {
                height: 3px;
                margin-top: 3px;
              }

              .lt-mini-grid {
                grid-template-columns: 28px repeat(9, 9px);
                gap: 3px;
                margin-top: 5px;
                font-size: 9px;
              }

              .lt-dot {
                width: 9px;
                height: 9px;
                border-radius: 3px;
              }

              .lt-card-action {
                height: 28px;
                margin-top: 5px;
                border-radius: 8px;
                gap: 14px;
                font-size: 11px;
              }

              .lt-question {
                margin: 8px 0 7px;
                font-size: 12.2px;
                line-height: 1.3;
              }

              .lt-option {
                min-height: 25px;
                margin-top: 4px;
                padding: 4px 7px;
                border-radius: 8px;
                gap: 7px;
                font-size: 10.4px;
              }

              .lt-option-letter {
                width: 19px;
                height: 19px;
                font-size: 10px;
              }

              .lt-practice-footer {
                height: 28px;
                margin-top: 6px;
                border-radius: 8px;
                padding: 0 10px;
                font-size: 11px;
              }

              .lt-answer-line {
                grid-template-columns: 78px minmax(0, 1fr);
                margin-bottom: 6px;
                gap: 6px;
                font-size: 11px;
              }

              .lt-answer-box {
                min-height: 28px;
                padding: 5px 8px;
                font-size: 10.5px;
              }

              .lt-explanation {
                grid-template-columns: 48px minmax(0, 1fr);
                gap: 8px;
                padding: 7px;
                border-radius: 9px;
                font-size: 10.8px;
                line-height: 1.28;
              }

              .lt-lungs {
                width: 46px;
                height: 46px;
                border-radius: 14px;
              }

              .lt-lungs svg {
                width: 34px;
                height: 34px;
              }

              .lt-wrong-list {
                margin-top: 5px;
                padding: 6px 8px;
                font-size: 10.4px;
                line-height: 1.25;
              }

              .lt-next-question {
                height: 28px;
                margin-top: 5px;
                border-radius: 8px;
                gap: 14px;
                font-size: 11px;
              }

              .lt-progress-card {
                grid-template-columns: 78px minmax(0, 1fr);
                min-height: 78px;
                padding: 9px;
                border-radius: 10px;
                gap: 8px;
              }

              .lt-ring {
                width: 66px;
                height: 66px;
              }

              .lt-ring div div:first-child {
                font-size: 18px !important;
              }

              .lt-ring div div:last-child {
                font-size: 9px !important;
              }

              .lt-stat-row {
                grid-template-columns: 1fr 38px;
                margin: 5px 0;
                font-size: 11px;
              }

              .lt-strength-grid {
                gap: 5px;
                margin-top: 6px;
              }

              .lt-strength-tile {
                min-height: 34px;
                border-radius: 8px;
                font-size: 9.5px;
              }

              .lt-strength-tile strong {
                font-size: 12px !important;
              }

              .lt-chart {
                height: 42px;
                margin-top: 5px;
                border-radius: 8px;
              }

              .lt-mi-area {
                width: 100%;
                max-width: 1500px;
                z-index: 4;
                min-height: clamp(112px, 12svh, 138px);
                margin: clamp(14px, 1.8svh, 22px) auto 0;
                grid-template-columns: 1fr;
              }

              .lt-connector-glow {
                top: 54px;
                height: 38px;
                filter: blur(8px);
              }

              .lt-connector-lines {
                top: 22px;
                height: 94px;
              }

              .lt-mi-hub {
                gap: 7px;
                z-index: 6;
              }

              .lt-brain-orbit {
                width: 64px;
                height: 64px;
                box-shadow:
                  0 0 0 9px rgba(22,185,106,0.10),
                  0 0 38px rgba(22,185,106,0.72),
                  inset 0 0 23px rgba(22,185,106,0.34);
              }

              .lt-brain-orbit svg {
                width: 42px;
                height: 42px;
              }

              .lt-mi-title {
                position: relative;
                z-index: 7;
                gap: 8px;
                font-size: 20px;
                text-shadow: 0 2px 12px rgba(5, 23, 51, 0.46);
              }

              .lt-mi-title svg {
                width: 18px;
                height: 18px;
              }

              .lt-mi-subtitle {
                position: relative;
                z-index: 7;
                margin-top: -4px;
                font-size: 13px;
                text-shadow: 0 2px 12px rgba(5, 23, 51, 0.50);
              }

              .lt-benefits {
                width: 100%;
                max-width: 1260px;
                margin: 0 auto clamp(26px, 3.4svh, 46px);
                z-index: 2;
                gap: 10px;
                padding: 6px 14px;
                border-radius: 18px;
                background: rgba(5, 23, 51, 0.42);
                border: 1px solid rgba(255,255,255,0.16);
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), 0 -14px 44px rgba(48,242,148,0.08);
                backdrop-filter: blur(10px);
              }

              .lt-benefit {
                min-height: 34px;
                grid-template-columns: 26px minmax(0, 1fr);
                gap: 7px;
              }

              .lt-benefit + .lt-benefit:before {
                left: -8px;
                height: 30px;
              }

              .lt-benefit-icon {
                width: 26px;
                height: 26px;
              }

              .lt-benefit-icon svg {
                width: 25px;
                height: 25px;
              }

              .lt-benefit-text {
                font-size: 11.8px;
                line-height: 1.22;
              }
            }

            @media (min-width: 1700px) {
              .lt-landing-viewport {
                width: min(1720px, calc(100vw - 72px));
              }

              .lt-story-rail {
                gap: 24px;
              }

              .lt-mi-area {
                max-width: 1580px;
                margin-top: clamp(20px, 2svh, 28px);
              }

              .lt-benefits {
                margin-bottom: clamp(48px, 5.4svh, 66px);
              }
            }

            @media (min-width: 1180px) and (max-height: 800px) {
              .lt-landing-viewport {
                padding-top: 10px;
              }

              .lt-landing-header {
                min-height: 42px;
              }

              .lt-brand {
                font-size: 21px;
              }

              .lt-brand svg {
                width: 28px;
                height: 28px;
              }

              .lt-signin {
                height: 40px;
                padding: 0 17px;
              }

              .lt-title {
                font-size: 40px;
              }

              .lt-explore {
                min-width: 196px;
                height: 40px;
                font-size: 17px;
              }

              .lt-story {
                margin-top: clamp(54px, 7svh, 66px);
              }

              .lt-story-card {
                height: clamp(224px, 29svh, 242px);
                padding: 10px 12px;
              }

              .lt-post-card-cta {
                margin-top: 8px;
              }

              .lt-stage-heading {
                min-height: 27px;
              }

              .lt-question {
                margin: 6px 0 5px;
                font-size: 11.6px;
              }

              .lt-option {
                min-height: 23px;
                margin-top: 3px;
                padding: 3px 7px;
              }

              .lt-practice-footer,
              .lt-next-question,
              .lt-card-action {
                height: 26px;
              }

              .lt-wrong-list,
              .lt-chart {
                display: none;
              }

              .lt-progress-card {
                min-height: 74px;
              }

              .lt-strength-tile {
                min-height: 32px;
              }

              .lt-mi-area {
                margin-top: 8px;
                min-height: 104px;
              }

              .lt-benefits {
                margin-bottom: clamp(24px, 3.2svh, 34px);
              }

              .lt-flow-arrow {
                top: 139px;
              }
            }

            @media (min-width: 1180px) and (max-height: 700px) {
              .lt-landing-viewport {
                padding-top: 8px;
                padding-bottom: 7px;
              }

              .lt-landing-header {
                min-height: 38px;
              }

              .lt-brand {
                font-size: 20px;
              }

              .lt-brand svg {
                width: 26px;
                height: 26px;
              }

              .lt-signin {
                height: 38px;
                padding: 0 17px;
                font-size: 15px;
              }

              .lt-title-wrap {
                margin-top: -6px;
              }

              .lt-title {
                font-size: 38px;
              }

              .lt-title-accent:after {
                bottom: -3px;
                height: 5px;
              }

              .lt-head-sparkle {
                right: -28px;
              }

              .lt-explore {
                min-width: 178px;
                height: 40px;
                border-radius: 15px;
                gap: 12px;
                font-size: 16px;
              }

              .lt-explore svg {
                width: 21px;
                height: 21px;
              }

              .lt-story {
                margin-top: clamp(44px, 6.2svh, 52px);
              }

              .lt-stage {
                gap: 8px;
              }

              .lt-stage-heading {
                min-height: 24px;
                padding-left: 32px;
              }

              .lt-stage-number {
                width: 24px;
                height: 24px;
                font-size: 12px;
              }

              .lt-stage-title {
                font-size: 15px;
              }

              .lt-story-card {
                height: clamp(202px, 31svh, 216px);
                padding: 8px 10px;
              }

              .lt-post-card-cta {
                margin-top: 6px;
              }

              .lt-card-top {
                margin-bottom: 5px;
              }

              .lt-topic-row {
                margin: 3px 0;
              }

              .lt-mini-grid,
              .lt-card-action,
              .lt-next-question {
                display: none;
              }

              .lt-question {
                margin: 4px 0;
                font-size: 11px;
                line-height: 1.24;
              }

              .lt-option {
                min-height: 21px;
                margin-top: 2px;
                font-size: 10px;
              }

              .lt-practice-footer {
                height: 24px;
                margin-top: 4px;
              }

              .lt-answer-line {
                margin-bottom: 4px;
              }

              .lt-answer-box {
                min-height: 24px;
                padding: 4px 7px;
              }

              .lt-explanation {
                padding: 6px;
                line-height: 1.22;
              }

              .lt-lungs {
                width: 40px;
                height: 40px;
              }

              .lt-lungs svg {
                width: 29px;
                height: 29px;
              }

              .lt-progress-card {
                min-height: 66px;
                padding: 7px;
              }

              .lt-ring {
                width: 58px;
                height: 58px;
              }

              .lt-strength-grid {
                margin-top: 5px;
              }

              .lt-strength-tile {
                min-height: 28px;
              }

              .lt-mi-area {
                min-height: 100px;
                margin-top: 5px;
              }

              .lt-benefits {
                margin-bottom: clamp(18px, 3svh, 24px);
              }

              .lt-flow-arrow {
                top: 128px;
              }

              .lt-brain-orbit {
                width: 54px;
                height: 54px;
              }

              .lt-brain-orbit svg {
                width: 35px;
                height: 35px;
              }

              .lt-mi-title {
                font-size: 18px;
              }

              .lt-mi-subtitle {
                font-size: 12px;
              }

              .lt-benefits {
                padding: 4px 10px;
                border-radius: 14px;
              }

              .lt-benefit {
                min-height: 28px;
                grid-template-columns: 22px minmax(0, 1fr);
                gap: 5px;
              }

              .lt-benefit-icon,
              .lt-benefit-icon svg {
                width: 22px;
                height: 22px;
              }

              .lt-benefit-text {
                font-size: 10.8px;
                line-height: 1.14;
              }
            }

            @media (max-width: 1179px) {
              .lt-title {
                font-size: 52px;
              }

              .lt-story-rail {
                grid-template-columns: repeat(2, minmax(270px, 1fr));
              }

              .lt-flow-arrow {
                display: none;
              }

              .lt-stage-heading {
                padding-left: 0;
              }

              .lt-story-card {
                min-height: 360px;
              }

              .lt-benefits {
                grid-template-columns: repeat(3, minmax(0, 1fr));
              }

              .lt-benefit + .lt-benefit:before {
                display: none;
              }
            }

            @media (max-width: 860px) {
              .lt-landing-viewport {
                padding: 18px 16px 28px;
              }

              .lt-brand {
                font-size: 21px;
              }

              .lt-signin {
                height: 46px;
                padding: 0 16px;
                font-size: 15px;
                gap: 8px;
              }

              .lt-title {
                font-size: 42px;
                line-height: 1.08;
              }

              .lt-title-accent {
                display: inline-block;
              }

              .lt-head-sparkle {
                display: none;
              }

              .lt-explore {
                min-width: 0;
                width: min(100%, 340px);
                height: 54px;
                font-size: 18px;
              }

              .lt-story {
                margin-top: 24px;
              }

              .lt-story-bg-lines {
                display: none;
              }

              .lt-story-rail {
                grid-template-columns: 1fr;
              }

              .lt-mi-area {
                grid-template-columns: 1fr;
                gap: 16px;
                margin-top: 28px;
              }

              .lt-connector-lines,
              .lt-connector-glow {
                display: none;
              }

              .lt-benefits {
                grid-template-columns: 1fr;
                gap: 10px;
                margin-top: 14px;
              }
            }

            @media (max-width: 520px) {
              .lt-landing-header {
                align-items: flex-start;
              }

              .lt-brand {
                gap: 8px;
                font-size: 18px;
              }

              .lt-title {
                font-size: 34px;
              }

              .lt-strength-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
              }

              .lt-progress-card {
                grid-template-columns: 1fr;
              }

            }
          `,
        }}
      />

      <div className="lt-landing-viewport">
        <div className="lt-landing-stage">
          <header className="lt-landing-header">
            <div className="lt-brand" aria-label="LazyTopper">
              <SparkleIcon size={38} />
              <span>LazyTopper</span>
            </div>

            <button
              type="button"
              className="lt-signin"
              onClick={() => navigate(signInUrl)}
            >
              <UserIcon size={25} />
              <span className="lt-signin-text">Sign in</span>
              <ArrowIcon size={23} />
            </button>
          </header>

          <section className="lt-hero">
            <div className="lt-title-wrap">
              <h1 className="lt-title">
                Study smarter for{" "}
                <span className="lt-title-accent">CBSE Class 10</span>
              </h1>
              <span className="lt-head-sparkle" aria-hidden="true">
                <SparkleIcon size={33} />
              </span>
            </div>
          </section>

          <section className="lt-story" aria-label="LazyTopper product loop preview">
            <StoryLines />
            <div className="lt-story-rail">
              <StoryStage
                number="1"
                title="Exam Trends"
                card={<ExamTrendsCard />}
              />
              <FlowArrow />
              <StoryStage
                number="2"
                title="Practice"
                card={<PracticeCard />}
              />
              <FlowArrow />
              <StoryStage
                number="3"
                title="Check & Improve"
                card={<CheckImproveCard />}
              />
              <FlowArrow />
              <StoryStage
                number="4"
                title="Me / Progress"
                card={<ProgressCard />}
              />
            </div>

            <div className="lt-post-card-cta">
              <button type="button" className="lt-explore" onClick={onExplore}>
                <SparkleIcon size={30} />
                <span>Explore</span>
                <ArrowIcon size={28} />
              </button>
            </div>

            <MistakeIntelligenceLayer />
          </section>

          <BenefitRow />

          {/* [FU-LEGAL-FOOTER-LINK] — the desktop public landing carries no app
              chrome (isPublicLandingRoute suppresses the global navbar), so this row
              is the only route from the signed-out front door to the policies.

              ★ PLACEMENT IS LOAD-BEARING. It must sit INSIDE .lt-landing-stage, not
              after it as a direct child of <main>. At >=1180px this landing is a
              frozen, non-scrolling screen: html/body/#root and .lt-frozen-landing are
              all `height:100vh; overflow:hidden`, and .lt-landing-viewport is a grid
              of `auto auto minmax(0,1fr) auto auto` whose items are the stage's own
              children (.lt-landing-stage is `display:contents`). Mounted here the
              footer fills the fifth, previously unused, grid row. Mounted outside the
              viewport it would be clipped away with no scrollbar to reach it —
              present in the DOM, unreachable by a student. */}
          <PublicLegalFooter className="lt-landing-legal" />
        </div>
      </div>
    </main>
  );
}

function StoryStage({
  number,
  title,
  card,
}: {
  number: string;
  title: string;
  card: React.ReactNode;
}) {
  return (
    <article className="lt-stage">
      <div className="lt-stage-heading">
        <span className="lt-stage-number">{number}</span>
        <div>
          <div className="lt-stage-title">{title}</div>
        </div>
      </div>
      {card}
    </article>
  );
}

function FlowArrow() {
  return (
    <div className="lt-flow-arrow" aria-hidden="true">
      <ArrowIcon size={27} />
    </div>
  );
}

function StoryLines() {
  return (
    <svg className="lt-story-bg-lines" viewBox="0 0 1500 620" fill="none" aria-hidden="true">
      <path
        d="M85 250 C85 40 245 35 265 92 C286 153 365 117 375 190"
        stroke="url(#lineA)"
        strokeWidth="2"
      />
      <path
        d="M1416 250 C1416 40 1254 35 1235 92 C1214 153 1134 117 1125 190"
        stroke="url(#lineA)"
        strokeWidth="2"
      />
      <path
        d="M82 250 V395 C82 438 115 468 160 468 H435 C520 468 552 505 640 505 H862 C950 505 982 468 1065 468 H1340 C1384 468 1418 438 1418 395 V250"
        stroke="url(#lineB)"
        strokeWidth="3"
        filter="url(#glow)"
      />
      {[
        [85, 250],
        [160, 468],
        [435, 468],
        [640, 505],
        [862, 505],
        [1065, 468],
        [1340, 468],
        [1418, 250],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="8" fill="#20f3a2" stroke="#fff" strokeWidth="3" />
      ))}
      <defs>
        <linearGradient id="lineA" x1="0" y1="0" x2="1500" y2="0">
          <stop stopColor="#7ddcff" stopOpacity="0" />
          <stop offset="0.45" stopColor="#9cf5dc" />
          <stop offset="1" stopColor="#7ddcff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lineB" x1="0" y1="0" x2="1500" y2="0">
          <stop stopColor="#20f3a2" />
          <stop offset="0.45" stopColor="#9cf5dc" />
          <stop offset="0.55" stopColor="#7ddcff" />
          <stop offset="1" stopColor="#20f3a2" />
        </linearGradient>
        <filter id="glow" x="-40" y="-40" width="1580" height="700">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}

function ExamTrendsCard() {
  const topics = [
    ["M", "Real Numbers", "92%", "#3b82f6", "92%"],
    ["S", "Life Processes", "88%", "#16b96a", "88%"],
    ["E", "First Flight", "75%", "#f59e0b", "75%"],
    ["M", "Quadratic Eq.", "68%", "#fb923c", "68%"],
  ];
  const years = ["2024", "2023", "2022", "2021", "2020"];

  return (
    <div className="lt-story-card">
      <div className="lt-card-top">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <TrendIcon size={18} color={GREEN} /> Top scoring topics
        </span>
      </div>
      {topics.map(([initial, label, value, color, width]) => (
        <div className="lt-topic-row" key={label}>
          <span className="lt-chip" style={{ color, background: `${color}18` }}>
            {initial}
          </span>
          <span style={{ minWidth: 0 }}>
            <span>{label}</span>
            <span className="lt-progress-track">
              <span className="lt-progress-fill" style={{ width, background: color }} />
            </span>
          </span>
          <strong>{value}</strong>
        </div>
      ))}

      <div style={{ marginTop: 18, fontWeight: 800, fontSize: 13 }}>Board paper pattern</div>
      <div style={{ marginTop: 4, color: MUTED, fontSize: 11 }}>Weightage by chapter</div>
      <div className="lt-mini-grid">
        {years.flatMap((year, row) => [
          <span key={`${year}-label`}>{year}</span>,
          ...Array.from({ length: 9 }, (_, col) => (
            <span
              key={`${year}-${col}`}
              className="lt-dot"
              style={{
                background:
                  col + row > 8
                    ? "rgba(59,130,246,0.34)"
                    : col % 3 === 0
                      ? "rgba(22,185,106,0.42)"
                      : "rgba(22,185,106,0.18)",
              }}
            />
          )),
        ])}
      </div>
    </div>
  );
}

function PracticeCard() {
  const options = [
    "Lungs -> Alveoli -> Blood -> Heart",
    "Lungs -> Blood -> Heart -> Alveoli",
    "Blood -> Lungs -> Heart -> Alveoli",
  ];

  return (
    <div className="lt-story-card">
      <div className="lt-card-top">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <LayersIcon size={18} color={GREEN} /> Science - Life Processes
        </span>
        <BookmarkIcon size={18} />
      </div>
      <p className="lt-question">
        Select the correct pathway for the transport of oxygen in human body.
      </p>
      {options.map((option, index) => (
        <div key={option} className={`lt-option ${index === 1 ? "correct" : ""}`}>
          <span className="lt-option-letter">{String.fromCharCode(65 + index)}</span>
          <span>{option}</span>
        </div>
      ))}
      <div className="lt-practice-footer">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          <TimerIcon size={17} /> 08:34
        </span>
        <span>12 / 20</span>
      </div>
    </div>
  );
}

function CheckImproveCard() {
  return (
    <div className="lt-story-card">
      <div className="lt-answer-line">
        <span>Correct answer</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
          <span className="lt-option-letter" style={{ background: "#c8f4dc", borderColor: "#c8f4dc", color: GREEN_DARK }}>
            B
          </span>
        </span>
      </div>
      <div className="lt-answer-box good">
        <CheckIcon size={16} color={GREEN_DARK} />
        <span>Lungs -&gt; Blood -&gt; Heart -&gt; Alveoli</span>
      </div>
      <div className="lt-answer-line" style={{ marginTop: 10 }}>
        <span>Your answer</span>
        <span className="lt-option-letter" style={{ background: "#ffe2e2", borderColor: "#ffe2e2", color: "#ef4444" }}>
          A
        </span>
      </div>
      <div className="lt-answer-box bad">Lungs -&gt; Alveoli -&gt; Blood -&gt; Heart</div>

      <div style={{ marginTop: 12, fontWeight: 800, fontSize: 12 }}>Explanation</div>
      <div className="lt-explanation">
        <div className="lt-lungs">
          <LungsIcon size={48} />
        </div>
        <div>
          Oxygen from the lungs diffuses into the blood in the alveoli and is carried to the heart.
        </div>
      </div>

    </div>
  );
}

function ProgressCard() {
  const strengths = [
    ["Maths", "82%", "#dcfce7", GREEN_DARK],
    ["Science", "75%", "#dbeafe", "#2563eb"],
    ["English", "70%", "#ede9fe", "#6d28d9"],
    ["SST", "68%", "#ffedd5", "#c2410c"],
  ] as const;

  return (
    <div className="lt-story-card">
      <div className="lt-progress-card">
        <div className="lt-ring">
          <div>
            <div style={{ fontSize: 23, fontWeight: 800 }}>76%</div>
            <div style={{ color: "#40f398", fontSize: 11, fontWeight: 800 }}>Strong!</div>
          </div>
        </div>
        <div style={{ alignSelf: "center" }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Overall Progress</div>
          <div className="lt-stat-row">
            <span>Mocks</span>
            <span>12</span>
          </div>
          <div className="lt-stat-row">
            <span>Accuracy</span>
            <span>78%</span>
          </div>
          <div className="lt-stat-row">
            <span>Rank</span>
            <span>Top 12%</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 13, fontWeight: 800, fontSize: 13 }}>Subject-wise strength</div>
      <div className="lt-strength-grid">
        {strengths.map(([label, value, bg, color]) => (
          <div className="lt-strength-tile" key={label} style={{ background: bg, color }}>
            <span>{label}</span>
            <strong style={{ fontSize: 15 }}>{value}</strong>
          </div>
        ))}
      </div>

      <div className="lt-chart">
        <svg width="100%" height="100%" viewBox="0 0 280 86" fill="none" preserveAspectRatio="none">
          <path d="M18 64 C48 48 55 55 72 57 C96 61 97 43 121 47 C145 52 151 35 174 39 C199 43 203 55 222 44 C244 33 251 33 262 22" stroke={GREEN} strokeWidth="3" fill="none" />
          <circle cx="262" cy="22" r="4" fill="#fff" stroke={GREEN} strokeWidth="3" />
        </svg>
        <div style={{ position: "absolute", right: 15, top: 25, color: GREEN, fontWeight: 900, fontSize: 18 }}>
          +18%
        </div>
        <div style={{ position: "absolute", right: 15, top: 48, color: MUTED, fontSize: 11 }}>
          This month
        </div>
      </div>
    </div>
  );
}

function MistakeIntelligenceLayer() {
  return (
    <section className="lt-mi-area" aria-label="Mistake Intelligence product loop">
      <div className="lt-connector-glow" aria-hidden="true" />
      <svg className="lt-connector-lines" viewBox="0 0 1500 160" fill="none" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 78 C310 90 445 78 610 78 C675 78 690 78 750 78" stroke="rgba(48,242,148,0.82)" strokeWidth="4" />
        <path d="M1500 78 C1190 90 1055 78 890 78 C825 78 810 78 750 78" stroke="rgba(48,242,148,0.82)" strokeWidth="4" />
        <path d="M0 112 C290 120 430 100 604 96 C682 94 706 96 750 92" stroke="rgba(125,220,255,0.74)" strokeWidth="3" />
        <path d="M1500 112 C1210 120 1070 100 896 96 C818 94 794 96 750 92" stroke="rgba(125,220,255,0.74)" strokeWidth="3" />
      </svg>

      <div className="lt-mi-hub">
        <div className="lt-brain-orbit">
          <BrainIcon size={58} />
        </div>
        <div className="lt-mi-title">
          <SparkleIcon size={24} />
          <span>Mistake Intelligence</span>
          <SparkleIcon size={24} />
        </div>
        <div className="lt-mi-subtitle">Turns mistakes into mastery</div>
      </div>
    </section>
  );
}

function BenefitRow() {
  const benefits = [
    ["CBSE Class 10", "Focused", <ShieldIcon size={42} />],
    ["Smart Practice", "That Adapts", <TargetIcon size={42} />],
    ["Mistake Intelligence", "That Improves", <SparkClusterIcon size={42} />],
    ["Your Progress,", "Always Saved", <LockIcon size={42} />],
    ["Climb Higher,", "Every Day", <TrophyIcon size={42} />],
  ] as const;

  return (
    <section className="lt-benefits" aria-label="LazyTopper benefits">
      {benefits.map(([line1, line2, icon]) => (
        <div className="lt-benefit" key={`${line1}-${line2}`}>
          <span className="lt-benefit-icon">{icon}</span>
          <span className="lt-benefit-text">
            {line1}
            <br />
            {line2}
          </span>
        </div>
      ))}
    </section>
  );
}

function ArrowIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function SparkleIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" />
      <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" />
    </svg>
  );
}

function UserIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function TrendIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 17 9 11l4 4 7-8" />
      <path d="M14 7h6v6" />
    </svg>
  );
}

function LayersIcon({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3 8 4-8 4-8-4 8-4z" />
      <path d="m4 12 8 4 8-4" />
      <path d="m4 17 8 4 8-4" />
    </svg>
  );
}

function BookmarkIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#6b7b94" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 4h12v17l-6-4-6 4V4z" />
    </svg>
  );
}

function TimerIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2" />
      <path d="M9 2h6" />
    </svg>
  );
}

function CheckIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function LungsIcon({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M24 8v30" />
      <path d="M24 22c-6-9-11-10-15-7-4 3-5 13-4 21 0 2 2 3 4 2 7-4 9-10 10-18" fill="rgba(228,102,127,0.22)" />
      <path d="M24 22c6-9 11-10 15-7 4 3 5 13 4 21 0 2-2 3-4 2-7-4-9-10-10-18" fill="rgba(228,102,127,0.22)" />
    </svg>
  );
}

function BrainIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 8c-5 0-8 3-8 7-4 1-7 5-7 10 0 6 5 10 11 10 1 4 4 6 8 6V8z" />
      <path d="M28 8c5 0 8 3 8 7 4 1 7 5 7 10 0 6-5 10-11 10-1 4-4 6-8 6V8z" />
      <path d="M15 17c4 0 6 2 6 6" />
      <path d="M33 17c-4 0-6 2-6 6" />
      <path d="M16 32c3-1 5-3 6-6" />
      <path d="M32 32c-3-1-5-3-6-6" />
    </svg>
  );
}

function ShieldIcon({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="#35f2a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 4 33 9v10c0 8-5 14-13 17C12 33 7 27 7 19V9l13-5z" />
      <path d="m14 20 4 4 8-10" />
    </svg>
  );
}

function TargetIcon({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="20" cy="20" r="14" />
      <circle cx="20" cy="20" r="8" />
      <circle cx="20" cy="20" r="2" />
      <path d="m29 11 5-5" />
      <path d="M31 6h3v3" />
    </svg>
  );
}

function SparkClusterIcon({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="#35f2a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 4l2 7 7 2-7 2-2 7-2-7-7-2 7-2 2-7z" />
      <path d="M10 24l1 4 4 1-4 1-1 4-1-4-4-1 4-1 1-4z" />
      <path d="M31 24l1 4 4 1-4 1-1 4-1-4-4-1 4-1 1-4z" />
    </svg>
  );
}

function LockIcon({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="17" width="22" height="17" rx="3" />
      <path d="M14 17v-5a6 6 0 0 1 12 0v5" />
      <path d="M20 24v4" />
    </svg>
  );
}

function TrophyIcon({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 6h16v6c0 8-3 12-8 12s-8-4-8-12V6z" />
      <path d="M12 10H6c0 6 3 10 8 11" />
      <path d="M28 10h6c0 6-3 10-8 11" />
      <path d="M20 24v7" />
      <path d="M14 34h12" />
    </svg>
  );
}
