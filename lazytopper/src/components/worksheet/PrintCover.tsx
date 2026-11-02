import { BRAND_MARK_SRC } from "../../config/brandMark";
import { REDOWNLOAD_COPY } from "../../lib/packs/packLabels";

/** The CBSE Class 10 board exam this edition is for (the 2026-27 session sits its boards in 2027). There is no synchronous
 *  helper for this: services/cbseExamDate.ts is a network fetch. Bump it when the next session's packs are issued. */
export const BOARD_EXAM_YEAR = 2027;

// The owner's real brand assets (public/brand/): the fingerprint and the script wordmark.
const BRAND_FINGERPRINT_SRC = BRAND_MARK_SRC.replace(/[^/]+$/, "lazytopper-fingerprint-mark.png");
const BRAND_WORDMARK_SRC = BRAND_MARK_SRC.replace(/[^/]+$/, "lazytopper-wordmark.png");

/**
 * PrintCover - the cover page of a licensed LazyTopper PDF (COVER-CLEAN-1, the approved "Clean Print" design: white page,
 * thin green + navy spine, serif title, fingerprint mark, fact strip, 3-step how-to, licence box). White on purpose: students
 * print these on home printers.
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
  /** Figures for the fact strip. With no `headline`, the first is shown large and the rest as a list beside it; none: no strip. */
  stats: Array<{ value: string; label: string }>;
  /** A pack-level headline figure shown large (e.g. the CBQ pack's "1,400+ CBQs"); `stats` then all go in the list beside it. */
  headline?: { value: string; label: string; note?: string };
  /** The pack's question types, shown as a "Question types" row; the row is left out when empty or absent. */
  types?: readonly string[];
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

/** How the user takes a pack from print to a marked answer. Same three steps on every pack. */
const HOW_STEPS: ReadonlyArray<{ title: string; text: string }> = [
  { title: "Attempt", text: "Solve on paper first, timed, without peeking." },
  { title: "Check", text: "Compare each answer with its step-wise worked solution." },
  { title: "Mark", text: "Upload your answers to the Answer Checker for CBSE step marking." },
];

export function PrintCover({ kicker, title, subtitle, stats, headline, types, licenseeLine, edition }: PrintCoverProps) {
  const big = headline ?? (stats[0] ? { value: stats[0].value, label: stats[0].label } : undefined);
  const rest = (headline ? stats : stats.slice(1)).slice(0, 4);
  const typeList = (types ?? []).filter(Boolean);
  return (
    <div className="lt-cover" data-testid="print-cover">
      <style>{COVER_CSS}</style>
      <div className="lt-cover__spine" />
      <div className="lt-cover__spine2" />

      <div className="lt-cover__hd">
        <img className="lt-cover__wmk" src={BRAND_WORDMARK_SRC} alt="LazyTopper" />
        <div className="lt-cover__board">
          For CBSE Board Exam {BOARD_EXAM_YEAR}
          <span>Class 10</span>
        </div>
      </div>
      <img className="lt-cover__fp" src={BRAND_FINGERPRINT_SRC} alt="" aria-hidden="true" />

      <div className="lt-cover__hero">
        <div className="lt-cover__kicker">{kicker}</div>
        <h1 className={`lt-cover__title lt-cover__title--${titleSize(title)}`}>{title}</h1>
        <p className="lt-cover__sub">{subtitle}</p>
        <div className="lt-cover__iit">
          <i />
          Made by an IITian (IIT Kanpur)
        </div>
      </div>

      {big && (
        <div className={`lt-cover__facts${rest.length === 0 ? " lt-cover__facts--solo" : ""}`}>
          <div className="lt-cover__bigc">
            <div className={`lt-cover__bv${big.value.length > 6 ? " lt-cover__bv--long" : big.value.length > 4 ? " lt-cover__bv--mid" : ""}`}>{big.value}</div>
            <div className="lt-cover__bl">
              {big.label}
              {headline?.note ? <span> · {headline.note}</span> : null}
            </div>
          </div>
          {rest.length > 0 && (
            <div className="lt-cover__small">
              {rest.map((t, i) => (
                <div key={i} className="lt-cover__sm">
                  <b>{t.value}</b>
                  <span>{t.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {typeList.length > 0 && (
        <div className="lt-cover__types">
          <span className="lt-cover__typesl">Question types</span>
          {typeList.map((t) => (
            <span key={t} className="lt-cover__chip">{t}</span>
          ))}
        </div>
      )}

      <div className="lt-cover__how">
        <h3>How to use this pack</h3>
        <ol>
          {HOW_STEPS.map((s, i) => (
            <li key={s.title}>
              <svg className="lt-cover__ok" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="#2fa36b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="lt-cover__n">{i + 1}</span>
              <span className="lt-cover__t">{s.title}</span>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="lt-cover__fill" />

      {licenseeLine && (
        <div className="lt-cover__lic">
          <div>
            <b className="lt-cover__licl">{licenseeLine}</b>
            <div>Please do not share or resell this file.</div>
            <div>{REDOWNLOAD_COPY}.</div>
          </div>
          <span className="lt-cover__k">Your copy</span>
        </div>
      )}
      <div className="lt-cover__foot">
        <b>lazytopper.com</b>
        <span>{edition ? `Edition ${edition}` : ""}</span>
      </div>
    </div>
  );
}

const COVER_CSS = `
.lt-cover { width: ${COVER_W}px; height: ${COVER_H}px; box-sizing: border-box; display: flex; flex-direction: column; padding: 44px 60px 48px 72px;
  background: #ffffff; color: #15233a; font-family: "Inter", ui-sans-serif, system-ui, sans-serif; position: relative; overflow: hidden; }
.lt-cover *, .lt-cover *::before, .lt-cover *::after { box-sizing: border-box; font-variant-numeric: lining-nums; }
.lt-cover__spine { position: absolute; left: 0; top: 0; bottom: 0; width: 12px; background: #2fa36b; }
.lt-cover__spine2 { position: absolute; left: 12px; top: 0; bottom: 0; width: 4px; background: #15233a; }

.lt-cover__hd { display: flex; align-items: center; justify-content: space-between; padding-bottom: 18px; border-bottom: 1.5px solid #15233a; flex-shrink: 0; }
.lt-cover__wmk { height: 50px; width: auto; display: block; }
.lt-cover__board { text-align: right; font-size: 12.5px; letter-spacing: 1.6px; text-transform: uppercase; font-weight: 700; color: #15233a; line-height: 1.5; }
.lt-cover__board span { display: block; font-weight: 500; letter-spacing: 0.3px; text-transform: none; font-size: 13px; color: #3a4a60; }
.lt-cover__fp { position: absolute; top: 150px; right: 44px; height: 300px; width: auto; opacity: 0.95; }

.lt-cover__hero { margin-top: 36px; width: 450px; min-height: 300px; flex-shrink: 0; }
.lt-cover__kicker { font-size: 14px; letter-spacing: 3px; text-transform: uppercase; color: #1d7a50; font-weight: 700; overflow-wrap: anywhere; }
.lt-cover__title { margin: 14px 0 0; font-family: "Fraunces", Georgia, serif; font-weight: 600; line-height: 1; letter-spacing: -1px; color: #15233a; overflow-wrap: anywhere; }
.lt-cover__title--l { font-size: 76px; }
.lt-cover__title--m { font-size: 54px; }
.lt-cover__title--s { font-size: 40px; }
.lt-cover__sub { margin: 20px 0 0; font-size: 18px; line-height: 1.5; color: #2a3a52; max-width: 440px; }
.lt-cover__iit { display: inline-flex; align-items: center; gap: 8px; margin-top: 22px; font-size: 13.5px; font-weight: 600; color: #15233a;
  border: 1.5px solid #15233a; border-radius: 999px; padding: 6px 14px 6px 10px; }
.lt-cover__iit i { width: 8px; height: 8px; border-radius: 50%; background: #2fa36b; display: block; }

.lt-cover__facts { margin-top: 18px; display: grid; grid-template-columns: 1.25fr 1fr; border-top: 1.5px solid #15233a; border-bottom: 1.5px solid #15233a; flex-shrink: 0; }
.lt-cover__facts--solo { grid-template-columns: minmax(0, 1fr); }
.lt-cover__bigc { padding: 20px 22px 18px 0; border-right: 1px solid #c5cfdb; min-width: 0; }
.lt-cover__facts--solo .lt-cover__bigc { border-right: 0; }
.lt-cover__bv { font-weight: 800; font-size: 92px; line-height: 0.95; letter-spacing: -4px; color: #15233a; overflow-wrap: anywhere; }
.lt-cover__bv--mid { font-size: 76px; letter-spacing: -3px; }
.lt-cover__bv--long { font-size: 44px; letter-spacing: -1px; line-height: 1.05; }
.lt-cover__bl { font-size: 16px; line-height: 1.4; font-weight: 600; margin-top: 8px; color: #15233a; }
.lt-cover__bl span { font-weight: 400; color: #3a4a60; }
.lt-cover__small { padding: 16px 0 14px 24px; display: flex; flex-direction: column; justify-content: center; gap: 11px; min-width: 0; }
.lt-cover__sm { display: flex; align-items: baseline; gap: 10px; font-size: 15px; line-height: 1.35; color: #2a3a52; }
.lt-cover__sm b { font-family: "Fraunces", Georgia, serif; font-size: 26px; font-weight: 600; color: #15233a; min-width: 62px; flex-shrink: 0; }
.lt-cover__sm span { min-width: 0; overflow-wrap: anywhere; }

.lt-cover__types { margin-top: 18px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; flex-shrink: 0; }
.lt-cover__typesl { font-size: 12.5px; letter-spacing: 1.6px; text-transform: uppercase; font-weight: 700; color: #3a4a60; margin-right: 4px; }
.lt-cover__chip { font-size: 13.5px; font-weight: 600; color: #15233a; border: 1.2px solid #8a9ab0; border-radius: 6px; padding: 5px 10px; }

.lt-cover__how { margin-top: 26px; flex-shrink: 0; }
.lt-cover__how h3 { margin: 0 0 10px; font-size: 12.5px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; color: #1d7a50; }
.lt-cover__how ol { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.lt-cover__how li { border: 1.2px solid #c5cfdb; border-radius: 10px; padding: 12px 14px; position: relative; }
.lt-cover__ok { position: absolute; top: 12px; right: 12px; }
.lt-cover__n { display: inline-flex; width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid #15233a; align-items: center; justify-content: center;
  font-size: 12.5px; font-weight: 700; margin-right: 8px; }
.lt-cover__t { font-size: 15px; font-weight: 700; vertical-align: middle; }
.lt-cover__how p { margin: 7px 0 0; font-size: 13px; line-height: 1.45; color: #2a3a52; }

.lt-cover__fill { flex-grow: 1; min-height: 16px; }
.lt-cover__lic { border: 1.5px dashed #8a9ab0; border-radius: 10px; padding: 12px 18px; font-size: 13px; line-height: 1.5; color: #2a3a52;
  display: flex; justify-content: space-between; gap: 16px; align-items: center; margin-bottom: 20px; flex-shrink: 0; }
.lt-cover__licl { color: #15233a; font-weight: 700; overflow-wrap: anywhere; }
.lt-cover__k { font-size: 11.5px; letter-spacing: 1.6px; text-transform: uppercase; font-weight: 700; color: #1d7a50; white-space: nowrap; }
.lt-cover__foot { display: flex; justify-content: space-between; font-size: 13px; color: #3a4a60; border-top: 1px solid #c5cfdb; padding-top: 12px; flex-shrink: 0; }
.lt-cover__foot b { color: #15233a; font-weight: 700; }
`;

export default PrintCover;
