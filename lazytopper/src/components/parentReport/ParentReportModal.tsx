import { useEffect, useMemo, useRef, useState } from "react";
import {
  trackParentReportShare,
  trackParentReportShown,
  type ParentReportPlacement,
} from "../../analytics/analytics";
import { readStudyModel, type StudyReadModel } from "../../services/progressReadModel";
import {
  downloadBlob,
  openWhatsAppLink,
  pickShareMethod,
  shareNative,
  type ShareNavigator,
} from "../results/share/shareScore";
import { buildParentReport, firstNameOf, parentReportShareText, type ParentReport } from "./parentReportModel";
import { PARENT_REPORT_FILENAME, renderParentReportPng } from "./parentReportPng";

/**
 * PARENT-REPORT-1 — the "Share with parents" sheet. Loaded only when the student taps the
 * button (ShareWithParentsButton imports it lazily), so the read, the card and html-to-image add
 * nothing to the pages that host the button.
 *
 * On open it reads the shared read model ONCE for the last seven IST days (`istWeek`; synced data
 * only, no Tutor read), builds the card (parentReportModel — the honest states live there), draws
 * the PNG and shows THAT image as the preview, so what the student sees is exactly what is sent.
 * The image is ready before the Share tap, so the tap opens the OS share sheet inside its own
 * user activation; on desktop it opens wa.me with the text and saves the PNG (SHARE-SCORE-1's
 * helpers, reused).
 *
 * Student-initiated only: nothing is sent, stored or remembered about a parent. The first name
 * appears only when the student ticks the box (off by default).
 */

type Phase = "loading" | "ready" | "error";
type SharePhase = "idle" | "busy" | "shared" | "saved" | "failed";

export interface ParentReportModalProps {
  uid: string;
  displayName: string | null;
  placement: ParentReportPlacement;
  onClose: () => void;
  /** Test seam: the read (default: the shared read model). */
  read?: (uid: string) => Promise<StudyReadModel>;
  /** Test seam: the PNG renderer. */
  render?: (report: ParentReport) => Promise<Blob>;
}

function browserNavigator(): ShareNavigator | undefined {
  return typeof navigator === "undefined" ? undefined : (navigator as unknown as ShareNavigator);
}

const defaultRead = (uid: string) => readStudyModel(uid, { window: "istWeek", tutor: false });

export default function ParentReportModal({
  uid,
  displayName,
  placement,
  onClose,
  read = defaultRead,
  render = renderParentReportPng,
}: ParentReportModalProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [model, setModel] = useState<StudyReadModel | null>(null);
  const [showName, setShowName] = useState(false);
  const [png, setPng] = useState<{ blob: Blob; url: string | null } | null>(null);
  const [share, setShare] = useState<SharePhase>("idle");
  const shownSent = useRef(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const firstName = firstNameOf(displayName);

  useEffect(() => {
    let alive = true;
    read(uid)
      .then((m) => {
        if (!alive) return;
        setModel(m);
        setPhase("ready");
      })
      .catch(() => {
        if (alive) setPhase("error");
      });
    return () => {
      alive = false;
    };
  }, [uid, read]);

  const report = useMemo(
    () => (model ? buildParentReport(model, { firstName: showName ? firstName : null }) : null),
    [model, showName, firstName],
  );

  // `parent_report_shown` once per open, when the card is first built: placement + state only.
  useEffect(() => {
    if (!report || shownSent.current) return;
    shownSent.current = true;
    trackParentReportShown(placement, report.state);
  }, [report, placement]);

  // Draw the PNG for the current card (again when the name box changes).
  useEffect(() => {
    if (!report) return;
    let alive = true;
    let url: string | null = null;
    setPng(null);
    render(report)
      .then((blob) => {
        if (!alive) return;
        url = typeof URL !== "undefined" && typeof URL.createObjectURL === "function" ? URL.createObjectURL(blob) : null;
        setPng({ blob, url });
      })
      .catch(() => {
        if (alive) setPhase("error");
      });
    return () => {
      alive = false;
      if (url && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url);
    };
  }, [report, render]);

  useEffect(() => {
    closeRef.current?.focus();
    // Capture on window, so Escape closes THIS sheet only, not a host overlay under it.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const onShare = async () => {
    if (!report || !png || share === "busy") return;
    const text = parentReportShareText(report);
    const file = new File([png.blob], PARENT_REPORT_FILENAME, { type: "image/png" });
    const nav = browserNavigator();
    const method = pickShareMethod(nav, file);
    if (method === "native" && nav) {
      setShare("busy");
      const outcome = await shareNative(nav, file, text);
      if (outcome === "shared") {
        trackParentReportShare(placement, "native");
        setShare("shared");
        return;
      }
      if (outcome === "failed") {
        downloadBlob(png.blob, PARENT_REPORT_FILENAME);
        setShare("failed");
        return;
      }
      setShare("idle");
      return;
    }
    // Desktop: wa.me opens inside this tap; the image is saved for the student to attach.
    const opened =
      typeof window !== "undefined" && typeof window.open === "function"
        ? openWhatsAppLink(text, (url, target) => window.open(url, target))
        : false;
    if (opened) trackParentReportShare(placement, "whatsapp_link");
    downloadBlob(png.blob, PARENT_REPORT_FILENAME);
    setShare("saved");
  };

  return (
    <div
        className="lt-prm"
        role="presentation"
        onClick={(e) => {
          // Portalled, but React still bubbles to the host (e.g. the scorecard overlay): stop here.
          e.stopPropagation();
          onClose();
        }}
      >
      <style>{PRM_CSS}</style>
      <div
        className="lt-prm__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lt-prm-title"
        data-testid="parent-report-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lt-prm__head">
          <h2 id="lt-prm-title" className="lt-prm__title">
            Share with your parents
          </h2>
          <button ref={closeRef} type="button" className="lt-prm__x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <p className="lt-prm__sub">
          This week&rsquo;s totals only — no questions, no answers.
          {firstName ? " Your name is shown only if you tick the box." : ""}
        </p>

        {phase === "error" ? (
          <p className="lt-prm__err" role="status" data-testid="prm-error">
            Couldn&rsquo;t make your report just now. Close this and try again.
          </p>
        ) : !png ? (
          <div className="lt-prm__loading" role="status" data-testid="prm-loading">
            Preparing your weekly report…
          </div>
        ) : (
          <img
            className="lt-prm__img"
            src={png.url ?? undefined}
            alt="Your weekly report card, as your parents will see it"
            data-testid="prm-preview"
          />
        )}

        {firstName && (
          <label className="lt-prm__name">
            <input
              type="checkbox"
              checked={showName}
              onChange={(e) => setShowName(e.target.checked)}
              data-testid="prm-show-name"
            />
            Show my first name ({firstName}) on the card
          </label>
        )}

        <button
          type="button"
          className="lt-prm__share"
          onClick={onShare}
          disabled={!png || share === "busy" || phase === "error"}
          data-testid="prm-share"
        >
          {share === "busy" ? "Opening…" : "Share on WhatsApp"}
        </button>
        {share === "shared" && (
          <p className="lt-prm__ok" role="status" data-testid="prm-done">
            Shared. You can share it again any time.
          </p>
        )}
        {share === "saved" && (
          <p className="lt-prm__ok" role="status" data-testid="prm-saved">
            The image was saved — attach it to the WhatsApp message.
          </p>
        )}
        {share === "failed" && (
          <p className="lt-prm__err" role="status">
            Sharing didn&rsquo;t open, so the image was saved — attach it in WhatsApp.
          </p>
        )}
      </div>
    </div>
  );
}

const PRM_CSS = `
.lt-prm {
  position: fixed; inset: 0; z-index: 1100; background: rgba(9, 16, 30, 0.62);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.lt-prm__sheet {
  width: 100%; max-width: 420px; max-height: calc(100vh - 32px); overflow-y: auto;
  background: #fff; color: #15233a; border-radius: 18px; padding: 18px 18px 20px; box-sizing: border-box;
  font-family: "Inter", ui-sans-serif, system-ui, sans-serif;
}
.lt-prm__head { display: flex; align-items: center; gap: 12px; }
.lt-prm__title { font-family: "Fraunces", Georgia, serif; font-size: 20px; font-weight: 700; margin: 0; }
.lt-prm__x {
  margin-left: auto; border: 0; background: transparent; font-size: 18px; cursor: pointer;
  color: #5b6b82; padding: 4px 8px; border-radius: 8px;
}
.lt-prm__sub { font-size: 13px; color: #5b6b82; margin: 6px 0 12px; line-height: 1.45; }
.lt-prm__img {
  display: block; width: 100%; height: auto; max-height: 58vh; object-fit: contain;
  border-radius: 12px; background: #15233a;
}
.lt-prm__loading {
  display: flex; align-items: center; justify-content: center; aspect-ratio: 1080 / 1350; max-height: 58vh;
  border-radius: 12px; background: #15233a; color: #cfd7e2; font-size: 14px;
}
.lt-prm__name { display: flex; align-items: center; gap: 8px; font-size: 13.5px; margin: 12px 0 0; cursor: pointer; }
.lt-prm__share {
  display: block; width: 100%; margin-top: 14px; padding: 12px 16px; border: 0; border-radius: 999px;
  background: hsl(152, 55%, 40%); color: #fff; font-weight: 700; font-size: 15px; cursor: pointer;
}
.lt-prm__share:disabled { opacity: 0.6; cursor: progress; }
.lt-prm__ok { font-size: 12.5px; color: hsl(152, 55%, 30%); margin: 8px 0 0; }
.lt-prm__err { font-size: 13px; color: #a14a12; margin: 10px 0 0; }
`;
