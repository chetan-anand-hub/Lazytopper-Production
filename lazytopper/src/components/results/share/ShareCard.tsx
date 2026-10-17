import { marksWithUnit } from "../../../lib/mistakeDisplay";
import type { ShareCardModel } from "./shareCardModel";

/**
 * SHARE-SCORE-1 - the dedicated 1080 x 1350 share card (a WhatsApp status / portrait post).
 *
 * It renders ONLY a ShareCardModel, the allow-listed projection of a scorecard
 * (shareCardModel.ts): score, surface, chapter/subject, mistake split in marks when typed
 * marks exist, date, brand and footer. No name, code, answer or working can appear here,
 * because the model never carries them. It is drawn off-screen and turned into a PNG by
 * renderSharePng; the student never sees this DOM directly.
 *
 * CLAUDE.md 7 - classes only, no inline style objects.
 */
export const SHARE_FOOTER = "Check your own answers free - lazytopper.com";

export default function ShareCard({ model }: { model: ShareCardModel }) {
  return (
    <div className="lt-share" data-testid="share-card">
      <style>{SHARE_CSS}</style>
      <div className="lt-share__brand">
        <span className="lt-share__dot" aria-hidden="true" />
        LazyTopper
        <span className="lt-share__tag">CBSE Class 10</span>
      </div>

      <div className="lt-share__main">
        <div className="lt-share__surface">{model.surfaceLabel}</div>
        {model.context && <div className="lt-share__ctx">{model.context}</div>}
        <div className="lt-share__score">
          {model.awarded}
          <span className="lt-share__of"> / {model.total}</span>
        </div>
        <div className="lt-share__marks">marks</div>

        {model.split && (
          <div className="lt-share__split" data-testid="share-split">
            <div className="lt-share__splithd">Where the marks went</div>
            {model.split.map((r) => (
              <div key={r.key} className={`lt-share__row lt-share__row--${r.key}`}>
                <span className="lt-share__sw" aria-hidden="true" />
                <span className="lt-share__lbl">{r.label}</span>
                <span className="lt-share__mk">{marksWithUnit(r.marks)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="lt-share__date">{model.dateLabel}</div>
      <div className="lt-share__foot">{SHARE_FOOTER}</div>
    </div>
  );
}

const SHARE_CSS = `
.lt-share-stage { position: fixed; left: -20000px; top: 0; pointer-events: none; }
.lt-share {
  width: 1080px; height: 1350px; box-sizing: border-box; position: relative; overflow: hidden;
  display: flex; flex-direction: column; padding: 84px 92px 0;
  background: #15233a; color: #fff;
  font-family: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
.lt-share__brand {
  display: flex; align-items: center; gap: 18px;
  font-family: "Fraunces", Georgia, serif; font-weight: 700; font-size: 52px; letter-spacing: -0.01em;
}
.lt-share__dot { width: 26px; height: 26px; border-radius: 50%; background: hsl(152, 55%, 45%); }
.lt-share__tag {
  margin-left: auto; font-family: "Inter", ui-sans-serif, system-ui, sans-serif; font-weight: 600;
  font-size: 26px; color: #9fb0c6; letter-spacing: 0.04em;
}
.lt-share__main { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.lt-share__surface {
  font-size: 30px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;
  color: hsl(152, 55%, 55%);
}
.lt-share__ctx {
  font-family: "Fraunces", Georgia, serif; font-weight: 700; font-size: 64px; line-height: 1.1;
  margin-top: 18px; color: #fff; overflow-wrap: anywhere;
}
.lt-share__score {
  font-family: "Fraunces", Georgia, serif; font-weight: 700; font-size: 250px; line-height: 1;
  margin-top: 56px; font-variant-numeric: tabular-nums; letter-spacing: -0.02em;
}
.lt-share__of { font-size: 120px; color: #8294ad; }
.lt-share__marks { font-size: 32px; color: #cfd7e2; margin-top: 10px; }
.lt-share__split { margin-top: 64px; }
.lt-share__splithd {
  font-size: 24px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
  color: #8294ad; margin-bottom: 22px;
}
.lt-share__row { display: flex; align-items: center; gap: 20px; font-size: 34px; color: #e3e9f1; margin-bottom: 18px; }
.lt-share__sw { width: 22px; height: 22px; border-radius: 6px; flex-shrink: 0; background: #8294ad; }
.lt-share__row--knowledge .lt-share__sw { background: #ef4444; }
.lt-share__row--technique .lt-share__sw { background: #3b82f6; }
.lt-share__row--careless .lt-share__sw { background: #e8930c; }
.lt-share__mk { margin-left: auto; font-weight: 700; color: #fff; }
.lt-share__date { font-size: 28px; color: #9fb0c6; padding: 0 0 36px; }
.lt-share__foot {
  margin: 0 -92px; padding: 40px 92px; background: hsl(152, 55%, 45%); color: #fff;
  font-size: 36px; font-weight: 700; text-align: center;
}
`;
