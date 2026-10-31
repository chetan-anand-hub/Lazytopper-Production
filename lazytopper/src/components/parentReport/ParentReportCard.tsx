import { TUITION_ANCHOR } from "../../config/pricing";
import { marksWithUnit } from "../../lib/mistakeDisplay";
import {
  MIN_ANSWERS_FOR_REPORT,
  PARENT_REPORT_LINK_LABEL,
  weekTitle,
  type ParentReport,
} from "./parentReportModel";

/**
 * PARENT-REPORT-1 — the 1080 x 1350 weekly report card a student sends to a parent.
 *
 * It renders ONLY a ParentReport (parentReportModel.ts): aggregate numbers, the repo's own
 * mistake labels, the product's own coaching sentences, and an optional first name. It is drawn
 * off-screen and turned into a PNG (runParentReportShare), exactly like SHARE-SCORE-1's card.
 *
 * Three honest states, never a placeholder: "empty" (too few answers marked this week — no
 * figure at all), "activity" (what the student did; nothing named about why marks were lost) and
 * "pattern" (Me's own split, chapters and next steps).
 *
 * PARENT-CARD-2 — visual uplift only (same model, same states, same 1080 x 1350 size): a navy header
 * band, raised stat tiles that overlap it, ONE stacked bar for where the marks went, a "Fix first" line.
 * A tile whose figure the model lacks is dropped, never shown as 0. The page's pay buttons are NOT on
 * this image (the link in the footer is the only call to action).
 *
 * CLAUDE.md 7 — classes only, no inline style objects (the bar is SVG geometry attributes).
 */
// The owner's sentence, with its promise made true: 3 answers START the card (the counts card);
// a mistake pattern may need more, which the activity note then says.
export const EMPTY_EN = `Not enough checked answers this week to show a pattern — check ${MIN_ANSWERS_FOR_REPORT} answers this week to start your card`;
export const EMPTY_HI = `इस हफ़्ते पैटर्न दिखाने के लिए काफ़ी जाँचे गए उत्तर नहीं हैं — अपना कार्ड शुरू करने के लिए इस हफ़्ते ${MIN_ANSWERS_FOR_REPORT} उत्तर जाँचें`;
/** Activity card, reason "few-answers" (below Me's gate) — the only case where this is true. */
export const ACTIVITY_EN = "Not enough checked answers yet to say why marks were lost — a few more this week will show it.";
export const ACTIVITY_HI = "अंक क्यों कटे, यह बताने के लिए अभी काफ़ी उत्तर नहीं — इस हफ़्ते कुछ और उत्तर जाँचने पर दिखेगा।";
/** Activity card, reason "not-ready" (history incomplete / counts do not reconcile) — neutral. */
export const NOT_READY_EN = "The mistake pattern isn’t ready yet — the counts above are this week’s real totals.";
export const NOT_READY_HI = "गलतियों का पैटर्न अभी तैयार नहीं है — ऊपर की संख्याएँ इस हफ़्ते की असली हैं।";
export const CARD_FOOTER = `Month pass: ${TUITION_ANCHOR} · ${PARENT_REPORT_LINK_LABEL}`;
/** PARENT-PAID-1: a paying student's card carries no month-pass line (display only). */
export const CARD_FOOTER_PAID = "lazytopper.com · Made by an IITian (IIT Kanpur)";

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** The stacked bar: SVG geometry attributes (not style), one rect per row, widths = share of the marks lost. */
function MarksBar({ rows, total }: { rows: ParentReport["typeRows"]; total: number }) {
  let x = 0;
  return (
    <svg className="lt-prc__bar" viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden="true" data-testid="prc-bar">
      {rows.map((r) => {
        const w = total > 0 ? (r.marks / total) * 1000 : 0;
        const rect = <rect key={r.key} className={`lt-prc__seg lt-prc__seg--${r.key}`} x={x} y={0} width={w} height={40} />;
        x += w;
        return rect;
      })}
    </svg>
  );
}

export default function ParentReportCard({ report, paid = false }: { report: ParentReport; paid?: boolean }) {
  const thin = report.state === "empty";
  const title = weekTitle(report.firstName, thin);
  const fixFirst = report.chapters[0] ?? null;
  const alsoChapters = report.chapters.slice(1);
  // Crisp: two next steps, one when the legend already runs long (the 1080 x 1350 card never overflows).
  const steps = report.nextSteps.slice(0, report.typeRows.length > 4 ? 1 : 2);
  return (
    <div className="lt-prc" data-testid="parent-report-card" data-state={report.state}>
      <style>{PRC_CSS}</style>
      <div className="lt-prc__band">
        <div className="lt-prc__brand">
          <span className="lt-prc__dot" aria-hidden="true" />
          LazyTopper
          <span className="lt-prc__tag">
            Weekly report <span className="lt-prc__hi">· साप्ताहिक रिपोर्ट</span>
          </span>
        </div>
        <div className="lt-prc__week" data-testid="prc-week">
          {report.weekLabel} · Class 10 CBSE
        </div>
        <div className="lt-prc__title">{title.en}</div>
        <div className="lt-prc__title-hi">{title.hi}</div>
      </div>

      {thin ? (
        <div className="lt-prc__main lt-prc__main--thin">
          {report.answersMarked > 0 && (
            <div className="lt-prc__panel lt-prc__thin-count" data-testid="prc-thin-count">
              <span className="lt-prc__thin-num">{report.answersMarked}</span>
              {report.answersMarked === 1 ? " answer checked this week" : " answers checked this week"}
            </div>
          )}
          <div className="lt-prc__panel" data-testid="prc-empty">
            <p className="lt-prc__empty-en">{EMPTY_EN}</p>
            <p className="lt-prc__empty-hi">{EMPTY_HI}</p>
          </div>
          <div className="lt-prc__panel">
            <div className="lt-prc__hd">How it works</div>
            <ol className="lt-prc__how">
              <li>Write an answer, or tap an MCQ.</li>
              <li>It is marked step by step, like a CBSE examiner.</li>
              <li>Your parents see where marks go — slips, method or concepts.</li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="lt-prc__main">
          <div className="lt-prc__stats">
            <div className="lt-prc__stat" data-testid="prc-answers">
              <div className="lt-prc__num">{report.answersMarked}</div>
              <div className="lt-prc__lbl">Answers checked</div>
              <div className="lt-prc__lbl-hi">जाँचे गए उत्तर</div>
            </div>
            {report.testsTaken > 0 && (
              <div className="lt-prc__stat" data-testid="prc-tests">
                <div className="lt-prc__num">{report.testsTaken}</div>
                <div className="lt-prc__lbl">Tests taken</div>
                <div className="lt-prc__lbl-hi">दिए गए टेस्ट</div>
              </div>
            )}
            {report.marksLost !== null && (
              <div className="lt-prc__stat lt-prc__stat--lost" data-testid="prc-lost">
                <div className="lt-prc__num">{report.marksLost}</div>
                <div className="lt-prc__lbl">Marks to win back</div>
                <div className="lt-prc__lbl-hi">वापस पाने लायक अंक</div>
              </div>
            )}
          </div>

          {report.state === "activity" && (
            <div className="lt-prc__panel lt-prc__note" data-testid="prc-activity-note" data-reason={report.activityReason ?? "not-ready"}>
              <p>{report.activityReason === "few-answers" ? ACTIVITY_EN : NOT_READY_EN}</p>
              <p className="lt-prc__hi">{report.activityReason === "few-answers" ? ACTIVITY_HI : NOT_READY_HI}</p>
            </div>
          )}

          {report.typeRows.length > 0 && report.marksLost !== null && (
            <div className="lt-prc__panel" data-testid="prc-types">
              <div className="lt-prc__hd">
                Where the marks went <span className="lt-prc__hi">· अंक कहाँ गए</span>
              </div>
              <MarksBar rows={report.typeRows} total={report.marksLost} />
              <div className="lt-prc__rows">
                {report.typeRows.map((r) => (
                  <div key={r.key} className="lt-prc__row" data-testid={`prc-type-${r.key}`}>
                    <span className={`lt-prc__sw lt-prc__seg--${r.key}`} aria-hidden="true" />
                    <span className="lt-prc__rl">
                      {r.label}
                      <span className="lt-prc__rh">{r.hindi}</span>
                    </span>
                    <span className="lt-prc__mk">{marksWithUnit(r.marks)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {fixFirst && (
            <div className="lt-prc__fix" data-testid="prc-chapters">
              <div className="lt-prc__fix-main" data-testid="prc-chapter">
                <span className="lt-prc__fix-k">Fix first · पहले ठीक करें</span>
                <span className="lt-prc__fix-v">
                  {fixFirst.label} <span className="lt-prc__fix-m">({marksWithUnit(fixFirst.marks)} lost)</span>
                </span>
              </div>
              {alsoChapters.length > 0 && (
                <div className="lt-prc__fix-more">
                  Then: {alsoChapters.map((c) => `${c.label} (${marksWithUnit(c.marks)})`).join(" · ")}
                </div>
              )}
            </div>
          )}

          {report.wonBack && (
            <div className="lt-prc__won" data-testid="prc-won-back">
              Won back on a later try: {plural(report.wonBack.count, "mistake", "mistakes")}
              {report.wonBack.marks !== null ? ` (${marksWithUnit(report.wonBack.marks)})` : ""}
              <span className="lt-prc__hi"> · बाद में सही करके वापस पाए</span>
            </div>
          )}

          {steps.length > 0 && (
            <div className="lt-prc__panel" data-testid="prc-steps">
              <div className="lt-prc__hd">
                Next <span className="lt-prc__hi">· आगे क्या करें</span>
              </div>
              <ol className="lt-prc__steps">
                {steps.map((st) => (
                  <li key={st}>{st}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      <div className="lt-prc__foot">{paid ? CARD_FOOTER_PAID : CARD_FOOTER}</div>
    </div>
  );
}

const PRC_CSS = `
.lt-prc-stage { position: fixed; left: -20000px; top: 0; pointer-events: none; }
.lt-prc {
  width: 1080px; height: 1350px; box-sizing: border-box; position: relative; overflow: hidden;
  display: flex; flex-direction: column;
  background: #F4F6FB; color: #0B1430;
  font-family: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Nirmala UI", "Noto Sans Devanagari", sans-serif;
}
.lt-prc__hi { font-family: "Noto Sans Devanagari", "Nirmala UI", "Mangal", "Inter", sans-serif; }
.lt-prc__band { background: #0B1430; color: #F4F6FB; padding: 44px 64px 100px; flex-shrink: 0; }
.lt-prc__brand {
  display: flex; align-items: center; gap: 16px;
  font-family: "Fraunces", Georgia, serif; font-weight: 800; font-size: 40px;
}
.lt-prc__dot { width: 22px; height: 22px; border-radius: 50%; background: #3DDC97; }
.lt-prc__tag {
  margin-left: auto; font-family: "Inter", ui-sans-serif, system-ui, sans-serif; font-weight: 600;
  font-size: 24px; color: #AEB8D0;
}
.lt-prc__week { font-size: 28px; color: #AEB8D0; font-weight: 600; margin-top: 18px; }
.lt-prc__title {
  font-family: "Fraunces", Georgia, serif; font-weight: 800; font-size: 68px; line-height: 1.04;
  letter-spacing: -1px; margin-top: 12px; overflow-wrap: anywhere;
}
.lt-prc__title-hi {
  font-family: "Noto Sans Devanagari", "Nirmala UI", "Mangal", sans-serif;
  font-size: 32px; color: #C9D2E6; margin-top: 10px;
}
.lt-prc__main { flex: 1; display: flex; flex-direction: column; gap: 18px; padding: 0 48px; margin-top: -70px; min-height: 0; }
.lt-prc__main--thin { margin-top: 36px; }
.lt-prc__stats { display: flex; gap: 22px; }
.lt-prc__stat {
  flex: 1; min-width: 0; background: #FFFFFF; border-radius: 28px; padding: 22px 24px 20px;
  box-shadow: 0 10px 0 #D7DEEE, 0 22px 34px rgba(11,20,48,0.14);
}
.lt-prc__stat--lost { background: #FFF1EC; box-shadow: 0 10px 0 #F3C6B6, 0 22px 34px rgba(11,20,48,0.14); }
.lt-prc__num {
  font-family: "Fraunces", Georgia, serif; font-weight: 800; font-size: 70px; line-height: 1;
  font-variant-numeric: tabular-nums;
}
.lt-prc__stat--lost .lt-prc__num { color: #B93A17; }
.lt-prc__lbl { font-size: 27px; color: #33405A; margin-top: 12px; font-weight: 700; line-height: 1.2; }
.lt-prc__lbl-hi { font-family: "Noto Sans Devanagari", "Nirmala UI", "Mangal", sans-serif; font-size: 22px; color: #47526B; margin-top: 2px; }
.lt-prc__panel { background: #FFFFFF; border-radius: 28px; padding: 22px 32px; }
.lt-prc__hd { font-size: 31px; font-weight: 800; color: #0B1430; margin-bottom: 12px; }
.lt-prc__hd .lt-prc__hi { font-size: 24px; font-weight: 600; color: #47526B; }
.lt-prc__bar { display: block; width: 100%; height: 36px; border-radius: 18px; overflow: hidden; margin-bottom: 20px; }
.lt-prc__seg { stroke: #FFFFFF; stroke-width: 3px; vector-effect: non-scaling-stroke; }
.lt-prc__seg--conceptual { fill: #0B1430; background: #0B1430; }
.lt-prc__seg--calculation { fill: #E8930C; background: #E8930C; }
.lt-prc__seg--silly { fill: #FFC857; background: #FFC857; }
.lt-prc__seg--presentation { fill: #5B7CFA; background: #5B7CFA; }
.lt-prc__seg--not-attempted { fill: #7B879E; background: #7B879E; }
.lt-prc__seg--untyped { fill: #BCC4D4; background: #BCC4D4; }
.lt-prc__rows { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 30px; }
.lt-prc__row { display: flex; align-items: center; gap: 14px; font-size: 26px; color: #0B1430; min-width: 0; }
.lt-prc__sw { width: 22px; height: 22px; border-radius: 7px; flex-shrink: 0; }
.lt-prc__rl { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; font-weight: 700; }
.lt-prc__rh { font-family: "Noto Sans Devanagari", "Nirmala UI", "Mangal", sans-serif; font-size: 20px; font-weight: 500; color: #47526B; }
.lt-prc__mk { margin-left: auto; font-weight: 800; color: #0B1430; white-space: nowrap; }
.lt-prc__fix { background: #E6F8EF; border-radius: 28px; padding: 20px 32px; display: flex; flex-direction: column; gap: 8px; }
.lt-prc__fix-main { display: flex; flex-direction: column; gap: 4px; }
.lt-prc__fix-k { font-size: 22px; font-weight: 800; color: #145C3D; letter-spacing: 0.04em; }
.lt-prc__fix-v { font-size: 38px; font-weight: 800; color: #0B1430; line-height: 1.15; }
.lt-prc__fix-m { font-size: 28px; font-weight: 700; color: #145C3D; }
.lt-prc__fix-more { font-size: 23px; color: #1F4D38; line-height: 1.3; }
.lt-prc__won { font-size: 25px; font-weight: 700; color: #145C3D; padding: 0 8px; }
.lt-prc__won .lt-prc__hi { font-weight: 500; }
.lt-prc__steps { margin: 0; padding-left: 34px; font-size: 24px; line-height: 1.3; color: #1F2A44; }
.lt-prc__steps li { margin-bottom: 6px; }
.lt-prc__note { font-size: 28px; line-height: 1.4; color: #1F2A44; }
.lt-prc__note p { margin: 0 0 8px; }
.lt-prc__note .lt-prc__hi { font-size: 24px; color: #47526B; }
.lt-prc__thin-count { font-size: 30px; font-weight: 600; color: #33405A; }
.lt-prc__thin-num { font-family: "Fraunces", Georgia, serif; font-size: 64px; font-weight: 800; color: #0B1430; }
.lt-prc__empty-en { font-family: "Fraunces", Georgia, serif; font-size: 38px; line-height: 1.25; margin: 0; font-weight: 700; }
.lt-prc__empty-hi {
  font-family: "Noto Sans Devanagari", "Nirmala UI", "Mangal", sans-serif;
  font-size: 26px; line-height: 1.5; color: #47526B; margin: 16px 0 0;
}
.lt-prc__how { margin: 0; padding-left: 36px; font-size: 28px; line-height: 1.45; color: #1F2A44; }
.lt-prc__foot {
  margin-top: auto; padding: 26px 48px; background: #3DDC97; color: #0B1430;
  font-size: 27px; font-weight: 800; text-align: center; flex-shrink: 0;
}
`;
