import { desktopTopicBySlug, desktopTopicsBySubject } from "../lib/desktop/topics";

/**
 * SEO-NOTES-LINK-2 — the internal links between the 26 notes pages, as pure data shared
 * by DesktopNotesPage and its tests.
 *
 * ★ ORDER IS `topics.ts` ORDER within one subject (`desktopTopicsBySubject`, the same
 * order Exam Trends' All chapters list uses).
 *
 * ⚠ DERIVED FROM topics.ts ALONE — deliberately NO note-spec registry import, so the Exam
 * Trends route does not pull the registry (and its figure-URL map) into its graph. Every
 * topic has a note spec today; `notesLinks.test.ts` asserts that at TEST time, so a future
 * chapter without notes fails a test instead of shipping a dead link.
 *
 * ★ CLEAN PATHS ONLY: every href is `/notes/<slug>` — no query, no hash — so the
 * crawlable link and the canonical are the same address.
 */

export interface NotesLink {
  slug: string;
  name: string;
  href: string;
}

/** How many "Related notes" links a page shows (the nearest same-subject chapters). */
const RELATED_COUNT = 3;

/** `/notes/<slug>` for a known chapter, otherwise null. */
export function notesHref(slug: string): string | null {
  const topic = desktopTopicBySlug(slug);
  return topic ? `/notes/${topic.slug}` : null;
}

/** The chapter's subject list (topics.ts order), and its index in it. */
function subjectOrder(slug: string): { list: NotesLink[]; at: number } {
  const topic = desktopTopicBySlug(slug);
  if (!topic) return { list: [], at: -1 };
  const list = desktopTopicsBySubject(topic.subject).map((t) => ({
    slug: t.slug,
    name: t.name,
    href: `/notes/${t.slug}`,
  }));
  return { list, at: list.findIndex((l) => l.slug === topic.slug) };
}

/**
 * The nearest same-subject chapters (by distance in topics.ts order, the earlier one
 * first on a tie), up to three, returned in topics.ts order.
 */
export function related(slug: string): NotesLink[] {
  const { list, at } = subjectOrder(slug);
  if (at === -1) return [];
  const picked: number[] = [];
  for (let d = 1; picked.length < RELATED_COUNT && d < list.length; d += 1) {
    for (const i of [at - d, at + d]) {
      if (i >= 0 && i < list.length && picked.length < RELATED_COUNT) picked.push(i);
    }
  }
  return picked.sort((a, b) => a - b).map((i) => list[i]);
}

/** The previous and next chapter of the same subject; null at either end. */
export function prevNext(slug: string): { prev: NotesLink | null; next: NotesLink | null } {
  const { list, at } = subjectOrder(slug);
  if (at === -1) return { prev: null, next: null };
  return {
    prev: at > 0 ? list[at - 1] : null,
    next: at < list.length - 1 ? list[at + 1] : null,
  };
}
