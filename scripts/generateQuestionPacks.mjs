import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const client = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
});

const MATHS_CHAPTERS = [
  { key: "Real Numbers", prefix: "RN2", file: "realNumbers", subtopics: ["Euclid Division Lemma","Fundamental Theorem of Arithmetic","HCF and LCM","Decimal Expansion","Irrationality Proofs"], ncertExs: ["Ex 1.1","Ex 1.2","Ex 1.3","Ex 1.4"], need: 45, packNum: 2 },
  { key: "Polynomials", prefix: "PL2", file: "polynomials", subtopics: ["Zeroes of Polynomial","Relationship between Zeroes and Coefficients","Division Algorithm"], ncertExs: ["Ex 2.1","Ex 2.2","Ex 2.3"], need: 44, packNum: 2 },
  { key: "Pair of Linear Equations", prefix: "PLE2", file: "pairOfLinearEquations", subtopics: ["Graphical Method","Substitution Method","Elimination Method","Cross-Multiplication Method","Word Problems"], ncertExs: ["Ex 3.1","Ex 3.2","Ex 3.3","Ex 3.4","Ex 3.5","Ex 3.6"], need: 44, packNum: 2 },
  { key: "Quadratic Equations", prefix: "QE2", file: "quadraticEquations", subtopics: ["Factorisation Method","Completing the Square","Quadratic Formula","Nature of Roots","Word Problems"], ncertExs: ["Ex 4.1","Ex 4.2","Ex 4.3","Ex 4.4"], need: 45, packNum: 2 },
  { key: "Arithmetic Progression", prefix: "AP2", file: "arithmeticProgression", subtopics: ["nth Term of AP","Sum of n Terms","Word Problems on AP"], ncertExs: ["Ex 5.1","Ex 5.2","Ex 5.3"], need: 44, packNum: 2 },
  { key: "Triangles", prefix: "TR3", file: "triangles", subtopics: ["Similarity Criteria","Basic Proportionality Theorem","Pythagoras Theorem","Areas of Similar Triangles"], ncertExs: ["Ex 6.1","Ex 6.2","Ex 6.3","Ex 6.4","Ex 6.5","Ex 6.6"], need: 66, packNum: 3 },
  { key: "Coordinate Geometry", prefix: "CG2", file: "coordinateGeometry", subtopics: ["Distance Formula","Section Formula","Area of Triangle","Midpoint Formula"], ncertExs: ["Ex 7.1","Ex 7.2","Ex 7.3","Ex 7.4"], need: 45, packNum: 2 },
  { key: "Trigonometry", prefix: "TG3", file: "trigonometry", subtopics: ["Trigonometric Ratios","Trigonometric Identities","Values of Standard Angles","Complementary Angles"], ncertExs: ["Ex 8.1","Ex 8.2","Ex 8.3","Ex 8.4"], need: 63, packNum: 3 },
  { key: "Circles", prefix: "CI2", file: "circles", subtopics: ["Tangent Properties","Number of Tangents from External Point","Tangent-Radius Perpendicularity"], ncertExs: ["Ex 10.1","Ex 10.2"], need: 45, packNum: 2 },
  { key: "Areas Related to Circles", prefix: "ARC2", file: "areasRelatedToCircles", subtopics: ["Sector Area","Segment Area","Arc Length","Combined Figures"], ncertExs: ["Ex 11.1","Ex 11.2","Ex 11.3"], need: 45, packNum: 2 },
  { key: "Surface Areas and Volumes", prefix: "SAV2", file: "surfaceAreasVolumes", subtopics: ["Combined Solids","Conversion of Solids","Frustum of Cone"], ncertExs: ["Ex 13.1","Ex 13.2","Ex 13.3","Ex 13.4","Ex 13.5"], need: 45, packNum: 2 },
  { key: "Statistics", prefix: "ST2", file: "statistics", subtopics: ["Mean of Grouped Data","Median of Grouped Data","Mode of Grouped Data","Ogive"], ncertExs: ["Ex 14.1","Ex 14.2","Ex 14.3","Ex 14.4"], need: 45, packNum: 2 },
  { key: "Probability", prefix: "PR2", file: "probability", subtopics: ["Classical Probability","Complementary Events","Impossible and Sure Events"], ncertExs: ["Ex 15.1","Ex 15.2"], need: 45, packNum: 2 },
];

const SCIENCE_CHAPTERS = [
  { key: "Chemical Reactions and Equations", prefix: "CR2", file: "chemicalReactions", subtopics: ["Types of Reactions","Balancing Equations","Oxidation-Reduction","Corrosion and Rancidity"], ncertExs: ["NCERT Ch1 InText","NCERT Ch1 Exercise"], need: 49, packNum: 2 },
  { key: "Acids, Bases and Salts", prefix: "ABS2", file: "acidsBasesSalts", subtopics: ["Properties of Acids and Bases","pH Scale","Salts and their Properties","Neutralisation"], ncertExs: ["NCERT Ch2 InText","NCERT Ch2 Exercise"], need: 50, packNum: 2 },
  { key: "Metals and Non-metals", prefix: "MNM2", file: "metalsNonMetals", subtopics: ["Physical Properties","Chemical Properties","Reactivity Series","Extraction of Metals","Corrosion"], ncertExs: ["NCERT Ch3 InText","NCERT Ch3 Exercise"], need: 50, packNum: 2 },
  { key: "Carbon and its Compounds", prefix: "CC2", file: "carbonCompounds", subtopics: ["Bonding in Carbon","Homologous Series","Nomenclature","Chemical Properties","Soaps and Detergents"], ncertExs: ["NCERT Ch4 InText","NCERT Ch4 Exercise"], need: 50, packNum: 2 },
  { key: "Life Processes", prefix: "LP2", file: "lifeProcesses", subtopics: ["Nutrition","Respiration","Transportation","Excretion"], ncertExs: ["NCERT Ch6 InText","NCERT Ch6 Exercise"], need: 49, packNum: 2 },
  { key: "Control and Coordination", prefix: "CNC2", file: "controlAndCoordination", subtopics: ["Nervous System","Reflex Arc","Brain Structure","Hormones in Animals","Plant Hormones"], ncertExs: ["NCERT Ch7 InText","NCERT Ch7 Exercise"], need: 49, packNum: 2 },
  { key: "How do Organisms Reproduce", prefix: "REP2", file: "reproduction", subtopics: ["Asexual Reproduction","Sexual Reproduction in Plants","Human Reproductive System","Reproductive Health"], ncertExs: ["NCERT Ch8 InText","NCERT Ch8 Exercise"], need: 49, packNum: 2 },
  { key: "Heredity and Evolution", prefix: "HE2", file: "heredity", subtopics: ["Mendel Experiments","Heredity Rules","Sex Determination","Evolution","Speciation"], ncertExs: ["NCERT Ch9 InText","NCERT Ch9 Exercise"], need: 49, packNum: 2 },
  { key: "Light - Reflection and Refraction", prefix: "LT2", file: "light", subtopics: ["Laws of Reflection","Spherical Mirrors","Mirror Formula","Refraction","Lens Formula"], ncertExs: ["NCERT Ch10 InText","NCERT Ch10 Exercise"], need: 49, packNum: 2 },
  { key: "Human Eye and Colourful World", prefix: "HEC2", file: "humanEyeAndColourfulWorld", subtopics: ["Human Eye Structure","Defects of Vision","Atmospheric Refraction","Dispersion","Scattering of Light"], ncertExs: ["NCERT Ch11 InText","NCERT Ch11 Exercise"], need: 49, packNum: 2 },
  { key: "Electricity", prefix: "EL2", file: "electricity", subtopics: ["Electric Current","Ohms Law","Resistance","Series and Parallel","Heating Effect","Electric Power"], ncertExs: ["NCERT Ch12 InText","NCERT Ch12 Exercise"], need: 49, packNum: 2 },
  { key: "Magnetic Effects of Electric Current", prefix: "ME2", file: "magneticEffects", subtopics: ["Magnetic Field","Electromagnet","Fleming Rules","Electric Motor","Electromagnetic Induction","AC and DC"], ncertExs: ["NCERT Ch13 InText","NCERT Ch13 Exercise"], need: 49, packNum: 2 },
  { key: "Our Environment", prefix: "OE2", file: "ourEnvironment", subtopics: ["Ecosystem Components","Food Chains and Webs","Ozone Depletion","Biodegradable and Non-biodegradable"], ncertExs: ["NCERT Ch15 InText","NCERT Ch15 Exercise"], need: 49, packNum: 2 },
];

function buildPrompt(ch, subject) {
  const n = ch.need;
  const easyCount = Math.round(n * 0.30);
  const medCount = Math.round(n * 0.45);
  const hardCount = n - easyCount - medCount;
  
  return `Generate exactly ${n} CBSE Class 10 ${subject} questions for the chapter "${ch.key}".
Subtopics: ${ch.subtopics.join(", ")}
NCERT exercises: ${ch.ncertExs.join(", ")}

REQUIREMENTS:
- Difficulty distribution: ${easyCount} Easy, ${medCount} Medium, ${hardCount} Hard
- At least 50% must be competency-based (application/analysis, not rote recall)
- Include 6-8 Assertion-Reasoning questions (format: "Assertion (A): ... Reason (R): ..." with 4 standard options)
- Include 8-10 PYQs from CBSE board exams 2019-2025 (tag with year and set)
- Include 3-4 Case-Based questions (4 marks, Section E, with 4 sub-parts)
- Include 3-4 Long Answer questions (5 marks, Section D)
- Rest should be MCQ (1 mark), Short Answer 2-mark (Section B), Short Answer 3-mark (Section C)
- Tag questions with NCERT exercise references where applicable
- Every question must have step-by-step solution with marks allocation

OUTPUT FORMAT — Return ONLY a valid JSON array. Each element:
{
  "id": "${ch.prefix}-XXX",
  "subject": "${subject}",
  "topicKey": "${ch.key}",
  "subtopic": "<specific subtopic>",
  "section": "A|B|C|D|E",
  "marks": 1|2|3|4|5,
  "format": "MCQ|Short|Long|Case-Based|Assertion-Reasoning",
  "difficulty": "Easy|Medium|Hard",
  "bloomSkill": "Remembering|Understanding|Applying|Analysing|Evaluating",
  "questionText": "<full question text>",
  "options": ["opt1","opt2","opt3","opt4"],
  "answer": "<correct answer text>",
  "solutionSteps": ["Step 1 (1 mark): ...","Step 2 (1 mark): ..."],
  "finalAnswer": "<concise final answer>",
  "isCompetencyBased": true|false,
  "pyqYear": "2023"|null,
  "pyqSet": "Set 1"|null,
  "ncertRef": "Ex 1.2 Q3"|null
}

For non-MCQ questions, set "options" to an empty array.
For Assertion-Reasoning, always use these 4 options:
["Both A and R are true, and R is the correct explanation of A.", "Both A and R are true, but R is not the correct explanation of A.", "A is true, R is false.", "A is false, R is true."]

Return ONLY the JSON array, no markdown, no explanation.`;
}

async function generateChapter(ch, subject, outDir) {
  const packFile = `${ch.file}.pack${ch.packNum}.ts`;
  const exportName = `${ch.file.charAt(0).toUpperCase()}${ch.file.slice(1)}Pack${ch.packNum}`.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toUpperCase();
  const cleanExport = `${ch.prefix}_PACK${ch.packNum}`;

  console.log(`Generating ${ch.need} questions for ${subject} / ${ch.key}...`);
  
  const prompt = buildPrompt(ch, subject);
  
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 16000,
      messages: [{ role: "user", content: prompt }],
    });
    
    let text = response.content[0].text.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    }
    
    const questions = JSON.parse(text);
    console.log(`  Got ${questions.length} questions for ${ch.key}`);
    
    const tsContent = `import type { CanonicalQuestion } from "../../types";\n\nexport const ${cleanExport}: CanonicalQuestion[] = ${JSON.stringify(questions, null, 2)};\n`;
    
    const outPath = join(outDir, packFile);
    writeFileSync(outPath, tsContent);
    console.log(`  Written to ${outPath}`);
    
    return { chapter: ch.key, count: questions.length, export: cleanExport, file: packFile, success: true };
  } catch (err) {
    console.error(`  ERROR for ${ch.key}: ${err.message}`);
    return { chapter: ch.key, count: 0, export: cleanExport, file: packFile, success: false, error: err.message };
  }
}

async function main() {
  const mathsDir = "lib/shared-data/src/questionBanks/maths";
  const scienceDir = "lib/shared-data/src/questionBanks/science";
  
  const results = [];
  
  for (const ch of MATHS_CHAPTERS) {
    const r = await generateChapter(ch, "Maths", mathsDir);
    results.push(r);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  for (const ch of SCIENCE_CHAPTERS) {
    const r = await generateChapter(ch, "Science", scienceDir);
    results.push(r);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log("\n=== SUMMARY ===");
  let totalGenerated = 0;
  for (const r of results) {
    console.log(`${r.chapter}: ${r.success ? r.count + " questions" : "FAILED: " + r.error}`);
    if (r.success) totalGenerated += r.count;
  }
  console.log(`Total generated: ${totalGenerated}`);
  
  writeFileSync("scripts/genResults.json", JSON.stringify(results, null, 2));
}

main().catch(console.error);
