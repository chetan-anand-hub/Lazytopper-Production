import { buildDiagramBlockFromLegacy } from "../diagrams/diagramInterop";
import type { LazytopperDiagramBlock } from "../diagrams/diagramIntelligence";
import { isRecord } from "../types/mentor";
import type { MentorStructured, TutorBlock } from "../types/mentor";

const isInternalTutorScaffoldText = (value: string) =>
  /Teacher goal:|Definition:|Criterion:|Correspondence:|Conclusion:|Client continuity mode active/i.test(
    String(value || "")
  );

export function stripMentorCodeFences(raw: string): string {
  return String(raw || "")
    .replace(/```[a-zA-Z0-9_-]*\n?/g, "")
    .replace(/```/g, "")
    .trim();
}

export function extractMentorJsonObjects(raw: string): string[] {
  const text = stripMentorCodeFences(raw ?? "");
  const out: string[] = [];
  const len = text.length;

  for (let i = 0; i < len; i += 1) {
    if (text[i] !== "{") continue;
    const startIdx = i;
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (; i < len; i += 1) {
      const ch = text[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        if (inString) escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === "{") depth += 1;
      if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          out.push(text.slice(startIdx, i + 1));
          break;
        }
      }
    }
  }

  return out;
}

function repairMentorJson(raw: string): string {
  let text = String(raw || "").trim();
  text = text.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
  text = text.replace(/,\s*([}\]])/g, "$1");
  text = text.replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":');
  text = text.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_m, inner) => {
    const safeInner = String(inner).replace(/"/g, '\\"');
    return `"${safeInner}"`;
  });
  return text;
}

function safeMentorJsonParse(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    try {
      return JSON.parse(repairMentorJson(raw));
    } catch {
      return null;
    }
  }
}

export function parseMentorStructuredText(raw: string): MentorStructured | null {
  const stripped = stripMentorCodeFences(raw ?? "");
  const direct = safeMentorJsonParse(stripped);
  if (isRecord(direct) && (typeof direct.kind === "string" || direct.tutor)) {
    return direct as MentorStructured;
  }

  const candidates = extractMentorJsonObjects(stripped);
  for (const candidate of candidates) {
    const parsed = safeMentorJsonParse(candidate);
    if (isRecord(parsed) && (typeof parsed.kind === "string" || parsed.tutor)) {
      return parsed as MentorStructured;
    }
  }

  return null;
}

export function getMentorTutorObject(structured: MentorStructured | undefined | null): TutorBlock | null {
  const tutor = structured?.tutor;
  return tutor && typeof tutor === "object" && !Array.isArray(tutor)
    ? (tutor as TutorBlock)
    : null;
}

export function getMentorTutorText(structured: MentorStructured | undefined | null): string {
  const tutor = structured?.tutor;
  if (typeof tutor === "string") {
    return isInternalTutorScaffoldText(tutor) ? "" : tutor;
  }
  if (isRecord(tutor)) {
    const text = typeof tutor.text === "string" ? tutor.text : "";
    const rawText = typeof tutor.rawText === "string" ? tutor.rawText : "";
    const preferred = text || rawText || "";
    return isInternalTutorScaffoldText(preferred) ? "" : preferred;
  }
  return "";
}

export function extractMentorDiagramBlock(
  structured: MentorStructured | undefined | null,
  fallbackTitle = "Mentor diagram"
): LazytopperDiagramBlock | null {
  if (!isRecord(structured)) return null;

  const directBlock = structured.diagramBlock;
  if (isRecord(directBlock) && typeof directBlock.diagramType === "string" && directBlock.spec) {
    return directBlock as unknown as LazytopperDiagramBlock;
  }

  const tutor = getMentorTutorObject(structured);
  const tutorDiagramBlock = tutor && isRecord(tutor.diagramBlock) ? tutor.diagramBlock : null;
  if (
    isRecord(tutorDiagramBlock) &&
    typeof tutorDiagramBlock.diagramType === "string" &&
    tutorDiagramBlock.spec
  ) {
    return tutorDiagramBlock as unknown as LazytopperDiagramBlock;
  }

  return buildDiagramBlockFromLegacy({
    diagramType:
      (typeof structured.diagramType === "string" ? structured.diagramType : "") ||
      (tutor && typeof tutor.diagramType === "string" ? tutor.diagramType : ""),
    diagramLabels:
      (structured.diagramLabels as Record<string, string> | string[] | null) ||
      (tutor?.diagramLabels as Record<string, string> | string[] | null) ||
      null,
    diagramSpec:
      structured.diagram ||
      structured.diagramSpec ||
      tutor?.diagram ||
      tutor?.diagramSpec,
    title: fallbackTitle,
    accessibilityLabel: fallbackTitle,
    diagramIntent: "mentor_support",
  });
}
