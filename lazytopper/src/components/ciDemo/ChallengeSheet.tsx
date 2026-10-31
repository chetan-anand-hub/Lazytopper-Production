import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { firstNameOf } from "../parentReport/parentReportModel";
import { pickShareMethod, type ShareNavigator } from "../results/share/shareScore";
import { CHALLENGE_COPY as L, CHALLENGE_FILENAME, buildChallengeCardModel, type ChallengeChannel, type ChallengeQuestion } from "./challengeModel";
import { makeChallengeImage, runChallengeChannel, type ChallengeImage } from "./runChallengeShare";
import "./friendChallenge.css";

/**
 * FRIEND-CHALLENGE-1 - the challenge share sheet (LAZY chunk, opened by "Challenge a friend").
 * The student sees the real PNG before anything leaves, may tick "Add my first name" (default OFF; offered only
 * when the account has a usable first name, cleaned by firstNameOf), and picks a channel: Share (OS sheet, where
 * files can be shared), WhatsApp, Copy link, Download image. The image is drawn before a channel tap so the tap
 * itself shares inside its own user activation. Display only (CLAUDE.md 4a); classes only (CLAUDE.md 7).
 */

function useOptionalDisplayName(): string | null {
  try {
    const u = useAuth().user;
    return u && !u.isLocalSession ? (u.displayName ?? null) : null;
  } catch {
    return null;
  }
}

function browserNavigator(): ShareNavigator | undefined {
  return typeof navigator === "undefined" ? undefined : (navigator as unknown as ShareNavigator);
}

export default function ChallengeSheet({ question, onClose }: { question: ChallengeQuestion; onClose: () => void }) {
  const firstName = firstNameOf(useOptionalDisplayName());
  const [withName, setWithName] = useState(false);
  const [image, setImage] = useState<ChallengeImage | null>(null);
  const [status, setStatus] = useState<"drawing" | "ready" | "failed">("drawing");
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const gen = useRef(0);
  const nav = browserNavigator();
  const canShareFiles = useMemo(
    () => pickShareMethod(nav, new File([new Uint8Array([0])], CHALLENGE_FILENAME, { type: "image/png" })) === "native",
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  useEffect(() => {
    const my = ++gen.current;
    setStatus("drawing");
    setImage(null);
    setHint(null);
    const model = buildChallengeCardModel(question, withName ? firstName : null);
    if (!model) {
      setStatus("failed");
      return;
    }
    makeChallengeImage(model)
      .then((img) => {
        if (gen.current !== my) return;
        setImage(img);
        setStatus("ready");
      })
      .catch(() => {
        if (gen.current === my) setStatus("failed");
      });
  }, [question, withName, firstName]);

  const previewUrl = useMemo(() => {
    if (!image || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return null;
    return URL.createObjectURL(image.blob);
  }, [image]);
  useEffect(
    () => () => {
      if (previewUrl && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const go = (channel: ChallengeChannel) => {
    if (!image || busy) return;
    setBusy(true);
    setHint(null);
    const open =
      typeof window !== "undefined" && typeof window.open === "function" ? (url: string, target: string) => window.open(url, target) : undefined;
    const writeClipboard =
      typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function"
        ? (t: string) => navigator.clipboard.writeText(t)
        : undefined;
    void runChallengeChannel(channel, { image, nav, open, writeClipboard })
      .then((outcome) => {
        if (outcome === "needs-tap") setHint(L.tapAgain);
        else if (outcome === "failed") setHint(L.failed);
        else if (outcome === "copied") setHint(L.copied);
        else if (channel === "whatsapp" && outcome !== "shared" && outcome !== "cancelled") setHint(L.whatsappHint);
      })
      .catch(() => setHint(L.failed))
      .finally(() => setBusy(false));
  };

  return (
    <div className="lt-fcs__dim" role="dialog" aria-modal="true" aria-label={L.title} onClick={onClose} data-testid="challenge-sheet">
      <div className="lt-fcs" onClick={(e) => e.stopPropagation()}>
        <div className="lt-fcs__head">
          <h2 className="lt-fcs__title">{L.title}</h2>
          <button type="button" className="lt-fcs__x" onClick={onClose} aria-label={L.close}>
            {"✕"}
          </button>
        </div>
        <div className="lt-fcs__preview">
          {previewUrl ? (
            <img className="lt-fcs__img" src={previewUrl} alt={L.alt} data-testid="challenge-preview" />
          ) : (
            <div className="lt-fcs__wait" role="status">
              {status === "failed" ? L.failed : L.making}
            </div>
          )}
        </div>
        {firstName && (
          <label className="lt-fcs__check">
            <input type="checkbox" checked={withName} onChange={(e) => setWithName(e.target.checked)} data-testid="challenge-opt-name" />
            {L.nameLabel}
          </label>
        )}
        <div className="lt-fcs__actions">
          {canShareFiles && (
            <button type="button" className="lt-fcs__act lt-fcs__act--primary" disabled={!image || busy} onClick={() => go("native")} data-testid="challenge-ch-native">
              {L.share}
            </button>
          )}
          <button type="button" className="lt-fcs__act" disabled={!image || busy} onClick={() => go("whatsapp")} data-testid="challenge-ch-whatsapp">
            {L.whatsapp}
          </button>
          <button type="button" className="lt-fcs__act" disabled={!image || busy} onClick={() => go("copy")} data-testid="challenge-ch-copy">
            {L.copy}
          </button>
          <button type="button" className="lt-fcs__act" disabled={!image || busy} onClick={() => go("download")} data-testid="challenge-ch-download">
            {L.download}
          </button>
        </div>
        {hint && (
          <p className="lt-fcs__hint" role="status">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
