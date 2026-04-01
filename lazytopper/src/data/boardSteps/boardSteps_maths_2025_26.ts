import type { BoardStepsIndex } from "./types";

/**
 * Board Steps (CBSE 2025-26) — Maths
 * Section mapping (typical):
 * A: 1 mark (MCQ/ARQ/very short)
 * B: 2 marks
 * C: 3 marks
 * D: 5 marks
 * E: Case Study (4 marks split: 1,1,2)
 *
 * NOTE: These are writing templates (presentation + step-marking), not solutions.
 */
export const boardSteps_maths_2025_26: BoardStepsIndex["Maths"] = {
  A: {
    subject: "Maths",
    section: "A",
    marksTotal: 1,
    steps: [
      {
        id: "A-core",
        title: "Answer directly (MCQ/ARQ/1-mark)",
        whatToWrite: [
          "Read what is asked (value / option / statement).",
          "Write/mark the final answer clearly (no extra steps).",
        ],
        marks: 1,
        commonMistakes: [
          "Over-writing: too many steps for a 1-mark question.",
          "Answer not clearly ticked/boxed.",
        ],
      },
    ],
    notes: ["For 1-mark: clarity > length. If calculation is needed, keep it 1–2 lines max."],
  },

  B: {
    subject: "Maths",
    section: "B",
    marksTotal: 2,
    steps: [
      { id: "B-given", title: "Given / To find", whatToWrite: ["Given: ...", "To find: ..."], marks: 0.5 },
      {
        id: "B-method",
        title: "Formula / method + substitution",
        whatToWrite: ["Write the formula/theorem used.", "Substitute values correctly and simplify."],
        marks: 1,
        commonMistakes: ["Skipping the formula line.", "Wrong substitution/sign error."],
      },
      { id: "B-final", title: "Final answer (boxed)", whatToWrite: ["Therefore, answer = ... (box it)."], marks: 0.5 },
    ],
    notes: ["For 2 marks, show method. One clean substitution line is usually enough."],
  },

  C: {
    subject: "Maths",
    section: "C",
    marksTotal: 3,
    steps: [
      {
        id: "C-setup",
        title: "Setup + diagram (if needed)",
        whatToWrite: ["Given/To find (or To prove).", "Draw a neat labelled figure (if geometry)."],
        marks: 0.5,
      },
      {
        id: "C-working",
        title: "Stepwise working (no jumps)",
        whatToWrite: ["Write the key equation/identity/theorem.", "Show steps line-by-line to reach the result."],
        marks: 2,
      },
      { id: "C-conclude", title: "Conclusion line", whatToWrite: ["Therefore, ... (final statement)."], marks: 0.5 },

      // Geometry mini-proof pack (Triangles: similarity/BPT/Pythagoras)
      {
        id: "C-geo-proof",
        title: "Geometry mini-proof (Triangles: similarity / BPT / Pythagoras)",
        whatToWrite: [
          "Write: Given, To Prove, Construction (only if required).",
          "State the theorem/criterion clearly (AA similarity / BPT / Pythagoras).",
          "Write 2–4 reasoned steps (each step must have a reason).",
          "End with: Hence proved / Therefore, ... (box the final statement).",
        ],
        marks: 0,
        commonMistakes: [
          "No reasons written (examiner cuts marks).",
          "Theorem not stated; directly jumping to conclusion.",
          "Diagram missing/unclear for geometry.",
        ],
      },
    ],
    notes: ["If it is a proof-type geometry question, use the Geometry mini-proof pack steps."],
  },

  D: {
    subject: "Maths",
    section: "D",
    marksTotal: 5,
    steps: [
      {
        id: "D-setup",
        title: "Given/To find or To prove + diagram",
        whatToWrite: ["Write Given & To find/To prove clearly.", "Neat labelled diagram (mandatory if geometry)."],
        marks: 1,
      },
      {
        id: "D-method",
        title: "Method / theorem / formula",
        whatToWrite: ["State the theorem/identity/criterion used (exact name)."],
        marks: 1,
        commonMistakes: ["Using a theorem without stating it.", "Wrong theorem/criterion chosen."],
      },
      {
        id: "D-steps",
        title: "Full working (show intermediate results)",
        whatToWrite: [
          "Proceed line-by-line (no jumps).",
          "Show intermediate results clearly.",
          "If geometry: write reasons for each step (Given / CPCT / similarity / angle property).",
        ],
        marks: 2,
      },
      {
        id: "D-final",
        title: "Final answer + check/verification (if asked)",
        whatToWrite: ["Box final answer.", "Verify/check condition if asked (brief)."],
        marks: 1,
      },

      // Full geometry proof pack (Triangles core)
      {
        id: "D-geo-proof",
        title: "Full Geometry Proof (Triangles: similarity / BPT / Pythagoras / congruence)",
        whatToWrite: [
          "Write: Given, To Prove, Construction (if any).",
          "State criterion/theorem (AA / SAS / SSS / RHS / BPT / Pythagoras).",
          "Write step-by-step proof with reasons (minimum 5–7 lines).",
          "Use a clean flow: similarity -> proportionality -> result / CPCT -> result.",
          "Final line: Hence proved / Therefore ... (box it).",
        ],
        marks: 0,
        commonMistakes: [
          "Missing reasons (most common mark-loss).",
          "Not stating similarity criterion (AA/SAS/SSS).",
          "Writing CPCT without proving triangles are congruent/similar first.",
        ],
      },
    ],
    notes: ["For Triangles proofs, use the Full Geometry Proof pack: it matches CBSE marking schemes best."],
  },

  E: {
    subject: "Maths",
    section: "E",
    marksTotal: 4,
    steps: [
      { id: "E-read", title: "Extract case data", whatToWrite: ["Write key data from case/table/graph (variables/values)."], marks: 0.5 },
      { id: "E-i", title: "Part (i) – 1 mark", whatToWrite: ["Direct answer with minimal working."], marks: 1 },
      { id: "E-ii", title: "Part (ii) – 1 mark", whatToWrite: ["Direct answer with minimal working."], marks: 1 },
      {
        id: "E-iii",
        title: "Part (iii) – 2 marks (show method)",
        whatToWrite: ["Write formula/steps clearly.", "Final answer for (iii) (box it)."],
        marks: 1.5,
      },
    ],
    notes: ["Case Study is typically split 1, 1, 2 marks. Keep parts (i) and (ii) short."],
  },
};

export default boardSteps_maths_2025_26;
