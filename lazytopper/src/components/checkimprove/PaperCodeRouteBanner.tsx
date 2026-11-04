/**
 * GRADE-ROUTE-1 - a calm offer on the Answer Checker confirm step: "This looks like your worksheet WS-M-MIX-02.
 * Grading it on its worksheet page uses the official answer key and marks."
 *
 * Shows ONLY when the uploaded paper's text carries a worksheet code that is in THIS student's own records.
 * Unknown / someone else's code, signed out, or a read failure -> renders nothing and the page is unchanged.
 * "Grade here anyway" only hides the banner: the grade request is the page's own, byte-identical. Never grades.
 * Lazy-loaded by the page (own chunk). Class-based styling (scoped <style>, the FreeCheckPanels convention).
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { findWorksheetCodes, resolveOwnWorksheet, worksheetUploadHref, type OwnWorksheetMatch } from "./paperCodeMatch";

export interface PaperCodeRouteBannerProps {
  uid: string | null | undefined;
  /** Every piece of text/name the page has for the uploaded paper(s): typed text, read questions, file names. */
  texts: ReadonlyArray<string | null | undefined>;
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

export default function PaperCodeRouteBanner({ uid, texts }: PaperCodeRouteBannerProps) {
  const codes = useMemo(() => findWorksheetCodes(texts), [texts]);
  const codeKey = codes.join("|");
  const [match, setMatch] = useState<OwnWorksheetMatch | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let live = true;
    setMatch(null);
    if (!uid || codes.length === 0) return;
    void resolveOwnWorksheet(codes, uid).then((m) => {
      if (live) setMatch(m);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, codeKey]);

  if (!match || dismissed) return null;
  return (
    <div className="lt-pcr" role="status" data-testid="paper-code-route-banner">
      <style>{CSS}</style>
      <p className="lt-pcr__lead">This looks like your worksheet {match.code}.</p>
      <p className="lt-pcr__body">
        Grading it on its worksheet page uses the official answer key and marks, and the result is saved to that
        worksheet. You will attach your files again there.
      </p>
      <div className="lt-pcr__actions">
        <Link className="lt-pcr__go" to={worksheetUploadHref(match)} data-testid="paper-code-route-go">
          Grade on worksheet page
        </Link>
        <button type="button" className="lt-pcr__skip" onClick={() => setDismissed(true)} data-testid="paper-code-route-skip">
          Grade here anyway
        </button>
      </div>
    </div>
  );
}
