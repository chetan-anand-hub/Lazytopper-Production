/* Auto-generated from triangles_content.json (SecondGPT output) */
export const trianglesTopicHubPack = {
  "subject": "maths",
  "topicKey": "10|Maths|Triangles",
  "topicName": "Triangles",
  "tier": "high-roi",
  "overview": [],
  "definitions": [
    {
      "title": "Similar Figures",
      "detail": "Two figures are similar if they have the same shape; their corresponding angles are equal and their corresponding sides are proportional.",
      "examTip": "Mention both conditions—equal angles and proportional sides—when defining similarity."
    },
    {
      "title": "Similar Triangles",
      "detail": "Two triangles are similar when their corresponding angles are equal and their corresponding sides are in the same ratio.",
      "examTip": "Use the symbol ‘~’ for similarity and justify angle equality or side ratios in proofs."
    },
    {
      "title": "Basic Proportionality Theorem (BPT)",
      "detail": "In a triangle, if a line is drawn parallel to one side to intersect the other two sides, it divides those sides in the same ratio.",
      "examTip": "Always state that the line is parallel before writing the proportionality ratio."
    },
    {
      "title": "Converse of BPT",
      "detail": "If a line divides two sides of a triangle in the same ratio, then the line is parallel to the third side.",
      "examTip": "Mention the ratio condition first and then conclude the line is parallel."
    },
    {
      "title": "Similarity Criteria",
      "detail": "Triangles are similar if any of the following holds: two angles are equal (AA), the ratios of all three pairs of corresponding sides are equal (SSS), or the ratios of two pairs of sides are equal and the included angles are equal (SAS).",
      "examTip": "State which criterion (AA, SSS or SAS) you are using when proving similarity."
    }
  ],
  "examPatterns": [],
  "misconceptions": [],
  "competencies": [
    {
      "title": "Identify and apply similarity criteria",
      "detail": "1. Compare angles or sides of the given triangles.\n2. Decide whether AA, SSS or SAS applies.\n3. Write the correct ratio or angle equality.\n4. Conclude the triangles are similar with the chosen criterion.",
      "examTip": "Prove that ΔABC ~ ΔDEF when ∠A = ∠D and AB/DE = AC/DF."
    },
    {
      "title": "Use the Basic Proportionality Theorem to find missing lengths",
      "detail": "1. Confirm that a line is parallel to one side of the triangle.\n2. Set up the ratio AD/DB = AE/EC using the BPT.\n3. Substitute known values and cross multiply.\n4. Solve for the unknown length and simplify your result.",
      "examTip": "In ΔABC, DE ∥ BC with AD = 3 cm, DB = 2 cm and AE = 4 cm. Find EC."
    },
    {
      "title": "Use a² + b² = c² as a numeric tool",
      "detail": "1. Mark the right angle and the longest side (the hypotenuse) from the figure.\n2. Write a² + b² = c² with the known sides substituted.\n3. Solve for the unknown side.\n4. Give the answer with its unit.",
      "examTip": "A 10 m ladder reaches 8 m up a wall. Find the distance of its foot from the wall."
    },
    {
      "title": "Construct logical geometric proofs",
      "detail": "1. Draw a neat figure and label all known quantities.\n2. Write down the ‘given’ and ‘to prove’ statements.\n3. Use appropriate theorems like BPT or similarity criteria with justification.\n4. Sequence your steps logically and cite reasons for each.\n5. Conclude with a clear statement of what has been proven.",
      "examTip": "Prove that a line drawn parallel to one side of a triangle divides the other two sides in the same ratio."
    }
  ],
  "markingTips": [
    "Do: Always draw a neat, labelled diagram.",
    "Do: State theorems and criteria before using them.",
    "Do: Justify every equality and ratio in proofs.",
    "Do: Simplify ratios before solving."
  ],
  "scoreTips": [
    "{\"id\": \"sb1\", \"booster\": \"Memorise similarity criteria names (AA, SSS, SAS).\", \"howToUseInExam\": \"When you need to prove triangles are similar, quickly decide which criterion applies and mention it by name. This shows clarity of thought and saves time.\"}",
    "{\"id\": \"sb2\", \"booster\": \"Check for parallel lines before applying BPT.\", \"howToUseInExam\": \"Look at the diagram or text to confirm a line is parallel to one side of a triangle. Only then write the proportionality ratio. This prevents misapplication of the theorem.\"}",
    "{\"id\": \"sb3\", \"booster\": \"Use variables for unknown segments in ratios.\", \"howToUseInExam\": \"When dealing with a ratio like 3:2, set the segments as multiples of a common variable (e.g., 3k and 2k). It simplifies calculations and avoids fraction mistakes.\"}",
    "{\"id\": \"sb4\", \"booster\": \"Organise your proof with ‘Given’, ‘To Prove’ and ‘Construction’.\", \"howToUseInExam\": \"At the start of a proof, list what is provided and what you need to show. This structure guides your reasoning and ensures you address every requirement.\"}"
  ],
  "workedExamples": [
    {
      "id": "we1",
      "title": "Proving triangles similar using AA",
      "difficulty": "Easy",
      "marks": 2,
      "question": "In ΔABC, ∠A = ∠D and ∠B = ∠E. Show that ΔABC is similar to ΔDEF.",
      "solutionSteps": [
        "Write the given information: ∠A = ∠D and ∠B = ∠E.",
        "Since two pairs of corresponding angles are equal, the third pair is also equal.",
        "By the AA similarity criterion, ΔABC ~ ΔDEF."
      ],
      "finalAnswer": "ΔABC is similar to ΔDEF by the AA criterion.",
      "examinerNotes": [
        "State that two equal angles are sufficient for similarity.",
        "Use the '~' symbol and name the criterion explicitly."
      ]
    },
    {
      "id": "we2",
      "title": "Using BPT to find a segment length",
      "difficulty": "Medium",
      "marks": 3,
      "question": "In ΔABC, DE is drawn parallel to BC such that D is on AB and E is on AC. If AD = 3 cm, DB = 2 cm and AE = 4 cm, find EC.",
      "solutionSteps": [
        "Recognise that DE ∥ BC, so the Basic Proportionality Theorem applies.",
        "Write the ratio: AD/DB = AE/EC.",
        "Substitute the known values: 3/2 = 4/EC.",
        "Cross multiply to get 3 × EC = 8.",
        "Solve for EC: EC = 8/3 cm."
      ],
      "finalAnswer": "EC = 8/3 cm.",
      "examinerNotes": [
        "Indicate that DE ∥ BC before applying BPT.",
        "Set up the ratio correctly and cross multiply carefully."
      ]
    },
    {
      "id": "we3",
      "title": "Finding a missing side with a² + b² = c²",
      "difficulty": "Medium",
      "marks": 3,
      "question": "In ΔABC, ∠B = 90°, AB = 7 cm and BC = 24 cm. Find AC.",
      "solutionSteps": [
        "The right angle is at B, so AC is the longest side (the hypotenuse).",
        "Write AC² = AB² + BC².",
        "Substitute: AC² = 7² + 24² = 49 + 576 = 625.",
        "Take the square root: AC = 25 cm."
      ],
      "finalAnswer": "AC = 25 cm.",
      "examinerNotes": [
        "Identify the hypotenuse before substituting.",
        "Show the squares explicitly and give the unit in the final answer."
      ]
    }
  ],
  "quickQuiz": [
    {
      "title": "Q1",
      "question": "",
      "answer": "",
      "why": ""
    },
    {
      "title": "Q2",
      "question": "",
      "answer": "",
      "why": ""
    },
    {
      "title": "Q3",
      "question": "",
      "answer": "",
      "why": ""
    },
    {
      "title": "Q4",
      "question": "",
      "answer": "",
      "why": ""
    },
    {
      "title": "Q5",
      "question": "",
      "answer": "",
      "why": ""
    }
  ],
  "labActivities": [],
  "caseStudies": [
    {
      "id": "cs1",
      "passage": "Anirudh is 1.6 m tall and casts a shadow 2.4 m long on a sunny day. Nearby, a lamppost casts a 7.2 m shadow at the same time. Anirudh decides to use the concept of similar triangles to find the height of the lamppost. In the school garden, a triangular flower bed has a path cutting across it, dividing two sides in the ratio 3:2. He wonders whether the path is parallel to the third side. He also compares his friend’s shadow of 2.7 m for a height of 1.8 m to check if the observations are consistent.",
      "subQuestions": [
        {
          "q": "Write the similarity ratio of Anirudh’s height to his shadow.",
          "marks": 1,
          "answer": "1.6 m / 2.4 m = 2/3"
        },
        {
          "q": "Using similar triangles, calculate the height of the lamppost.",
          "marks": 2,
          "answer": "Height / 7.2 = 1.6 / 2.4 ⇒ Height = (7.2 × 1.6) / 2.4 = 4.8 m"
        },
        {
          "q": "In the triangular garden, if the path divides two sides in the ratio 3:2, what can you conclude about the path relative to the third side?",
          "marks": 2,
          "answer": "By the converse of the Basic Proportionality Theorem, the path is parallel to the third side of the triangle."
        },
        {
          "q": "Explain why Anirudh can use the ratio of shadows to determine the height of the lamppost.",
          "marks": 3,
          "answer": "The sun’s rays are practically parallel, so the triangles formed by Anirudh and his shadow and the lamppost and its shadow are similar. Therefore, the ratio of their heights equals the ratio of their shadow lengths."
        },
        {
          "q": "Does Anirudh’s friend of height 1.8 m casting a shadow 2.7 m long follow the same ratio? What does this imply?",
          "marks": 2,
          "answer": "1.8 m / 2.7 m = 2/3, which matches Anirudh’s ratio. It implies both observations were taken at the same time under the same conditions, confirming the similarity of triangles."
        }
      ]
    }
  ],
  "mindMap": {
    "nodes": [
      {
        "id": "n1",
        "label": "Similar Figures",
        "description": "Figures having equal angles and proportional sides."
      },
      {
        "id": "n2",
        "label": "Similar Triangles",
        "description": "Triangles that satisfy similarity criteria."
      },
      {
        "id": "n3",
        "label": "Similarity Criteria",
        "description": "AA, SSS and SAS tests for similarity."
      },
      {
        "id": "n4",
        "label": "BPT",
        "description": "A line parallel to a side divides the other sides proportionally."
      },
      {
        "id": "n5",
        "label": "Converse BPT",
        "description": "Proportional division implies parallel lines."
      },
      {
        "id": "n10",
        "label": "Applications",
        "description": "Real‑life uses like measuring heights and distances."
      },
      {
        "id": "n11",
        "label": "Proofs",
        "description": "Logical steps for proving theorems."
      },
      {
        "id": "n12",
        "label": "Common Traps",
        "description": "Frequent mistakes to avoid in exams."
      },
      {
        "id": "n13",
        "label": "Exam Tips",
        "description": "Strategies to write clear answers and score well."
      }
    ],
    "edges": [
      {
        "from": "n1",
        "to": "n2",
        "label": "includes"
      },
      {
        "from": "n2",
        "to": "n3",
        "label": "proved using"
      },
      {
        "from": "n3",
        "to": "n4",
        "label": "applied in"
      },
      {
        "from": "n4",
        "to": "n5",
        "label": "converse of"
      },
      {
        "from": "n4",
        "to": "n2",
        "label": "used to show"
      },
      {
        "from": "n5",
        "to": "n4",
        "label": "requires"
      },
      {
        "from": "n2",
        "to": "n10",
        "label": "used in"
      },
      {
        "from": "n12",
        "to": "n11",
        "label": "warns about"
      },
      {
        "from": "n11",
        "to": "n13",
        "label": "leads to"
      },
      {
        "from": "n3",
        "to": "n12",
        "label": "misunderstood as"
      },
      {
        "from": "n13",
        "to": "n10",
        "label": "helps in"
      },
      {
        "from": "n2",
        "to": "n12",
        "label": "requires caution"
      }
    ]
  },
  "formulae": [
    {
      "id": "for_aa",
      "title": "AA Similarity Criterion",
      "formula": "If two angles of one triangle are equal to two angles of another triangle, then the triangles are similar.",
      "whenToUse": "When you know two pairs of corresponding angles are equal."
    },
    {
      "id": "for_sss",
      "title": "SSS Similarity Criterion",
      "formula": "If the three pairs of corresponding sides of two triangles are proportional, then the triangles are similar.",
      "whenToUse": "When all three side ratios are known and equal."
    },
    {
      "id": "for_sas",
      "title": "SAS Similarity Criterion",
      "formula": "If two pairs of sides are proportional and the included angles are equal, then the triangles are similar.",
      "whenToUse": "When you know two side ratios and the included angle equality."
    },
    {
      "id": "for_bpt",
      "title": "Basic Proportionality Theorem",
      "formula": "In ΔABC, if DE ∥ BC, then AD/DB = AE/EC.",
      "whenToUse": "When a line parallel to one side of a triangle divides the other two sides."
    },
    {
      "id": "for_converse_bpt",
      "title": "Converse of BPT",
      "formula": "In ΔABC, if AD/DB = AE/EC, then DE ∥ BC.",
      "whenToUse": "To prove a line is parallel to a side when it divides two sides proportionally."
    },
    {
      "id": "for_pyth",
      "title": "Right-angled triangle relation (numeric tool)",
      "formula": "a² + b² = c², where c is the hypotenuse.",
      "whenToUse": "To find a missing side in a right-angled triangle in height, distance and tangent-length problems."
    }
  ],
  "videos": [
    {
      "id": "vid1",
      "title": "Basic Proportionality Theorem (BPT) | Class 10 Triangles",
      "url": "https://www.youtube.com/watch?v=luBi6PgRRmg",
      "whyThis": "This video walks through the proof of the Basic Proportionality Theorem and demonstrates its application with clear diagrams."
    },
    {
      "id": "vid2",
      "title": "Similarity Criteria of Triangles | AA, SSS, SAS",
      "url": "https://www.youtube.com/watch?v=XX0P1dP7X6s",
      "whyThis": "It explains the three criteria for triangle similarity with worked examples, making it easier to remember when to use each."
    }
  ]
} as const;

export default trianglesTopicHubPack;
