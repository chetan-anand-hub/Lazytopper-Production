import { Link, useParams, useSearchParams } from "react-router-dom";

import { Card } from "../../components/grammar/Card";
import { useReturnTicket } from "../../components/navigation/ReturnTicket";
import { Note, type NoteInitialTab } from "../../components/notes/Note";
import { getNoteSpecForTopic } from "../../components/notes/noteSpecRegistry";
import { desktopTopicBySlug } from "../../lib/desktop/topics";

/**
 * DesktopNotesPage — `/notes/:topicSlug`, the chapter note on a URL of its own
 * (SEO-NOTES-AND-LINKS-1).
 *
 * The Topic Hub's Notes control opens the SAME `<Note>` as a popup (NoteModal).
 * That popup had no address, so the notes — the page students search for — could
 * never be crawled, shared or opened in a new tab. This page mounts `<Note>`
 * standalone: it takes `{ spec }` (plus an optional `initialTab`) and owns no
 * dialog, focus or portal behaviour (all of that lives in NoteModal), so nothing
 * is re-implemented here.
 *
 * LANDING-FOLLOWUP-1 — this page, not <Note>, reads the URL: `?tab=questions`
 * opens the questions tab, and `?returnTo=&backLabel=` (via `useReturnTicket`)
 * points the back-link at wherever the reader came from. Both are absent in the
 * prerender capture, so the captured body is unchanged.
 *
 * Chrome comes from the route layer, exactly as for `/topic-hub/:topicName`:
 * DesktopShell at desktop width (isDesktopShellRoute) and MobileSelfChrome below it.
 *
 * Honest resolution: a slug with no topic or no authored spec renders a not-found
 * card — never a blank page and never invented note content.
 */

const NOTES_PAGE_CSS = `
.lt-notes-page {
  max-width: 980px;
  margin: 0 auto;
  padding: 20px 16px 48px;
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
}
.lt-notes-page__back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: hsl(152, 55%, 32%);
  text-decoration: none;
}
.lt-notes-page__back:hover { text-decoration: underline; }
.lt-notes-page__title {
  margin: 0 0 14px;
  font-family: "Fraunces", Georgia, serif;
  font-size: 26px;
  line-height: 1.25;
  color: hsl(220, 25%, 12%);
}
/* CBSE-PAGE-1 — contextual link out to the CBSE 2027 page, under the title. */
.lt-notes-page__cbse {
  display: inline-block;
  margin: -6px 0 16px;
  font-size: 13px;
  font-weight: 600;
  color: hsl(152, 60%, 28%);
  text-decoration: none;
}
.lt-notes-page__cbse:hover { text-decoration: underline; }
.lt-notes-page__nf-title {
  margin: 0 0 8px;
  font-size: 20px;
  color: hsl(220, 25%, 12%);
}
.lt-notes-page__nf-body {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: hsl(220, 15%, 42%);
}
`;

/**
 * `?tab=` → the tab the note opens on. ★ AN ALLOW-LIST, NOT A CAST: only
 * `questions` maps; anything else (absent, unknown, or a Topic Hub value such as
 * `learn`) opens the note on its default tab. The capture loads the bare path, so
 * the prerendered body is always the default view.
 */
export function noteTabFromParam(raw: string | null): NoteInitialTab | undefined {
  return raw === "questions" ? "questions" : undefined;
}

export default function DesktopNotesPage() {
  const { topicSlug = "" } = useParams<{ topicSlug?: string }>();
  const [params] = useSearchParams();
  // The return ticket, if the entry point supplied a safe one — validated by
  // `safeInternalReturnTo` inside the hook, exactly as /cbse/class-10 does. With no
  // ticket (a crawler, a shared link, the capture) the back-link is today's Topic
  // Hub link, unchanged.
  const ticket = useReturnTicket();
  const topic = topicSlug ? desktopTopicBySlug(topicSlug) : undefined;
  const spec = topic ? getNoteSpecForTopic(topic.slug) : null;

  if (!topic || !spec) {
    return (
      <div className="lt-notes-page">
        <style>{NOTES_PAGE_CSS}</style>
        <Link to="/exam-trends" className="lt-notes-page__back">
          <span aria-hidden="true">←</span>
          <span>Back to Exam Trends</span>
        </Link>
        <Card padding={24}>
          <h1 className="lt-notes-page__nf-title">Notes not found</h1>
          <p className="lt-notes-page__nf-body">
            We couldn&rsquo;t find chapter notes at this address. Use Exam Trends to
            browse every chapter and open its notes from the Topic Hub.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="lt-notes-page">
      <style>{NOTES_PAGE_CSS}</style>
      <Link to={ticket?.path ?? `/topic-hub/${topic.slug}`} className="lt-notes-page__back">
        <span aria-hidden="true">←</span>
        <span>{ticket?.label ?? `${topic.name} Topic Hub`}</span>
      </Link>
      <h1 className="lt-notes-page__title">{topic.name} — Class 10 Notes</h1>
      <Link
        to={`/cbse/class-10?returnTo=${encodeURIComponent(`/notes/${topic.slug}`)}`
          + `&backLabel=${encodeURIComponent(`Back to ${topic.name} notes`)}`}
        className="lt-notes-page__cbse"
      >
        CBSE 2027 — dates, rules and official papers →
      </Link>
      <Note spec={spec} initialTab={noteTabFromParam(params.get("tab"))} />
    </div>
  );
}
