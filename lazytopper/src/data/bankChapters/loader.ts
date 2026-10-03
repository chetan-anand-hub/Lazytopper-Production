// src/data/bankChapters/loader.ts
//
// BANK-SPLIT-1 PR-2 (L4) — "await at the boundary, sync inside".
//
// Each route that serves bank questions awaits `ensureBankChapters(...)` ONCE, before it
// builds anything (Practice on topic select, Chapter Test and Full Mock before the draw,
// Worksheets before the plan preview, the tutor before its demo question, Exam Simulation
// before generation). That fills this module's cache with the chapter chunks it needs.
// Every builder underneath (selectBankQuestions, PredictionCore.*, buildUnionPool,
// planWorksheet, ...) stays SYNCHRONOUS and reads the cache.
//
// Reading a chapter that was never loaded THROWS BankChapterNotLoadedError. It never
// returns []: an empty pool would look like "this chapter has no questions", an honest-
// looking lie. A missed await must fail loudly in tests instead.
//
// This module imports no bank data statically. The generated registry holds one literal
// import() per chapter, so each chapter is its own chunk, fetched on demand.

import type { CanonicalQuestion } from "../predictionTypes";
import { resolveCanonicalSlug } from "../syllabus/canonicalTopicSlug";
import type { BankChapter } from "./defineChapter";
import {
  BANK_CHAPTER_LOADERS,
  BANK_CHAPTER_SLUGS,
  BANK_CHAPTER_SUBJECT,
  type BankChapterSlug,
} from "./chapterRegistry.generated";

export { BANK_CHAPTER_SLUGS, BANK_CHAPTER_SUBJECT, type BankChapterSlug };

export class BankChapterNotLoadedError extends Error {
  readonly slugs: string[];
  constructor(slugs: string[]) {
    super(
      `Bank chapter(s) not loaded: ${slugs.join(", ")}. ` +
        "The route must await ensureBankChapters(...) before reading the bank.",
    );
    this.name = "BankChapterNotLoadedError";
    this.slugs = slugs;
  }
}

const KNOWN = new Set<string>(BANK_CHAPTER_SLUGS);
const cache = new Map<BankChapterSlug, BankChapter>();
const inflight = new Map<BankChapterSlug, Promise<void>>();

/** True for one of the 26 canonical chapter slugs (anything else has no bank rows). */
export function isBankChapterSlug(slug: string): slug is BankChapterSlug {
  return KNOWN.has(slug);
}

/** Resolve any topic-key spellings to the distinct bank chapters they name (others dropped). */
export function bankChaptersFor(topicKeys: Iterable<string | null | undefined>): BankChapterSlug[] {
  const out: BankChapterSlug[] = [];
  for (const key of topicKeys) {
    const slug = resolveCanonicalSlug(key);
    if (isBankChapterSlug(slug) && !out.includes(slug)) out.push(slug);
  }
  return out;
}

/** Every chapter of a subject, in registry order. */
export function bankChaptersForSubject(subject: string): BankChapterSlug[] {
  const want = String(subject || "").trim().toLowerCase();
  return BANK_CHAPTER_SLUGS.filter((s) => BANK_CHAPTER_SUBJECT[s].toLowerCase() === want);
}

function loadOne(slug: BankChapterSlug): Promise<void> {
  if (cache.has(slug)) return Promise.resolve();
  let p = inflight.get(slug);
  if (!p) {
    p = BANK_CHAPTER_LOADERS[slug]()
      .then((mod) => {
        cache.set(slug, mod.default);
      })
      .finally(() => {
        inflight.delete(slug);
      });
    inflight.set(slug, p);
  }
  return p;
}

/**
 * Load the chapters named by `topicKeys` (any spelling; unknown keys are ignored, they
 * have no bank rows). Resolves when every one is in the cache. Safe to call repeatedly.
 */
export async function ensureBankChapters(topicKeys: Iterable<string | null | undefined>): Promise<void> {
  await Promise.all(bankChaptersFor(topicKeys).map(loadOne));
}

/** Load every chapter of a subject (Full Mock, Exam Simulation, full-subject worksheets). */
export async function ensureBankSubject(subject: string): Promise<void> {
  await Promise.all(bankChaptersForSubject(subject).map(loadOne));
}

/** Load all 26 chapters (tests and tooling; no live route needs this). */
export async function ensureAllBankChapters(): Promise<void> {
  await Promise.all(BANK_CHAPTER_SLUGS.map(loadOne));
}

export function isBankChapterLoaded(slug: string): boolean {
  return isBankChapterSlug(slug) && cache.has(slug);
}

function loadedChapters(slugs: Iterable<string>): BankChapter[] {
  const out: BankChapter[] = [];
  const missing: string[] = [];
  const seen = new Set<string>();
  for (const slug of slugs) {
    if (seen.has(slug) || !isBankChapterSlug(slug)) continue;
    seen.add(slug);
    const ch = cache.get(slug);
    if (ch) out.push(ch);
    else missing.push(slug);
  }
  if (missing.length) throw new BankChapterNotLoadedError(missing);
  return out;
}

/**
 * Served rows of the given canonical slugs, in aggregator order (exactly the order
 * `canonicalQuestionBank.filter(...)` would give). Slugs that are not bank chapters
 * contribute nothing; a bank chapter that is not loaded throws.
 */
export function getBankRows(slugs: Iterable<string>): CanonicalQuestion[] {
  const chapters = loadedChapters(slugs);
  if (chapters.length === 1) return [...chapters[0].rows];
  const merged: Array<{ q: CanonicalQuestion; k: number }> = [];
  for (const ch of chapters) {
    for (let i = 0; i < ch.rows.length; i += 1) merged.push({ q: ch.rows[i], k: ch.order[i] });
  }
  merged.sort((a, b) => a.k - b.k);
  return merged.map((m) => m.q);
}

/** Served rows of every chapter of a subject, in aggregator order. */
export function getBankRowsForSubject(subject: string): CanonicalQuestion[] {
  return getBankRows(bankChaptersForSubject(subject));
}

/**
 * True when `id` belongs to an AI pack (AI_GENERATED_QUESTION_IDS), judged over the
 * LOADED chapters. Callers ask only about rows of chapters they loaded.
 */
export function isAiGeneratedBankId(id: string): boolean {
  for (const ch of cache.values()) if (ch.aiIds.has(id)) return true;
  return false;
}

/** Test-only: forget every loaded chapter. */
export function __resetBankChaptersForTest(): void {
  cache.clear();
  inflight.clear();
}
