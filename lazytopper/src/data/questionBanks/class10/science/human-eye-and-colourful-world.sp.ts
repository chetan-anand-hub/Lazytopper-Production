import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * human-eye-and-colourful-world — CBSE Sample Papers (P5): Science SQP 2022-23 + OnBoard 2023.
 * Extracted 2026-05-29 (Sprint 1). topicKey "human-eye-and-colourful-world". pyqYear OMITTED (sample papers, not board PYQ).
 */
export const HEYE_SP: CanonicalQuestion[] = [
  {
    "id": "SQP-S-2023-HEYE-C-001",
    "subject": "Science",
    "topicKey": "human-eye-and-colourful-world",
    "subtopic": "Spectrum and dispersion of light by a prism",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "Define spectrum. Why do different coloured rays deviate separately on passing through a glass prism?",
    "options": [],
    "answer": "A spectrum is the band of coloured components of a light beam (VIBGYOR). Different colours travel at different speeds in glass, so glass has different refractive indices for different colours (highest for violet, lowest for red); they refract through different angles and emerge in different directions, becoming distinct.",
    "solutionSteps": [
      "[1 mark] Spectrum: the band of coloured components of a light beam is called its spectrum; the sequence of colours is VIBGYOR — Violet, Indigo, Blue, Green, Yellow, Orange and Red.",
      "[1 mark] The speed of light of different colours in a medium such as glass is different, which leads to different refractive indices for different colours; the refractive index of glass is greatest for violet and least for red.",
      "[1 mark] Because of these different refractive indices, the various colours of white light refract through different angles and hence emerge from the prism in different directions and become distinct."
    ],
    "finalAnswer": "Spectrum = band of VIBGYOR colours; colours deviate separately because glass has different refractive indices (different speeds) for different colours, so each bends by a different angle.",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-S-2023-HEYE-E-001",
    "subject": "Science",
    "topicKey": "human-eye-and-colourful-world",
    "subtopic": "Dispersion of white light through a prism",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "When white light is incident on one of the refracting surfaces of a prism, the light diverges into its constituent colours violet, indigo, blue, green, yellow, orange and red. This splitting of white light into its seven constituent colours is called dispersion, and the band of colours obtained on a screen is the spectrum. Red colour bends the least and violet bends the most on passing through the prism. Answer: a. What will happen when a red-coloured light is passed through a prism? b. Which type of spectrum is produced by white light when it is passed through a glass prism? c. Why does red light bend the least while violet light bends the most during dispersion? [OR] c. Explain the cause of dispersion of white light through a prism.",
    "options": [],
    "answer": "a. Red light does not split into any constituent colours on passing through the prism. b. White light through a glass prism gives an impure spectrum (overlapping colours). c. Violet has the slowest speed in glass and red the fastest; lower speed means greater bending, so violet bends most and red least. [OR c. Dispersion occurs because different colours travel at different speeds in the same medium, so they have different refrangibility and separate out.]",
    "solutionSteps": [
      "[1 mark] a. A red-coloured (monochromatic) light will not split into any constituent colours on passing through the prism (it only deviates as a single colour).",
      "[1 mark] b. White light passed through a glass prism produces an impure spectrum, in which the different colours overlap.",
      "[1 mark] c. In VIBGYOR, violet has the slowest speed and red the fastest speed in glass; the slower a colour travels, the more it bends.",
      "[1 mark] c. Therefore red (fastest) bends the least and violet (slowest) bends the most during dispersion. [OR c. Dispersion is caused because the different component colours of light travel at different speeds in the same medium (different refrangibility), so they deviate by different amounts and separate.]"
    ],
    "finalAnswer": "a. Red light does not split. b. Impure spectrum. c. Violet (slowest) bends most, red (fastest) bends least (OR dispersion is due to different speeds/refrangibility of colours in the medium).",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "A glass prism with white light from a sheet with a pinhole incident on one refracting face; the emerging light is dispersed into a band of seven colours labelled R, O, Y, G, B, I, V on a screen, showing red deviating least and violet most."
  }
];
