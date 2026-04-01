function stringifyValue(value: any) {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value);
}

export function buildTrianglesGrindContractPrompt(payload: any) {
  const nodeId = stringifyValue(payload?.mindmapNodeId) || "UNKNOWN";
  const nodeTitle = stringifyValue(payload?.mindmapNodeTitle) || "UNKNOWN";
  const nodeText = stringifyValue(payload?.mindmapNodeText);
  const doubtContext = stringifyValue(payload?.doubtContext);
  const grade = stringifyValue(payload?.grade) || "unknown";
  const subject = stringifyValue(payload?.subject) || "Maths";
  const topic = stringifyValue(payload?.topicKey) || "triangles";
  const contextLines = [
    nodeText ? `Node details: ${nodeText}` : "",
    doubtContext ? `Doubt context: ${doubtContext}` : "",
  ].filter(Boolean);

  const instructions = [
    "You are a meticulous CBSE Triangles grind writer. Return EXACTLY one JSON object that follows the schema described below.",
    `Use the context for Class ${grade} ${subject}, topic ${topic}, grind node ${nodeTitle} (ID ${nodeId}).`,
    "Do not add markdown, bullet characters, or code fences; respond with plain JSON using double quotes only.",
    "Ensure every field exists; if you lack information, return empty arrays or placeholder strings like \"Unknown\" instead of null or missing keys.",
    "",
    "Schema:",
    '{',
    '  "type": "grind_triangles_v1",',
    '  "node": { "id": string, "title": string },',
    '  "board": { "given": string[], "toProve": string[], "figureHints": string[], "steps": string[] },',
    '  "rubric": { "marks": number, "checkpoints": string[] },',
    '  "commonTraps": [{ "trap": string, "fix": string }],',
    '  "microDrills": [{ "prompt": string, "answerKey": string }],',
    '  "next": { "recommendedNodeId": string, "reason": string }',
    '}',
    "Make board arrays describe concise board-handwriting prompts: given facts, what to prove, figure hints, and logical steps.",
    "Rubric marks should be a number describing typical marks for this node and checkpoints should be short exam-ready expectations.",
    "Common traps should list pitfalls and a fix per entry. Micro drills should be small practice prompts with simple answer keys.",
    "Next should name a follow-up node and why it helps tie the grind together.",
  ];

  const contextSection = contextLines.length ? ["", ...contextLines] : [];
  return [...instructions, ...contextSection].join("\n");
}
