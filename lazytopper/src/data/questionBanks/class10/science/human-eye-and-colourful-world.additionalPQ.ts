import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Science (086)
// Papers: Science-PQ.pdf + Science-PQMS.pdf
// topicKey: "human-eye-and-colourful-world"
// Extraction date: 2026-05-25

export const HUMAN_EYE_APQ: CanonicalQuestion[] = [
  // Science-PQ Q14 (Section A, MCQ, 1 mark)
  { id: "APQ-S-EYE-001", subject: "Science", topicKey: "human-eye-and-colourful-world", subtopic: "Atmospheric Scattering — Sky Colour", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "The face of the moon that is visible to us is called as the near side and the face of the moon which is invisible to us is called as far side. What colour would the sky appear to an astronaut standing on the \"far side\" of the Moon and why?",
    options: [
      "blue, as the Moon's atmosphere scatters sunlight just like Earth",
      "white, as the Moon's surface reflect all the light that falls on it",
      "black, as there is no atmosphere on Moon to scatter sunlight",
      "black, as sunlight does not fall on the far side of the Moon"
    ],
    answer: "black, as there is no atmosphere on Moon to scatter sunlight",
    solutionSteps: ["Sky appears blue on Earth because the atmosphere scatters shorter (blue) wavelengths of sunlight (Rayleigh scattering).", "The Moon has no atmosphere, so no scattering occurs ⟹ sky appears BLACK (sunlight reaches the eyes only when looking directly at the Sun)."],
    finalAnswer: "(c) black, as there is no atmosphere on Moon to scatter sunlight",
    ncertRef: "APQ Science-PQ Q14", isCompetencyBased: true },

  // Science-PQ Q36 first variant (Section D, Long, 5 marks)
  { id: "APQ-S-EYE-002", subject: "Science", topicKey: "human-eye-and-colourful-world", subtopic: "Dispersion of White Light through Prisms", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Savera passed a beam of white light through a series of equilateral prisms (Prism 1, 2, 3). (a) What colour(s) will be seen on the screen? (b) Copy the diagram and draw the beam entering Prism 1 and emerging from Prism 3 and falling on the screen. (c) Name all the processes that take place when the beam of light enters Prism 1 and emerges from Prism 3.",
    answer: "(a) White light (VIBGYOR recombined). (b) See ray-diagram steps. (c) Dispersion and refraction.",
    solutionSteps: ["[1 mark] (a) Prism 1 disperses the white light into its seven constituent colours VIBGYOR (violet, indigo, blue, green, yellow, orange, red).", "[1 mark] (a) Prisms 2 and 3 (suitably inverted) recombine these colours, so the beam finally falling on the screen appears WHITE again (Newton's recombination experiment).", "[1 mark] (b) Diagram: the white beam enters Prism 1 and splits into the VIBGYOR spectrum.", "[1 mark] (b) Diagram: the spectrum passes through Prisms 2 and 3 and recombines into a single white beam falling on the screen.", "[1 mark] (c) Processes taking place: dispersion (splitting of white light), refraction (bending at each prism surface) and recombination of the colours."],
    finalAnswer: "(a) White (recombined VIBGYOR); (b) ray diagram; (c) dispersion + refraction.",
    ncertRef: "APQ Science-PQ Q36 (first variant)", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: three-prism arrangement with screen." },

  // Science-PQ Q36 OR variant (Section D, Long, 5 marks)
  { id: "APQ-S-EYE-003", subject: "Science", topicKey: "human-eye-and-colourful-world", subtopic: "Myopia, Lens Defects, Eye Anatomy", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "(a) Rupal suffers from myopia. Where would the image form in her eye? (b) Name the type of lens that is generally used to correct myopia. (c) Rupal underwent cataract surgery and her eye lens was replaced with an artificial lens with a fixed focal length, made of a plastic material, silicone. State one likely visual disadvantage that Rupal is likely to experience as compared to a person who has normal eyesight. (d) Identify the parts of the eye labeled (i)-(iv) in the diagram: (i) changes focal length of lens; (ii) causes most refraction; (iii) controls amount of light entering; (iv) acts as screen.",
    answer: "(a) In front of retina. (b) Concave lens. (c) Loss of accommodation. (d) (i) ciliary muscle, (ii) cornea, (iii) iris/pupil, (iv) retina.",
    solutionSteps: ["[1 mark] (a) In myopia (short-sightedness), the image of a distant object forms in FRONT of the retina (eye lens too convergent / eyeball too long).", "[1 mark] (b) A concave (diverging) lens of suitable negative power is used to correct myopia, shifting the image back onto the retina.", "[1 mark] (c) With a fixed-focal-length artificial lens she loses the power of accommodation — the lens cannot change shape to focus on both near and distant objects (unlike the natural lens controlled by ciliary muscles).", "[1 mark] (d) (i) ciliary muscle — changes the focal length of the eye lens; (ii) cornea — causes most (~80%) of the refraction.", "[1 mark] (d) (iii) iris/pupil — controls the amount of light entering the eye; (iv) retina — acts as the light-sensitive screen."],
    finalAnswer: "(a) Front of retina; (b) concave; (c) no accommodation; (d) ciliary muscle / cornea / iris / retina.",
    ncertRef: "APQ Science-PQ Q36 (OR variant)", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: labeled eye diagram." },

  // ----- Source: Science-PQ2.pdf + Science-PQMS2.pdf (appended 2026-05-25) -----

  // Science-PQ2 Q24 (Section B, Short, 2 marks)
  { id: "APQ-S-EYE-004", subject: "Science", topicKey: "human-eye-and-colourful-world", subtopic: "Scattering and Atmospheric Refraction", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Give reasons for the following: (a) Red traffic signals can be seen from a very long distance. (b) Stars appear to be slightly higher than their actual position.",
    answer: "(a) Red has highest wavelength, least scattered. (b) Atmospheric refraction makes star position appear raised.",
    solutionSteps: ["(a) Red light has the LONGEST wavelength among visible colours; it is therefore the LEAST scattered by air molecules and can travel longer distances without losing intensity — making red traffic signals visible from afar even in fog/dust.", "(b) Optical density of atmospheric layers INCREASES as light travels from outer space to ground. Light from a star bends towards the normal due to this gradient (atmospheric refraction) — the observer perceives the star along the apparent ray, slightly HIGHER than its true position."],
    finalAnswer: "(a) Red = longest wavelength, least scattered; (b) atmospheric refraction raises apparent star position.",
    ncertRef: "APQ Science-PQ2 Q24", isCompetencyBased: true },

  // Science-PQ2 Q36 first variant (Section D, Long, 5 marks)
  { id: "APQ-S-EYE-005", subject: "Science", topicKey: "human-eye-and-colourful-world", subtopic: "Hypermetropia — Causes and Correction", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A person is unable to see objects distinctly placed within 75 cm from his eyes. (a) Name the defect of vision the person is suffering from. (b) List its two possible causes. (c) Calculate the power of the lens needed to correct this defect. Assume that the near point for the normal eye is 25 cm.",
    answer: "(a) Hypermetropia. (b) Decreased curvature of eye lens; shortening of eye ball. (c) P = +2.67 D.",
    solutionSteps: ["[1 mark] (a) The defect is HYPERMETROPIA (long-sightedness) — the near point has moved away from the normal 25 cm.", "[1 mark] (b) Cause 1: the curvature of the eye lens decreases (eye lens becomes less convergent, focal length too long).", "[1 mark] (b) Cause 2: the eyeball becomes too short, so the image of a near object forms behind the retina.", "[1 mark] (c) To correct, an object at 25 cm must give a virtual image at the near point 75 cm: u = −25 cm, v = −75 cm. Lens formula 1/f = 1/v − 1/u = 1/(−75) − 1/(−25) = −1/75 + 3/75 = 2/75 ⟹ f = 37.5 cm = 0.375 m.", "[1 mark] (c) Power P = 1/f(in m) = 1/0.375 ≈ +2.67 D (positive ⟹ convex lens)."],
    finalAnswer: "(a) Hypermetropia; (b) decreased lens curvature, shortened eye ball; (c) P ≈ +2.67 D (convex).",
    ncertRef: "APQ Science-PQ2 Q36 (first variant)", isCompetencyBased: true },

  // Science-PQ2 Q36 OR variant (Section D, Long, 5 marks)
  { id: "APQ-S-EYE-006", subject: "Science", topicKey: "human-eye-and-colourful-world", subtopic: "Near Point, Recombination of Spectrum, Rainbow", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "(a) Why is a normal eye not able to see clearly the objects placed closer than 25 cm? (b) With the help of a diagram show recombination of the spectrum of white light. (c) List two essential conditions for observing a rainbow.",
    answer: "(a) Eye lens cannot become more curved beyond a limit. (b) Two prisms (one inverted) recombine spectrum. (c) Water droplets in air + Sun behind observer.",
    solutionSteps: ["[1 mark] (a) The focal length of the eye lens has a minimum limit — the ciliary muscles cannot curve the lens beyond a certain point.", "[1 mark] (a) For an object closer than 25 cm the image would form behind the retina, so a sharp image cannot be produced and the object appears blurred.", "[1 mark] (b) Diagram: white light passing through Prism 1 disperses into the VIBGYOR spectrum.", "[1 mark] (b) Diagram: a second identical, inverted prism (Prism 2) recombines the colours back into white light on the screen (Newton's two-prism recombination).", "[1 mark] (c) Two essential conditions for a rainbow: (i) presence of water droplets in the atmosphere (after rain); (ii) the Sun must be behind the observer (observer facing the droplets)."],
    finalAnswer: "(a) Eye-lens focal length has min limit; (b) two-prism recombination; (c) water droplets + Sun behind observer.",
    ncertRef: "APQ Science-PQ2 Q36 (OR variant)", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: two-prism recombination diagram." },
];
