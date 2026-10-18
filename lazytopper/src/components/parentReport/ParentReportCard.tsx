import { TUITION_ANCHOR } from "../../config/pricing";
import { marksWithUnit } from "../../lib/mistakeDisplay";
import {
  MIN_ANSWERS_FOR_REPORT,
  PARENT_REPORT_LINK_LABEL,
  reportTitle,
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
 * CLAUDE.md 7 — classes only, no inline style objects.
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

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export default function ParentReportCard({ report }: { report: ParentReport }) {
  const title = reportTitle(report.firstName);
  return (
    <div className="lt-prc" data-testid="parent-report-card" data-state={report.state}>
      <style>{PRC_CSS}</style>
      <div className="lt-prc__brand">
        <span className="lt-prc__dot" aria-hidden="true" />
        LazyTopper
        <span className="lt-prc__tag">
          Weekly report <span className="lt-prc__hi">· साप्ताहिक रिपोर्ट</span>
        </span>
      </div>

      <div className="lt-prc__title">{title.en}</div>
      <div className="lt-prc__title-hi">{title.hi}</div>
      <div className="lt-prc__week" data-testid="prc-week">
        This week <span className="lt-prc__hi">(इस हफ़्ते)</span>: {report.weekLabel}
      </div>

      {report.state === "empty" ? (
        <div className="lt-prc__empty" data-testid="prc-empty">
          <p className="lt-prc__empty-en">{EMPTY_EN}</p>
          <p className="lt-prc__empty-hi">{EMPTY_HI}</p>
        </div>
      ) : (
        <div className="lt-prc__main">
          <div className="lt-prc__stats">
            <div className="lt-prc__stat" data-testid="prc-answers">
              <div className="lt-prc__num">{report.answersMarked}</div>
              <div className="lt-prc__lbl">Answers checked</div>
              <div className="lt-prc__lbl-hi">जाँचे गए उत्तर</div>
            </div>
            <div className="lt-prc__stat" data-testid="prc-tests">
              <div className="lt-prc__num">{report.testsTaken}</div>
              <div className="lt-prc__lbl">Tests taken</div>
              <div className="lt-prc__lbl-hi">दिए गए टेस्ट</div>
            </div>
            {report.marksLost !== null && (
              <div className="lt-prc__stat lt-prc__stat--lost" data-testid="prc-lost">
                <div className="lt-prc__num">{report.marksLost}</div>
                <div className="lt-prc__lbl">Marks lost</div>
                <div className="lt-prc__lbl-hi">कटे अंक</div>
              </div>
            )}
          </div>

          {report.state === "activity" && (
            <div className="lt-prc__note" data-testid="prc-activity-note" data-reason={report.activityReason ?? "not-ready"}>
              <p>{report.activityReason === "few-answers" ? ACTIVITY_EN : NOT_READY_EN}</p>
              <p className="lt-prc__hi">{report.activityReason === "few-answers" ? ACTIVITY_HI : NOT_READY_HI}</p>
            </div>
          )}

          {report.typeRows.length > 0 && (
            <div className="lt-prc__sect" data-testid="prc-types">
              <div className="lt-prc__hd">
                Where the marks were lost <span className="lt-prc__hi">· अंक कहाँ कटे</span>
              </div>
              <div className="lt-prc__rows">
                {report.typeRows.map((r) => (
                  <div key={r.key} className={`lt-prc__row lt-prc__row--${r.key}`} data-testid={`prc-type-${r.key}`}>
                    <span className="lt-prc__sw" aria-hidden="true" />
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

          {report.chapters.length > 0 && (
            <div className="lt-prc__sect" data-testid="prc-chapters">
              <div className="lt-prc__hd">
                Chapters that cost the most marks <span className="lt-prc__hi">· सबसे ज़्यादा अंक इन अध्यायों में कटे</span>
              </div>
              {report.chapters.map((c) => (
                <div key={c.key} className="lt-prc__ch" data-testid="prc-chapter">
                  <span className="lt-prc__chl">{c.label}</span>
                  <span className="lt-prc__mk">{marksWithUnit(c.marks)}</span>
                </div>
              ))}
            </div>
          )}

          {report.wonBack && (
            <div className="lt-prc__won" data-testid="prc-won-back">
              Won back on a later try: {plural(report.wonBack.count, "mistake", "mistakes")}
              {report.wonBack.marks !== null ? ` (${marksWithUnit(report.wonBack.marks)})` : ""}
              <span className="lt-prc__hi"> · बाद में सही करके वापस पाए</span>
            </div>
          )}

          {report.nextSteps.length > 0 && (
            <div className="lt-prc__sect" data-testid="prc-steps">
              <div className="lt-prc__hd">
                What LazyTopper suggests next <span className="lt-prc__hi">· आगे क्या करें</span>
              </div>
              <ol className="lt-prc__steps">
                {report.nextSteps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      <div className="lt-prc__foot">{CARD_FOOTER}</div>
    </div>
  );
}

const PRC_CSS = `
.lt-prc-stage { position: fixed; left: -20000px; top: 0; pointer-events: none; }
.lt-prc {
  width: 1080px; height: 1350px; box-sizing: border-box; position: relative; overflow: hidden;
  display: flex; flex-direction: column; padding: 56px 80px 0;
  background: #15233a; color: #fff;
  font-family: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Nirmala UI", "Noto Sans Devanagari", sans-serif;
}
.lt-prc__hi { font-family: "Noto Sans Devanagari", "Nirmala UI", "Mangal", "Inter", sans-serif; }
.lt-prc__brand {
  display: flex; align-items: center; gap: 16px;
  font-family: "Fraunces", Georgia, serif; font-weight: 700; font-size: 44px;
}
.lt-prc__dot { width: 22px; height: 22px; border-radius: 50%; background: hsl(152, 55%, 45%); }
.lt-prc__tag {
  margin-left: auto; font-family: "Inter", ui-sans-serif, system-ui, sans-serif; font-weight: 600;
  font-size: 24px; color: #9fb0c6;
}
.lt-prc__title {
  font-family: "Fraunces", Georgia, serif; font-weight: 700; font-size: 54px; line-height: 1.08;
  margin-top: 24px; overflow-wrap: anywhere;
}
.lt-prc__title-hi {
  font-family: "Noto Sans Devanagari", "Nirmala UI", "Mangal", sans-serif;
  font-size: 34px; color: #cfd7e2; margin-top: 8px;
}
.lt-prc__week { font-size: 26px; color: hsl(152, 55%, 60%); font-weight: 700; margin-top: 12px; }
.lt-prc__main { flex: 1; display: flex; flex-direction: column; gap: 14px; margin-top: 20px; min-height: 0; }
.lt-prc__stats { display: flex; gap: 18px; }
.lt-prc__stat {
  flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.10);
  border-radius: 20px; padding: 14px 20px;
}
.lt-prc__stat--lost { border-color: rgba(239, 68, 68, 0.55); }
.lt-prc__num {
  font-family: "Fraunces", Georgia, serif; font-weight: 700; font-size: 50px; line-height: 1;
  font-variant-numeric: tabular-nums;
}
.lt-prc__lbl { font-size: 22px; color: #e3e9f1; margin-top: 8px; font-weight: 600; }
.lt-prc__lbl-hi { font-family: "Noto Sans Devanagari", "Nirmala UI", "Mangal", sans-serif; font-size: 20px; color: #9fb0c6; }
.lt-prc__hd {
  font-size: 21px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
  color: #8fa2bb; margin-bottom: 10px;
}
.lt-prc__hd .lt-prc__hi { text-transform: none; letter-spacing: 0; font-weight: 600; }
.lt-prc__rows { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 26px; }
.lt-prc__row { display: flex; align-items: center; gap: 14px; font-size: 25px; color: #e3e9f1; }
.lt-prc__sw { width: 18px; height: 18px; border-radius: 5px; flex-shrink: 0; background: #8294ad; }
.lt-prc__row--conceptual .lt-prc__sw { background: #ef4444; }
.lt-prc__row--presentation .lt-prc__sw { background: #3b82f6; }
.lt-prc__row--calculation .lt-prc__sw { background: #e8930c; }
.lt-prc__row--silly .lt-prc__sw { background: #f5b94a; }
.lt-prc__rl { display: flex; flex-direction: column; min-width: 0; line-height: 1.2; }
.lt-prc__rh { font-family: "Noto Sans Devanagari", "Nirmala UI", "Mangal", sans-serif; font-size: 19px; color: #9fb0c6; }
.lt-prc__mk { margin-left: auto; font-weight: 700; color: #fff; white-space: nowrap; }
.lt-prc__ch {
  display: flex; align-items: center; gap: 14px; font-size: 26px; color: #e3e9f1;
  padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.08);
}
.lt-prc__chl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lt-prc__won { font-size: 24px; color: #bff0d8; }
.lt-prc__steps { margin: 0; padding-left: 30px; font-size: 21px; line-height: 1.3; color: #e3e9f1; }
.lt-prc__steps li { margin-bottom: 6px; }
.lt-prc__note { font-size: 26px; line-height: 1.4; color: #e3e9f1; }
.lt-prc__note p { margin: 0 0 8px; }
.lt-prc__note .lt-prc__hi { font-size: 24px; color: #9fb0c6; }
.lt-prc__empty { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.lt-prc__empty-en { font-family: "Fraunces", Georgia, serif; font-size: 46px; line-height: 1.25; margin: 0; }
.lt-prc__empty-hi {
  font-family: "Noto Sans Devanagari", "Nirmala UI", "Mangal", sans-serif;
  font-size: 32px; line-height: 1.5; color: #cfd7e2; margin: 28px 0 0;
}
.lt-prc__foot {
  margin: 20px -80px 0; padding: 28px 60px; background: hsl(152, 55%, 45%); color: #fff;
  font-size: 27px; font-weight: 700; text-align: center;
}
`;
