import { Link } from "react-router-dom";
import { Card } from "../grammar/Card";
import type { NoteSpec } from "../notes/noteSpec.types";
import { buildChapterAtAGlance, type GlanceItem } from "./chapterGlanceContent";

/**
 * ChapterAtAGlance — SEO-HUB-1 H1. The expanded overview at the top of every Topic Hub:
 * the chapter's opening summary, what the board asks (with marks where the spec carries
 * them), the key formulas and the NCERT definitions, and a visible link to the full notes.
 *
 * Composed ONLY from the chapter's existing note spec — see chapterGlanceContent.ts. A field
 * the spec lacks renders nothing (light-reflection-and-refraction has no big_idea, so it
 * shows no summary paragraph rather than an invented one). Plain text only: this module
 * must never import NoteRichText / katex (the Googlebot preload crash).
 */

const GLANCE_CSS = `
.lt-glance { margin-top: 14px; }
.lt-glance__title {
  margin: 0 0 8px;
  font-family: var(--font-display, "Fraunces", Georgia, serif);
  font-size: 18px;
  font-weight: 600;
  color: hsl(220, 25%, 12%);
}
.lt-glance__lead {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  color: hsl(220, 25%, 18%);
}
.lt-glance__text {
  margin: 0 0 10px;
  font-size: 13.5px;
  line-height: 1.6;
  color: hsl(220, 15%, 30%);
}
.lt-glance__h {
  margin: 14px 0 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: hsl(152, 45%, 30%);
}
.lt-glance__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.lt-glance__item {
  font-size: 13px;
  line-height: 1.55;
  color: hsl(220, 15%, 30%);
}
.lt-glance__label {
  font-weight: 600;
  color: hsl(220, 25%, 14%);
}
.lt-glance__formulas {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
  margin: 0;
}
.lt-glance__formula {
  padding: 8px 10px;
  border-radius: 8px;
  background: hsl(210, 40%, 98%);
  border: 1px solid hsl(220, 18%, 91%);
}
.lt-glance__formula dt {
  font-size: 11.5px;
  font-weight: 600;
  color: hsl(220, 15%, 42%);
}
.lt-glance__formula dd {
  margin: 2px 0 0;
  font-size: 13.5px;
  color: hsl(220, 25%, 12%);
  overflow-wrap: anywhere;
}
.lt-glance__notes-link {
  display: inline-flex;
  margin-top: 14px;
  font-size: 13.5px;
  font-weight: 600;
  color: hsl(152, 55%, 32%);
  text-decoration: none;
}
.lt-glance__notes-link:hover { text-decoration: underline; }
`;

function ItemList({ items }: { items: GlanceItem[] }) {
  return (
    <ul className="lt-glance__list">
      {items.map((item, i) => (
        <li key={`${item.label}-${i}`} className="lt-glance__item">
          <span className="lt-glance__label">{item.label}</span> — {item.text}
        </li>
      ))}
    </ul>
  );
}

export interface ChapterAtAGlanceProps {
  spec: NoteSpec;
  /** Topic slug — the notes page lives at /notes/<slug>. */
  slug: string;
  /** Chapter display name, for the notes link. */
  chapterName: string;
}

export function ChapterAtAGlance({ spec, slug, chapterName }: ChapterAtAGlanceProps) {
  const glance = buildChapterAtAGlance(spec);
  return (
    <section className="lt-glance" aria-labelledby="lt-glance-title" data-testid="chapter-at-a-glance">
      <style>{GLANCE_CSS}</style>
      <Card padding={18}>
        <h2 id="lt-glance-title" className="lt-glance__title">Chapter at a glance</h2>
        {glance.lead && <p className="lt-glance__lead">{glance.lead}</p>}
        {glance.summary && <p className="lt-glance__text">{glance.summary}</p>}

        {(glance.boardAsks || glance.boardPatterns.length > 0) && (
          <>
            <h3 className="lt-glance__h">What the board asks</h3>
            {glance.boardAsks && <p className="lt-glance__text">{glance.boardAsks}</p>}
            {glance.boardPatterns.length > 0 && <ItemList items={glance.boardPatterns} />}
          </>
        )}

        {glance.formulas.length > 0 && (
          <>
            <h3 className="lt-glance__h">Key formulas</h3>
            <dl className="lt-glance__formulas">
              {glance.formulas.map((f, i) => (
                <div key={`${f.label}-${i}`} className="lt-glance__formula">
                  <dt>{f.label}</dt>
                  <dd>{f.text}</dd>
                </div>
              ))}
            </dl>
          </>
        )}

        {glance.definitions.length > 0 && (
          <>
            <h3 className="lt-glance__h">Definitions to know (NCERT wording)</h3>
            <ItemList items={glance.definitions} />
          </>
        )}

        <Link to={`/notes/${slug}`} className="lt-glance__notes-link">
          Read the full {chapterName} notes<span aria-hidden="true">&nbsp;→</span>
        </Link>
      </Card>
    </section>
  );
}

export default ChapterAtAGlance;
