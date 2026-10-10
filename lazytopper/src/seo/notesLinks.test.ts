import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { notesHref, prevNext, related } from "./notesLinks";
import { hasNoteSpec } from "../components/notes/noteSpecRegistry";
import { allDesktopTopics, desktopTopicBySlug, desktopTopicsBySubject } from "../lib/desktop/topics";

/**
 * SEO-NOTES-LINK-2 — the link data shared by the notes page ("Related notes" + previous /
 * next chapter). Table-driven over EVERY topic, so a chapter added to topics.ts is covered.
 */

const ALL = allDesktopTopics();
/** `<repo>/notes/specs` — vitest runs with cwd = lazytopper/. */
const SPECS_DIR = resolve(process.cwd(), "..", "notes", "specs");

describe("notesLinks — related() and prevNext() over every chapter", () => {
  it("names its subject on every run, green included", () => {
    // eslint-disable-next-line no-console
    console.log(`NOTES_LINKS_SCOPE: topics=${ALL.length}`);
    expect(ALL.length).toBe(26);
  });

  it.each(ALL.map((t) => [t.slug]))("%s: related() is 2-3 same-subject neighbours, clean paths", (slug) => {
    const topic = desktopTopicBySlug(slug)!;
    const order = desktopTopicsBySubject(topic.subject).map((t) => t.slug);
    const at = order.indexOf(slug);
    const links = related(slug);
    expect(links.length).toBeGreaterThanOrEqual(2);
    expect(links.length).toBeLessThanOrEqual(3);
    const slugs = links.map((l) => l.slug);
    expect(new Set(slugs).size, `${slug}: duplicate related link`).toBe(slugs.length);
    expect(slugs).not.toContain(slug);
    for (const l of links) {
      expect(desktopTopicBySlug(l.slug)?.subject, `${slug} -> ${l.slug}: other subject`).toBe(topic.subject);
      expect(l.href).toBe(`/notes/${l.slug}`);
      expect(l.href).not.toMatch(/[?#]/);
      expect(l.name).toBe(desktopTopicBySlug(l.slug)?.name);
      // Neighbouring: within 3 places of this chapter in topics.ts order.
      expect(Math.abs(order.indexOf(l.slug) - at), `${slug} -> ${l.slug}: not a neighbour`).toBeLessThanOrEqual(3);
    }
    // Rendered in topics.ts order.
    const positions = slugs.map((s) => order.indexOf(s));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it.each(ALL.map((t) => [t.slug]))("%s: prevNext() follows topics.ts order, one direction at the edges", (slug) => {
    const topic = desktopTopicBySlug(slug)!;
    const order = desktopTopicsBySubject(topic.subject).map((t) => t.slug);
    const at = order.indexOf(slug);
    const { prev, next } = prevNext(slug);
    if (at === 0) expect(prev).toBeNull();
    else expect(prev?.href).toBe(`/notes/${order[at - 1]}`);
    if (at === order.length - 1) expect(next).toBeNull();
    else expect(next?.href).toBe(`/notes/${order[at + 1]}`);
    expect(prev !== null || next !== null).toBe(true);
  });

  it("CONTROL — an unknown slug gets no links, never invented ones", () => {
    expect(related("does-not-exist")).toEqual([]);
    expect(prevNext("does-not-exist")).toEqual({ prev: null, next: null });
    expect(notesHref("does-not-exist")).toBeNull();
    expect(notesHref("polynomials")).toBe("/notes/polynomials");
  });
});

/**
 * TEST-TIME guard (controller ruling): notesLinks derives its links from topics.ts ALONE, so
 * the Exam Trends route never pulls in the note-spec registry. That is only safe while every
 * topic has a note spec — this guard is what turns a future chapter without notes into a
 * red test instead of a shipped dead link.
 */
describe("notesLinks — every linked chapter has a note spec (test-time guard)", () => {
  it("every topic slug notesLinks can link to has an authored note spec", () => {
    const linkable = [...desktopTopicsBySubject("Maths"), ...desktopTopicsBySubject("Science")];
    expect(linkable.length).toBe(26);
    const missing = linkable
      .map((t) => t.slug)
      .filter((slug) => !hasNoteSpec(slug) || !existsSync(join(SPECS_DIR, `${slug}.json`)));
    expect(missing, "chapters linked by notesLinks with no note spec").toEqual([]);
    for (const t of linkable) expect(notesHref(t.slug)).toBe(`/notes/${t.slug}`);
  });

  it("CONTROL — the guard's detector fires for a slug with no spec", () => {
    expect(hasNoteSpec("does-not-exist")).toBe(false);
    expect(existsSync(join(SPECS_DIR, "does-not-exist.json"))).toBe(false);
  });

  it("notesLinks.ts does not import the note-spec registry (keeps it off the Exam Trends route)", () => {
    const src = readFileSync(join(process.cwd(), "src", "seo", "notesLinks.ts"), "utf8");
    expect(src).not.toMatch(/noteSpecRegistry/);
    expect(src).not.toMatch(/notes\/specs/);
  });
});
