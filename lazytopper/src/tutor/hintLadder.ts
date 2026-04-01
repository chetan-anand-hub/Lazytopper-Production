export type HintLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type HintHistoryItem = { level: HintLevel; text: string; ts?: string };

export type HintLadderState = {
  level: HintLevel;
  max_level: 5;
  last_hint: { level: HintLevel; text: string } | null;
  next_hint_available: boolean;
  history: HintHistoryItem[];
};

export type HintContext = {
  status: string;
  mistakeTags: string[];
  attemptText: string;
  topicKey?: string;
  questionText?: string;
  theoremFocus?: string;
};

const MAX_LEVEL: HintLevel = 5;

export function initHintState(): HintLadderState {
  return {
    level: 0,
    max_level: 5,
    last_hint: null,
    next_hint_available: true,
    history: [],
  };
}

function pickFocus(context: HintContext) {
  const tags = (context.mistakeTags || []).map((t) => String(t || "").toLowerCase());
  if (tags.some((t) => t.includes("similar"))) return "similarity";
  if (tags.some((t) => t.includes("pyth"))) return "pythagoras";
  if (tags.some((t) => t.includes("angle"))) return "angles";
  if (tags.some((t) => t.includes("ratio") || t.includes("proportion"))) return "proportion";
  if (String(context.theoremFocus || "").toLowerCase().includes("bpt")) return "bpt";
  return "similarity";
}

export function renderHint(level: HintLevel, context: HintContext): string {
  const focus = pickFocus(context);
  const subject = focus === "pythagoras"
    ? "Pythagoras"
    : focus === "bpt"
      ? "BPT"
      : focus === "proportion"
        ? "proportional sides"
        : focus === "angles"
          ? "angle relations"
          : "triangle similarity";

  switch (level) {
    case 0:
      return `L0 Checkpoint: Which ${subject} fact from the given data is key here?`;
    case 1:
      return `L1 Nudge: Think about applying ${subject}. State the criterion clearly first.`;
    case 2:
      return "L2 Directed hint: Identify the pair of equal angles (or proportional sides) and write the similarity criterion.";
    case 3:
      return "L3 Scaffold: Write “Since __ = __ (given), triangles are similar by __.”";
    case 4:
      return "L4 Next step: Conclude similarity, then set up the proportional sides to solve the unknown.";
    case 5:
    default:
      return `L5 Outline: 1) State criterion (${subject}). 2) Prove similarity. 3) Use CPST/proportions. 4) Solve and conclude.`;
  }
}

export function computeNextHint(state: HintLadderState, context: HintContext, requestNext: boolean): HintLadderState {
  const base = state || initHintState();
  if (!requestNext) return base;

  const nextLevelRaw = base.last_hint ? (base.last_hint.level + 1) : base.level;
  const nextLevel = (Math.min(nextLevelRaw, MAX_LEVEL) as HintLevel);
  const text = renderHint(nextLevel, context);
  const history = [...base.history, { level: nextLevel, text, ts: new Date().toISOString() }];
  return {
    level: nextLevel,
    max_level: 5,
    last_hint: { level: nextLevel, text },
    next_hint_available: nextLevel < MAX_LEVEL,
    history,
  };
}
