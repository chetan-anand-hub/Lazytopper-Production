import type { ReactNode } from "react";
import { BRIDGE_IMG, type BridgePagesData } from "../../lib/packs/packBridge";
import { MARKS_HEADING } from "../../lib/mistakeDisplay";

/**
 * PrintBridgePages - pages 2 and 3 of every PURCHASED pack PDF (BRIDGE-PDF-1; approved designs bridge-approved/Main.dc.html and
 * ScorecardViews.dc.html, owner 8 Nov 2026 19:38). Copy is the approved copy, verbatim; only the header (this pack) and the example
 * code (a code from this pack) change per file. The sample images and "What the marking caught" are the ONE real sample paper,
 * PK-M-RN-CT1, written by our team with deliberate mistakes - labelled as such on both pages.
 *
 * Rendered by worksheetPdfExport into an A4-shaped host (794 x 1123 CSS px), rasterised, and placed right after the cover. Loaded
 * with a dynamic import() from the export path only, never part of the entry chunk. Elements carrying `data-pdf-link` become
 * clickable link areas in the PDF (their target is the attribute value).
 */

export const BRIDGE_W = 794;
export const BRIDGE_H = 1123;

/** The six lines of "What the marking caught", from the sample's real scorecard. */
const CAUGHT: ReadonlyArray<{ what: ReactNode; mark: string }> = [
  { what: <>Q7 · answer <b>x = 60</b>, no unit</>, mark: "−½ · Presentation" },
  { what: "Q10 · used HCF where LCM was needed", mark: "−1 · Concept gap" },
  { what: "Q11 · copied 1512 as 1152 from own line", mark: "−½ · Silly slip" },
  { what: "Q14 · 5000 ÷ 25 = 250; later steps still credited", mark: "−½ · Calculation" },
  { what: "Q3 · wrong option, marked on the answer alone", mark: "0 / 1" },
  { what: "Q9 · left blank", mark: "0 / 2" },
];

const VIEWS: ReadonlyArray<{ alt: string; label: ReactNode }> = [
  { alt: "Scorecard first view: 25.5 out of 31 and what to fix first", label: <><b>1 · Your score</b> and the one thing to fix first</> },
  { alt: "Marks by section and by concept", label: <><b>2 · By section and concept</b> — where the paper went well</> },
  // The scorecard's own heading (lib/mistakeDisplay.ts MARKS_HEADING, "Where your marks went"), never a hard-coded copy (G4 guard).
  { alt: `${MARKS_HEADING}: careless slips, not attempted`, label: <><b>3 · {MARKS_HEADING}</b> — concept gap, slips, presentation</> },
  { alt: "Question 10 marked 1 out of 2: LCM needed, not HCF", label: <><b>4 · Each answer, step by step</b> — Q10, HCF used where LCM was needed</> },
  { alt: "Question 11 marked 2.5 out of 3: 1512 miscopied as 1152", label: <><b>5 · Silly slips caught</b> — Q11, 1512 copied as 1152</> },
  { alt: "Question 14 marked 3.5 out of 4 with error carried forward", label: <><b>6 · Fair like the board</b> — Q14, later steps credited after a slip</> },
];

export interface BridgePageProps {
  data: BridgePagesData;
  /** Link targets (absolute URLs) the exporter turns into PDF link areas. */
  links: { packs: string; pricing: string; sample: string };
}

/** Page 2 - "Get this paper marked like a CBSE examiner". */
export function PrintBridgeMarkPage({ data, links }: BridgePageProps) {
  return (
    <div className="lt-br" data-testid="print-bridge-mark">
      <style>{BRIDGE_CSS}</style>
      <div className="lt-br__hd">
        <span className="lt-br__pk">{data.packLabel}</span>
        <span className="lt-br__site">lazytopper.com</span>
      </div>

      <div className="lt-br__intro">
        <h1 className="lt-br__h1">Get this paper marked like a CBSE examiner</h1>
        <p className="lt-br__lede">Write your answers on paper, then upload a photo. You get your marks step by step, where each half-mark went, and what to fix first.</p>
      </div>

      <div className="lt-br__steps">
        <div className="lt-br__step">
          <span className="lt-br__stepn">STEP 1</span>
          <span className="lt-br__stept">Write your answers</span>
          <span className="lt-br__stepb">On plain paper. Write the paper code at the top — it is printed on every paper{data.exampleCode ? <>, e.g. <b className="lt-br__code">{data.exampleCode}</b>. Or photograph the QR at the bottom of the paper</> : null}.</span>
        </div>
        <div className="lt-br__step">
          <span className="lt-br__stepn">STEP 2</span>
          <span className="lt-br__stept">Open My packs</span>
          <span className="lt-br__stepb">
            Sign in at <b data-pdf-link={links.packs}>lazytopper.com/packs</b> with the email or phone number you bought with, and tap the paper.
          </span>
        </div>
        <div className="lt-br__step">
          <span className="lt-br__stepn">STEP 3</span>
          <span className="lt-br__stept">Upload and get marked</span>
          <span className="lt-br__stepb">Tap your MCQ options, add a photo of each page. Marks arrive in about a minute.</span>
        </div>
      </div>

      <div className="lt-br__real">
        <div className="lt-br__realL">
          <span className="lt-br__cap">A real marked paper</span>
          <div className="lt-br__shot lt-br__shot--total">
            <img src={BRIDGE_IMG.total} alt="Scorecard: Real Numbers Chapter Test 1, 25.5 out of 31" />
          </div>
          <span className="lt-br__note">This paper (PK-M-RN-CT1) was written by our team with six deliberate mistakes, then marked by LazyTopper exactly as yours will be.</span>
        </div>
        <div className="lt-br__realR">
          <span className="lt-br__cap">What the marking caught</span>
          <div className="lt-br__caught">
            {CAUGHT.map((c, i) => (
              <div key={i} className="lt-br__crow">
                <span>{c.what}</span>
                <span className="lt-br__cmark">{c.mark}</span>
              </div>
            ))}
          </div>
          <div className="lt-br__shot lt-br__shot--q7">
            <img src={BRIDGE_IMG.q7} alt="Question 7 marked 1.5 out of 2: write the unit cm with your final answer" />
          </div>
        </div>
      </div>

      {data.boardPassCard && (
        <div className="lt-br__pass" data-testid="print-bridge-pass">
          <span className="lt-br__passh">Every account gets its first paper of each kind marked free.</span>
          <span className="lt-br__passb">
            This pack gives you every question at once. <b>Board Pass</b> marks every paper you write till your boards — with CBSE examiner style marking, practice aimed at the topics where you lose marks, and your personal tutor for any doubt.
          </span>
          <span className="lt-br__passl" data-pdf-link={links.pricing}>lazytopper.com/pricing</span>
        </div>
      )}

      <div className="lt-br__foot">
        <span>CBSE Class 10 · 2026-27 syllabus</span>
        <span>Page 2</span>
      </div>
    </div>
  );
}

/** Page 3 - "What you get back, screen by screen". */
export function PrintBridgeViewsPage({ data, links }: BridgePageProps) {
  return (
    <div className="lt-br lt-br--views" data-testid="print-bridge-views">
      <style>{BRIDGE_CSS}</style>
      <div className="lt-br__hd">
        <span className="lt-br__pk">{data.packLabel}</span>
        <span className="lt-br__site">lazytopper.com</span>
      </div>
      <div className="lt-br__intro lt-br__intro--tight">
        <h1 className="lt-br__h1 lt-br__h1--s">What you get back, screen by screen</h1>
        <p className="lt-br__lede lt-br__lede--s">The scorecard for the sample paper PK-M-RN-CT1 — 25.5 / 31. Scroll down it on your phone the same way.</p>
      </div>

      <div className="lt-br__grid">
        {VIEWS.map((v, i) => (
          <div key={i} className="lt-br__view">
            <div className="lt-br__shot lt-br__shot--tile">
              <img src={BRIDGE_IMG.views[i]} alt={v.alt} />
            </div>
            <span className="lt-br__vl">{v.label}</span>
          </div>
        ))}
      </div>

      <div className="lt-br__next">
        <div className="lt-br__shot lt-br__shot--tile">
          <img src={BRIDGE_IMG.next} alt="What next: graded answer sheet, practise the marks you lost, solution key" />
        </div>
        <div className="lt-br__nextt">
          <span className="lt-br__nexth">7 · Then: a graded answer sheet PDF</span>
          <span className="lt-br__nextb">Every answer marked step by step with "should be" lines, ready to keep in your file — plus practice for the marks you lost.</span>
          <span className="lt-br__nextb">
            The full sample graded sheet is in <b data-pdf-link={links.sample}>My packs → See a marked sample</b>.
          </span>
        </div>
      </div>

      <div className="lt-br__foot">
        <span>Sample paper written by our team with deliberate mistakes; marked by LazyTopper.</span>
        <span>Page 3</span>
      </div>
    </div>
  );
}

const BRIDGE_CSS = `
/* Page 2 runs 20 px tighter than the mock-up (gap 26 -> 20, top 56 -> 48): with the real fonts its last line (the footer) fell off A4. */
.lt-br { width: ${BRIDGE_W}px; height: ${BRIDGE_H}px; box-sizing: border-box; padding: 48px 60px 44px; background: #ffffff;
  font-family: "Inter", ui-sans-serif, system-ui, sans-serif; color: #0f1b33; display: flex; flex-direction: column; gap: 20px; overflow: hidden; }
.lt-br--views { gap: 22px; }
.lt-br *, .lt-br *::before, .lt-br *::after { box-sizing: border-box; }
.lt-br b { color: #0f1b33; }
.lt-br__code { white-space: nowrap; }
.lt-br__hd { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #0f1b33; padding-bottom: 12px; gap: 16px; }
.lt-br__pk { font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #46536b; min-width: 0; overflow-wrap: anywhere; }
.lt-br__site { font-size: 13px; color: #46536b; flex-shrink: 0; }
.lt-br__intro { display: flex; flex-direction: column; gap: 8px; }
.lt-br__intro--tight { gap: 6px; }
.lt-br__h1 { margin: 0; font-family: "Fraunces", Georgia, serif; font-weight: 600; font-size: 40px; line-height: 1.1; color: #0f1b33; }
.lt-br__h1--s { font-size: 32px; line-height: 1.15; }
.lt-br__lede { margin: 0; font-size: 16px; line-height: 1.5; color: #33405a; max-width: 600px; }
.lt-br__lede--s { font-size: 14px; max-width: none; }
.lt-br__steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.lt-br__step { border: 1px solid #d5dbe6; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 6px; }
.lt-br__stepn { font-size: 13px; font-weight: 700; color: #15803d; }
.lt-br__stept { font-size: 15px; font-weight: 600; }
.lt-br__stepb { font-size: 13px; line-height: 1.45; color: #46536b; overflow-wrap: anywhere; }
.lt-br__real { display: flex; gap: 24px; align-items: flex-start; }
.lt-br__realL { display: flex; flex-direction: column; gap: 8px; width: 300px; flex-shrink: 0; }
.lt-br__realR { display: flex; flex-direction: column; gap: 10px; flex: 1; min-width: 0; }
.lt-br__cap { font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #46536b; }
.lt-br__note { font-size: 11px; line-height: 1.4; color: #5a667d; }
.lt-br__shot { position: relative; overflow: hidden; background: #0f1b33; }
.lt-br__shot img { display: block; width: 100%; height: 100%; }
.lt-br__shot--total { width: 300px; height: 302px; border-radius: 12px; }
.lt-br__shot--q7 { width: 100%; height: 150px; border-radius: 10px; margin-top: 4px; }
.lt-br__shot--tile { width: 210px; height: 212px; border-radius: 10px; flex-shrink: 0; }
.lt-br__caught { display: flex; flex-direction: column; gap: 8px; font-size: 13px; line-height: 1.4; }
.lt-br__crow { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid #e6eaf1; padding-bottom: 6px; }
.lt-br__crow:last-child { border-bottom: 0; padding-bottom: 0; }
.lt-br__cmark { font-weight: 600; white-space: nowrap; }
.lt-br__pass { background: #f0f7f2; border: 1px solid #bfe0c9; border-radius: 14px; padding: 18px 20px; display: flex; flex-direction: column; gap: 10px; }
.lt-br__passh { font-size: 16px; font-weight: 700; color: #0f1b33; }
.lt-br__passb { font-size: 14px; line-height: 1.5; color: #33405a; }
.lt-br__passl { align-self: flex-start; font-size: 13px; color: #15803d; font-weight: 600; }
.lt-br__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px 22px; }
.lt-br__view { display: flex; flex-direction: column; gap: 6px; }
.lt-br__vl { font-size: 12px; line-height: 1.4; }
.lt-br__next { display: flex; gap: 22px; align-items: center; border: 1px solid #d5dbe6; border-radius: 14px; padding: 16px 18px; }
.lt-br__nextt { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.lt-br__nexth { font-size: 15px; font-weight: 700; }
.lt-br__nextb { font-size: 13px; line-height: 1.5; color: #33405a; }
.lt-br__foot { margin-top: auto; display: flex; justify-content: space-between; gap: 16px; font-size: 11px; color: #5a667d; border-top: 1px solid #e6eaf1; padding-top: 10px; }
`;

export default PrintBridgeMarkPage;
