/**
 * GRADE-ROUTE-1 - a calm offer on the Answer Checker confirm step: "This looks like your worksheet WS-M-MIX-02.
 * Grading it on its worksheet page uses the official answer key and marks."
 *
 * Shows ONLY when the uploaded paper's text carries a worksheet code that is in THIS student's own records AND
 * (GRADE-ROUTE-3) the upload IS the paper stored under that code: its first questions are found in what the page has
 * read (the PDF's first-page text, or the read questions once "Read the question" ran). A code that matches a
 * DIFFERENT paper (pre-#1556 codes could repeat), a stored paper without question texts, or nothing to compare yet
 * -> no offer.
 * Unknown / someone else's code, signed out, or a read failure -> renders nothing and the page is unchanged.
 * "Grade here anyway" only hides the banner: the grade request is the page's own, byte-identical. Never grades.
 * BRIDGE-CODES-1 - a PACK paper code (`PK-...`, CBQ Pack documents included) is unique to one paper by construction (pinned),
 * so the code alone identifies it: typing it with the upload is enough. A pack code that is NOT saved on this account (a
 * positive server answer - never a read failure) gets an honest note pointing to My packs instead: nothing is graded against
 * a paper the student has not downloaded.
 * Lazy-loaded by the page (own chunk). Class-based styling (scoped <style>, the FreeCheckPanels convention).
 */
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { trackNamedEvent } from "../../analytics/analytics";
import { findPaperCodes, isPackPaperCode, isSamePaper, resolveOwnPaper, type OwnPaperMatch } from "./paperCodeMatch";
import { readPdfPaperText } from "./pdfPaperText";
import { decodePaperCodeFromImage } from "./decodePaperCode";

export interface PaperCodeRouteBannerProps {
  uid: string | null | undefined;
  /** Every piece of text/name the page has for the uploaded paper(s): typed text, read questions, file names. */
  texts: ReadonlyArray<string | null | undefined>;
  /** The uploaded files (base64 + mime): a PDF's metadata and first-page text are read in the browser (no model call). */
  files?: ReadonlyArray<{ base64: string | null; mime: string } | null>;
}

const CSS = `
.lt-pcr { box-sizing: border-box; width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid hsl(152, 30%, 80%);
  background: hsl(152, 40%, 96%); color: hsl(220, 25%, 14%); font-size: 0.9rem; line-height: 1.5; }
.lt-pcr__lead { margin: 0 0 4px; font-weight: 700; overflow-wrap: anywhere; }
.lt-pcr__body { margin: 0 0 10px; color: hsl(220, 15%, 32%); }
.lt-pcr__actions { display: flex; flex-wrap: wrap; gap: 8px; }
.lt-pcr__go, .lt-pcr__skip { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; padding: 8px 14px;
  border-radius: 10px; font: inherit; font-weight: 700; text-decoration: none; cursor: pointer; }
.lt-pcr__go { background: hsl(152, 55%, 30%); color: #fff; border: 1px solid hsl(152, 55%, 30%); }
.lt-pcr__skip { background: transparent; color: hsl(220, 25%, 22%); border: 1px solid hsl(220, 18%, 78%); }
`;

export default function PaperCodeRouteBanner({ uid, texts, files }: PaperCodeRouteBannerProps) {
  const [pdfTexts, setPdfTexts] = useState<string[]>([]);
  const fileKey = (files ?? []).map((f) => (f?.base64 ? `${f.mime}:${f.base64.length}:${f.base64.slice(0, 32)}` : "")).join("|");

  // A3/B3 - the PDF's own Title/Subject + first-page text, or an image's footer QR (deterministic; survives a renamed file).
  useEffect(() => {
    let live = true;
    setPdfTexts([]);
    const present = (files ?? []).filter((f): f is { base64: string; mime: string } => !!f?.base64);
    if (!uid || present.length === 0) return;
    // A PDF: its metadata + first-page text. An image/scan: the footer QR, decoded in the browser (B3).
    void Promise.all(
      present.map(async (f) => {
        if (f.mime === "application/pdf") return readPdfPaperText(f.base64, f.mime);
        if (f.mime.startsWith("image/")) {
          const t = await decodePaperCodeFromImage({ base64: f.base64, mime: f.mime });
          return t ? [t] : [];
        }
        return [];
      }),
    ).then((all) => {
      if (live) setPdfTexts(all.flat());
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, fileKey]);

  const codes = useMemo(() => findPaperCodes([...texts, ...pdfTexts]), [texts, pdfTexts]);
  const codeKey = codes.join("|");
  const [candidate, setCandidate] = useState<OwnPaperMatch | null>(null);
  const [packNotSaved, setPackNotSaved] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let live = true;
    setCandidate(null);
    setPackNotSaved(null);
    if (!uid || codes.length === 0) return;
    void resolveOwnPaper(codes, uid).then(async (m) => {
      if (!live) return;
      setCandidate(m);
      if (m) return;
      // BRIDGE-CODES-1: no offer for a pack code -> is it simply not on this account? Only a positive "no" is said.
      const pack = codes.find(isPackPaperCode);
      if (!pack) return;
      const { packCodeSavedOnAccount } = await import("./packCodeSaved");
      const saved = await packCodeSavedOnAccount(uid, pack);
      if (live && saved === false) setPackNotSaved(pack);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, codeKey]);

  // GRADE-ROUTE-3 - the code is not enough: offer only when the upload IS the stored paper.
  const match = useMemo(
    () =>
      candidate && (isPackPaperCode(candidate.code) || isSamePaper(candidate.storedQuestions, [...texts, ...pdfTexts])) ? candidate : null,
    [candidate, texts, pdfTexts],
  );
  const shownFor = match?.code ?? null;
  // Fired in the SAME commit that puts the banner on screen (layout effect), not on a later passive-effect tick:
  // "shown" is true exactly when the banner is in the DOM.
  useLayoutEffect(() => {
    if (shownFor && !dismissed) trackNamedEvent("grade_route_offer_shown");
  }, [shownFor, dismissed]);

  if (dismissed) return null;
  if (!match && packNotSaved) {
    return (
      <div className="lt-pcr" role="status" data-testid="paper-code-pack-note">
        <style>{CSS}</style>
        <p className="lt-pcr__lead">{packNotSaved} is a paper from a LazyTopper PDF pack.</p>
        <p className="lt-pcr__body">
          It is not in your papers on this account yet. If you bought the pack with this account, download this paper once
          from My packs on the PDF packs page. It then waits on Home under &ldquo;Papers waiting for your answers&rdquo;,
          ready to be marked against its own answer key. If you haven&rsquo;t bought it, you can still check your answers
          here, question by question.
        </p>
        <div className="lt-pcr__actions">
          {/* FU-4 (review 1643): an owner lands on My packs; anyone else lands on the PDF packs page - the label says so. */}
          <Link className="lt-pcr__go" to="/packs#my-packs" data-testid="paper-code-pack-note-go">
            Go to PDF packs
          </Link>
          <button type="button" className="lt-pcr__skip" onClick={() => setDismissed(true)} data-testid="paper-code-route-skip">
            Grade here anyway
          </button>
        </div>
      </div>
    );
  }
  if (!match) return null;
  const own = match.surface === "worksheet" ? "worksheet" : match.surface === "chapter-test" ? "Chapter Test" : "Full Mock";
  return (
    <div className="lt-pcr" role="status" data-testid="paper-code-route-banner">
      <style>{CSS}</style>
      <p className="lt-pcr__lead">This looks like your {own} {match.code}.</p>
      <p className="lt-pcr__body">
        Grading it on its own page uses the official answer key and marks, and the result is saved to that {own}.
        You will attach your files again there.
      </p>
      <div className="lt-pcr__actions">
        <Link
          className="lt-pcr__go"
          to={match.href}
          data-testid="paper-code-route-go"
          onClick={() => trackNamedEvent("grade_route_offer_accepted")}
        >
          Grade on its own page
        </Link>
        <button type="button" className="lt-pcr__skip" onClick={() => setDismissed(true)} data-testid="paper-code-route-skip">
          Grade here anyway
        </button>
      </div>
    </div>
  );
}
