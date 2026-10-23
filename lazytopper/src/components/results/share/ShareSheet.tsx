import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { firstNameOf } from "../../parentReport/parentReportModel";
import type { ScorecardShareChannel } from "../../../analytics/analytics";
import type { ScorecardVariant } from "../scorecardVariants";
import { SHARE_PANEL_LABELS as L } from "./shareCopy";
import { shareLink, type ShareSize } from "./shareCardModel";
import { makeShareImage, runShareChannel, shareQrDataUrl, type ShareImage } from "./runScoreShare";
import { pickShareMethod, shareFilename, type ShareNavigator } from "./shareScore";

/**
 * SHARE-CARD-1 - the share sheet (LAZY chunk, opened by "Share result").
 *
 * The student sees the real PNG before anything leaves the device, and chooses:
 *   - size: Story 1080 x 1920 (Instagram / WhatsApp status) or Square 1080 x 1080;
 *   - "Show Byte & Ziggy" (default ON - the app's "Hide mascots" does not apply to the image);
 *   - "Add my first name" (default OFF; offered only when the account has a usable first name,
 *     cleaned by firstNameOf - never an email, phone number or handle);
 *   - a channel: Share (the OS sheet, where files can be shared), WhatsApp, Instagram story,
 *     Download image.
 * Both sizes are drawn as soon as the options settle, so a channel tap shares at once inside
 * its own user activation (navigator.share / window.open are called synchronously).
 *
 * Display only (CLAUDE.md 4a). CLAUDE.md 7 - classes only, no inline style objects.
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

type Images = Partial<Record<ShareSize, ShareImage>>;
type Status = "drawing" | "ready" | "failed";

export default function ShareSheet({ variant: liveVariant, onClose }: { variant: ScorecardVariant; onClose: () => void }) {
  // The result as it was when the sheet opened: a host re-render (a new variant object) never
  // redraws the image under the student's thumb.
  const [variant] = useState(liveVariant);
  const firstName = firstNameOf(useOptionalDisplayName());
  const [size, setSize] = useState<ShareSize>("story");
  const [showMascots, setShowMascots] = useState(true);
  const [withName, setWithName] = useState(false);
  const [images, setImages] = useState<Images>({});
  const [status, setStatus] = useState<Status>("drawing");
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const gen = useRef(0);

  const nav = browserNavigator();
  // Whether this browser can share an image FILE (a 1-byte probe; Android / iOS: yes).
  const canShareFiles = useMemo(
    () => pickShareMethod(nav, new File([new Uint8Array([0])], shareFilename("story"), { type: "image/png" })) === "native",
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Escape closes THIS sheet only (captured before the scorecard's own Escape listener).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  // Draw both sizes whenever an option changes (the selected size first).
  useEffect(() => {
    const my = ++gen.current;
    setStatus("drawing");
    setImages({});
    setHint(null);
    const name = withName ? firstName : null;
    (async () => {
      try {
        const qr = await shareQrDataUrl(shareLink(variant.surface));
        const order: ShareSize[] = size === "story" ? ["story", "square"] : ["square", "story"];
        for (const s of order) {
          const img = await makeShareImage(variant, { size: s, showMascots, firstName: name, qrDataUrl: qr });
          if (gen.current !== my) return;
          if (!img) throw new Error("not shareable");
          setImages((prev) => ({ ...prev, [s]: img }));
          setStatus("ready");
        }
      } catch {
        if (gen.current === my) setStatus("failed");
      }
    })();
    // `size` is read for ordering only; switching size never redraws (both are drawn).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, showMascots, withName, firstName]);

  const current = images[size] ?? null;
  const previewUrl = useMemo(() => {
    if (!current || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return null;
    return URL.createObjectURL(current.blob);
  }, [current]);
  useEffect(
    () => () => {
      if (previewUrl && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const go = (channel: ScorecardShareChannel) => {
    const image = channel === "instagram" ? images.story : current;
    if (!image || busy) return;
    if (channel === "instagram") setSize("story");
    setBusy(true);
    setHint(null);
    const open =
      typeof window !== "undefined" && typeof window.open === "function"
        ? (url: string, target: string) => window.open(url, target)
        : undefined;
    // Called synchronously in the tap: the sheet / window opens inside this activation.
    void runShareChannel(channel, { surface: variant.surface, image, nav, open })
      .then((outcome) => {
        if (outcome === "needs-tap") setHint(L.tapAgain);
        else if (outcome === "failed") setHint(L.failed);
        else if (channel === "instagram" && outcome === "downloaded") setHint(L.instagramHint);
        else if (channel === "whatsapp" && outcome !== "shared" && outcome !== "cancelled") setHint(L.whatsappHint);
      })
      .catch(() => setHint(L.failed))
      .finally(() => setBusy(false));
  };

  return (
    <div className="lt-shs__dim" role="dialog" aria-modal="true" aria-label={L.title} onClick={onClose} data-testid="share-sheet">
      <style>{SHS_CSS}</style>
      <div className="lt-shs" onClick={(e) => e.stopPropagation()}>
        <div className="lt-shs__head">
          <h2 className="lt-shs__title">{L.title}</h2>
          <button type="button" className="lt-shs__x" onClick={onClose} aria-label={L.close}>
            ✕
          </button>
        </div>

        <div className={`lt-shs__preview lt-shs__preview--${size}`}>
          {previewUrl ? (
            <img className="lt-shs__img" src={previewUrl} alt="Preview of your result image" data-testid="share-preview" />
          ) : (
            <div className="lt-shs__wait" role="status">
              {status === "failed" ? L.failed : L.making}
            </div>
          )}
        </div>

        <div className="lt-shs__opts">
          <div className="lt-shs__sizes" role="radiogroup" aria-label="Image size">
            {(["story", "square"] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={size === s}
                className={`lt-shs__size${size === s ? " is-on" : ""}`}
                onClick={() => setSize(s)}
                data-testid={`share-size-${s}`}
              >
                {s === "story" ? L.sizeStory : L.sizeSquare}
              </button>
            ))}
          </div>
          <label className="lt-shs__check">
            <input type="checkbox" checked={showMascots} onChange={(e) => setShowMascots(e.target.checked)} data-testid="share-opt-mascots" />
            {L.mascots}
          </label>
          {firstName && (
            <label className="lt-shs__check">
              <input type="checkbox" checked={withName} onChange={(e) => setWithName(e.target.checked)} data-testid="share-opt-name" />
              {L.name}
            </label>
          )}
        </div>

        <div className="lt-shs__actions">
          {canShareFiles && (
            <button type="button" className="lt-shs__act lt-shs__act--primary" disabled={!current || busy} onClick={() => go("native")} data-testid="share-ch-native">
              {L.share}
            </button>
          )}
          <button type="button" className="lt-shs__act" disabled={!current || busy} onClick={() => go("whatsapp")} data-testid="share-ch-whatsapp">
            {L.whatsapp}
          </button>
          <button type="button" className="lt-shs__act" disabled={!images.story || busy} onClick={() => go("instagram")} data-testid="share-ch-instagram">
            {/* Desktop cannot hand a file to Instagram: say what the button really does. */}
            {canShareFiles ? L.instagram : L.saveStory}
          </button>
          <button type="button" className="lt-shs__act" disabled={!current || busy} onClick={() => go("download")} data-testid="share-ch-download">
            {L.download}
          </button>
        </div>
        {hint && (
          <p className="lt-shs__hint" role="status">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

const SHS_CSS = `
.lt-shs__dim {
  position: fixed; inset: 0; z-index: 1100; background: rgba(6, 12, 24, 0.72);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.lt-shs {
  width: min(440px, 100%); max-height: calc(100vh - 32px); overflow-y: auto; box-sizing: border-box;
  background: #15233a; color: #f6f8fb; border-radius: 20px; padding: 18px 18px 20px;
  font-family: "Inter", ui-sans-serif, system-ui, sans-serif; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
}
.lt-shs__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.lt-shs__title { margin: 0; font-family: "Fraunces", Georgia, serif; font-size: 20px; font-weight: 700; }
.lt-shs__x { background: none; border: 0; color: #9fb0c6; font-size: 18px; cursor: pointer; padding: 6px; }
.lt-shs__preview {
  display: flex; align-items: center; justify-content: center; background: #0c1830; border-radius: 14px;
  margin: 0 auto 14px; overflow: hidden;
}
.lt-shs__preview--story { width: min(220px, 60vw); aspect-ratio: 9 / 16; }
.lt-shs__preview--square { width: min(300px, 80vw); aspect-ratio: 1 / 1; }
.lt-shs__img { width: 100%; height: 100%; object-fit: contain; display: block; }
.lt-shs__wait { color: #9fb0c6; font-size: 13px; padding: 16px; text-align: center; }
.lt-shs__opts { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
.lt-shs__sizes { display: flex; gap: 8px; }
.lt-shs__size {
  flex: 1; cursor: pointer; border-radius: 12px; padding: 9px 8px; font: 600 12.5px/1.25 "Inter", ui-sans-serif, system-ui, sans-serif;
  color: #cfd7e2; background: rgba(255, 255, 255, 0.05); border: 1.5px solid rgba(255, 255, 255, 0.12);
}
.lt-shs__size.is-on { color: #fff; border-color: hsl(152, 55%, 45%); background: rgba(52, 199, 138, 0.16); }
.lt-shs__check { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #e3e9f1; cursor: pointer; }
.lt-shs__check input { width: 18px; height: 18px; accent-color: hsl(152, 55%, 45%); }
.lt-shs__actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.lt-shs__act {
  cursor: pointer; border-radius: 999px; padding: 11px 10px; font: 700 13.5px/1.2 "Inter", ui-sans-serif, system-ui, sans-serif;
  color: #fff; background: rgba(52, 199, 138, 0.14); border: 1.5px solid hsl(152, 55%, 45%);
}
.lt-shs__act--primary { grid-column: 1 / -1; background: hsl(152, 55%, 45%); }
.lt-shs__act:disabled { opacity: 0.55; cursor: progress; }
.lt-shs__hint { margin: 12px 0 0; font-size: 13px; color: #f0cf9a; }
`;
