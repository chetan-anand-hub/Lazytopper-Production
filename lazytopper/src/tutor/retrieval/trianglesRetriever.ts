import fs from "fs";
import path from "path";

type Chunk = { id: string; title: string; excerpt: string; path: string; score: number };

type RetrieverInput = {
  attemptText: string;
  mistakeTags: string[];
  theoremFocus?: string | string[];
};

const KNOWLEDGE_DIR = path.join(process.cwd(), "docs", "knowledge", "triangles");
const FILES = [
  "ncert_key_points.md",
  "common_theorems.md",
  "solved_examples.md",
  "common_mistakes.md",
];

function tokenize(text: string) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function splitByHeadings(content: string) {
  const lines = content.split(/\r?\n/);
  const chunks: { title: string; body: string[] }[] = [];
  let current = { title: "Intro", body: [] as string[] };
  for (const line of lines) {
    const heading = line.match(/^##\s+(.*)/);
    if (heading) {
      if (current.body.length) chunks.push(current);
      current = { title: heading[1].trim(), body: [] };
    } else {
      current.body.push(line);
    }
  }
  if (current.body.length) chunks.push(current);
  return chunks;
}

function scoreChunk(tokens: string[], chunkTokens: string[], tags: string[], theoremFocus?: string | string[]) {
  const tokenSet = new Set(tokens);
  let score = 0;
  for (const t of chunkTokens) {
    if (tokenSet.has(t)) score += 1;
  }
  for (const tag of tags) {
    if (chunkTokens.includes(tag.toLowerCase())) score += 2;
  }
  const theoremFocusTokens = Array.isArray(theoremFocus)
    ? theoremFocus.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean)
    : [String(theoremFocus || "").trim().toLowerCase()].filter(Boolean);
  for (const focus of theoremFocusTokens) {
    if (chunkTokens.includes(focus)) score += 3;
  }
  return score;
}

export function retrieveTrianglesSources(input: RetrieverInput): Chunk[] {
  const attemptTokens = tokenize(input.attemptText);
  const tags = (input.mistakeTags || []).map((t) => String(t || "").toLowerCase());
  const results: Chunk[] = [];

  for (const file of FILES) {
    const full = path.join(KNOWLEDGE_DIR, file);
    if (!fs.existsSync(full)) continue;
    const content = fs.readFileSync(full, "utf8");
    const chunks = splitByHeadings(content);
    chunks.forEach((chunk, idx) => {
      const excerpt = chunk.body.join("\n").trim();
      if (!excerpt) return;
      const chunkTokens = tokenize(excerpt + " " + chunk.title);
      const score = scoreChunk(attemptTokens, chunkTokens, tags, input.theoremFocus);
      results.push({
        id: `${path.basename(file, ".md")}-${idx + 1}`,
        title: chunk.title,
        excerpt: excerpt.split(/\r?\n/).slice(0, 6).join(" "),
        path: `docs/knowledge/triangles/${file}`,
        score,
      });
    });
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
