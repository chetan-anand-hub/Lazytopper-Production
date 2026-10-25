import { BRAND_MARK_SRC } from "../../config/brandMark";
import { REDOWNLOAD_COPY } from "../../lib/packs/packLabels";

/** The CBSE Class 10 board exam this edition is for (the 2026-27 session sits its boards in 2027). There is no synchronous
 *  helper for this: services/cbseExamDate.ts is a network fetch. Bump it when the next session's packs are issued. */
export const BOARD_EXAM_YEAR = 2027;

// The owner's real brand assets (public/brand/): the fingerprint and the script wordmark.
const BRAND_FINGERPRINT_SRC = BRAND_MARK_SRC.replace(/[^/]+$/, "lazytopper-fingerprint-mark.png");
const BRAND_WORDMARK_SRC = BRAND_MARK_SRC.replace(/[^/]+$/, "lazytopper-wordmark.png");

/**
 * PrintCover - the navy cover page of a licensed LazyTopper PDF (PDF-REBRAND-1, the approved mock-up "Main").
 *
 * Rendered by worksheetPdfExport into its own A4-shaped host (COVER_W x COVER_H CSS px = 210 x 297 mm at 96 dpi),
 * rasterised, and placed as page 1. It is loaded with a dynamic import() from the export path only, so it is never
 * part of the app's entry chunk.
 */

/** A4 at 96 dpi. */
export const COVER_W = 794;
export const COVER_H = 1123;

export interface PrintCoverProps {
  /** Small caps line above the title, e.g. "Maths · Chapter Pack". */
  kicker: string;
  title: string;
  subtitle: string;
  /** One to four figures shown as tiles under the subtitle. */
  stats: Array<{ value: string; label: string }>;
  /** "Licensed to <name> · <email> · Order <id> — personal use only"; the box is left out when absent. */
  licenseeLine?: string;
  /** Printed bottom right as "Edition <date>", e.g. "25 Oct 2026"; left out when empty. */
  edition?: string;
}

function titleSize(title: string): "l" | "m" | "s" {
  if (title.length > 40) return "s";
  if (title.length > 22) return "m";
  return "l";
}

export function PrintCover({ kicker, title, subtitle, stats, licenseeLine, edition }: PrintCoverProps) {
  const tiles = stats.slice(0, 4);
  return (
    <div className="lt-cover" data-testid="print-cover">
      <style>{COVER_CSS}</style>
      <div className="lt-cover__bar" />
      <div className="lt-cover__panel">
        <div className="lt-cover__board">For CBSE Board Exam {BOARD_EXAM_YEAR}</div>
        <img className="lt-cover__fp" src={BRAND_FINGERPRINT_SRC} alt="" aria-hidden="true" />
        <img className="lt-cover__wmk" src={BRAND_WORDMARK_SRC} alt="LazyTopper" />
      </div>

      <div className="lt-cover__band">
      <div className="lt-cover__hero">
        <div className="lt-cover__kicker">{kicker}</div>
        <h1 className={`lt-cover__title lt-cover__title--${titleSize(title)}`}>{title}</h1>
        <p className="lt-cover__sub">{subtitle}</p>
      </div>

      {tiles.length > 0 && (
        <div className={`lt-cover__stats lt-cover__stats--${tiles.length}`}>
          {tiles.map((t, i) => (
            <div key={i} className="lt-cover__stat">
              <div className="lt-cover__statv">{t.value}</div>
              <div className="lt-cover__statl">{t.label}</div>
            </div>
          ))}
        </div>
      )}

      <ul className="lt-cover__points">
        <li>Past board questions are tagged with their year and set</li>
        <li>Step marks shown the way CBSE examiners award them</li>
        <li>Get your test answers marked in the LazyTopper app</li>
      </ul>

      <div className="lt-cover__fill" />

      {licenseeLine && (
        <div className="lt-cover__lic">
          <div className="lt-cover__licl">{licenseeLine}</div>
          <div>For your personal study only. Please do not share or resell this file.</div>
          <div>{REDOWNLOAD_COPY}.</div>
        </div>
      )}
      <div className="lt-cover__foot">
        <span>lazytopper.com</span>
        <span>{edition ? `Edition ${edition}` : ""}</span>
      </div>
      </div>
    </div>
  );
}

const COVER_CSS = `
.lt-cover { width: ${COVER_W}px; height: ${COVER_H}px; box-sizing: border-box; display: flex; flex-direction: column;
  background: #ffffff; color: #ffffff; font-family: "Inter", ui-sans-serif, system-ui, sans-serif; position: relative; overflow: hidden; }
.lt-cover__bar { height: 10px; background: #3fbf82; flex-shrink: 0; }
.lt-cover__panel { background: #ffffff; flex-shrink: 0; height: 392px; box-sizing: border-box; padding: 34px 64px 0; display: flex;
  flex-direction: column; align-items: center; position: relative; }
.lt-cover__board { position: absolute; right: 64px; top: 34px; font-size: 14px; letter-spacing: 1.5px; text-transform: uppercase; color: #3a4a60; font-weight: 600; }
.lt-cover__fp { height: 236px; width: auto; display: block; margin-top: 12px; }
.lt-cover__wmk { height: 84px; width: auto; display: block; margin-top: 10px; }

.lt-cover__band { flex: 1; background: #15233a; display: flex; flex-direction: column; min-height: 0; }
.lt-cover__hero { padding: 40px 64px 0; display: flex; flex-direction: column; gap: 14px; }
.lt-cover__kicker { font-size: 15px; letter-spacing: 2px; text-transform: uppercase; color: #3fbf82; font-weight: 600; }
.lt-cover__title { margin: 0; font-family: "Fraunces", Georgia, serif; font-weight: 600; line-height: 1.05; overflow-wrap: anywhere; color: #ffffff; }
.lt-cover__title--l { font-size: 66px; }
.lt-cover__title--m { font-size: 52px; }
.lt-cover__title--s { font-size: 40px; }
.lt-cover__sub { margin: 0; font-size: 19px; line-height: 1.5; color: #ffffff; max-width: 600px; }

.lt-cover__stats { margin: 30px 64px 0; display: grid; gap: 14px; }
.lt-cover__stats--1 { grid-template-columns: minmax(0, 1fr); }
.lt-cover__stats--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.lt-cover__stats--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.lt-cover__stats--4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.lt-cover__stat { border: 1px solid #5a6f8f; border-radius: 12px; padding: 16px 18px 14px; display: flex; flex-direction: column; gap: 4px; }
.lt-cover__statv { font-family: "Fraunces", Georgia, serif; font-size: 32px; font-weight: 600; color: #ffffff; }
.lt-cover__statl { font-size: 15px; color: #e9eef5; }

.lt-cover__points { list-style: none; margin: 26px 64px 0; padding: 0; display: flex; flex-direction: column; gap: 8px; font-size: 16px; color: #ffffff; }
.lt-cover__points li { display: flex; gap: 10px; align-items: center; }
.lt-cover__points li::before { content: ""; width: 8px; height: 8px; border-radius: 4px; background: #3fbf82; flex-shrink: 0; }

.lt-cover__fill { flex-grow: 1; }
.lt-cover__lic { margin: 0 64px; padding: 14px 18px; border-radius: 12px; background: #1d2f4b; font-size: 14px; line-height: 1.5; color: #e9eef5; }
.lt-cover__licl { font-weight: 600; color: #ffffff; overflow-wrap: anywhere; }
.lt-cover__foot { padding: 16px 64px 34px; display: flex; justify-content: space-between; font-size: 14px; color: #e9eef5; }
`;

export default PrintCover;
