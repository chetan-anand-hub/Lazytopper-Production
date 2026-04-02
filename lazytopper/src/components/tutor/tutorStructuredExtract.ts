import type { StructuredSection } from "./TutorMessageRenderer";

type AnyObj = Record<string, unknown>;

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function safeStrArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => safeStr(x)).filter(Boolean);
}

function isObj(v: unknown): v is AnyObj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function resolveStructured(payload: AnyObj): AnyObj {
  if (isObj(payload.structured)) return payload.structured as AnyObj;
  if (isObj(payload.data)) {
    const data = payload.data as AnyObj;
    if (isObj(data.structured)) return data.structured as AnyObj;
    return data;
  }
  return payload;
}

export function extractStructuredSection(payload: AnyObj | null | undefined): StructuredSection | null {
  if (!payload) return null;

  const structured = resolveStructured(payload);
  const teach = isObj(structured.teach) ? structured.teach : structured;

  const goalLine =
    safeStr(teach.goalLine) ||
    safeStr(structured.goalLine) ||
    safeStr(payload.goalLine);

  const keyIdeas =
    safeStrArray(teach.keyIdeas).length
      ? safeStrArray(teach.keyIdeas)
      : safeStrArray(structured.keyIdeas).length
        ? safeStrArray(structured.keyIdeas)
        : safeStrArray(teach.simpleExplanation);

  const examLines =
    safeStrArray(teach.cbseExamSentence).length
      ? safeStrArray(teach.cbseExamSentence)
      : typeof teach.cbseExamSentence === "string" && teach.cbseExamSentence
        ? [safeStr(teach.cbseExamSentence)]
        : safeStrArray(structured.cbseExamSentence).length
          ? safeStrArray(structured.cbseExamSentence)
          : typeof structured.cbseExamSentence === "string"
            ? [safeStr(structured.cbseExamSentence)]
            : [];

  const rawExamples = Array.isArray(structured.workedExamples)
    ? structured.workedExamples
    : Array.isArray(teach.workedExamples)
      ? teach.workedExamples
      : [];

  const workedExamples = rawExamples
    .filter(isObj)
    .map((ex) => ({
      question: safeStr(ex.question),
      steps: Array.isArray(ex.steps)
        ? ex.steps.filter(isObj).map((s) => ({
            text: safeStr(s.text),
            marks: typeof s.marks === "number" ? s.marks : undefined,
          }))
        : [],
      totalMarks: typeof ex.totalMarks === "number" ? ex.totalMarks : undefined,
      finalAnswer: safeStr(ex.finalAnswer),
    }));

  const checkpointQuestion =
    safeStr(structured.checkpointQuestion) ||
    safeStr(teach.checkpointQuestion);

  const checkpointAnswer =
    safeStr(structured.checkpointAnswer) ||
    safeStr(teach.checkpointAnswer);

  const commonMistake =
    safeStr(structured.commonMistake) ||
    safeStr(teach.commonMistake) ||
    safeStr(structured.commonError);

  const commonFix =
    safeStr(structured.commonFix) ||
    safeStr(teach.commonFix);

  const hasContent = goalLine || keyIdeas.length || workedExamples.length ||
    checkpointQuestion || commonMistake || examLines.length;

  if (!hasContent) return null;

  return {
    goal: goalLine ? { goalLine, keyIdeas: keyIdeas.length ? keyIdeas : undefined } : undefined,
    examLines: examLines.length ? examLines : undefined,
    workedExamples: workedExamples.length ? workedExamples : undefined,
    checkpoint: checkpointQuestion ? { question: checkpointQuestion, answer: checkpointAnswer || undefined } : undefined,
    commonMistake: commonMistake || undefined,
    commonFix: commonFix || undefined,
  };
}

export function extractStepsBlock(text: string): { cleanText: string; stepsData: AnyObj | null } {
  const regex = /```steps\s*\n([\s\S]*?)\n```/;
  const match = text.match(regex);
  if (!match) return { cleanText: text, stepsData: null };
  try {
    const parsed = JSON.parse(match[1].trim());
    if (isObj(parsed) && Array.isArray(parsed.steps)) {
      const cleanText = text.replace(regex, "").trim();
      return { cleanText, stepsData: parsed };
    }
  } catch { /* invalid JSON */ }
  return { cleanText: text, stepsData: null };
}

export function stepsDataToStructured(stepsData: AnyObj): import("./TutorMessageRenderer").StructuredSection {
  const steps = Array.isArray(stepsData.steps)
    ? (stepsData.steps as AnyObj[]).filter(isObj).map((s) => ({
        text: safeStr(s.text),
        marks: typeof s.marks === "number" ? s.marks : undefined,
      }))
    : [];
  const example: import("./TutorMessageRenderer").StructuredExample = {
    question: safeStr(stepsData.question),
    steps,
    totalMarks: typeof stepsData.totalMarks === "number" ? stepsData.totalMarks : undefined,
    finalAnswer: safeStr(stepsData.finalAnswer),
  };
  return {
    workedExamples: [example],
    commonMistake: safeStr(stepsData.commonMistake) || undefined,
  };
}

export function extractTutorText(payload: AnyObj | null | undefined): string {
  if (!payload) return "";

  if (typeof payload.responseText === "string" && payload.responseText.trim())
    return payload.responseText.trim();

  const data = (payload.data as AnyObj) ?? payload;
  const structured = (data.structured as AnyObj) ?? data;

  if (typeof data.responseText === "string" && data.responseText.trim())
    return data.responseText.trim();
  if (typeof data.feedback === "string" && data.feedback.trim())
    return data.feedback.trim();
  if (typeof structured.feedback === "string" && structured.feedback.trim())
    return structured.feedback.trim();

  const teach = isObj(structured.teach) ? structured.teach : isObj(data.teach) ? data.teach : null;
  if (teach) {
    const parts: string[] = [];
    if (typeof teach.goalLine === "string") parts.push(teach.goalLine);
    if (Array.isArray(teach.simpleExplanation))
      parts.push(...safeStrArray(teach.simpleExplanation));
    if (Array.isArray(teach.keyIdeas))
      parts.push(...safeStrArray(teach.keyIdeas));
    if (typeof teach.cbseExamSentence === "string") parts.push(teach.cbseExamSentence);
    if (Array.isArray(teach.cbseExamSentence))
      parts.push(...safeStrArray(teach.cbseExamSentence));
    if (parts.length > 0) return parts.filter(Boolean).join("\n\n");
  }

  if (structured.goalLine || structured.keyIdeas) {
    const parts: string[] = [];
    if (typeof structured.goalLine === "string") parts.push(structured.goalLine);
    if (Array.isArray(structured.keyIdeas)) parts.push(...safeStrArray(structured.keyIdeas));
    if (typeof structured.checkpointQuestion === "string") parts.push("\n" + structured.checkpointQuestion);
    if (parts.length > 0) return parts.filter(Boolean).join("\n\n");
  }

  if (isObj(structured.tutor)) {
    const tutor = structured.tutor;
    const parts: string[] = [];
    if (isObj(tutor.diagnosis)) {
      const diag = tutor.diagnosis;
      if (diag.analysis) parts.push(String(diag.analysis));
      if (diag.verdict) parts.push(String(diag.verdict));
    }
    if (typeof tutor.explanation === "string") parts.push(tutor.explanation);
    if (typeof tutor.text === "string") parts.push(tutor.text);
    if (parts.length > 0) return parts.filter(Boolean).join("\n\n");
  }

  if (typeof structured.commonMistake === "string" && structured.commonMistake.trim())
    return "Watch out: " + structured.commonMistake.trim();
  if (typeof structured.checkpointAnswer === "string" && structured.checkpointAnswer.trim())
    return structured.checkpointAnswer.trim();

  if (typeof data.text === "string" && data.text.trim()) {
    try {
      const parsed = JSON.parse(data.text) as AnyObj;
      const subParts: string[] = [];
      if (parsed.goalLine) subParts.push(String(parsed.goalLine));
      if (Array.isArray(parsed.keyIdeas)) subParts.push(...safeStrArray(parsed.keyIdeas));
      if (parsed.checkpointQuestion) subParts.push(String(parsed.checkpointQuestion));
      if (subParts.length > 0) return subParts.filter(Boolean).join("\n\n");
    } catch { /* not JSON */ }
    return data.text.trim();
  }

  if (typeof payload.message === "string" && payload.message.trim())
    return payload.message.trim();

  return "";
}
