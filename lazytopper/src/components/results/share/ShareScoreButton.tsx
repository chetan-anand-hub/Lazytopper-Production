import { useState } from "react";
import type { ScorecardVariant } from "../scorecardVariants";
import { buildShareCardModel, shareText } from "./shareCardModel";
import { SHARE_FILENAME, openWhatsAppLink, pickShareMethod, shareNative, type ShareNavigator } from "./shareScore";

/**
 * SHARE-SCORE-1 - "Share my score" on the scorecard. The host (ResultsScorecard) mounts it
 * only when canShareScore(variant) holds.
 *
 * The method is chosen SYNCHRONOUSLY in the tap (a 1-byte probe PNG against
 * navigator.canShare), so the desktop fallback opens wa.me inside the tap's user activation
 * (no popup block). The image pipeline - ShareCard, html-to-image - is imported only now.
 * If drawing the image outlived the activation (NotAllowedError), the image is kept and the
 * button asks for one more tap, which shares at once.
 */
type Phase = "idle" | "busy" | "ready" | "failed";

const LABEL: Record<Phase, string> = {
  idle: "Share my score",
  busy: "Preparing your image…",
  ready: "Image ready - tap to share",
  failed: "Share my score",
};

function browserNavigator(): ShareNavigator | undefined {
  return typeof navigator === "undefined" ? undefined : (navigator as unknown as ShareNavigator);
}

export default function ShareScoreButton({ variant }: { variant: ScorecardVariant }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [readyFile, setReadyFile] = useState<File | null>(null);

  const onTap = async () => {
    if (phase === "busy") return;
    // Text needs no date, so a placeholder date label is fine for it.
    const model = buildShareCardModel(variant, "");
    if (!model) return;
    const text = shareText(model);
    const nav = browserNavigator();

    if (phase === "ready" && readyFile && nav) {
      setPhase("busy");
      const outcome = await shareNative(nav, readyFile, text);
      setReadyFile(outcome === "needs-tap" ? readyFile : null);
      setPhase(outcome === "needs-tap" ? "ready" : outcome === "failed" ? "failed" : "idle");
      return;
    }

    const probe = new File([new Uint8Array([0])], SHARE_FILENAME, { type: "image/png" });
    const method = pickShareMethod(nav, probe);
    if (method === "whatsapp_link" && typeof window !== "undefined" && typeof window.open === "function") {
      openWhatsAppLink(text, (url, target, features) => window.open(url, target, features));
    }

    setPhase("busy");
    try {
      const { runScoreShare } = await import("./runScoreShare");
      const result = await runScoreShare(variant, { method, nav });
      if (result.outcome === "needs-tap" && result.file) {
        setReadyFile(result.file);
        setPhase("ready");
        return;
      }
      setReadyFile(null);
      setPhase(result.outcome === "failed" ? "failed" : "idle");
    } catch {
      setPhase("failed");
    }
  };

  return (
    <div className="lt-ss">
      <style>{SS_CSS}</style>
      <button
        type="button"
        className={`lt-ss__btn${phase === "ready" ? " lt-ss__btn--ready" : ""}`}
        data-testid="sc-share-score"
        onClick={onTap}
        disabled={phase === "busy"}
        aria-busy={phase === "busy"}
      >
        <svg className="lt-ss__ic" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0 .09.73L8.6 8.04a3 3 0 1 0 0 3.92l6.49 3.31A3 3 0 1 0 16 13.5a3 3 0 0 0-.4.03L9 10.2a3 3 0 0 0 0-.4l6.6-3.37A3 3 0 0 0 18 8Z" />
        </svg>
        {LABEL[phase]}
      </button>
      {phase === "failed" && (
        <p className="lt-ss__err" role="status">
          Couldn&rsquo;t make the image just now. Tap to try again.
        </p>
      )}
    </div>
  );
}

const SS_CSS = `
.lt-ss { margin: 4px 0 22px; }
.lt-ss__btn {
  display: inline-flex; align-items: center; gap: 9px; cursor: pointer;
  font-family: "Inter", ui-sans-serif, system-ui, sans-serif; font-weight: 700; font-size: 13.5px;
  padding: 10px 16px; border-radius: 999px; color: #fff;
  background: rgba(52, 199, 138, 0.14); border: 1.5px solid hsl(152, 55%, 45%);
}
.lt-ss__btn:hover { background: rgba(52, 199, 138, 0.24); }
.lt-ss__btn--ready { background: hsl(152, 55%, 45%); }
.lt-ss__btn:disabled { opacity: 0.7; cursor: progress; }
.lt-ss__ic { width: 16px; height: 16px; fill: currentColor; flex-shrink: 0; }
.lt-ss__err { font-size: 12px; color: #f0cf9a; margin: 8px 0 0; }
@media (max-width: 1023px) {
  .lt-ss__btn { width: 100%; justify-content: center; padding: 12px 16px; }
}
`;
