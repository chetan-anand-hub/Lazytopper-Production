import { getGuaranteedArchetypes, isGuaranteedArchetype } from "./guaranteedArchetypes";

export type PaperSection = "A" | "B" | "C" | "D" | "E";

export interface ConstrainedPaperCandidate {
  id: string;
  subject: "Maths" | "Science";
  topicKey: string;
  subtopic: string;
  section: PaperSection;
  marks: number;
  format: string;
  competencyType: string;
  score: number;
}

export interface ConstrainedBlueprint {
  sectionMarks: Record<PaperSection, number>;
  competencyFocusedMinShare?: number; // e.g. 0.50
  caseBasedMinCount?: number; // e.g. 3
}

export interface GuaranteedArchetypeDiagnostic {
  topic: string;
  subtopic: string;
  included: boolean;
  reason: string;
}

export interface ConstrainedPaperResult {
  selected: ConstrainedPaperCandidate[];
  bySection: Record<PaperSection, ConstrainedPaperCandidate[]>;
  totalMarks: number;
  diagnostics: {
    competencyFocusedShare: number;
    caseBasedCount: number;
    objectiveScore: number;
    constraintsSatisfied: boolean;
    guaranteedArchetypes: GuaranteedArchetypeDiagnostic[];
    guaranteedAllIncluded: boolean;
  };
}

const SECTION_ORDER: PaperSection[] = ["A", "B", "C", "D", "E"];

function isCompetencyFocused(c: ConstrainedPaperCandidate): boolean {
  const fmt = String(c.format || "").toLowerCase();
  const comp = String(c.competencyType || "").toLowerCase();
  return (
    fmt.includes("case") ||
    fmt.includes("assertion") ||
    comp.includes("application") ||
    comp.includes("case") ||
    comp.includes("assertion")
  );
}

function objectiveValue(rows: ConstrainedPaperCandidate[]): number {
  const base = rows.reduce((sum, row) => sum + (row.score || 0), 0);
  const uniqueTopics = new Set(rows.map((r) => `${r.subject}|${r.topicKey}`)).size;
  return base + uniqueTopics * 0.35;
}

function chooseBestForSection(args: {
  candidates: ConstrainedPaperCandidate[];
  targetMarks: number;
}): ConstrainedPaperCandidate[] {
  const { candidates, targetMarks } = args;
  if (targetMarks <= 0 || candidates.length === 0) return [];

  // Exact-mark 0/1 knapsack DP keeps runtime bounded while preserving
  // deterministic "best score" selection.
  const pool = [...candidates]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 140);

  const bestAtMarks: Array<{ score: number; picks: number[] } | null> = Array(
    targetMarks + 1
  ).fill(null);
  bestAtMarks[0] = { score: 0, picks: [] };

  for (let index = 0; index < pool.length; index += 1) {
    const candidate = pool[index];
    const candMarks = Math.max(0, candidate.marks);
    if (candMarks <= 0 || candMarks > targetMarks) continue;
    const candScore = Number(candidate.score || 0);

    for (let marks = targetMarks; marks >= candMarks; marks -= 1) {
      const prev = bestAtMarks[marks - candMarks];
      if (!prev) continue;
      if (prev.picks.includes(index)) continue;

      const nextScore = prev.score + candScore;
      const current = bestAtMarks[marks];
      if (!current || nextScore > current.score) {
        bestAtMarks[marks] = {
          score: nextScore,
          picks: [...prev.picks, index],
        };
      }
    }
  }

  const best = bestAtMarks[targetMarks];
  if (!best) return [];
  return best.picks.map((pickIndex) => pool[pickIndex]);
}

function repairForConstraints(args: {
  initial: ConstrainedPaperCandidate[];
  allCandidates: ConstrainedPaperCandidate[];
  blueprint: ConstrainedBlueprint;
}): ConstrainedPaperCandidate[] {
  const { initial, allCandidates, blueprint } = args;
  const out = [...initial];

  const focusedMinShare = blueprint.competencyFocusedMinShare ?? 0.5;
  const caseMinCount = blueprint.caseBasedMinCount ?? 3;

  const totalCount = Math.max(1, out.length);
  let focusedCount = out.filter(isCompetencyFocused).length;
  let caseCount = out.filter((q) =>
    String(q.format || "").toLowerCase().includes("case")
  ).length;

  // swap-in better competency/case questions section-wise (marks preserved).
  for (const section of SECTION_ORDER) {
    if (focusedCount / totalCount >= focusedMinShare && caseCount >= caseMinCount) {
      break;
    }
    const currentSection = out.filter((q) => q.section === section);
    const sectionCandidates = allCandidates.filter((q) => q.section === section);
    if (currentSection.length === 0 || sectionCandidates.length === 0) continue;

    for (const candidate of sectionCandidates) {
      if (out.some((x) => x.id === candidate.id)) continue;
      const fmt = String(candidate.format || "").toLowerCase();
      const boostsFocused = isCompetencyFocused(candidate);
      const boostsCase = fmt.includes("case");
      if (!boostsFocused && !boostsCase) continue;

      const replaceIdx = out.findIndex((q) => {
        if (q.section !== section) return false;
        if (q.marks !== candidate.marks) return false;
        const qFocused = isCompetencyFocused(q);
        const qCase = String(q.format || "").toLowerCase().includes("case");
        return (!qFocused || !qCase) && q.score <= candidate.score;
      });
      if (replaceIdx < 0) continue;

      const old = out[replaceIdx];
      out[replaceIdx] = candidate;
      if (isCompetencyFocused(old) !== boostsFocused) {
        focusedCount += boostsFocused ? 1 : -1;
      }
      const oldCase = String(old.format || "").toLowerCase().includes("case");
      if (oldCase !== boostsCase) {
        caseCount += boostsCase ? 1 : -1;
      }
      break;
    }
  }

  return out;
}

function norm(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function fuzzyMatchPaper(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wordsA = new Set(na.split(" "));
  const wordsB = new Set(nb.split(" "));
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  return Math.min(wordsA.size, wordsB.size) >= 2 && overlap / Math.min(wordsA.size, wordsB.size) >= 0.7;
}

function enforceGuaranteedArchetypes(args: {
  current: ConstrainedPaperCandidate[];
  allCandidates: ConstrainedPaperCandidate[];
  subject: "Maths" | "Science";
}): { result: ConstrainedPaperCandidate[]; diagnostics: GuaranteedArchetypeDiagnostic[] } {
  const { current, allCandidates, subject } = args;
  const out = [...current];
  const guaranteedList = getGuaranteedArchetypes(subject);
  const diagnostics: GuaranteedArchetypeDiagnostic[] = [];

  for (const arch of guaranteedList) {
    const alreadyIncluded = out.some(
      q => fuzzyMatchPaper(q.topicKey, arch.topic) && fuzzyMatchPaper(q.subtopic, arch.subtopic)
    );
    if (alreadyIncluded) {
      diagnostics.push({ topic: arch.topic, subtopic: arch.subtopic, included: true, reason: "already selected by scoring" });
      continue;
    }

    const replacement = allCandidates.find(
      c => fuzzyMatchPaper(c.topicKey, arch.topic) && fuzzyMatchPaper(c.subtopic, arch.subtopic)
    );
    if (!replacement) {
      diagnostics.push({ topic: arch.topic, subtopic: arch.subtopic, included: false, reason: "no matching candidate in question bank" });
      continue;
    }

    const swapIdx = out.findIndex(q => {
      if (q.section !== replacement.section) return false;
      if (q.marks !== replacement.marks) return false;
      const qGuaranteed = isGuaranteedArchetype(subject, q.topicKey, q.subtopic);
      return qGuaranteed === null && q.score <= replacement.score;
    });

    if (swapIdx >= 0) {
      out[swapIdx] = replacement;
      diagnostics.push({ topic: arch.topic, subtopic: arch.subtopic, included: true, reason: "swapped in (same section, same marks, lower score)" });
      continue;
    }

    const fallbackIdx = out.findIndex(q => {
      if (q.section !== replacement.section) return false;
      if (q.marks !== replacement.marks) return false;
      const qGuaranteed = isGuaranteedArchetype(subject, q.topicKey, q.subtopic);
      return qGuaranteed === null;
    });

    if (fallbackIdx >= 0) {
      out[fallbackIdx] = replacement;
      diagnostics.push({ topic: arch.topic, subtopic: arch.subtopic, included: true, reason: "swapped in (same section, same marks, fallback)" });
      continue;
    }

    const crossSectionIdx = out.findIndex(q => {
      if (q.marks !== replacement.marks) return false;
      const qGuaranteed = isGuaranteedArchetype(subject, q.topicKey, q.subtopic);
      return qGuaranteed === null;
    });

    if (crossSectionIdx >= 0) {
      const displaced = out[crossSectionIdx];
      replacement.section = displaced.section as PaperSection;
      out[crossSectionIdx] = replacement;
      diagnostics.push({ topic: arch.topic, subtopic: arch.subtopic, included: true, reason: `forced inclusion (cross-section swap from ${displaced.section})` });
      continue;
    }

    diagnostics.push({ topic: arch.topic, subtopic: arch.subtopic, included: false, reason: "no compatible swap slot found (marks mismatch across all sections)" });
  }

  return { result: out, diagnostics };
}

export function buildConstrainedPaper(args: {
  candidates: ConstrainedPaperCandidate[];
  blueprint: ConstrainedBlueprint;
}): ConstrainedPaperResult {
  const { candidates, blueprint } = args;
  const bySection: Record<PaperSection, ConstrainedPaperCandidate[]> = {
    A: [],
    B: [],
    C: [],
    D: [],
    E: [],
  };

  for (const section of SECTION_ORDER) {
    const sectionRows = candidates.filter((c) => c.section === section);
    bySection[section] = chooseBestForSection({
      candidates: sectionRows,
      targetMarks: blueprint.sectionMarks[section],
    });
  }

  const initial = SECTION_ORDER.flatMap((s) => bySection[s]);

  const subject = candidates.length > 0 ? candidates[0].subject : "Maths";
  const guaranteedEnforcement = enforceGuaranteedArchetypes({
    current: initial,
    allCandidates: candidates,
    subject,
  });

  const repaired = repairForConstraints({
    initial: guaranteedEnforcement.result,
    allCandidates: candidates,
    blueprint,
  });

  const finalBySection: Record<PaperSection, ConstrainedPaperCandidate[]> = {
    A: repaired.filter((q) => q.section === "A"),
    B: repaired.filter((q) => q.section === "B"),
    C: repaired.filter((q) => q.section === "C"),
    D: repaired.filter((q) => q.section === "D"),
    E: repaired.filter((q) => q.section === "E"),
  };

  const totalMarks = repaired.reduce((sum, row) => sum + row.marks, 0);
  const focusedCount = repaired.filter(isCompetencyFocused).length;
  const caseBasedCount = repaired.filter((q) =>
    String(q.format || "").toLowerCase().includes("case")
  ).length;
  const competencyFocusedShare =
    repaired.length > 0 ? focusedCount / repaired.length : 0;
  const guaranteedAllIncluded = guaranteedEnforcement.diagnostics.every(d => d.included);
  const constraintsSatisfied =
    competencyFocusedShare >= (blueprint.competencyFocusedMinShare ?? 0.5) &&
    caseBasedCount >= (blueprint.caseBasedMinCount ?? 3) &&
    guaranteedAllIncluded;

  return {
    selected: repaired,
    bySection: finalBySection,
    totalMarks,
    diagnostics: {
      competencyFocusedShare,
      caseBasedCount,
      objectiveScore: objectiveValue(repaired),
      constraintsSatisfied,
      guaranteedArchetypes: guaranteedEnforcement.diagnostics,
      guaranteedAllIncluded,
    },
  };
}
