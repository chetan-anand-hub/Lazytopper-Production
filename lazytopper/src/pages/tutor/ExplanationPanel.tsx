// src/pages/tutor/ExplanationPanel.tsx
// Stage 3 (D-TUT-13 panel 2) — the explanation panel's INNER content. The outer shell
// (split-on-desktop / overlay-on-mobile, open/close animation) lives in TutorPage; this
// renders the header + body for ONE resolved visual, in the tutor's product grammar.
//
// Anti-fabrication (D-TUT-14/15): it renders ONLY what the resolver produced —
//   - image        : a real, correctly-grained notes/bank figure (the workhorse).
//   - interactive  : an OFFER (owner ruling) — a whole-chapter interactive is NEVER
//                    auto-embedded; the student opts in, then it loads in its own dark card.
//   - ncert        : the exact NCERT page, INLINE (owner ruling 2026-07-17). It outranks the
//                    interactive now, so a page can be the panel's primary content.
//   - gap          : an honest "no diagram yet" — never a stretched/wrong figure.
// When a figure won the body, the NCERT page is still offered ALONGSIDE it as the
// authoritative source link (D-TUT-14 #1), opening the shared NcertPageModal.
//
// ★★ `ncert` is the ONE body kind whose asset is not proven to exist before render. An image
// ref is gated on disk by CI (tutor_visual_catalogue_acceptance.mjs); an NCERT page is fetched
// from Firebase Storage at render time and can be missing, unhosted, CORS-blocked, or simply
// unconfigured (no VITE_FIREBASE_STORAGE_BUCKET — the case on every local dev build). So this
// panel FAILS CLOSED: it probes first and renders the honest `gap` body on any failure. It
// must never show a dead frame, and must never turn a working "no diagram yet" into a broken
// one. Disk/URL existence is only ever a proxy for reachability — #448 shipped a live 404
// through a fully green guard, and this is the same class of gap.

import { useEffect, useState } from "react";
import { buildNcertPdfUrl } from "../../components/notes/NcertPageModal";
import type { ResolvedVisual, NcertPageRefData } from "./conceptVisualCatalogue";

/** Student-facing chapter subject label. Deliberately local: NcertPageModal keeps its own
 *  copy module-private, and exporting it would widen a notes component's API for four
 *  strings. If a third consumer ever needs it, promote it to a shared module then. */
const NCERT_SUBJECT_LABEL: Record<NcertPageRefData["subject"], string> = {
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
  maths: "Maths",
};

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

  // The inline NCERT page: build the URL, then PROVE it loads before embedding it.
  const ncertUrl = body.kind === "ncert" ? buildNcertPdfUrl(body.page) : null;
  const [ncertStatus, setNcertStatus] = useState<"probing" | "ready" | "unavailable">("probing");

  useEffect(() => {
    if (body.kind !== "ncert") return;
    // No URL at all (no Storage bucket configured) → fail closed immediately, no request.
    if (!ncertUrl) {
      setNcertStatus("unavailable");
      return;
    }
    setNcertStatus("probing");
    let cancelled = false;
    // HEAD-probe before embedding, mirroring NcertPageModal: a 404 / missing bucket / CORS
    // rejection must degrade to the honest gap, never render a broken frame at the student.
    fetch(ncertUrl, { method: "HEAD" })
      .then((r) => {
        if (!cancelled) setNcertStatus(r.ok ? "ready" : "unavailable");
      })
      .catch(() => {
        if (!cancelled) setNcertStatus("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [body.kind, ncertUrl]);

  // ONE definition of the honest gap, rendered both by a real `gap` body and by an `ncert`
  // body whose page turned out to be unreachable — so the fail-closed path is byte-identical
  // to the real thing and the two can never drift into different promises.
  const gapBody = (
    <div className="lt-exp__gap">
      <p>No diagram for this one yet — I&rsquo;ll explain it in words, and you can check the exact figure in your NCERT.</p>
    </div>
  );

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

        {body.kind === "gap" && gapBody}

        {body.kind === "ncert" && ncertStatus === "probing" && (
          <div className="lt-exp__gap">
            <p>Opening the exact NCERT page&hellip;</p>
          </div>
        )}

        {/* Fail closed: the page could not be reached, so tell the same honest truth the
            gap body tells. Never a broken frame, never a "coming soon" dead end here. */}
        {body.kind === "ncert" && ncertStatus === "unavailable" && gapBody}

        {body.kind === "ncert" && ncertStatus === "ready" && ncertUrl && (
          <figure className="lt-exp__fig">
            <div className="lt-exp__ncert-frame">
              <iframe
                className="lt-exp__ncert-embed"
                src={ncertUrl}
                title={`NCERT ${NCERT_SUBJECT_LABEL[body.page.subject]} chapter ${body.page.chapter}, page ${body.page.page}`}
                loading="lazy"
              />
            </div>
            <figcaption className="lt-exp__cap">
              The exact page this comes from in your NCERT book.
            </figcaption>
            <div className="lt-exp__src">
              NCERT &middot; {NCERT_SUBJECT_LABEL[body.page.subject]} &middot; Chapter {body.page.chapter} &middot; Page{" "}
              {body.page.page}
            </div>
            <button
              type="button"
              className="lt-exp__ncert"
              onClick={() => onOpenNcert(body.page)}
            >
              <span aria-hidden="true">&#128196;</span> View it larger
            </button>
          </figure>
        )}

        {/* The alongside source-link (D-TUT-14 #1) — only when the page is NOT already the
            body, otherwise it would duplicate the "View it larger" button above. */}
        {visual.ncertPage && body.kind !== "ncert" && (
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
/* The inline NCERT page, when it won the body. Framed like a figure (not like the dark
   interactive card) because it IS the source document, not a tool to go play with. */
.lt-exp__ncert-frame {
  border: 1px solid var(--lt-line);
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}
.lt-exp__ncert-embed {
  display: block;
  width: 100%;
  height: 420px;
  border: none;
  background: #fff;
}

/* Interactive + the NCERT page get more height on a roomy viewport. */
@media (min-width: 1024px) {
  .lt-exp__iframe { height: 480px; }
  .lt-exp__ncert-embed { height: 520px; }
}
`;
