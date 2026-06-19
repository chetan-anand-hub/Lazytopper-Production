import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../grammar/Card";
import ConceptTeachDrawer from "../tutor/ConceptTeachDrawer";
import { findVisualForConcept } from "../../data/visualConceptRegistry";
import type { DesktopTopicSummary } from "../../lib/desktop/topics";
import type {
  ActionableTopicHubContent,
  BoardConcept,
} from "../../lib/desktop/topicHubContent";

/**
 * ConceptSpine — the Topic Hub main view, final-IA LAYOUT (Learn-Flow PR-D).
 *
 * Binding design: `docs/design/topichub_ia_mockup_FINAL_2026-06-19.html` (visual
 * reference) + the FINAL-IA supersession block in
 * `docs/design/LazyTopper_Learn_Flow_Spec_LOCKED.md`. This view is built to MATCH
 * that mockup; the verification gate is "the page matches the final mockup at
 * desktop + 360px mobile".
 *
 * What PR-D changed from the PR-B/PR-C spine:
 *   1. LEARN-FIRST re-order — the concept rows are the HERO ("Learn the N
 *      concepts"). The topic-level action band moves BELOW them and RECEDES into a
 *      quiet, dashed zone ("When you're ready — practise or test the whole topic").
 *   2. NOTES consolidation — the old "Formula sheet · Proofs · Practice all" tab
 *      bar is replaced by ONE unified "Notes" toggle (formulae + proofs + mind-map
 *      are sections of one Notes view). Honest "coming soon" until a later stage.
 *   3. EXAMINER'S TIPS panel — a clickable, expandable "★ Examiner's tips"
 *      affordance. PR-D builds the CONTAINER; the per-topic tip CONTENT is PR-F.
 *      The one real `examinerWarning` seeds a preview tip (never fabricated);
 *      everything else is an honest "coming soon".
 *   4. ACTION BAND (3 buttons) — "Practise this topic" (primary, solid green) ·
 *      "Chapter test" · "Worksheet". "Practise this topic" routes to the existing
 *      topic practice (what the old "Practice all" tab did). Chapter test /
 *      Worksheet are present-but-inert (honest "Soon") pending their PR-E wiring.
 *   5. Concept-row "Practise" is CONCEPT-FILTERED — the page builds the per-concept
 *      route carrying the concept identity + its mark band (see
 *      DesktopTopicHubPage + buildDesktopPracticePath `markBand`). ConceptSpine
 *      renders whatever href the page supplies.
 *   8. Per-row visual badge — a row shows a "Visual" badge ONLY where
 *      findVisualForConcept returns a real (non-null) interactive for that concept.
 *      Honest: no badge where no visual (PR-C hardened that resolver to return null
 *      instead of a wrong concepts[0]).
 *
 * Concept-row actions (unchanged from PR-C):
 *   - "Teach me" opens the concept tutor (`ConceptTeachDrawer` → `TeachFlow` →
 *     /api/mentor `concept_teach`, the EXISTING engine reused unchanged).
 *     ConceptSpine owns the open/close state and passes the clicked concept's
 *     { topicKey, subject, concept } context. One mount covers desktop + mobile.
 *   - "Practise" routes to the existing per-concept practice target.
 *
 * MI guard (item 9, per #270/#271): Mistake Intel is navy-SIDEBAR chrome ONLY —
 * there is deliberately NO MI on this page body.
 *
 * Design grammar: light mode, var(--font-display) (Fraunces) headings +
 * var(--font-body) (Inter), brand green hsl(152,55%,45%). Styling is class-driven
 * (no inline style objects) with a single scoped <style> block carrying a pure-CSS
 * @media (max-width:1023px) reflow so the same markup serves desktop → 360px with
 * no JS width branch.
 */

const TREND_LABEL: Record<DesktopTopicSummary["trendTier"], string> = {
  high: "High trend",
  medium: "Medium trend",
  low: "Low trend",
};

const SPINE_CSS = `
.lt-spine {
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  color: hsl(220, 25%, 12%);
  max-width: 920px;
  margin: 0 auto;
  padding: 24px clamp(16px, 4vw, 32px) 64px;
}
.lt-spine__back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: hsl(220, 15%, 42%);
  text-decoration: none;
  margin-bottom: 14px;
}
.lt-spine__back:hover { color: hsl(220, 25%, 12%); }
.lt-spine__title {
  margin: 0;
  font-family: var(--font-display, "Fraunces", Georgia, serif);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: hsl(220, 25%, 12%);
}
.lt-spine__stats {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.lt-spine__sections {
  font-size: 12.5px;
  color: hsl(220, 15%, 42%);
}
.lt-spine__chip {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 999px;
  white-space: nowrap;
}
.lt-spine__chip--high { background: hsl(0, 72%, 96%); color: #c0392b; }
.lt-spine__chip--medium { background: hsl(38, 92%, 94%); color: #9a6a00; }
.lt-spine__chip--low { background: hsl(210, 33%, 96%); color: hsl(220, 15%, 42%); }
.lt-spine__chip--preview {
  background: hsl(210, 40%, 98%);
  color: hsl(220, 15%, 42%);
  border: 1px solid hsl(220, 18%, 90%);
}
.lt-spine__marks {
  font-size: 12px;
  color: hsl(220, 15%, 42%);
}

/* ── Examiner's tips (clickable / expandable container) ─────────────── */
.lt-spine__tips-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  font-size: 13px;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 10px;
  cursor: pointer;
  background: hsl(38, 92%, 95%);
  border: 1px solid hsl(38, 60%, 82%);
  color: hsl(33, 70%, 32%);
}
.lt-spine__tips-toggle:hover { background: hsl(38, 92%, 92%); }
.lt-spine__chev { font-size: 10px; }
.lt-spine__tips-panel {
  margin: 10px 0 0;
  padding: 4px 14px;
  border-radius: 10px;
  background: hsl(38, 92%, 96%);
  border: 1px solid hsl(38, 60%, 84%);
}
.lt-spine__tip {
  display: flex;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid hsl(38, 55%, 88%);
  font-size: 12.5px;
  line-height: 1.5;
  color: hsl(33, 45%, 24%);
}
.lt-spine__tip:last-child { border-bottom: none; }
.lt-spine__tip-num { flex-shrink: 0; font-weight: 600; color: hsl(33, 70%, 38%); }
.lt-spine__tips-soon {
  display: flex;
  gap: 10px;
  padding: 9px 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: hsl(33, 35%, 40%);
  font-style: italic;
}

/* ── Notes (single unified toggle) ─────────────────────────────────── */
.lt-spine__notes-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
}
.lt-spine__notes-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  font-size: 13.5px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 10px;
  cursor: pointer;
  background: #ffffff;
  border: 1px solid hsl(220, 18%, 88%);
  color: hsl(220, 25%, 12%);
}
.lt-spine__notes-btn:hover { border-color: hsl(152, 40%, 70%); }
.lt-spine__notes-hint {
  font-size: 12px;
  color: hsl(220, 12%, 58%);
}
.lt-spine__notes-panel {
  margin-top: 10px;
}
.lt-spine__panel-note {
  margin: 6px 0 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: hsl(220, 15%, 42%);
}

/* ── Concept rows — the HERO (learn-first) ─────────────────────────── */
.lt-spine__concepts-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  margin: 22px 0 12px;
}
.lt-spine__concepts-title {
  font-family: var(--font-display, "Fraunces", Georgia, serif);
  font-size: 18px;
  font-weight: 600;
  color: hsl(220, 25%, 12%);
}
.lt-spine__concepts-sub {
  font-size: 13px;
  color: hsl(220, 15%, 42%);
}
.lt-spine__rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.lt-spine__row {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}
.lt-spine__row-main { flex: 1; min-width: 0; }
.lt-spine__row-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.lt-spine__row-name {
  font-size: 14.5px;
  font-weight: 600;
  color: hsl(220, 25%, 12%);
}
.lt-spine__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: hsl(214, 90%, 96%);
  color: hsl(214, 80%, 40%);
  border: 1px solid hsl(214, 70%, 86%);
  white-space: nowrap;
}
.lt-spine__row-use {
  margin: 6px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: hsl(220, 15%, 42%);
}
.lt-spine__row-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.lt-spine__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  font-size: 12.5px;
  font-weight: 600;
  padding: 8px 15px;
  border-radius: 9px;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  border: 1px solid transparent;
}
/* Concept-level "Teach me" + "Practise" — quiet, green-tint secondaries inside
   the card. Visually distinct from the topic-level solid-primary band button. */
.lt-spine__btn--teach {
  background: #ffffff;
  color: hsl(152, 55%, 28%);
  border-color: hsl(152, 40%, 78%);
}
.lt-spine__btn--teach:hover { background: hsl(152, 55%, 97%); }
.lt-spine__btn--practise {
  background: hsl(152, 55%, 95%);
  color: hsl(152, 55%, 28%);
  border-color: hsl(152, 40%, 80%);
}
.lt-spine__btn--practise:hover { background: hsl(152, 55%, 92%); }

/* ── Action band — receded / quiet (secondary to the concepts) ─────── */
.lt-spine__band {
  margin-top: 18px;
  padding: 14px 16px;
  border: 1px dashed hsl(220, 18%, 84%);
  border-radius: 14px;
  background: transparent;
}
.lt-spine__band-label {
  font-size: 12px;
  font-weight: 600;
  color: hsl(220, 15%, 48%);
  margin-bottom: 11px;
}
.lt-spine__band-btns {
  display: flex;
  gap: 10px;
}
.lt-spine__ab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  font-size: 13.5px;
  font-weight: 600;
  padding: 10px 14px;
  border-radius: 10px;
  text-decoration: none;
  white-space: nowrap;
  border: 1px solid hsl(220, 18%, 86%);
  background: #ffffff;
  color: hsl(220, 25%, 12%);
}
.lt-spine__ab--primary {
  flex: 1.4;
  background: hsl(152, 55%, 45%);
  border-color: hsl(152, 55%, 45%);
  color: #ffffff;
  cursor: pointer;
}
.lt-spine__ab--primary:hover { background: hsl(152, 60%, 38%); }
.lt-spine__ab--secondary {
  flex: 1;
  cursor: default;
  opacity: 0.7;
}
.lt-spine__soon {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 999px;
  background: hsl(220, 18%, 92%);
  color: hsl(220, 12%, 50%);
}

@media (max-width: 1023px) {
  .lt-spine__row {
    flex-direction: column;
    align-items: stretch;
  }
  .lt-spine__row-actions {
    width: 100%;
  }
  .lt-spine__btn {
    flex: 1;
  }
  .lt-spine__band-btns {
    flex-wrap: wrap;
  }
  .lt-spine__ab--primary {
    flex: 1 1 100%;
  }
}
`;

export interface ConceptSpineProps {
  topic: DesktopTopicSummary;
  actionable: ActionableTopicHubContent;
  /** Safe in-app href for the in-page back button. */
  backHref: string;
  /** Label for the back button (e.g. "Back to Exam Trends"). */
  backLabel: string;
  /** Existing whole-topic practice route — powers "Practise this topic" in the band. */
  practiceAllHref: string;
  /** Builds the existing per-concept (concept + mark band) practice route. */
  practiceHrefForConcept: (concept: BoardConcept) => string;
}

export function ConceptSpine({
  topic,
  actionable,
  backHref,
  backLabel,
  practiceAllHref,
  practiceHrefForConcept,
}: ConceptSpineProps) {
  // The concept whose tutor drawer is open (null = closed). ConceptSpine owns this
  // open/close state; opening passes the clicked concept's context to the existing
  // ConceptTeachDrawer → TeachFlow → /api/mentor `concept_teach` engine. One mount
  // covers both platforms (the spine renders at every width).
  const [teachConcept, setTeachConcept] = useState<BoardConcept | null>(null);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const concepts = actionable.boardEssentials;
  const trendTier = topic.trendTier;

  // The one genuine per-topic tip we hold today. It seeds a preview in the tips
  // panel; the full 3–4 per-topic tip set is PR-F. Sample-preview topics carry a
  // placeholder warning (no hand-curated tip) — treat those as "no seeded tip" so
  // we never present a placeholder as if it were a real examiner tip.
  const seededTip =
    !actionable.isSamplePreview && actionable.examinerWarning
      ? actionable.examinerWarning
      : null;

  return (
    <div className="lt-spine">
      <style>{SPINE_CSS}</style>

      {/* In-page back button (top-left) */}
      <Link to={backHref} className="lt-spine__back">
        <span aria-hidden="true">←</span>
        <span>{backLabel}</span>
      </Link>

      {/* Topic card: title + stat strip + Examiner's tips + Notes */}
      <Card padding={18}>
        <h1 className="lt-spine__title">{topic.name}</h1>
        <div className="lt-spine__stats">
          <span className={`lt-spine__chip lt-spine__chip--${trendTier}`}>
            {TREND_LABEL[trendTier]}
          </span>
          <span className="lt-spine__marks">{topic.marks}</span>
          <span className="lt-spine__sections">{actionable.topicSnapshot.likelySection}</span>
          {actionable.isSamplePreview && (
            <span className="lt-spine__chip lt-spine__chip--preview">Sample preview</span>
          )}
        </div>

        {/* Examiner's tips — clickable / expandable container (content = PR-F) */}
        <button
          type="button"
          className="lt-spine__tips-toggle"
          aria-expanded={tipsOpen}
          onClick={() => setTipsOpen((v) => !v)}
        >
          <span aria-hidden="true">★</span>
          <span>Examiner&rsquo;s tips</span>
          <span className="lt-spine__chev" aria-hidden="true">{tipsOpen ? "▲" : "▼"}</span>
        </button>
        {tipsOpen && (
          <div className="lt-spine__tips-panel">
            {seededTip && (
              <div className="lt-spine__tip">
                <span className="lt-spine__tip-num">1</span>
                <span>{seededTip}</span>
              </div>
            )}
            <div className="lt-spine__tips-soon">
              <span aria-hidden="true">☆</span>
              <span>
                More examiner&rsquo;s tips for this topic are on the way — a curated
                set of board do&rsquo;s and don&rsquo;ts is coming soon.
              </span>
            </div>
          </div>
        )}

        {/* Notes — ONE unified toggle (formulae + proofs + mind-map in one view) */}
        <div className="lt-spine__notes-row">
          <button
            type="button"
            className="lt-spine__notes-btn"
            aria-expanded={notesOpen}
            onClick={() => setNotesOpen((v) => !v)}
          >
            <span aria-hidden="true">▤</span>
            <span>Notes</span>
          </button>
          <span className="lt-spine__notes-hint">formulae · proofs · mind-map — one view</span>
        </div>
        {notesOpen && (
          <div className="lt-spine__notes-panel">
            <p className="lt-spine__panel-note">
              Notes coming soon. One unified view will gather this topic&rsquo;s
              formula sheet, board-format proofs and a mind-map (with a downloadable
              PDF). No notes are authored here yet — the content arrives pre-generated
              in a later stage.
            </p>
          </div>
        )}
      </Card>

      {/* Concept spine — the HERO. Learn first, then practise each. */}
      <div className="lt-spine__concepts-head">
        <span className="lt-spine__concepts-title">
          Learn the {concepts.length} {concepts.length === 1 ? "concept" : "concepts"}
        </span>
        <span className="lt-spine__concepts-sub">teach yourself first, then practise each</span>
      </div>
      <div className="lt-spine__rows">
        {concepts.map((concept, idx) => {
          // Item 8 — honest per-row badge: show "Visual" ONLY where the SAME
          // resolver the tutor uses returns a real (non-null) interactive for this
          // concept. No badge where no visual (PR-C hardened the resolver to return
          // null instead of a wrong concepts[0]).
          const hasVisual =
            findVisualForConcept(topic.subject, topic.slug, [concept.name]) !== null;
          return (
            <Card key={`${concept.name}-${idx}`} padding={14}>
              <div className="lt-spine__row">
                <div className="lt-spine__row-main">
                  <div className="lt-spine__row-head">
                    <span className="lt-spine__row-name">{concept.name}</span>
                    <span className="lt-spine__marks">{concept.marks} marks</span>
                    {hasVisual && (
                      <span className="lt-spine__badge">
                        <span aria-hidden="true">✦</span> Visual
                      </span>
                    )}
                  </div>
                  {concept.oneLineUse && (
                    <p className="lt-spine__row-use">{concept.oneLineUse}</p>
                  )}
                </div>
                <div className="lt-spine__row-actions">
                  {/* Opens the concept tutor (concept_teach) — wired in PR-C */}
                  <button
                    type="button"
                    className="lt-spine__btn lt-spine__btn--teach"
                    onClick={() => setTeachConcept(concept)}
                    title={`Teach me: ${concept.name}`}
                  >
                    Teach me
                  </button>
                  {/* Concept-filtered practice (concept + mark band) — built by the page */}
                  <Link
                    to={practiceHrefForConcept(concept)}
                    className="lt-spine__btn lt-spine__btn--practise"
                    title={`Practise ${concept.name}`}
                  >
                    Practise
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Action band — receded / quiet. Topic-level practise or test. */}
      <div className="lt-spine__band">
        <div className="lt-spine__band-label">
          When you&rsquo;re ready — practise or test the whole topic
        </div>
        <div className="lt-spine__band-btns">
          {/* Primary — routes to the existing whole-topic practice (old "Practice all") */}
          <Link to={practiceAllHref} className="lt-spine__ab lt-spine__ab--primary">
            Practise this topic
          </Link>
          {/* Chapter test / Worksheet — present-but-inert (honest "Soon") pending PR-E */}
          <button
            type="button"
            className="lt-spine__ab lt-spine__ab--secondary"
            aria-disabled="true"
            title="Chapter test — coming soon"
          >
            Chapter test <span className="lt-spine__soon">Soon</span>
          </button>
          <button
            type="button"
            className="lt-spine__ab lt-spine__ab--secondary"
            aria-disabled="true"
            title="Worksheet — coming soon"
          >
            Worksheet <span className="lt-spine__soon">Soon</span>
          </button>
        </div>
      </div>

      {/* Concept tutor — REUSED engine (ConceptTeachDrawer → TeachFlow → /api/mentor
          `concept_teach`). Mounted fresh per concept so each gets its own session;
          questionText is empty (concept-teach, not a question). One mount = both
          platforms. Teach-first / earned-reveal + the visual/chat split are handled
          inside TeachFlow. (Mobile full-screen toggle for the tutor interactive is
          deferred to its own PR — PR-D.1 — per the owner-approved split.) */}
      {teachConcept && (
        <ConceptTeachDrawer
          open
          onClose={() => setTeachConcept(null)}
          context={{
            topicKey: topic.slug,
            subject: topic.subject,
            questionText: "",
            concept: teachConcept.name,
          }}
        />
      )}
    </div>
  );
}

export default ConceptSpine;
