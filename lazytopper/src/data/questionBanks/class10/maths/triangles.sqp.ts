import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Triangles — CBSE Sample Question Paper 2023-24 (MATHEMATICS STANDARD — Code 041)
 * Source: MathsStandard-SQP.pdf (10pp) + MathsStandard-MS.pdf (9pp), cbseacademic.nic.in
 * Extracted: 2026-05-24 (P2 SQP-only scope; APQ deferred to follow-up PR)
 * topicKey: "triangles"
 * Section distribution: A=1, B=1, D=1
 */
export const TRIANGLES_SQP: CanonicalQuestion[] = [
  {
    "id": "SQP-M-TRI-001",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Basic Proportionality Theorem — Application",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "In Δ ABC, DE ‖ AB. If AB = a, DE = x, BE = b and EC = c. Then x expressed in terms of a, b and c is:",
    "options": [
      "(A) ac/b",
      "(B) ac/(b + c)",
      "(C) ab/c",
      "(D) ab/(b + c)"
    ],
    "answer": "(B) ac/(b + c)",
    "solutionSteps": [
      "By Basic Proportionality Theorem in Δ ABC with DE ‖ AB: CD/DA = CE/EB. Since Δ CDE ~ Δ CAB (AA), DE/AB = CE/CB ⇒ x/a = c/(b + c) ⇒ x = ac/(b + c). Answer: (B)."
    ],
    "finalAnswer": "(B) ac/(b + c)",
    "isCompetencyBased": true
  },
  {
    "id": "SQP-M-TRI-002",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Similar Triangles in a Parallelogram",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "ABCD is a parallelogram. Point P divides AB in the ratio 2:3 and point Q divides DC in the ratio 4:1. Prove that OC is half of OA (where O is the intersection of PQ and AC).",
    "options": [],
    "answer": "Proved: OC = (1/2) OA.",
    "solutionSteps": [
      "In parallelogram ABCD, AB = DC = a. P divides AB as 2:3 ⇒ AP = (2/5)a, PB = (3/5)a. Q divides DC as 4:1 ⇒ DQ = (4/5)a, CQ = (1/5)a.",
      "Since AB ‖ DC, ∠OAP = ∠OCQ and ∠APO = ∠CQO (alternate angles between transversal and parallel sides). By AA similarity, Δ APO ~ Δ CQO.",
      "From similar triangles: AP/CQ = AO/CO = PO/QO ⇒ (2/5)a / (1/5)a = AO/CO ⇒ AO/CO = 2/1. Therefore OC = (1/2) OA, as required."
    ],
    "finalAnswer": "OC = (1/2) OA (proved via Δ APO ~ Δ CQO with AP:CQ = 2:1).",
    "isCompetencyBased": true
  },
  {
    "id": "SQP-M-TRI-003",
    "subject": "Maths",
    "topicKey": "triangles",
    "subtopic": "Basic Proportionality Theorem — Statement, Proof, and Application",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "(a) State and prove Basic Proportionality theorem.\n(b) In the given figure ∠CEF = ∠CFE. F is the midpoint of DC. Prove that AB/BD = AE/FD.",
    "options": [],
    "answer": "(a) BPT proved with statement, given/to-prove, figure, and reasoned proof. (b) AB/BD = AE/FD proved using BPT in Δ ABE and midpoint theorem in Δ CDG.",
    "solutionSteps": [
      "Part (a) — Statement of BPT: If a line is drawn parallel to one side of a triangle, intersecting the other two sides at distinct points, it divides those two sides in the same ratio.",
      "Part (a) — Given Δ ABC with DE ‖ BC, D on AB, E on AC. To prove: AD/DB = AE/EC. Construction: join BE and CD; draw EM ⊥ AB and DN ⊥ AC. Proof: Area(ΔADE) = (1/2)·AD·EM and Area(ΔBDE) = (1/2)·DB·EM, so Area(ΔADE)/Area(ΔBDE) = AD/DB. Similarly Area(ΔADE)/Area(ΔDEC) = AE/EC. Triangles BDE and DEC have equal areas (same base DE, same parallel line BC). Therefore AD/DB = AE/EC.",
      "Part (b) — Construction: draw DG ‖ BE meeting CA produced at G. In Δ ABE, since DG ‖ BE, by BPT: AB/BD = AE/GE  ... (i)",
      "Part (b) — In Δ CDG, F is midpoint of DC and FE ‖ DG (because DG ‖ BE ‖ FE not needed; instead use that GE/CE = DF/CF). By midpoint theorem applied to Δ CDG with F midpoint of CD, E is midpoint of CG, so CE = GE  ... (ii)",
      "Part (b) — Given ∠CEF = ∠CFE in Δ CFE ⇒ CF = CE (sides opposite equal angles) ... (iii). F is midpoint of DC ⇒ CF = FD ... (iv). Combining (ii), (iii), (iv): GE = CE = CF = FD. Substitute GE = FD into (i): AB/BD = AE/FD, as required."
    ],
    "finalAnswer": "(a) BPT proved. (b) AB/BD = AE/FD proved.",
    "isCompetencyBased": false
  }
];
