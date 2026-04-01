import type { BoardStepsIndex } from "./types";

export const boardSteps_science_2025_26: BoardStepsIndex["Science"] = {
  A: { subject:"Science", section:"A", marksTotal:1, steps:[
    { id:"A-term", title:"Use correct scientific term", whatToWrite:["Write/mark the correct answer.","Use the exact term/keyword."], marks:1 }
  ]},
  B: { subject:"Science", section:"B", marksTotal:2, steps:[
    { id:"B-core", title:"Key statement (1 line)", whatToWrite:["State the law/process/definition."], marks:0.75 },
    { id:"B-points", title:"2 points (bullets)", whatToWrite:["Point 1: …","Point 2: …"], marks:1.0 },
    { id:"B-close", title:"Conclusion", whatToWrite:["Therefore, …"], marks:0.25 }
  ], notes:["Use bullet points. Marking is point-wise."]},
  C: { subject:"Science", section:"C", marksTotal:3, steps:[
    { id:"C-law", title:"Law/Concept + name", whatToWrite:["Write the correct law/principle/definition."], marks:1 },
    { id:"C-explain", title:"Explanation points (bullets)", whatToWrite:["Point 1: …","Point 2: …","(Optional) Point 3: …"], marks:1.5 },
    { id:"C-diagram", title:"Diagram/Units (if applicable)", whatToWrite:["Draw labelled diagram OR write correct units."], marks:0.5 }
  ]},
  D: { subject:"Science", section:"D", marksTotal:5, steps:[
    { id:"D-core", title:"Core concept (1–2 lines)", whatToWrite:["State the law/process clearly."], marks:1 },
    { id:"D-diagram", title:"Diagram + labels (if asked)", whatToWrite:["Neat diagram with labels."], marks:1 },
    { id:"D-reason", title:"Reasoning (3 bullets)", whatToWrite:["Point 1: …","Point 2: …","Point 3: …"], marks:2 },
    { id:"D-calc", title:"If numerical: formula → substitution → units", whatToWrite:["Formula","Substitution with units","Final answer with units"], marks:1 }
  ]},
  E: { subject:"Science", section:"E", marksTotal:4, steps:[
    { id:"E-read", title:"Use case data", whatToWrite:["Extract data from figure/table/passage."], marks:0.5 },
    { id:"E-i", title:"Part (i) – 1 mark", whatToWrite:["One-line exact answer (keyword included)."], marks:1 },
    { id:"E-ii", title:"Part (ii) – 1 mark", whatToWrite:["One-line exact answer (keyword included)."], marks:1 },
    { id:"E-iii", title:"Part (iii) – 2 marks (2 bullets)", whatToWrite:["Bullet 1: …","Bullet 2: …","Conclusion line"], marks:1.5 }
  ], notes:["Keep answers tied to the case data; use bullets for full marks."] }
};

export default boardSteps_science_2025_26;
