import { useMemo } from "react";
import { countWithUnit, marksWithUnit } from "../../../lib/mistakeDisplay";
import { BRAND_MARK_SRC } from "../../../config/brandMark";
import { SHARE_LABELS } from "./shareCopy";
import { staticPoseSvg } from "./mascotStill";
import type { ShareCardModel } from "./shareCardModel";

/**
 * SHARE-CARD-1 - the dedicated share card: story 1080 x 1920 or square 1080 x 1080.
 *
 * It renders ONLY a ShareCardModel, the allow-listed projection of a scorecard
 * (shareCardModel.ts): score, surface, chapter/subject, the four Mistake-Intelligence types
 * (count + marks lost, 0s shown honestly), the biggest loss, Ziggy's pose + line with the score,
 * Byte's tip on the biggest loss, an optional first name, date, brand and the public link + QR.
 * No email, uid, code, answer or working can appear here, because the model never carries them.
 *
 * Byte and Ziggy never share an app screen; this static image is a deliberately composed card,
 * so both appear - in SEPARATE panels (Ziggy with the score, Byte with the tip).
 *
 * Drawn off-screen and turned into a PNG by renderSharePng; the student sees the PNG preview.
 * CLAUDE.md 7 - classes only, no inline style objects.
 */

function Mascot({ kind, pose, className }: { kind: "byte" | "ziggy"; pose: ShareCardModel["ziggy"]["pose"]; className: string }) {
  const svg = useMemo(() => staticPoseSvg(kind, pose), [kind, pose]);
  if (!svg) return null;
  return (
    <span
      className={`lt-share__mascot ${className}`}
      data-testid={`share-mascot-${kind}`}
      data-pose={pose}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default function ShareCard({ model, qrDataUrl = null }: { model: ShareCardModel; qrDataUrl?: string | null }) {
  const m = model;
  return (
    <div className={`lt-share lt-share--${m.size}${m.showMascots ? "" : " lt-share--plain"}`} data-testid="share-card" data-size={m.size}>
      <style>{SHARE_CSS}</style>
      <div className="lt-share__brand">
        <img className="lt-share__logo" src={BRAND_MARK_SRC} alt="" />
        <span className="lt-share__name">LazyTopper</span>
        <span className="lt-share__tag">{SHARE_LABELS.brandTag}</span>
      </div>

      <div className="lt-share__grid">
        <section className="lt-share__panel lt-share__panel--score" data-testid="share-panel-score">
          <div className="lt-share__scoretext">
            {m.firstName && (
              <div className="lt-share__who" data-testid="share-first-name">
                {m.firstName}
                {SHARE_LABELS.nameSuffix}
              </div>
            )}
            <div className="lt-share__surface">{m.surfaceLabel}</div>
            {m.context && <div className="lt-share__ctx">{m.context}</div>}
            <div className="lt-share__score" data-testid="share-score">
              {m.awarded}
              <span className="lt-share__of"> / {m.total}</span>
            </div>
            <div className="lt-share__marks">{SHARE_LABELS.marksWord}</div>
          </div>
          {m.showMascots && (
            <div className="lt-share__ziggy">
              <Mascot kind="ziggy" pose={m.ziggy.pose} className="lt-share__mascot--ziggy" />
              <div className="lt-share__bub lt-share__bub--ziggy" data-testid="share-ziggy-line">
                {m.ziggy.line}
              </div>
            </div>
          )}
        </section>

        <section className="lt-share__panel lt-share__panel--mi" data-testid="share-panel-mi">
          <div className="lt-share__mihd">{m.mi === "objective" ? SHARE_LABELS.objectiveHeading : SHARE_LABELS.miHeading}</div>
          {m.rows && (
            <>
              <div className="lt-share__misub">{SHARE_LABELS.miSub}</div>
              {m.rows.map((r) => (
                <div
                  key={r.type}
                  className={`lt-share__row lt-share__row--${r.type}${r.biggest ? " lt-share__row--big" : ""}`}
                  data-testid={`share-row-${r.type}`}
                >
                  <span className="lt-share__sw" aria-hidden="true" />
                  <span className="lt-share__lbl">
                    {r.label}
                    {r.biggest && <span className="lt-share__bigchip">{SHARE_LABELS.biggest}</span>}
                  </span>
                  {r.count !== null && <span className="lt-share__ct">{countWithUnit(r.count)}</span>}
                  {r.marks !== null && <span className="lt-share__mk">{marksWithUnit(r.marks)}</span>}
                </div>
              ))}
              {m.notAttemptedMarks > 0 && (
                <div
                  className={`lt-share__xrow${m.biggest?.kind === "unattempted" ? " lt-share__xrow--big" : ""}`}
                  data-testid="share-row-unattempted"
                >
                  <span>{SHARE_LABELS.notAttempted}</span>
                  <span className="lt-share__mk">{marksWithUnit(m.notAttemptedMarks)}</span>
                </div>
              )}
              {m.untypedMarks > 0 && (
                <div className="lt-share__xrow" data-testid="share-row-untyped">
                  <span>{SHARE_LABELS.untyped}</span>
                  <span className="lt-share__mk">{marksWithUnit(m.untypedMarks)}</span>
                </div>
              )}
            </>
          )}
          {m.objective && (
            <div className="lt-share__obj" data-testid="share-objective">
              <div className="lt-share__objc lt-share__objc--right">
                <span className="lt-share__objn">{m.objective.right}</span>
                <span className="lt-share__objl">{SHARE_LABELS.objectiveRight}</span>
              </div>
              <div className="lt-share__objc lt-share__objc--wrong">
                <span className="lt-share__objn">{m.objective.wrong}</span>
                <span className="lt-share__objl">{SHARE_LABELS.objectiveWrong}</span>
              </div>
            </div>
          )}
        </section>

        <section className="lt-share__panel lt-share__panel--tip" data-testid="share-panel-tip">
          {m.showMascots ? (
            <Mascot kind="byte" pose={m.byte.pose} className="lt-share__mascot--byte" />
          ) : (
            <span className="lt-share__tiplbl">{SHARE_LABELS.tipFallback}</span>
          )}
          <div className="lt-share__bub lt-share__bub--byte" data-testid="share-byte-line">
            {m.byte.line}
          </div>
        </section>
      </div>

      <div className="lt-share__foot">
        <div className="lt-share__foottext">
          <div className="lt-share__footlead">{SHARE_LABELS.footLead}</div>
          <div className="lt-share__site">{SHARE_LABELS.footSite}</div>
          <div className="lt-share__date">{m.dateLabel}</div>
        </div>
        {qrDataUrl && <img className="lt-share__qr" src={qrDataUrl} alt="" data-testid="share-qr" />}
      </div>
    </div>
  );
}

const SHARE_CSS = `
.lt-share-stage { position: fixed; left: -20000px; top: 0; pointer-events: none; }
.lt-share {
  --navy: #10203a; --navy2: #182c4b; --navy3: #22395e; --white: #f6f8fb; --muted: #9fb0c6;
  --green: hsl(152, 55%, 45%); --green2: hsl(152, 60%, 62%);
  width: 1080px; box-sizing: border-box; position: relative; overflow: hidden;
  display: flex; flex-direction: column; background: var(--navy); color: var(--white);
  font-family: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.lt-share * { box-sizing: border-box; }
.lt-share .lt-gr-svg, .lt-share .lt-gr-svg * { animation: none !important; transition: none !important; }
.lt-share--story { height: 1920px; padding: 72px 72px 0; }
.lt-share--square { height: 1080px; padding: 44px 48px 0; }

.lt-share__brand { display: flex; align-items: center; gap: 18px; }
.lt-share__logo { width: 64px; height: 64px; border-radius: 16px; background: #fff; padding: 6px; }
.lt-share__name { font-family: "Fraunces", Georgia, serif; font-weight: 700; font-size: 48px; letter-spacing: -0.01em; }
.lt-share__tag { margin-left: auto; font-weight: 700; font-size: 26px; color: var(--muted); letter-spacing: 0.04em; }
.lt-share--square .lt-share__logo { width: 52px; height: 52px; border-radius: 13px; }
.lt-share--square .lt-share__name { font-size: 40px; }
.lt-share--square .lt-share__tag { font-size: 22px; }

.lt-share__grid { flex: 1; display: grid; gap: 22px; margin: 32px 0 28px; min-height: 0; }
.lt-share--story .lt-share__grid { grid-template-rows: auto 1fr auto; }
.lt-share--square .lt-share__grid {
  gap: 20px; margin: 26px 0 24px;
  grid-template-columns: 1fr 1fr; grid-template-rows: 1fr auto;
  grid-template-areas: "score mi" "tip mi";
}
.lt-share--square .lt-share__panel--score { grid-area: score; }
.lt-share--square .lt-share__panel--mi { grid-area: mi; }
.lt-share--square .lt-share__panel--tip { grid-area: tip; }

.lt-share__panel { background: var(--navy2); border: 2px solid var(--navy3); border-radius: 36px; padding: 34px 40px; min-width: 0; }
.lt-share--square .lt-share__panel { border-radius: 28px; padding: 26px 28px; }

.lt-share__panel--score { display: flex; align-items: center; gap: 24px; }
.lt-share--square .lt-share__panel--score { flex-direction: column; align-items: stretch; justify-content: space-between; gap: 12px; }
.lt-share__scoretext { flex: 1; min-width: 0; }
.lt-share__who { font-size: 34px; font-weight: 700; color: var(--green2); margin-bottom: 10px; }
.lt-share__surface { font-size: 28px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--green2); }
.lt-share__ctx { font-family: "Fraunces", Georgia, serif; font-weight: 700; font-size: 54px; line-height: 1.1; margin-top: 12px; overflow-wrap: anywhere; }
.lt-share__score { font-family: "Fraunces", Georgia, serif; font-weight: 700; font-size: 172px; line-height: 1; margin-top: 22px; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; white-space: nowrap; }
.lt-share__of { font-size: 84px; color: #8294ad; }
.lt-share__marks { font-size: 30px; color: #cfd7e2; margin-top: 6px; }
.lt-share--square .lt-share__who { font-size: 26px; margin-bottom: 6px; }
.lt-share--square .lt-share__surface { font-size: 20px; }
.lt-share--square .lt-share__ctx { font-size: 34px; margin-top: 6px; }
.lt-share--square .lt-share__score { font-size: 112px; margin-top: 10px; }
.lt-share--square .lt-share__of { font-size: 56px; }
.lt-share--square .lt-share__marks { font-size: 22px; margin-top: 2px; }

.lt-share__ziggy { width: 320px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.lt-share--square .lt-share__ziggy { width: auto; flex-direction: row; align-items: center; gap: 14px; }
.lt-share__mascot { display: block; line-height: 0; }
.lt-share__mascot .lt-gr-svg { display: block; width: 100%; height: auto; overflow: visible; }
.lt-share__mascot--ziggy { width: 250px; }
.lt-share--square .lt-share__mascot--ziggy { width: 190px; flex-shrink: 0; }
.lt-share__mascot--byte { width: 180px; flex-shrink: 0; }
.lt-share--square .lt-share__mascot--byte { width: 120px; }

.lt-share__bub { background: var(--white); color: var(--navy); border-radius: 26px; font-weight: 700; line-height: 1.25; }
.lt-share__bub--ziggy { font-size: 29px; padding: 16px 20px; text-align: center; }
.lt-share--square .lt-share__bub--ziggy { font-size: 22px; padding: 14px 16px; text-align: left; }
.lt-share__bub--byte { flex: 1; font-size: 35px; padding: 26px 30px; }
.lt-share--square .lt-share__bub--byte { font-size: 23px; padding: 16px 18px; border-radius: 20px; }

.lt-share__mihd { font-family: "Fraunces", Georgia, serif; font-weight: 700; font-size: 46px; color: var(--white); }
.lt-share__misub { font-size: 26px; color: var(--muted); margin: 6px 0 20px; }
.lt-share--square .lt-share__mihd { font-size: 32px; }
.lt-share--square .lt-share__misub { font-size: 18px; margin: 4px 0 14px; }
.lt-share__row {
  display: flex; align-items: center; gap: 18px; font-size: 35px; color: #e3e9f1;
  padding: 18px 24px; border-radius: 22px; margin-bottom: 12px; background: rgba(255, 255, 255, 0.04); border: 2px solid transparent;
}
.lt-share__row--big { border-color: var(--green); background: rgba(52, 199, 138, 0.12); }
.lt-share--square .lt-share__row { flex-wrap: wrap; font-size: 23px; padding: 12px 16px; gap: 4px 12px; border-radius: 16px; margin-bottom: 10px; }
.lt-share--square .lt-share__lbl { flex: 1 1 calc(100% - 30px); flex-wrap: nowrap; white-space: nowrap; }
.lt-share__sw { width: 22px; height: 22px; border-radius: 6px; flex-shrink: 0; background: #8294ad; }
.lt-share--square .lt-share__sw { width: 16px; height: 16px; border-radius: 4px; }
.lt-share__row--conceptual .lt-share__sw { background: #ef4444; }
.lt-share__row--calculation .lt-share__sw { background: #e8930c; }
.lt-share__row--silly .lt-share__sw { background: #f5c542; }
.lt-share__row--presentation .lt-share__sw { background: #3b82f6; }
.lt-share__lbl { flex: 1; min-width: 0; font-weight: 700; color: var(--white); display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.lt-share__bigchip { font-size: 20px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--navy); background: var(--green2); border-radius: 999px; padding: 4px 12px; }
.lt-share--square .lt-share__bigchip { font-size: 14px; padding: 3px 9px; }
.lt-share__ct { color: var(--muted); font-size: 0.85em; white-space: nowrap; }
.lt-share__mk { font-weight: 800; color: var(--white); white-space: nowrap; min-width: 4.6em; text-align: right; }
.lt-share--square .lt-share__ct { margin-left: 28px; }
.lt-share--square .lt-share__mk { margin-left: auto; min-width: 0; }
.lt-share__xrow { display: flex; justify-content: space-between; gap: 16px; font-size: 28px; color: var(--muted); padding: 10px 24px; }
.lt-share__xrow--big { color: var(--green2); }
.lt-share--square .lt-share__xrow { font-size: 18px; padding: 6px 16px; }

.lt-share__obj { display: flex; gap: 22px; margin-top: 30px; }
.lt-share__objc { flex: 1; border-radius: 26px; padding: 30px; text-align: center; background: rgba(255, 255, 255, 0.05); }
.lt-share__objc--right { border: 2px solid var(--green); }
.lt-share__objc--wrong { border: 2px solid #e8930c; }
.lt-share__objn { display: block; font-family: "Fraunces", Georgia, serif; font-weight: 700; font-size: 120px; line-height: 1; }
.lt-share__objl { display: block; font-size: 30px; color: var(--muted); margin-top: 8px; font-weight: 700; }
.lt-share--square .lt-share__obj { flex-direction: column; gap: 14px; margin-top: 16px; }
.lt-share--square .lt-share__objc { padding: 18px; }
.lt-share--square .lt-share__objn { font-size: 72px; }
.lt-share--square .lt-share__objl { font-size: 20px; }

.lt-share__panel--tip { display: flex; align-items: center; gap: 26px; }
.lt-share--square .lt-share__panel--tip { gap: 12px; }
.lt-share__tiplbl { font-size: 26px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--green2); }

.lt-share__foot {
  margin: 0 -72px; padding: 30px 72px; background: var(--green); color: #fff;
  display: flex; align-items: center; gap: 28px;
}
.lt-share--square .lt-share__foot { margin: 0 -48px; padding: 18px 48px; gap: 20px; }
.lt-share__foottext { flex: 1; min-width: 0; }
.lt-share__footlead { font-size: 30px; font-weight: 700; }
.lt-share__site { font-family: "Fraunces", Georgia, serif; font-size: 54px; font-weight: 700; line-height: 1.1; }
.lt-share__date { font-size: 22px; opacity: 0.9; margin-top: 4px; }
.lt-share--square .lt-share__footlead { font-size: 22px; }
.lt-share--square .lt-share__site { font-size: 36px; }
.lt-share--square .lt-share__date { font-size: 16px; }
.lt-share__qr { width: 170px; height: 170px; border-radius: 16px; background: #fff; padding: 8px; flex-shrink: 0; }
.lt-share--square .lt-share__qr { width: 112px; height: 112px; border-radius: 12px; padding: 6px; }
`;
