export type RubricBand = "BEGINNER" | "DEVELOPING" | "PROFICIENT" | "MASTER";

export type RubricResult = {
  total_score: number;
  band: RubricBand;
  dimensions: {
    concept_selection: number;
    setup_correctness: number;
    logical_progression: number;
    computation_accuracy: number;
    presentation_exam_style: number;
  };
  skill_tags: string[];
  strengths: string[];
  gaps: string[];
  recommended_next: {
    focus_skill: string;
    micro_drill_prompt: string;
  };
};

type RubricContext = {
  status: string;
  mistakeTags: string[];
  attemptText: string;
  theoremFocus?: string;
};

const DIM_MAX = {
  concept_selection: 25,
  setup_correctness: 20,
  logical_progression: 25,
  computation_accuracy: 20,
  presentation_exam_style: 10,
};

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function bandFromScore(score: number): RubricBand {
  if (score >= 80) return "MASTER";
  if (score >= 55) return "PROFICIENT";
  if (score >= 30) return "DEVELOPING";
  return "BEGINNER";
}

function reduceForTag(tag: string, dims: any) {
  const t = tag.toLowerCase();
  if (t.includes("wrong") || t.includes("theorem")) dims.concept_selection -= 10;
  if (t.includes("setup") || t.includes("diagram") || t.includes("given")) dims.setup_correctness -= 8;
  if (t.includes("logic") || t.includes("sequence") || t.includes("progress")) dims.logical_progression -= 10;
  if (t.includes("calc") || t.includes("arithmetic") || t.includes("algebra")) dims.computation_accuracy -= 8;
  if (t.includes("justification") || t.includes("presentation")) dims.presentation_exam_style -= 4;
}

function deriveTags(context: RubricContext) {
  const tags = new Set<string>();
  const focus = String(context.theoremFocus || "").toLowerCase();
  if (focus.includes("bpt")) tags.add("bpt");
  if (focus.includes("pyth")) tags.add("pythagoras");
  if (focus.includes("similar")) tags.add("similarity");
  if (!tags.size) tags.add("similarity");
  return Array.from(tags);
}

function recommendedNext(dims: any): { focus_skill: string; micro_drill_prompt: string } {
  const entries = Object.entries(dims as Record<string, number>).sort((a, b) => (a[1] as number) - (b[1] as number));
  const [lowest] = entries[0];
  switch (lowest) {
    case "concept_selection":
      return { focus_skill: "choose_theorem", micro_drill_prompt: "Pick AA/SAS/SSS or BPT based on the given data." };
    case "setup_correctness":
      return { focus_skill: "setup", micro_drill_prompt: "Write the given info and mark corresponding sides/angles." };
    case "logical_progression":
      return { focus_skill: "logic_chain", micro_drill_prompt: "Write the sequence: criterion -> similarity -> proportion." };
    case "computation_accuracy":
      return { focus_skill: "calculation", micro_drill_prompt: "Solve the proportion carefully and check arithmetic." };
    default:
      return { focus_skill: "exam_presentation", micro_drill_prompt: "Add reasons for each step and a final conclusion." };
  }
}

export function scoreRubric(context: RubricContext): RubricResult {
    const dims = {
    concept_selection: 18,
    setup_correctness: 15,
    logical_progression: 18,
    computation_accuracy: 15,
    presentation_exam_style: 8,
  };

  for (const tag of context.mistakeTags || []) reduceForTag(String(tag || ""), dims);

  // shift dimensions based on status
  if (context.status === "correct") {
    dims.concept_selection += 5;
    dims.logical_progression += 5;
  }

  dims.concept_selection = clamp(dims.concept_selection, 0, DIM_MAX.concept_selection);
  dims.setup_correctness = clamp(dims.setup_correctness, 0, DIM_MAX.setup_correctness);
  dims.logical_progression = clamp(dims.logical_progression, 0, DIM_MAX.logical_progression);
  dims.computation_accuracy = clamp(dims.computation_accuracy, 0, DIM_MAX.computation_accuracy);
  dims.presentation_exam_style = clamp(dims.presentation_exam_style, 0, DIM_MAX.presentation_exam_style);

  const total = clamp(
    dims.concept_selection +
      dims.setup_correctness +
      dims.logical_progression +
      dims.computation_accuracy +
      dims.presentation_exam_style,
    0,
    100
  );

  const band = bandFromScore(total);
  const tags = deriveTags(context);
  const strengths = total >= 55 ? ["Coherent approach"] : ["Attempt started"];
  const gaps = total >= 55 ? ["Exam presentation"] : ["Concept selection", "Logical flow"];
  const next = recommendedNext(dims);

  return {
    total_score: total,
    band,
    dimensions: dims,
    skill_tags: tags,
    strengths,
    gaps,
    recommended_next: next,
  };
}
