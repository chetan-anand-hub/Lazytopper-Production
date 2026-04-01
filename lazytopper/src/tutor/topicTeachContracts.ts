import { canonicalChapters, getCanonicalChapterBySlug } from "../data/syllabus/cbse10Canonical";
import {
  getChapterScopePolicy,
  getScopeBullets,
  getScopeGuardLine,
  violatesAssessedScope,
} from "../data/syllabus/scopePolicy";
import { resolveCanonicalTopicKey } from "../data/syllabus/topicAliasMap";
import { resolveTopicDisplayName } from "../utils/topicResolver";

export interface TopicTeachContract {
  canonicalTopicKey: string;
  subject: "Maths" | "Science";
  contractSource: "topic" | "generic";
  goalLine: string;
  keyIdeas: [string, string, string, string];
  checkpointQuestion: string;
  checkpointAnswer: string;
  commonMistake: string;
  scopeGuardLine?: string;
  assessedScopeBullets?: string[];
  enrichmentScopeBullets?: string[];
}

type TeachContractSeed = {
  subject: "Maths" | "Science";
  goalLine: string;
  keyIdeas: [string, string, string, string];
  checkpointQuestion: string;
  checkpointAnswer: string;
  commonMistake: string;
};

const mathsGeneric: TeachContractSeed = {
  subject: "Maths",
  goalLine: "Learn {topic} in CBSE board-writing format.",
  keyIdeas: [
    "state the core definition used in this question.",
    "name the exact theorem/criterion/formula before applying it.",
    "maintain correspondence and write each logical step with reason.",
    "end with Therefore/Hence and the asked result.",
  ],
  checkpointQuestion:
    "Board checkpoint: For {topic}, write Given, To Prove/Find, theorem/formula used, and final Therefore/Hence line.",
  checkpointAnswer:
    "Expected answer: Given: [state data for {topic}]. To Prove/Find: [required result]. Criterion/Theorem/Formula: [exact name]. Therefore/Hence: [final result line].",
  commonMistake:
    "Common mistake: applying a theorem/formula without conditions or correspondence. This can lose marks in CBSE board checking.",
};

const scienceGeneric: TeachContractSeed = {
  subject: "Science",
  goalLine: "Learn {topic} in CBSE board-writing format with concept clarity and application.",
  keyIdeas: [
    "state the concept/definition in one precise line.",
    "name the governing law/principle/process before using it.",
    "link cause and effect with one evidence-based explanation.",
    "conclude with exam-safe wording and units/labels where required.",
  ],
  checkpointQuestion:
    "Board checkpoint: For {topic}, write Given context, concept/law used, one reasoning step, and a final Therefore/Hence conclusion.",
  checkpointAnswer:
    "Expected answer: Given: [context for {topic}]. To Prove/Find: [required explanation/result]. Principle/Law: [exact name]. Therefore/Hence: [final conclusion line].",
  commonMistake:
    "Common mistake: writing statements without naming the correct principle/law or missing labels/units. This can lose marks in CBSE board checking.",
};

const topicSpecificSeeds: Record<string, TeachContractSeed> = {
  triangles: {
    ...mathsGeneric,
    goalLine: "Learn {topic} with similarity logic in CBSE board-writing format.",
    keyIdeas: [
      "define similarity in terms of corresponding angles/sides.",
      "state AA/SAS/SSS or BPT criterion exactly before proof.",
      "maintain vertex correspondence order through all ratios.",
      "close with Therefore/Hence and required proportionality/result.",
    ],
    checkpointQuestion:
      "Board checkpoint: Which similarity criterion is valid in this {topic} question? Use Given, To Prove, criterion, and Therefore/Hence format.",
    checkpointAnswer:
      "Expected answer: Given: [matching angle/side data]. To Prove: [triangles are similar or required relation]. Criterion/Theorem: [AA/SAS/SSS/BPT exact name]. Therefore/Hence: [final similarity/proportionality line].",
    commonMistake:
      "Common mistake: skipping correspondence order or criterion name in similarity proofs. This can lose marks in CBSE board checking.",
  },
  trigonometry: {
    ...mathsGeneric,
    goalLine: "Learn {topic} with ratio selection and identity discipline in CBSE board-writing format.",
    keyIdeas: [
      "define ratio/identity with respect to the chosen angle.",
      "state the exact identity/formula before substitution.",
      "track opposite-adjacent-hypotenuse and sign carefully.",
      "conclude with simplified final value/result and units if needed.",
    ],
    checkpointQuestion:
      "Board checkpoint: For this {topic} item, write Given, To Find, formula used, and Therefore/Hence conclusion.",
    checkpointAnswer:
      "Expected answer: Given: [angle/side data]. To Find: [ratio/value]. Criterion/Theorem/Formula: [trigonometric identity or ratio]. Therefore/Hence: [final simplified value].",
    commonMistake:
      "Common mistake: selecting the wrong ratio or identity for the given angle setup. This can lose marks in CBSE board checking.",
  },
  "maths-applications-trigonometry": {
    ...mathsGeneric,
    goalLine: "Learn {topic} with angle-based application setup in CBSE board-writing format.",
    keyIdeas: [
      "identify the angle of elevation/depression and sketch the relation.",
      "state the exact formula or trigonometric relation before substitution.",
      "map distances/heights to the selected ratio with clear correspondence.",
      "end with the final numerical result and therefore/hence line.",
    ],
    checkpointQuestion:
      "Board checkpoint: For this {topic} item, write Given data, To Find, formula used, and final Therefore/Hence result.",
    checkpointAnswer:
      "Expected answer: Given: [angle and distance data]. To Find: [height/distance result]. Criterion/Theorem/Formula: [chosen trigonometric formula]. Therefore/Hence: [final computed result].",
    commonMistake:
      "Common mistake: choosing the wrong angle or formula in height-distance applications. This can lose marks in CBSE board checking.",
  },
  "coordinate-geometry": {
    ...mathsGeneric,
    goalLine: "Learn {topic} with formula setup and coordinate substitution in CBSE board-writing format.",
    keyIdeas: [
      "state coordinate points and required relation clearly.",
      "name the distance/section formula before substitution.",
      "substitute coordinates carefully with sign discipline.",
      "conclude with final coordinate/distance statement.",
    ],
    checkpointQuestion:
      "Board checkpoint: In this {topic} question, write Given points, To Find, formula used, and Therefore/Hence final value.",
    checkpointAnswer:
      "Expected answer: Given: [coordinates]. To Find: [distance/section]. Criterion/Theorem/Formula: [distance/section formula]. Therefore/Hence: [final computed result].",
    commonMistake:
      "Common mistake: sign errors during coordinate substitution. This can lose marks in CBSE board checking.",
  },
  electricity: {
    ...scienceGeneric,
    goalLine: "Learn {topic} with circuit-law reasoning in CBSE board-writing format.",
    keyIdeas: [
      "define current/voltage/resistance/power in context.",
      "state Ohm's law or circuit rule before calculation.",
      "show substitution with units and valid series/parallel logic.",
      "conclude with interpreted result and unit.",
    ],
    checkpointQuestion:
      "Board checkpoint: For this {topic} circuit case, write Given values, law used, one calculation step, and final Therefore/Hence result.",
    checkpointAnswer:
      "Expected answer: Given: [circuit values]. To Prove/Find: [required electrical quantity]. Principle/Law: [Ohm's law/series-parallel rule]. Therefore/Hence: [final value with unit].",
    commonMistake:
      "Common mistake: mixing series and parallel resistance rules or omitting units. This can lose marks in CBSE board checking.",
  },
  "light-reflection-and-refraction-incl-human-eye-prism": {
    ...scienceGeneric,
    goalLine: "Learn {topic} with ray-rule reasoning in CBSE board-writing format.",
    keyIdeas: [
      "state mirror/lens/ray concept with proper sign convention.",
      "name the governing law/formula before solving.",
      "trace rays/labels correctly and justify image nature.",
      "conclude with final observation/result in exam-safe language.",
    ],
    checkpointQuestion:
      "Board checkpoint: For this {topic} prompt, write Given setup, law/formula used, one reasoned step, and final Therefore/Hence conclusion.",
    checkpointAnswer:
      "Expected answer: Given: [optical setup]. To Prove/Find: [image or value]. Principle/Law: [reflection/refraction/lens formula]. Therefore/Hence: [final image/result statement].",
    commonMistake:
      "Common mistake: wrong sign convention or unlabeled ray diagram reasoning. This can lose marks in CBSE board checking.",
  },
  "life-processes": {
    ...scienceGeneric,
    goalLine: "Learn {topic} with process-sequence clarity in CBSE board-writing format.",
    keyIdeas: [
      "define the biological process and key term first.",
      "name the governing concept/process relation explicitly.",
      "explain the sequence with cause-effect logic, body system context, and labels.",
      "conclude with the asked function/result in crisp exam language.",
    ],
    checkpointQuestion:
      "Board checkpoint: For this {topic} question, write Given context, process principle, one reasoning step, and final Therefore/Hence line.",
    checkpointAnswer:
      "Expected answer: Given: [biological context]. To Prove/Find: [function/outcome]. Principle/Law: [named process concept]. Therefore/Hence: [final biologically correct conclusion].",
    commonMistake:
      "Common mistake: listing facts without process sequence or correct terminology. This can lose marks in CBSE board checking.",
  },
};

function applyTopic(seed: string, topic: string): string {
  return String(seed || "").replace(/\{topic\}/g, topic);
}

function sanitizeScopeLine(canonicalTopicKey: string, value: string, fallback: string): string {
  const line = String(value || "").trim();
  if (!line) return fallback;
  if (violatesAssessedScope(canonicalTopicKey, line)) return fallback;
  return line;
}

function buildGeneratedSeed(
  canonicalTopicKey: string,
  subject: "Maths" | "Science"
): TeachContractSeed {
  const base = subject === "Science" ? scienceGeneric : mathsGeneric;
  const scope = getScopeBullets(canonicalTopicKey, "assessed");
  const scope1 = scope[0] || base.keyIdeas[0];
  const scope2 = scope[1] || base.keyIdeas[1];
  const scope3 = scope[2] || base.keyIdeas[2];
  const guard = getScopeGuardLine(canonicalTopicKey);

  return {
    ...base,
    goalLine: `${base.goalLine} Stay within assessed chapter scope.`,
    keyIdeas: [
      sanitizeScopeLine(canonicalTopicKey, `state this assessed scope anchor: ${scope1}`, base.keyIdeas[0]),
      sanitizeScopeLine(canonicalTopicKey, `name the exact board anchor before solving: ${scope2}`, base.keyIdeas[1]),
      sanitizeScopeLine(canonicalTopicKey, `show one reasoning link from assessed scope: ${scope3}`, base.keyIdeas[2]),
      base.keyIdeas[3],
    ],
    commonMistake: guard
      ? `${base.commonMistake} ${guard}`
      : base.commonMistake,
  };
}

function buildContract(
  canonicalTopicKey: string,
  seed: TeachContractSeed,
  topicLabel: string,
  contractSource: "topic" | "generic"
): TopicTeachContract {
  const policy = getChapterScopePolicy(canonicalTopicKey);
  return {
    canonicalTopicKey,
    subject: seed.subject,
    contractSource,
    goalLine: applyTopic(seed.goalLine, topicLabel),
    keyIdeas: [
      applyTopic(seed.keyIdeas[0], topicLabel),
      applyTopic(seed.keyIdeas[1], topicLabel),
      applyTopic(seed.keyIdeas[2], topicLabel),
      applyTopic(seed.keyIdeas[3], topicLabel),
    ],
    checkpointQuestion: applyTopic(seed.checkpointQuestion, topicLabel),
    checkpointAnswer: applyTopic(seed.checkpointAnswer, topicLabel),
    commonMistake: applyTopic(seed.commonMistake, topicLabel),
    scopeGuardLine: getScopeGuardLine(canonicalTopicKey) || undefined,
    assessedScopeBullets: policy?.assessedScopeBullets || undefined,
    enrichmentScopeBullets: policy?.enrichmentScopeBullets || undefined,
  };
}

export function resolveTopicTeachContract(input: {
  topicKey?: string;
  subject?: string;
  nodeTitle?: string;
}): TopicTeachContract | null {
  const topicRaw = String(input.topicKey || "").trim();
  const canonicalInput = resolveCanonicalTopicKey(topicRaw);
  const subject = String(input.subject || "").toLowerCase().includes("science")
    ? "Science"
    : "Maths";
  const canonicalChapter = getCanonicalChapterBySlug(canonicalInput || topicRaw);
  const canonicalTopicKey =
    canonicalChapter?.canonicalSlug || canonicalInput || resolveCanonicalTopicKey(String(input.nodeTitle || ""));
  const topicLabel =
    String(input.nodeTitle || "").trim() ||
    resolveTopicDisplayName(subject, canonicalTopicKey || topicRaw) ||
    "this concept";

  if (canonicalChapter && canonicalTopicKey) {
    const seed =
      topicSpecificSeeds[canonicalTopicKey] || buildGeneratedSeed(canonicalTopicKey, subject);
    return buildContract(canonicalTopicKey, seed, topicLabel, "topic");
  }

  if (canonicalTopicKey && topicSpecificSeeds[canonicalTopicKey]) {
    return buildContract(canonicalTopicKey, topicSpecificSeeds[canonicalTopicKey], topicLabel, "topic");
  }

  const genericSeed = subject === "Science" ? scienceGeneric : mathsGeneric;
  const fallbackKey = canonicalTopicKey || resolveCanonicalTopicKey(topicLabel) || "generic-topic";
  return buildContract(fallbackKey, genericSeed, topicLabel, "generic");
}

export function getTopicTeachContractCoverage(): {
  totalCanonical: number;
  topicContracts: number;
  genericFallback: number;
  missingCanonical: string[];
} {
  const missingCanonical: string[] = [];
  let topicContracts = 0;
  let genericFallback = 0;

  for (const chapter of canonicalChapters) {
    const subject = chapter.subjectId === "science" ? "Science" : "Maths";
    const contract = resolveTopicTeachContract({
      topicKey: chapter.canonicalSlug,
      subject,
      nodeTitle: chapter.title,
    });
    if (!contract || contract.contractSource !== "topic") {
      missingCanonical.push(chapter.canonicalSlug);
      continue;
    }
    topicContracts += 1;
  }

  genericFallback = Math.max(0, canonicalChapters.length - topicContracts);
  return {
    totalCanonical: canonicalChapters.length,
    topicContracts,
    genericFallback,
    missingCanonical,
  };
}
