/**
 * offersCopy - OFFERS-V2. The words of the buying block that are not pack rows: the Board Pass benefit line per surface and the paper-wall
 * titles. Plain, honest, no invented numbers: every figure (the price, the later price, the date) is drawn from config/pricing at render
 * time by the block, never typed here. PURE.
 */
import type { OfferKind } from "./offersModel";

/** One benefit line under "Board Pass", per surface (owner-approved canvas, 2 Nov 2026). */
export const BOARD_PASS_BENEFIT: Readonly<Record<OfferKind, string>> = {
  "full-mock": "Every answer you write, marked step by step like a CBSE examiner — mocks, chapter tests and your own handwritten work. Till your boards.",
  "check-improve": "Check every answer like this till your boards — and catch these slips before the exam does.",
  "chapter-test": "Every chapter test, mock and handwritten answer marked step by step — and a tutor that knows where you slip.",
  worksheet: "Every worksheet, chapter test and handwritten answer marked step by step — and a tutor that knows where you slip.",
  "quick-practice": "Upload your rough work and find out exactly why — then get every written answer marked step by step till your boards.",
  ladder: "Get your written answers marked step by step, like a CBSE examiner, till your boards.",
};

/** The paper's name in a sentence ("your mock", "your chapter test", "your worksheet"). */
export function paperWord(kind: OfferKind): string {
  switch (kind) {
    case "full-mock":
      return "mock";
    case "chapter-test":
      return "chapter test";
    case "worksheet":
      return "worksheet";
    default:
      return "answers";
  }
}

export interface PaperWallCopy {
  title: string;
  body: string | null;
  benefit: string;
  /** The small grey link at the very bottom. */
  dismiss: string;
}

export const WALL_DISMISS_BASIC = "Continue with Basic (free)";
export const WALL_DISMISS_TRIAL = "Not now";

/**
 * The paper wall's words. A trial student at this week's allowance: "saved, want it marked now?" and a benefit that names today. A Basic
 * student (trial over): "saved, get it marked like the board would"; `trialEndedLine` ("Your trial ended on 9 August.") only when the server
 * told us the date. Nothing here claims a number the server did not send.
 */
export function paperWallCopy(kind: OfferKind, onTrial: boolean, trialEndedLine: string | null): PaperWallCopy {
  const word = paperWord(kind);
  const saved = kind === "full-mock" || kind === "chapter-test" || kind === "worksheet" ? `Your ${word} is saved.` : "Your answers are saved.";
  if (onTrial) {
    return {
      title: `${saved} Want it marked now?`,
      body: `You've used this week's graded ${kind === "full-mock" || kind === "chapter-test" || kind === "worksheet" ? word : "paper"} from your free week.`,
      benefit: `Get this ${kind === "full-mock" || kind === "chapter-test" || kind === "worksheet" ? word : "paper"} marked today, and every mock, chapter test and handwritten answer till your boards.`,
      dismiss: WALL_DISMISS_TRIAL,
    };
  }
  const written = kind === "full-mock" ? "Your MCQ score is ready; written answers are marked with the Board Pass." : "Written answers are marked with the Board Pass.";
  return {
    title: `${saved} Get it marked like the board would.`,
    body: [trialEndedLine, written].filter(Boolean).join(" "),
    benefit: "Every answer marked step by step, your AI tutor, and Mistake Intelligence — till your boards.",
    dismiss: WALL_DISMISS_BASIC,
  };
}
