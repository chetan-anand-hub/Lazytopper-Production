import { useMemo, useState } from "react";
import ReturnContextBar from "../components/ux/ReturnContextBar";

import type { CanonicalQuestion } from "../data/predictionTypes";

import { AREAS_RELATED_TO_CIRCLES_PACK1 } from "../data/questionBanks/class10/maths/areasRelatedToCircles.pack1";
import { ARC2_PACK2 } from "../data/questionBanks/class10/maths/areasRelatedToCircles.pack2";
import { ARITHMETIC_PROGRESSION_PACK1 } from "../data/questionBanks/class10/maths/arithmeticProgression.pack1";
import { AP2_PACK2 } from "../data/questionBanks/class10/maths/arithmeticProgression.pack2";
import { CIRCLES_PACK1 } from "../data/questionBanks/class10/maths/circles.pack1";
import { CI2_PACK2 } from "../data/questionBanks/class10/maths/circles.pack2";
import { COORDINATE_GEOMETRY_PACK1 } from "../data/questionBanks/class10/maths/coordinateGeometry.pack1";
import { CG2_PACK2 } from "../data/questionBanks/class10/maths/coordinateGeometry.pack2";
import { PAIR_LINEAR_EQUATIONS_PACK1 } from "../data/questionBanks/class10/maths/pairOfLinearEquations.pack1";
import { PLE2_PACK2 } from "../data/questionBanks/class10/maths/pairOfLinearEquations.pack2";
import { POLYNOMIALS_PACK1 } from "../data/questionBanks/class10/maths/polynomials.pack1";
import { PL2_PACK2 } from "../data/questionBanks/class10/maths/polynomials.pack2";
import { PROBABILITY_PACK1 } from "../data/questionBanks/class10/maths/probability.pack1";
import { PR2_PACK2 } from "../data/questionBanks/class10/maths/probability.pack2";
import { QUADRATIC_EQUATIONS_PACK1 } from "../data/questionBanks/class10/maths/quadraticEquations.pack1";
import { QE2_PACK2 } from "../data/questionBanks/class10/maths/quadraticEquations.pack2";
import { REAL_NUMBERS_PACK1 } from "../data/questionBanks/class10/maths/realNumbers.pack1";
import { RN2_PACK2 } from "../data/questionBanks/class10/maths/realNumbers.pack2";
import { STATISTICS_PACK1 } from "../data/questionBanks/class10/maths/statistics.pack1";
import { ST2_PACK2 } from "../data/questionBanks/class10/maths/statistics.pack2";
import { SURFACE_AREAS_VOLUMES_PACK1 } from "../data/questionBanks/class10/maths/surfaceAreasVolumes.pack1";
import { SAV2_PACK2 } from "../data/questionBanks/class10/maths/surfaceAreasVolumes.pack2";
import { TRIANGLES_PACK1_QUESTIONS } from "../data/questionBanks/class10/maths/triangles.pack1";
import { trianglesPack2Questions } from "../data/questionBanks/class10/maths/triangles.pack2";
import { TR3_PACK3 } from "../data/questionBanks/class10/maths/triangles.pack3";
import { TRIG_PACK1_QUESTIONS } from "../data/questionBanks/class10/maths/trigonometry.pack1";
import { trigonometryPack2Questions } from "../data/questionBanks/class10/maths/trigonometry.pack2";
import { TG3_PACK3 } from "../data/questionBanks/class10/maths/trigonometry.pack3";

import { ACIDS_BASES_SALTS_PACK1 } from "../data/questionBanks/class10/science/acidsBasesSalts.pack1";
import { ABS2_PACK2 } from "../data/questionBanks/class10/science/acidsBasesSalts.pack2";
import { CARBON_COMPOUNDS_PACK1 } from "../data/questionBanks/class10/science/carbonCompounds.pack1";
import { CC2_PACK2 } from "../data/questionBanks/class10/science/carbonCompounds.pack2";
import { CHEMICAL_REACTIONS_PACK1 } from "../data/questionBanks/class10/science/chemicalReactions.pack1";
import { CR2_PACK2 } from "../data/questionBanks/class10/science/chemicalReactions.pack2";
import { CONTROL_AND_COORDINATION_PACK1 } from "../data/questionBanks/class10/science/controlAndCoordination.pack1";
import { CNC2_PACK2 } from "../data/questionBanks/class10/science/controlAndCoordination.pack2";
import { ELECTRICITY_PACK1 } from "../data/questionBanks/class10/science/electricity.pack1";
import { EL2_PACK2 } from "../data/questionBanks/class10/science/electricity.pack2";
import { HEREDITY_PACK1 } from "../data/questionBanks/class10/science/heredity.pack1";
import { HE2_PACK2 } from "../data/questionBanks/class10/science/heredity.pack2";
import { HUMAN_EYE_PACK1 } from "../data/questionBanks/class10/science/humanEyeAndColourfulWorld.pack1";
import { HEC2_PACK2 } from "../data/questionBanks/class10/science/humanEyeAndColourfulWorld.pack2";
import { LIFE_PROCESSES_PACK1 } from "../data/questionBanks/class10/science/lifeProcesses.pack1";
import { LP2_PACK2 } from "../data/questionBanks/class10/science/lifeProcesses.pack2";
import { LIGHT_PACK1 } from "../data/questionBanks/class10/science/light.pack1";
import { LT2_PACK2 } from "../data/questionBanks/class10/science/light.pack2";
import { MAGNETIC_EFFECTS_PACK1 } from "../data/questionBanks/class10/science/magneticEffects.pack1";
import { ME2_PACK2 } from "../data/questionBanks/class10/science/magneticEffects.pack2";
import { METALS_NON_METALS_PACK1 } from "../data/questionBanks/class10/science/metalsNonMetals.pack1";
import { MNM2_PACK2 } from "../data/questionBanks/class10/science/metalsNonMetals.pack2";
import { OUR_ENVIRONMENT_PACK1 } from "../data/questionBanks/class10/science/ourEnvironment.pack1";
import { OE2_PACK2 } from "../data/questionBanks/class10/science/ourEnvironment.pack2";
import { REPRODUCTION_PACK1 } from "../data/questionBanks/class10/science/reproduction.pack1";
import { REP2_PACK2 } from "../data/questionBanks/class10/science/reproduction.pack2";

const HARD_MIN = 15;
const HARD_MAX = 30;
const EASY_MIN = 20;
const EASY_MAX = 60;

type SectionKey = "A" | "B" | "C" | "D" | "E";

interface ChapterBreakdown {
  chapter: string;
  subject: string;
  total: number;
  easy: number;
  medium: number;
  hard: number;
  easyPct: number;
  mediumPct: number;
  hardPct: number;
  sections: Record<SectionKey, number>;
}

type ChapterEntry = {
  chapter: string;
  subject: string;
  packs: CanonicalQuestion[][];
};

const CHAPTER_PACKS: ChapterEntry[] = [
  { chapter: "Real Numbers", subject: "Maths", packs: [REAL_NUMBERS_PACK1 as CanonicalQuestion[], RN2_PACK2 as CanonicalQuestion[]] },
  { chapter: "Polynomials", subject: "Maths", packs: [POLYNOMIALS_PACK1 as CanonicalQuestion[], PL2_PACK2 as CanonicalQuestion[]] },
  { chapter: "Pair of Linear Equations", subject: "Maths", packs: [PAIR_LINEAR_EQUATIONS_PACK1 as CanonicalQuestion[], PLE2_PACK2 as CanonicalQuestion[]] },
  { chapter: "Quadratic Equations", subject: "Maths", packs: [QUADRATIC_EQUATIONS_PACK1 as CanonicalQuestion[], QE2_PACK2 as CanonicalQuestion[]] },
  { chapter: "Arithmetic Progression", subject: "Maths", packs: [ARITHMETIC_PROGRESSION_PACK1 as CanonicalQuestion[], AP2_PACK2 as CanonicalQuestion[]] },
  { chapter: "Triangles", subject: "Maths", packs: [TRIANGLES_PACK1_QUESTIONS as unknown as CanonicalQuestion[], trianglesPack2Questions as CanonicalQuestion[], TR3_PACK3 as CanonicalQuestion[]] },
  { chapter: "Coordinate Geometry", subject: "Maths", packs: [COORDINATE_GEOMETRY_PACK1 as CanonicalQuestion[], CG2_PACK2 as CanonicalQuestion[]] },
  { chapter: "Trigonometry", subject: "Maths", packs: [TRIG_PACK1_QUESTIONS as unknown as CanonicalQuestion[], trigonometryPack2Questions as CanonicalQuestion[], TG3_PACK3 as CanonicalQuestion[]] },
  { chapter: "Circles", subject: "Maths", packs: [CIRCLES_PACK1 as CanonicalQuestion[], CI2_PACK2 as CanonicalQuestion[]] },
  { chapter: "Areas Related to Circles", subject: "Maths", packs: [AREAS_RELATED_TO_CIRCLES_PACK1 as CanonicalQuestion[], ARC2_PACK2 as CanonicalQuestion[]] },
  { chapter: "Surface Areas & Volumes", subject: "Maths", packs: [SURFACE_AREAS_VOLUMES_PACK1 as CanonicalQuestion[], SAV2_PACK2 as CanonicalQuestion[]] },
  { chapter: "Statistics", subject: "Maths", packs: [STATISTICS_PACK1 as CanonicalQuestion[], ST2_PACK2 as CanonicalQuestion[]] },
  { chapter: "Probability", subject: "Maths", packs: [PROBABILITY_PACK1 as CanonicalQuestion[], PR2_PACK2 as CanonicalQuestion[]] },

  { chapter: "Chemical Reactions", subject: "Science", packs: [CHEMICAL_REACTIONS_PACK1 as CanonicalQuestion[], CR2_PACK2 as CanonicalQuestion[]] },
  { chapter: "Acids, Bases & Salts", subject: "Science", packs: [ACIDS_BASES_SALTS_PACK1 as CanonicalQuestion[], ABS2_PACK2 as CanonicalQuestion[]] },
  { chapter: "Metals & Non-Metals", subject: "Science", packs: [METALS_NON_METALS_PACK1 as CanonicalQuestion[], MNM2_PACK2 as CanonicalQuestion[]] },
  { chapter: "Carbon Compounds", subject: "Science", packs: [CARBON_COMPOUNDS_PACK1 as CanonicalQuestion[], CC2_PACK2 as CanonicalQuestion[]] },
  { chapter: "Life Processes", subject: "Science", packs: [LIFE_PROCESSES_PACK1 as CanonicalQuestion[], LP2_PACK2 as CanonicalQuestion[]] },
  { chapter: "Control & Coordination", subject: "Science", packs: [CONTROL_AND_COORDINATION_PACK1 as CanonicalQuestion[], CNC2_PACK2 as CanonicalQuestion[]] },
  { chapter: "Reproduction", subject: "Science", packs: [REPRODUCTION_PACK1 as CanonicalQuestion[], REP2_PACK2 as CanonicalQuestion[]] },
  { chapter: "Heredity & Evolution", subject: "Science", packs: [HEREDITY_PACK1 as CanonicalQuestion[], HE2_PACK2 as CanonicalQuestion[]] },
  { chapter: "Light", subject: "Science", packs: [LIGHT_PACK1 as CanonicalQuestion[], LT2_PACK2 as CanonicalQuestion[]] },
  { chapter: "Human Eye & Colourful World", subject: "Science", packs: [HUMAN_EYE_PACK1 as CanonicalQuestion[], HEC2_PACK2 as CanonicalQuestion[]] },
  { chapter: "Electricity", subject: "Science", packs: [ELECTRICITY_PACK1 as CanonicalQuestion[], EL2_PACK2 as CanonicalQuestion[]] },
  { chapter: "Magnetic Effects", subject: "Science", packs: [MAGNETIC_EFFECTS_PACK1 as CanonicalQuestion[], ME2_PACK2 as CanonicalQuestion[]] },
  { chapter: "Our Environment", subject: "Science", packs: [OUR_ENVIRONMENT_PACK1 as CanonicalQuestion[], OE2_PACK2 as CanonicalQuestion[]] },
];

function aggregateChapter(entry: ChapterEntry): ChapterBreakdown {
  const questions = entry.packs.flat();
  const total = questions.length;
  let easy = 0, medium = 0, hard = 0;
  const sections: Record<SectionKey, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };

  for (const q of questions) {
    if (q.difficulty === "Easy") easy++;
    else if (q.difficulty === "Medium") medium++;
    else if (q.difficulty === "Hard") hard++;

    const sec = (q.section ?? "").toUpperCase() as SectionKey;
    if (sec in sections) sections[sec]++;
  }

  const easyPct = total > 0 ? Math.round((easy / total) * 100) : 0;
  const mediumPct = total > 0 ? Math.round((medium / total) * 100) : 0;
  const hardPct = total > 0 ? Math.round((hard / total) * 100) : 0;

  return { chapter: entry.chapter, subject: entry.subject, total, easy, medium, hard, easyPct, mediumPct, hardPct, sections };
}

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

function DiffPill({ count, p, low, high, color }: { count: number; p: number; low: number; high: number; color: string }) {
  const flagLow = p < low;
  const flagHigh = p > high;
  const bg = flagLow
    ? "rgba(245,158,11,0.12)"
    : flagHigh
    ? "rgba(239,68,68,0.12)"
    : "rgba(255,255,255,0.04)";
  const textColor = flagLow ? "#fbbf24" : flagHigh ? "#f87171" : color;

  return (
    <td style={{ padding: "10px 12px", textAlign: "center", background: bg }}>
      <span style={{ fontWeight: 600, color: textColor, fontVariantNumeric: "tabular-nums", fontSize: 13 }}>
        {count}
      </span>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginLeft: 3 }}>({p}%)</span>
      {(flagLow || flagHigh) && (
        <span style={{ marginLeft: 3, fontSize: 10, color: textColor }}>⚠</span>
      )}
    </td>
  );
}

export default function DifficultyBreakdownPage() {
  const [subjectFilter, setSubjectFilter] = useState<"All" | "Maths" | "Science">("All");

  const breakdown = useMemo(() => CHAPTER_PACKS.map(aggregateChapter), []);
  const filtered = breakdown.filter((r) => subjectFilter === "All" || r.subject === subjectFilter);

  const totals = filtered.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      easy: acc.easy + r.easy,
      medium: acc.medium + r.medium,
      hard: acc.hard + r.hard,
      A: acc.A + r.sections.A,
      B: acc.B + r.sections.B,
      C: acc.C + r.sections.C,
      D: acc.D + r.sections.D,
      E: acc.E + r.sections.E,
    }),
    { total: 0, easy: 0, medium: 0, hard: 0, A: 0, B: 0, C: 0, D: 0, E: 0 },
  );

  const flagged = filtered.filter(
    (r) => r.hardPct < HARD_MIN || r.hardPct > HARD_MAX || r.easyPct < EASY_MIN || r.easyPct > EASY_MAX,
  );

  const thBase: React.CSSProperties = {
    padding: "10px 12px",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    color: "rgba(255,255,255,0.35)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    whiteSpace: "nowrap",
    textAlign: "center",
  };

  const tdBase: React.CSSProperties = {
    padding: "10px 12px",
    fontSize: 13,
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    textAlign: "center",
    color: "rgba(255,255,255,0.45)",
    fontVariantNumeric: "tabular-nums",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#fff",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <ReturnContextBar backLabel="Admin" backTo="/admin/cache-stats" />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px 60px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Question Difficulty Breakdown</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
            Easy / Medium / Hard and Section A–E counts per chapter — Class 10 Maths &amp; Science
          </p>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Thresholds:</span>
          <span style={{
            display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
            borderRadius: 6, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
            fontSize: 12, color: "#fbbf24",
          }}>
            ⚠ Hard &lt; {HARD_MIN}% or Easy &lt; {EASY_MIN}% — too few
          </span>
          <span style={{
            display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
            borderRadius: 6, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            fontSize: 12, color: "#f87171",
          }}>
            ⚠ Hard &gt; {HARD_MAX}% or Easy &gt; {EASY_MAX}% — too many
          </span>
          <span style={{
            padding: "4px 10px", borderRadius: 6,
            background: flagged.length === 0 ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.04)",
            border: flagged.length === 0 ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(255,255,255,0.08)",
            fontSize: 12,
            color: flagged.length === 0 ? "#4ade80" : "rgba(255,255,255,0.4)",
          }}>
            {flagged.length === 0 ? "✓ All chapters in range" : `⚠ ${flagged.length} chapter${flagged.length > 1 ? "s" : ""} flagged`}
          </span>
        </div>

        {/* Subject filter */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {(["All", "Maths", "Science"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSubjectFilter(s)}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: subjectFilter === s ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.06)",
                background: subjectFilter === s ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                color: subjectFilter === s ? "#fff" : "rgba(255,255,255,0.4)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                <th style={{ ...thBase, textAlign: "left", paddingLeft: 16 }}>Chapter</th>
                <th style={thBase}>Subject</th>
                <th style={thBase}>Total</th>
                <th style={{ ...thBase, color: "rgba(74,222,128,0.7)" }}>Easy</th>
                <th style={{ ...thBase, color: "rgba(251,191,36,0.7)" }}>Medium</th>
                <th style={{ ...thBase, color: "rgba(248,113,113,0.7)" }}>Hard</th>
                <th style={{ ...thBase, borderLeft: "1px solid rgba(255,255,255,0.06)" }}>§A</th>
                <th style={thBase}>§B</th>
                <th style={thBase}>§C</th>
                <th style={thBase}>§D</th>
                <th style={thBase}>§E</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const hasFlag =
                  row.hardPct < HARD_MIN || row.hardPct > HARD_MAX ||
                  row.easyPct < EASY_MIN || row.easyPct > EASY_MAX;

                return (
                  <tr
                    key={`${row.subject}-${row.chapter}`}
                    style={{
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)",
                      borderLeft: hasFlag ? "2px solid rgba(245,158,11,0.5)" : "2px solid transparent",
                    }}
                  >
                    <td style={{ ...tdBase, textAlign: "left", paddingLeft: 14, color: "#fff", fontWeight: 500, whiteSpace: "nowrap" }}>
                      {hasFlag && <span style={{ marginRight: 6, fontSize: 11, color: "#fbbf24" }}>⚠</span>}
                      {row.chapter}
                    </td>
                    <td style={tdBase}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                        background: row.subject === "Maths" ? "rgba(59,130,246,0.12)" : "rgba(16,185,129,0.12)",
                        color: row.subject === "Maths" ? "#93c5fd" : "#6ee7b7",
                      }}>
                        {row.subject}
                      </span>
                    </td>
                    <td style={{ ...tdBase, color: "rgba(255,255,255,0.5)" }}>{row.total}</td>
                    <DiffPill count={row.easy} p={row.easyPct} low={EASY_MIN} high={EASY_MAX} color="#4ade80" />
                    <td style={{ ...tdBase, color: "#fbbf24", fontWeight: 600 }}>
                      {row.medium}
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 3 }}>({row.mediumPct}%)</span>
                    </td>
                    <DiffPill count={row.hard} p={row.hardPct} low={HARD_MIN} high={HARD_MAX} color="#f87171" />
                    <td style={{ ...tdBase, borderLeft: "1px solid rgba(255,255,255,0.05)" }}>{row.sections.A}</td>
                    <td style={tdBase}>{row.sections.B}</td>
                    <td style={tdBase}>{row.sections.C}</td>
                    <td style={tdBase}>{row.sections.D}</td>
                    <td style={tdBase}>{row.sections.E}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "rgba(255,255,255,0.03)", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                <td style={{ ...tdBase, textAlign: "left", paddingLeft: 16, color: "rgba(255,255,255,0.35)", fontSize: 12 }}>
                  {filtered.length} chapters
                </td>
                <td style={tdBase} />
                <td style={{ ...tdBase, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>{totals.total}</td>
                <td style={{ ...tdBase, color: "rgba(255,255,255,0.35)" }}>
                  {totals.easy} <span style={{ fontSize: 11 }}>({pct(totals.easy, totals.total)}%)</span>
                </td>
                <td style={{ ...tdBase, color: "rgba(255,255,255,0.35)" }}>
                  {totals.medium} <span style={{ fontSize: 11 }}>({pct(totals.medium, totals.total)}%)</span>
                </td>
                <td style={{ ...tdBase, color: "rgba(255,255,255,0.35)" }}>
                  {totals.hard} <span style={{ fontSize: 11 }}>({pct(totals.hard, totals.total)}%)</span>
                </td>
                {(["A", "B", "C", "D", "E"] as SectionKey[]).map((s, si) => (
                  <td key={s} style={{ ...tdBase, color: "rgba(255,255,255,0.3)", borderLeft: si === 0 ? "1px solid rgba(255,255,255,0.05)" : undefined }}>
                    {totals[s]}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>

        <p style={{ marginTop: 12, fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
          Thresholds configurable in <code style={{ fontFamily: "monospace" }}>src/pages/DifficultyBreakdownPage.tsx</code> · HARD_MIN={HARD_MIN}%, HARD_MAX={HARD_MAX}%, EASY_MIN={EASY_MIN}%, EASY_MAX={EASY_MAX}%
        </p>
      </div>
    </div>
  );
}
