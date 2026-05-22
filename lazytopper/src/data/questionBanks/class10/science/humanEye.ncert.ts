import type { CanonicalQuestion } from '../../../predictionTypes';

// Source: NCERT Class 10 Science — Chapter 10: The Human Eye and the Colourful World (jesc110.pdf)
// topicKey: "human-eye-and-colourful-world"
// Extraction date: 2026-05-22
// Syllabus: CBSE 2026-27
// Coverage: 4 in-text questions (after §10.2) + 12 exercises = 16 questions

export const EYE_NCERT: CanonicalQuestion[] = [
  // ===== §10.2 In-text questions (after Defects of Vision and Their Correction) =====
  { id: "EYE-NCERT-10-SA-001", subject: "Science", topicKey: "human-eye-and-colourful-world", subtopic: "Power of Accommodation", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "What is meant by power of accommodation of the eye?",
    answer: "The ability of the eye lens to adjust its focal length is called the power of accommodation. The ciliary muscles change the curvature (and hence the focal length) of the eye lens so that the image of objects at varying distances is always formed on the retina. When viewing distant objects, the ciliary muscles relax and the lens becomes thin (focal length increases). When viewing nearby objects, the ciliary muscles contract and the lens becomes thicker (focal length decreases).",
    solutionSteps: ["Accommodation = ability of the eye lens to change its focal length.", "Ciliary muscles modify the curvature of the lens.", "Distant objects → muscles relaxed → lens thin → focal length large.", "Near objects → muscles contract → lens thick → focal length small.", "This keeps the image on the retina for objects at varying distances."],
    finalAnswer: "Power of accommodation = ability of the eye lens to adjust its focal length using ciliary muscles to focus images of objects at different distances on the retina.",
    ncertRef: "In-text Q1 (after §10.2)", isCompetencyBased: false,
    strategyHint: "Mention ciliary muscles, change in curvature, and image always on retina." },

  { id: "EYE-NCERT-10-SA-002", subject: "Science", topicKey: "human-eye-and-colourful-world", subtopic: "Myopia", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "A person with a myopic eye cannot see objects beyond 1.2 m distinctly. What should be the type of the corrective lens used to restore proper vision?",
    answer: "The person is suffering from myopia (near-sightedness) with a far point of 1.2 m instead of infinity. To correct this defect, a concave lens (diverging lens) of suitable focal length is used. The lens should have a focal length of -1.2 m so that it forms a virtual image of distant objects at the far point (1.2 m) of the defective eye, from where the eye lens can focus it on the retina.",
    solutionSteps: ["Far point of the myopic eye = 1.2 m (less than infinity).", "Myopia is corrected by a CONCAVE (diverging) lens.", "The lens forms a virtual image of a distant object at the eye's far point.", "Required focal length f = -1.2 m (negative sign for concave lens)."],
    finalAnswer: "A concave (diverging) lens of focal length -1.2 m (power = -0.83 D) is required.",
    ncertRef: "In-text Q2 (after §10.2)", isCompetencyBased: true,
    strategyHint: "Myopia → concave lens; focal length = -(far point)." },

  { id: "EYE-NCERT-10-SA-003", subject: "Science", topicKey: "human-eye-and-colourful-world", subtopic: "Near Point and Far Point", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "What is the far point and near point of the human eye with normal vision?",
    answer: "For a human eye with normal vision: (i) Near point = 25 cm (the minimum distance from the eye at which an object can be seen distinctly and comfortably without strain). It is also called the least distance of distinct vision. (ii) Far point = infinity (the maximum distance up to which the eye can see objects clearly).",
    solutionSteps: ["Near point = least distance of distinct vision.", "For a normal young adult, near point = 25 cm.", "Far point = farthest distance at which an eye can see clearly.", "For a normal eye, far point = infinity."],
    finalAnswer: "Near point = 25 cm; Far point = infinity (for normal human eye).",
    ncertRef: "In-text Q3 (after §10.2)", isCompetencyBased: false },

  { id: "EYE-NCERT-10-SA-004", subject: "Science", topicKey: "human-eye-and-colourful-world", subtopic: "Myopia", section: "C", marks: 3, format: "Short", difficulty: "Easy", bloomSkill: "Applying",
    questionText: "A student has difficulty reading the blackboard while sitting in the last row. What could be the defect the child is suffering from? How can it be corrected?",
    answer: "The student is unable to see distant objects (the blackboard) clearly while sitting in the last row, but can presumably see nearby objects. This is the defect known as myopia or near-sightedness. In a myopic eye, the image of a distant object is formed in front of the retina due to either excessive curvature of the eye lens or elongation of the eyeball. It is corrected by using spectacles with a concave (diverging) lens of suitable focal length, which diverges the parallel rays from distant objects so that the eye lens can focus them on the retina.",
    solutionSteps: ["Symptoms: cannot see distant blackboard but can see nearby objects → far point < infinity.", "This refractive defect is called MYOPIA (near-sightedness).", "Cause: image of distant object forms IN FRONT of the retina.", "Correction: use spectacles with a CONCAVE (diverging) lens of suitable power.", "The lens forms a virtual image at the eye's far point, which the eye can then focus on the retina."],
    finalAnswer: "Defect = Myopia (near-sightedness). Corrected by a concave lens of suitable focal length.",
    ncertRef: "In-text Q4 (after §10.2)", isCompetencyBased: true,
    strategyHint: "Identify the defect from the symptom, then state both the cause and the corrective lens type." },

  // ===== EXERCISES (Q1-Q12) =====
  { id: "EYE-NCERT-10-MCQ-001", subject: "Science", topicKey: "human-eye-and-colourful-world", subtopic: "Power of Accommodation", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "The human eye can focus on objects at different distances by adjusting the focal length of the eye lens. This is due to",
    options: ["presbyopia.", "accommodation.", "near-sightedness.", "far-sightedness."],
    answer: "accommodation.",
    solutionSteps: ["Adjustment of focal length of the eye lens by the action of ciliary muscles is called accommodation.", "Presbyopia, near-sightedness and far-sightedness are defects of vision, not the focusing mechanism."],
    finalAnswer: "accommodation — option (b)",
    ncertRef: "Exercise Q1", isCompetencyBased: false },

  { id: "EYE-NCERT-10-MCQ-002", subject: "Science", topicKey: "human-eye-and-colourful-world", subtopic: "Structure of Human Eye", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "The human eye forms the image of an object at its",
    options: ["cornea.", "iris.", "pupil.", "retina."],
    answer: "retina.",
    solutionSteps: ["The retina is the light-sensitive screen at the back of the eye where the image is formed.", "Cornea is the transparent outer membrane; iris controls pupil size; pupil regulates light entry."],
    finalAnswer: "retina — option (d)",
    ncertRef: "Exercise Q2", isCompetencyBased: false },

  { id: "EYE-NCERT-10-MCQ-003", subject: "Science", topicKey: "human-eye-and-colourful-world", subtopic: "Near Point and Far Point", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "The least distance of distinct vision for a young adult with normal vision is about",
    options: ["25 m.", "2.5 cm.", "25 cm.", "2.5 m."],
    answer: "25 cm.",
    solutionSteps: ["The least distance of distinct vision (near point) for a young adult with normal vision is 25 cm.", "Other options are incorrect by an order of magnitude."],
    finalAnswer: "25 cm — option (c)",
    ncertRef: "Exercise Q3", isCompetencyBased: false },

  { id: "EYE-NCERT-10-MCQ-004", subject: "Science", topicKey: "human-eye-and-colourful-world", subtopic: "Power of Accommodation", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "The change in focal length of an eye lens is caused by the action of the",
    options: ["pupil.", "retina.", "ciliary muscles.", "iris."],
    answer: "ciliary muscles.",
    solutionSteps: ["Ciliary muscles modify the curvature of the eye lens, which in turn changes its focal length.", "Pupil and iris regulate light entry; retina is the screen receiving the image."],
    finalAnswer: "ciliary muscles — option (c)",
    ncertRef: "Exercise Q4", isCompetencyBased: false },

  { id: "EYE-NCERT-10-SA-005", subject: "Science", topicKey: "human-eye-and-colourful-world", subtopic: "Lens Power and Focal Length", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A person needs a lens of power -5.5 dioptres for correcting his distant vision. For correcting his near vision he needs a lens of power +1.5 dioptre. What is the focal length of the lens required for correcting (i) distant vision, and (ii) near vision?",
    answer: "Using P = 1/f, where P is in dioptres and f in metres. (i) For distant vision: P₁ = -5.5 D, so f₁ = 1/P₁ = 1/(-5.5) = -0.182 m = -18.2 cm (concave lens). (ii) For near vision: P₂ = +1.5 D, so f₂ = 1/P₂ = 1/1.5 = 0.667 m = +66.7 cm (convex lens).",
    solutionSteps: ["Use the formula: Power P = 1/f (focal length in metres).", "(i) Distant vision: P₁ = -5.5 D → f₁ = 1/(-5.5) m = -0.1818 m ≈ -18.2 cm (concave lens corrects myopia).", "(ii) Near vision: P₂ = +1.5 D → f₂ = 1/1.5 m = 0.667 m ≈ +66.7 cm (convex lens corrects hypermetropia).", "Negative focal length → concave (diverging); positive → convex (converging)."],
    finalAnswer: "(i) f₁ = -18.18 cm (concave). (ii) f₂ = +66.67 cm (convex).",
    ncertRef: "Exercise Q5", isCompetencyBased: true,
    strategyHint: "P = 1/f with f in metres; sign of P indicates lens nature." },

  { id: "EYE-NCERT-10-SA-006", subject: "Science", topicKey: "human-eye-and-colourful-world", subtopic: "Myopia", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The far point of a myopic person is 80 cm in front of the eye. What is the nature and power of the lens required to correct the problem?",
    answer: "For a myopic eye with far point at 80 cm, the corrective lens must form a virtual image of a distant object (object at infinity) at the far point (80 cm) of the eye. Using the lens formula 1/v - 1/u = 1/f, with u = -∞ and v = -80 cm: 1/f = 1/v = -1/80 cm, hence f = -80 cm = -0.80 m. Power P = 1/f (in m) = 1/(-0.80) = -1.25 D. The lens is a concave (diverging) lens of power -1.25 D.",
    solutionSteps: ["Far point of the myopic eye = 80 cm; correction requires a concave lens.", "The lens must form an image of an object at infinity (u = -∞) at the far point (v = -80 cm).", "Apply lens formula: 1/v - 1/u = 1/f → 1/(-80) - 0 = 1/f → f = -80 cm = -0.8 m.", "Power P = 1/f (m) = 1/(-0.8) = -1.25 D.", "Hence, a concave lens of power -1.25 D corrects the defect."],
    finalAnswer: "Nature: concave (diverging) lens; Power = -1.25 D (focal length = -0.8 m or -80 cm).",
    ncertRef: "Exercise Q6", isCompetencyBased: true,
    strategyHint: "f = -(far point in metres); P = 1/f." },

  // REQUIRES-FIGURE
  { id: "EYE-NCERT-10-SA-007", subject: "Science", topicKey: "human-eye-and-colourful-world", subtopic: "Hypermetropia", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Make a diagram to show how hypermetropia is corrected. The near point of a hypermetropic eye is 1 m. What is the power of the lens required to correct this defect? Assume that the near point of the normal eye is 25 cm.",
    answer: "Hypermetropia is corrected by a convex (converging) lens that forms a virtual image of an object placed at the normal near point (25 cm) at the defective eye's near point (1 m). Using the lens formula with u = -25 cm = -0.25 m and v = -100 cm = -1.0 m: 1/f = 1/v - 1/u = 1/(-1.0) - 1/(-0.25) = -1 + 4 = +3. Hence f = +1/3 m ≈ +0.333 m. Power P = 1/f = +3.0 D. So a convex lens of power +3.0 D is required.",
    solutionSteps: ["Hypermetropia is corrected by a CONVEX (converging) lens (see ray diagram: parallel rays from near object converge after refraction through convex lens, then focus on retina).", "Given: normal near point u = -25 cm = -0.25 m; defective near point v = -100 cm = -1.0 m.", "Apply lens formula: 1/v - 1/u = 1/f → 1/(-1.0) - 1/(-0.25) = -1 + 4 = +3.", "Hence f = +1/3 m ≈ +33.3 cm.", "Power P = 1/f (in m) = +3.0 D. So required lens: convex of power +3.0 D."],
    finalAnswer: "Convex lens of focal length ≈ +33.3 cm and power = +3.0 D.",
    ncertRef: "Exercise Q7", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: Ray diagram of hypermetropic eye + convex lens correction (rays from object at 25 cm refract through convex lens to form virtual image at 1 m).",
    },

  { id: "EYE-NCERT-10-SA-008", subject: "Science", topicKey: "human-eye-and-colourful-world", subtopic: "Power of Accommodation", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Why is a normal eye not able to see clearly the objects placed closer than 25 cm?",
    answer: "The focal length of the eye lens cannot be decreased below a certain minimum value because the ciliary muscles can contract only up to a limit. For objects closer than 25 cm, the lens would need to become even thicker (focal length even shorter) than what the ciliary muscles can achieve. As a result, the image of such close objects cannot be formed on the retina and the eye experiences strain. Hence, 25 cm is the least distance of distinct vision (near point).",
    solutionSteps: ["The eye lens's focal length is adjusted by ciliary muscles.", "Ciliary muscles can contract only up to a maximum limit → focal length has a minimum value.", "For objects nearer than 25 cm, the required focal length is below this minimum → image cannot form on retina.", "Hence the object appears blurred and the eye feels strained."],
    finalAnswer: "Because the eye lens's focal length cannot be reduced below the limit set by maximum ciliary muscle contraction, so objects closer than 25 cm cannot be focussed on the retina.",
    ncertRef: "Exercise Q8", isCompetencyBased: true },

  { id: "EYE-NCERT-10-SA-009", subject: "Science", topicKey: "human-eye-and-colourful-world", subtopic: "Power of Accommodation", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "What happens to the image distance in the eye when we increase the distance of an object from the eye?",
    answer: "The image distance in the eye remains essentially constant (equal to the distance between the eye lens and the retina, about 2.3 cm), regardless of the object distance. As the object distance increases, the eye lens automatically adjusts its focal length (by relaxation of ciliary muscles) so that the image always forms on the retina. Thus, while the focal length of the eye lens changes, the image distance does not change.",
    solutionSteps: ["The retina is fixed at a constant distance (≈ 2.3 cm) from the eye lens.", "When object distance increases, the ciliary muscles relax → lens becomes thinner → focal length increases.", "Accommodation keeps the image on the retina regardless of object distance.", "Therefore, image distance (lens to retina) stays unchanged; only the focal length varies."],
    finalAnswer: "Image distance remains the same (≈ 2.3 cm); the eye lens adjusts its focal length to keep the image on the retina.",
    ncertRef: "Exercise Q9", isCompetencyBased: true,
    strategyHint: "Image distance is fixed by retina position; focal length adjusts via accommodation." },

  { id: "EYE-NCERT-10-SA-010", subject: "Science", topicKey: "human-eye-and-colourful-world", subtopic: "Atmospheric Refraction", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Why do stars twinkle?",
    answer: "Stars twinkle because of atmospheric refraction of starlight. The earth's atmosphere consists of layers of different refractive indices, which change continuously due to varying temperature and density. As starlight passes through the atmosphere, it refracts continuously and the apparent position of the star fluctuates slightly. Since stars are extremely distant point-sized sources of light, even a small change in the path of light produces a noticeable change in the amount of light entering our eye. So the star appears alternately brighter and fainter — this is the twinkling effect.",
    solutionSteps: ["Starlight enters the atmosphere and undergoes refraction.", "The atmosphere has layers of varying refractive index (changing with temperature/density).", "As physical conditions are not stationary, the apparent position of the star fluctuates.", "Stars are point sources, so tiny variations cause noticeable changes in light reaching the eye.", "The amount of light entering the eye keeps fluctuating → star appears to twinkle."],
    finalAnswer: "Atmospheric refraction by layers of varying refractive index makes the apparent position and brightness of point-like distant stars fluctuate → twinkling.",
    ncertRef: "Exercise Q10", isCompetencyBased: true },

  { id: "EYE-NCERT-10-SA-011", subject: "Science", topicKey: "human-eye-and-colourful-world", subtopic: "Atmospheric Refraction", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Explain why the planets do not twinkle.",
    answer: "Planets do not twinkle because they are much closer to the earth than stars and appear as extended sources of light rather than point sources. A planet can be regarded as a collection of a very large number of point-sized sources. Each individual point may twinkle (due to atmospheric refraction), but the variations in light from all these points average out to zero — the increase in light from one point is cancelled by the decrease from another. The net effect is that the planet shines steadily without twinkling.",
    solutionSteps: ["Stars are far away → appear as point sources, so atmospheric refraction causes visible twinkling.", "Planets are much closer → appear as extended sources (not points).", "A planet can be considered as many point sources side by side.", "Twinkling from each point averages out over the whole disc → net variation in light = 0.", "Hence planets shine steadily without twinkling."],
    finalAnswer: "Planets are extended sources (collection of many point sources); twinkling of individual points averages out, so the net brightness is steady.",
    ncertRef: "Exercise Q11", isCompetencyBased: true,
    strategyHint: "Key idea: extended source vs point source; averaging cancels twinkling." },

  { id: "EYE-NCERT-10-SA-012", subject: "Science", topicKey: "human-eye-and-colourful-world", subtopic: "Scattering of Light", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Why does the sky appear dark instead of blue to an astronaut?",
    answer: "The blue colour of the sky is due to scattering of sunlight by the molecules of air and other fine particles in the earth's atmosphere — shorter (blue) wavelengths get scattered more than longer wavelengths. An astronaut at a very high altitude (or in space) is essentially outside the dense atmosphere, so there are no particles to scatter sunlight. With no scattering, no light reaches the astronaut's eye from directions other than the direct line to the Sun, so the surrounding sky appears dark/black instead of blue.",
    solutionSteps: ["Blue sky on earth is caused by scattering of sunlight by air molecules and fine particles.", "Scattering is more effective at shorter (blue) wavelengths.", "An astronaut in space (or at very high altitude) is above/outside the dense atmosphere.", "No atmosphere → no scattering of sunlight → no blue light reaches the eye → sky appears dark."],
    finalAnswer: "Above the atmosphere there are no particles to scatter sunlight, so no blue light reaches the eye and the sky appears dark.",
    ncertRef: "Exercise Q12", isCompetencyBased: true },
];
