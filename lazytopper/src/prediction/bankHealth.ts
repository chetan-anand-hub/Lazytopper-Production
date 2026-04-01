// LazyTopper – Bank Health Engine
// Location: src/prediction/bankHealth.ts
// Purpose: Build BankHealthReport from canonical questions + TopicKey sources,
//          using policy-driven difficulty (suggestDifficulty) for difficultyCounts.

import type { DifficultyLabel, CanonicalQuestionLike } from "./difficultyAutoSuggest";
import { suggestDifficulty } from "./difficultyAutoSuggest";

export interface TopicKeySourceLike {
  subject: string;
  topicKey: string;
  topicTitle?: string;
  expectedSlots?: number;
  [key: string]: any;
}

// Maintain backwards compatibility: some modules still import TopicKeySource
// from this file.  Export an alias so imports continue to type-check.
export type TopicKeySource = TopicKeySourceLike;

export interface DifficultyCounts {
  easy: number;
  medium: number;
  hard: number;
  total: number;
}

export interface TopicBankHealthRow {
  subject: string;
  topicKey: string;
  topicTitle: string;
  totalSlots: number | null;
  bankCount: number;
  coverageStatus: "zero" | "low" | "ok";
  missingInBank: boolean;
  missingInTrends: boolean;
  difficultyCounts: DifficultyCounts;
  // Open-ended bag for future needs (e.g. blueprint links, notes)
  [key: string]: any;
}

export interface BankHealthSummary {
  totalTopicSlots: number;
  zeroCoverageCount: number;
  lowCoverageCount: number;
  okCoverageCount: number;
  missingInBankCount: number;
  missingInTrendsCount: number;
}

export interface BankHealthReport {
  rows: TopicBankHealthRow[];
  summary: BankHealthSummary;
}

export interface BuildBankHealthReportArgs {
  questions: CanonicalQuestionLike[];
  topicKeySources: TopicKeySourceLike[];
}

// --- Internal helpers -------------------------------------------------------

function normaliseString(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function makeDifficultyCounts(): DifficultyCounts {
  return { easy: 0, medium: 0, hard: 0, total: 0 };
}

function difficultyKey(label: DifficultyLabel): keyof DifficultyCounts {
  if (label === "easy") return "easy";
  if (label === "medium") return "medium";
  return "hard";
}

function rowKey(subject: string, topicKey: string): string {
  return `${subject}||${topicKey}`;
}

// --- Core engine ------------------------------------------------------------

export function buildBankHealthReport(args: BuildBankHealthReportArgs): BankHealthReport {
  const { questions, topicKeySources } = args;

  const rowsByKey = new Map<string, TopicBankHealthRow>();

  // 1) Seed rows from TopicKey sources (TopicHub / trend roots)
  for (const src of topicKeySources || []) {
    if (!src) continue;

    const subject = normaliseString(src.subject);
    const topicKey = normaliseString(src.topicKey);
    if (!subject || !topicKey) continue;

    const key = rowKey(subject, topicKey);
    if (!rowsByKey.has(key)) {
      rowsByKey.set(key, {
        subject,
        topicKey,
        topicTitle: normaliseString(src.topicTitle) || topicKey,
        totalSlots: typeof src.expectedSlots === "number" ? src.expectedSlots : null,
        bankCount: 0,
        coverageStatus: "zero",
        missingInBank: false,
        missingInTrends: false,
        difficultyCounts: makeDifficultyCounts(),
      });
    }
  }

  // 2) Walk through canonical questions, attach by (subject, topicKey) and
  //    compute difficulty using the policy-driven suggestDifficulty.
  for (const q of questions || []) {
    if (!q) continue;

    const subject = normaliseString((q as any).subject ?? (q as any).boardSubject ?? "");
    const topicKey = normaliseString((q as any).topicKey ?? "");
    if (!topicKey) continue; // if a question is not mapped to a topicKey, we skip it

    const key = rowKey(subject, topicKey);
    if (!rowsByKey.has(key)) {
      // Topic present in bank but missing from TopicHub/trends.
      rowsByKey.set(key, {
        subject,
        topicKey,
        topicTitle: topicKey,
        totalSlots: null,
        bankCount: 0,
        coverageStatus: "zero",
        missingInBank: false,
        missingInTrends: true,
        difficultyCounts: makeDifficultyCounts(),
      });
    }

    const row = rowsByKey.get(key)!;
    row.bankCount += 1;

    const difficulty = suggestDifficulty(q);
    const dKey = difficultyKey(difficulty);
    row.difficultyCounts[dKey] += 1;
    row.difficultyCounts.total += 1;
  }

  // 3) Finalise coverage status + missing flags and compute summary.
  let totalTopicSlots = 0;
  let zeroCoverageCount = 0;
  let lowCoverageCount = 0;
  let okCoverageCount = 0;
  let missingInBankCount = 0;
  let missingInTrendsCount = 0;

  for (const row of rowsByKey.values()) {
    const expectedSlots = row.totalSlots;
    const bankCount = row.bankCount;

    if (expectedSlots != null) {
      totalTopicSlots += expectedSlots;
    }

    if (expectedSlots == null) {
      // If we don't know the blueprint expectation, we derive coverage only from bankCount.
      if (bankCount === 0) {
        row.coverageStatus = "zero";
        zeroCoverageCount += 1;
      } else {
        row.coverageStatus = "ok";
        okCoverageCount += 1;
      }
    } else {
      if (bankCount === 0) {
        row.coverageStatus = "zero";
        row.missingInBank = true;
        zeroCoverageCount += 1;
        missingInBankCount += 1;
      } else if (bankCount < expectedSlots) {
        row.coverageStatus = "low";
        lowCoverageCount += 1;
      } else {
        row.coverageStatus = "ok";
        okCoverageCount += 1;
      }
    }

    if (row.missingInTrends) {
      missingInTrendsCount += 1;
    }
  }

  const rows = Array.from(rowsByKey.values()).sort((a, b) => {
    const subjA = a.subject.toLowerCase();
    const subjB = b.subject.toLowerCase();
    if (subjA !== subjB) return subjA.localeCompare(subjB);
    const topicA = a.topicKey.toLowerCase();
    const topicB = b.topicKey.toLowerCase();
    return topicA.localeCompare(topicB);
  });

  const summary: BankHealthSummary = {
    totalTopicSlots,
    zeroCoverageCount,
    lowCoverageCount,
    okCoverageCount,
    missingInBankCount,
    missingInTrendsCount,
  };

  return { rows, summary };
}

// Legacy helper for callers that only need the summary.
export function summariseBankHealth(report: BankHealthReport): BankHealthSummary {
  return report.summary;
}