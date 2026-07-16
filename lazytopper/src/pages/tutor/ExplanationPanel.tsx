// src/pages/tutor/ExplanationPanel.tsx
// Stage 3 (D-TUT-13 panel 2) — the explanation panel's INNER content. The outer shell
// (split-on-desktop / overlay-on-mobile, open/close animation) lives in TutorPage; this
// renders the header + body for ONE resolved visual, in the tutor's product grammar.
//
// Anti-fabrication (D-TUT-14/15): it renders ONLY what the resolver produced —
//   - image        : a real, correctly-grained notes/bank figure (the workhorse).
//   - interactive  : an OFFER (owner ruling) — a whole-chapter interactive is NEVER
//                    auto-embedded; the student opts in, then it loads in its own dark card.
//   - gap          : an honest "no diagram yet" — never a stretched/wrong figure.
// An exact NCERT page (when curated) is offered ALONGSIDE the body as the authoritative
// source link (D-TUT-14 #1), opening the shared NcertPageModal.

import { useEffect, useState } from "react";
import type { ResolvedVisual, NcertPageRefData } from "./conceptVisualCatalogue";

interface ExplanationPanelProps {
  visual: ResolvedVisual;
  onClose: () => void;
  onOpenNcert: (ref: NcertPageRefData) => void;
}

export default function ExplanationPanel({ visual, onClose, onOpenNcert }: ExplanationPanelProps) {
  // The interactive is opt-in (offer, never auto-embed). Reset the opt-in whenever the shown
  // concept changes, so switching concepts never silently keeps a prior chapter embedded.
  const [embedInteractive, setEmbedInteractive] = useState(false);
  useEffect(() => {
    setEmbedInteractive(false);
  }, [visual.conceptLabel, visual.body.kind]);

  const { body } = visual;

  return (
    <div className="lt-exp">
      <div className="lt-exp__head">
        <div className="lt-exp__title">{visual.conceptLabel}</div>
        <button type="button" className="lt-exp__x" onClick={onClose} aria-label="Close the diagram">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>

      <div className="lt-exp__body">
        {body.kind === "image" && (
          <figure className="lt-exp__fig">
            <img className="lt-exp__img" src={body.url} alt={body.caption} loading="lazy" />
            <figcaption className="lt-exp__cap">{body.caption}</figcaption>
            <div className="lt-exp__src">
              {body.source === "notes" ? "From your NCERT notes" : "From a real exam question"}
            </div>
          </figure>
        )}

        {body.kind === "interactive" && !embedInteractive && (
          <div className="lt-exp__offer">
            <p className="lt-exp__offer-lead">
              No single static diagram for this one yet — but there&rsquo;s an interactive for the
              whole chapter.
            </p>
            <button
              type="button"
              className="lt-exp__offer-btn"
              onClick={() => setEmbedInteractive(true)}
            >
              Explore the interactive
            </button>
            <p className="lt-exp__offer-note">It covers the whole chapter, so use it to play, not as a single answer.</p>
          </div>
        )}

        {body.kind === "interactive" && embedInteractive && (
          <div className="lt-exp__interactive">
            <div className="lt-exp__interactive-tag">Interactive &middot; whole chapter</div>
            <iframe
              className="lt-exp__iframe"
              src={body.url}
              title={body.title}
              sandbox="allow-scripts allow-same-origin"
              loading="lazy"
            />
          </div>
        )}

        {body.kind === "gap" && (
          <div className="lt-exp__gap">
            <p>No diagram for this one yet — I&rsquo;ll explain it in words, and you can check the exact figure in your NCERT.</p>
          </div>
        )}

        {visual.ncertPage && (
          <button
            type="button"
            className="lt-exp__ncert"
            onClick={() => visual.ncertPage && onOpenNcert(visual.ncertPage)}
          >
            <span aria-hidden="true">&#128196;</span> Open the exact NCERT page
          </button>
        )}
      </div>

      <style>{EXP_CSS}</style>
    </div>
  );
}

const EXP_CSS = `
.lt-exp { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.lt-exp__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--lt-line);
  flex: none;
}
.lt-exp__title {
  flex: 1;
  min-width: 0;
  font-family: var(--font-display, "Fraunces", Georgia, serif);
  font-weight: 600;
  font-size: 13.5px;
  color: hsl(215, 45%, 16%);
  line-height: 1.3;
}
.lt-exp__x {
  flex: none;
  cursor: pointer;
  color: var(--lt-faint);
  background: transparent;
  border: none;
  font-size: 20px;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 8px;
}
.lt-exp__x:hover { color: var(--lt-ink); background: var(--lt-bg); }
.lt-exp__body { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 15px; }
.lt-exp__fig { margin: 0; }
.lt-exp__img {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  border: 1px solid var(--lt-line);
  border-radius: 10px;
  background: #fff;
}
.lt-exp__cap { font-size: 12.5px; color: var(--lt-soft); line-height: 1.5; margin-top: 10px; }
.lt-exp__src {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--lt-faint);
  margin-top: 8px;
}
.lt-exp__offer {
  background: var(--lt-green-tint);
  border: 1px solid var(--lt-green-line);
  border-radius: 12px;
  padding: 15px 16px;
}
.lt-exp__offer-lead { font-size: 13.5px; color: var(--lt-ink); line-height: 1.5; margin: 0 0 12px; }
.lt-exp__offer-btn {
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: var(--lt-green);
  border: none;
  border-radius: 10px;
  padding: 9px 15px;
  cursor: pointer;
}
.lt-exp__offer-btn:hover { background: var(--lt-green-deep); }
.lt-exp__offer-note { font-size: 11.5px; color: var(--lt-soft); margin: 10px 0 0; line-height: 1.45; }
.lt-exp__interactive {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid hsl(220, 25%, 20%);
  background: hsl(220, 30%, 12%);
}
.lt-exp__interactive-tag {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: hsl(152, 40%, 70%);
  padding: 8px 12px;
}
.lt-exp__iframe {
  display: block;
  width: 100%;
  height: 420px;
  border: none;
  background: hsl(220, 30%, 12%);
}
.lt-exp__gap {
  font-size: 13.5px;
  color: var(--lt-soft);
  line-height: 1.55;
  background: var(--lt-bg);
  border: 1px solid var(--lt-line);
  border-radius: 12px;
  padding: 14px 15px;
}
.lt-exp__gap p { margin: 0; }
.lt-exp__ncert {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--lt-green-deep);
  background: #fff;
  border: 1px dashed var(--lt-green-line);
  border-radius: 9px;
  padding: 8px 12px;
  margin-top: 14px;
  cursor: pointer;
}
.lt-exp__ncert:hover { background: var(--lt-green-tint); }

/* Interactive gets more height on a roomy viewport. */
@media (min-width: 1024px) {
  .lt-exp__iframe { height: 480px; }
}
`;
