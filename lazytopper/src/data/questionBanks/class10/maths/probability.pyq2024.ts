import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Mathematics Standard (041) Previous Year Question Papers — 2023-24 board exam
// Question papers + matched marking schemes (MS 041_30-x-x Mathematics 2023-24) from CBSE
// topicKey: "probability"
// Extraction date: 2026-05-25
// PDF tool: pymupdf (0 cid artifacts confirmed via probe)
// Coverage: 13 text-extractable Standard QPs (30(B), 30/2/x, 30/3/x, 30/4/x, 30/5/x); 3 scanned QPs (30/1/x) skipped — require OCR; Maths Basic (241) not in scope
// OR-question handling: Section B/C/D internal-choice (a)/(b) alternates extracted as separate questions with -a/-b ID suffix

export const PROBABILITY_PYQ_2024: CanonicalQuestion[] = [
  { id: "PYQ-M-2024-PROB-001", subject: "Maths", topicKey: "probability", subtopic: "Dice Probability", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Two dice are thrown together. The probability that they show different numbersis:",
    options: ["1/6", "5/6", "1/3", "2/3"],
    answer: "5/6",
    solutionSteps: ["Correct option: (b) 5/6."],
    finalAnswer: "(b) 5/6",
    ncertRef: "PYQ 30/3/1 Q3", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "1" },
  { id: "PYQ-M-2024-PROB-002", subject: "Maths", topicKey: "probability", subtopic: "General", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A carton consists of 60 shirts of which 48 are good, 8 have major defects and 4 have minor defects. Nigam, a trader, will accept the shirts which are good but Anmol, another trader, will only reject the shirts which have major defects. One shirt is drawn at random from the carton. Find the probability that it is acceptable to Anmol.",
    answer: "Number of Shirts without major defects = 52 P( Anmol will accept the shirt) = 52 60 or",
    solutionSteps: ["Number of Shirts without major defects = 52 P( Anmol will accept the shirt) = 52 60 or"],
    finalAnswer: "Number of Shirts without major defects = 52 P( Anmol will accept the shirt) = 52 60 or",
    ncertRef: "PYQ 30/5/2 Q24", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "2" },
  { id: "PYQ-M-2024-PROB-003", subject: "Maths", topicKey: "probability", subtopic: "Card Probability", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The king, queen and ace of clubs and diamonds are removed from a deck of 52 playing cards and the remaining cards are shuffled. A card is randomly drawn from the remaining cards. Find the probability of getting (i) a card of clubs. (ii) a red coloured card.",
    answer: "Total cards left = 52 − 3 – 3 = 46 (i) P (card of clubs) = 10 46 or 5 23 (ii) P (red coloured card) = 23 46 or",
    solutionSteps: ["Total cards left = 52 − 3 – 3 = 46 (i) P (card of clubs) = 10 46 or 5 23 (ii) P (red coloured card) = 23 46 or"],
    finalAnswer: "Total cards left = 52 − 3 – 3 = 46 (i) P (card of clubs) = 10 46 or 5 23 (ii) P (red coloured card) = 23 46 or",
    ncertRef: "PYQ 30/5/3 Q21", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "3" },
  { id: "PYQ-M-2024-PROB-004", subject: "Maths", topicKey: "probability", subtopic: "Coin Tossing", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Three unbiased coins are tossed simultaneously. Find the probability of getting : (i) at least one head. (ii) exactly one tail. (iii) two heads and one tail.",
    answer: "Total number of possible outcomes = 8 (i) P(at least one head) = 7 8 (ii) P (exactly one tail) = 3 8 (iii) P (2 heads and one tail) =",
    solutionSteps: ["Total number of possible outcomes = 8 (i) P(at least one head) = 7 8 (ii) P (exactly one tail) = 3 8 (iii) P (2 heads and one tail) ="],
    finalAnswer: "Total number of possible outcomes = 8 (i) P(at least one head) = 7 8 (ii) P (exactly one tail) = 3 8 (iii) P (2 heads and one tail) =",
    ncertRef: "PYQ 30/5/1 Q30", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "1" },
  { id: "PYQ-M-2024-PROB-005", subject: "Maths", topicKey: "probability", subtopic: "General", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "In a survey on holidays, 120 people were asked to state which type of transporttheyusedontheirlastholiday.Thefollowingpiechartshows theresultsofthesurvey. Observethepiechartandanswerthefollowingquestions: (i) Ifonepersonisselectedatrandom,findtheprobabilitythathe/she travelledbybusorship. 1 (ii) Which is most favourite mode of transport and how many people usedit? 1 (iii) (a) A person is selected at random.If the probability thathe did notusetrainis4/5,findthenumberofpeoplewhousedtrain. 2 OR (iii) (b) Theprobabilitythatrandomlyselectedpersonusedaeroplaneis 7/60.Findtherevenuecollectedbyaircompanyattherateof` 5,000perperson. 2 ___________ 107 A",
    answer: "Revenue generated= 14 × 5000 = ₹ 70,000 1",
    solutionSteps: ["[1 mark] (i) P(travelled by bus or ship) = (36 + 33)/360 = 69/360 = 23/120.", "[1 mark] (ii) The most favourite mode of transport is Car; number of people who used car = (177/360) × 120 = 59.", "[1 mark] (iii)(a) P(did not use train) = 4/5 ⇒ P(used train) = 1 − 4/5 = 1/5.   [OR (iii)(b) P(used aeroplane) = 7/60.]", "[1 mark] (iii)(a) Number who used train = (1/5) × 120 = 24.   [OR (iii)(b) number who used aeroplane = (7/60) × 120 = 14, so revenue = 14 × 5000 = ₹70,000.]"],
    finalAnswer: "(i) 23/120; (ii) Car — 59 people; (iii)(a) 24 people [OR (iii)(b) aeroplane 14 people, revenue ₹70,000]",
    ncertRef: "PYQ 30/2/1 Q38", isCompetencyBased: true,
    pyqYear: "2024", pyqSet: "1" },
];
