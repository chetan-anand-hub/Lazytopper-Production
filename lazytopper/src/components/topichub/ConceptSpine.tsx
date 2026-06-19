import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../grammar/Card";
import { Pill } from "../grammar/Pill";
import { SectionHeader } from "../grammar/SectionHeader";
import ConceptTeachDrawer from "../tutor/ConceptTeachDrawer";
import type { DesktopTopicSummary } from "../../lib/desktop/topics";
import type {
  ActionableTopicHubContent,
  BoardConcept,
} from "../../lib/desktop/topicHubContent";

/**
 * ConceptSpine — the rebuilt Topic Hub main view (Learn-Flow PR-B, layout only).
 *
 * Per the LOCKED spec (`docs/design/LazyTopper_Learn_Flow_Spec_LOCKED.md`) and the
 * locked prototype (`docs/design/01_full_flow_examtrends_to_topichub_to_tutor.html`):
 * the page IS its concept rows. Each row = concept name + mark band + one-line use
 * + two actions ("Learn this" / "Practise"). An in-page back button sits top-left,
 * a header tab bar (Formula sheet · Proofs · Practice all) renders as structure, and
 * a tight stat strip (trend · marks · sections) replaces the old prose right-rail.
 *
 * Concept-row actions:
 *   - "Teach me" opens the concept tutor (`ConceptTeachDrawer` → `TeachFlow` →
 *     /api/mentor in `concept_teach` mode — the EXISTING engine, reused unchanged).
 *     ConceptSpine owns the open/close state and passes the clicked concept's
 *     { topicKey, subject, concept } context (wired in PR-C). Because the spine is a
 *     single responsive component mounted at every width, this wiring covers BOTH
 *     desktop and mobile in one place.
 *   - "Practise" routes to the EXISTING practice target (already-wired, trivial).
 *   - Formula sheet / Proofs tabs are HONEST empty containers ("coming soon"),
 *     designed to RECEIVE pre-generated per-topic content in PR-E. No notes,
 *     formulas, or proofs are inline-authored here.
 *
 * HONEST OMISSIONS (anti-fabrication — an absent field beats an invented one):
 *   - sub-formula per row: NOT cleanly derivable from BoardConcept (which carries
 *     only name/oneLineUse/marks). FormulaUseCard data is per-topic, not per-concept,
 *     so there is no clean per-row join. Rendered WITHOUT it (omitted, not faked).
 *   - visual badge per row: a real "has interactive" check depends on
 *     findVisualForConcept. PR-C hardens that resolver so a below-confidence match
 *     returns null instead of a wrong concepts[0] visual, but the per-row badge
 *     RENDERING is a layout change deferred to PR-D — omitted here, not faked.
 *   Both omissions are flagged in the PR-B / PR-C reports.
 *
 * Design grammar: light mode, var(--font-display) (Fraunces) headings +
 * var(--font-body) (Inter), brand green hsl(152,55%,45%); grammar tokens mirrored
 * for surface colours. Styling is class-driven (no inline style objects) with a
 * single scoped <style> block carrying a pure-CSS @media (max-width:1023px) reflow
 * so the same markup works desktop → 360px with no JS width branch.
 *
 * Single responsive component, single concept-row data source (BoardConcept) — the
 * same component serves both platforms (the route renders it at every width).
 */

const TREND_LABEL: Record<DesktopTopicSummary["trendTier"], string> = {
  high: "High trend",
  medium: "Medium trend",
  low: "Low trend",
};

type SpineTab = "formula" | "proofs" | null;

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
.lt-spine__tip {
  margin: 10px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
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
.lt-spine__tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 14px;
}
.lt-spine__tab-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 999px;
  border: none;
  background: hsl(152, 55%, 45%);
  color: #ffffff;
  text-decoration: none;
  cursor: pointer;
}
.lt-spine__tab-link:hover { background: hsl(152, 60%, 38%); }
.lt-spine__panel {
  margin-top: 12px;
}
.lt-spine__panel-note {
  margin: 6px 0 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: hsl(220, 15%, 42%);
}
.lt-spine__count {
  margin: 18px 0 10px;
}
.lt-spine__rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.lt-spine__row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
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
.lt-spine__row-use {
  margin: 6px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: hsl(220, 15%, 42%);
}
.lt-spine__row-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 132px;
}
.lt-spine__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  font-size: 12px;
  font-weight: 600;
  padding: 7px 12px;
  border-radius: 8px;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
}
.lt-spine__btn--learn {
  background: #ffffff;
  color: hsl(214, 80%, 38%);
  border: 1.5px solid hsl(214, 70%, 80%);
}
.lt-spine__btn--practise {
  background: hsl(152, 55%, 95%);
  color: hsl(152, 60%, 30%);
  border: 1.5px solid hsla(152, 55%, 45%, 0.30);
}
.lt-spine__btn--practise:hover { background: hsl(152, 55%, 92%); }
@media (max-width: 1023px) {
  .lt-spine__row {
    flex-direction: column;
  }
  .lt-spine__row-actions {
    flex-direction: row;
    width: 100%;
    min-width: 0;
  }
  .lt-spine__btn {
    flex: 1;
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
  /** Existing practice route for the whole topic (the "Practice all" tab). */
  practiceAllHref: string;
  /** Builds the existing per-concept practice route. */
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
  const [activeTab, setActiveTab] = useState<SpineTab>(null);
  // The concept whose tutor drawer is open (null = closed). ConceptSpine owns this
  // open/close state; opening passes the clicked concept's context to the existing
  // ConceptTeachDrawer → TeachFlow → /api/mentor `concept_teach` engine. One mount
  // covers both platforms (the spine renders at every width).
  const [teachConcept, setTeachConcept] = useState<BoardConcept | null>(null);
  const concepts = actionable.boardEssentials;
  const trendTier = topic.trendTier;

  const toggleTab = (tab: Exclude<SpineTab, null>) =>
    setActiveTab((prev) => (prev === tab ? null : tab));

  return (
    <div className="lt-spine">
      <style>{SPINE_CSS}</style>

      {/* In-page back button (top-left) */}
      <Link to={backHref} className="lt-spine__back">
        <span aria-hidden="true">←</span>
        <span>{backLabel}</span>
      </Link>

      {/* Header: title + tight stat strip (trend · marks · sections) + one-line tip */}
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
        {actionable.examinerWarning && (
          <p className="lt-spine__tip">{actionable.examinerWarning}</p>
        )}

        {/* Header tab bar — structure only (Formula sheet · Proofs · Practice all) */}
        <div className="lt-spine__tabs">
          <Pill active={activeTab === "formula"} tone="green" onClick={() => toggleTab("formula")}>
            Formula sheet
          </Pill>
          <Pill active={activeTab === "proofs"} tone="green" onClick={() => toggleTab("proofs")}>
            Proofs
          </Pill>
          <Link to={practiceAllHref} className="lt-spine__tab-link">
            Practice all
          </Link>
        </div>

        {/* Honest "coming soon" tab shells — content arrives pre-generated in PR-E */}
        {activeTab === "formula" && (
          <div className="lt-spine__panel">
            <SectionHeader>Formula sheet</SectionHeader>
            <p className="lt-spine__panel-note">
              Formula sheet coming soon. Per-topic formula sheets (with a downloadable
              PDF) will appear here.
            </p>
          </div>
        )}
        {activeTab === "proofs" && (
          <div className="lt-spine__panel">
            <SectionHeader>Proofs</SectionHeader>
            <p className="lt-spine__panel-note">
              Board-format proofs coming soon. Verified proofs (with a downloadable PDF)
              will appear here for proof-relevant topics.
            </p>
          </div>
        )}
      </Card>

      {/* Concept spine — the page IS its concept rows */}
      <div className="lt-spine__count">
        <SectionHeader>
          {concepts.length} {concepts.length === 1 ? "concept" : "concepts"} — learn or practise each
        </SectionHeader>
      </div>
      <div className="lt-spine__rows">
        {concepts.map((concept, idx) => (
          <Card key={`${concept.name}-${idx}`} padding={14}>
            <div className="lt-spine__row">
              <div className="lt-spine__row-main">
                <div className="lt-spine__row-head">
                  <span className="lt-spine__row-name">{concept.name}</span>
                  <span className="lt-spine__marks">{concept.marks} marks</span>
                </div>
                {concept.oneLineUse && (
                  <p className="lt-spine__row-use">{concept.oneLineUse}</p>
                )}
              </div>
              <div className="lt-spine__row-actions">
                {/* Opens the concept tutor (concept_teach) — wired in PR-C */}
                <button
                  type="button"
                  className="lt-spine__btn lt-spine__btn--learn"
                  onClick={() => setTeachConcept(concept)}
                  title={`Teach me: ${concept.name}`}
                >
                  Teach me
                </button>
                {/* Existing, already-wired practice route */}
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
        ))}
      </div>

      {/* Concept tutor — REUSED engine (ConceptTeachDrawer → TeachFlow → /api/mentor
          `concept_teach`). Mounted fresh per concept so each gets its own session;
          questionText is empty (concept-teach, not a question). One mount = both
          platforms. Teach-first / earned-reveal + the visual/chat split (side-by-side
          on desktop, stacked under 768px) are handled inside TeachFlow. */}
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
