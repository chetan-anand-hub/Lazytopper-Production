import { defaultQuickActions, quickActionKeywords } from "./commandPaletteConfig";

export interface CommandIntent {
  recognized: boolean;
  handler: string;
  query: string;
  topic?: string;
}

function normalize(input: string): string {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parseTopic(raw: string, trigger: string): string {
  const idx = raw.indexOf(trigger);
  if (idx < 0) return "";
  return raw.slice(idx + trigger.length).trim();
}

export function parseCommandIntent(query: string): CommandIntent {
  const norm = normalize(query);
  if (!norm) return { recognized: false, handler: "", query: norm };

  if (norm.startsWith("practice ")) {
    return {
      recognized: true,
      handler: "navigateToPractice",
      query: norm,
      topic: parseTopic(norm, "practice "),
    };
  }
  if (norm.startsWith("open topichub ") || norm.startsWith("open topic hub ")) {
    const trigger = norm.startsWith("open topichub ") ? "open topichub " : "open topic hub ";
    return {
      recognized: true,
      handler: "navigateToTopicHub",
      query: norm,
      topic: parseTopic(norm, trigger),
    };
  }
  if (norm.startsWith("start mock")) {
    return { recognized: true, handler: "navigateToMockTest", query: norm };
  }
  if (norm === "my stats" || norm === "stats") {
    return { recognized: true, handler: "navigateToStats", query: norm };
  }
  // SEVER PR: "daily mix" → navigateToDailyMix and "weekly wrapped/recap" →
  // navigateToWeeklyWrap intents removed — both routes are retired.
  if (norm.includes("mentor")) {
    return { recognized: true, handler: "navigateToMentor", query: norm };
  }
  if (norm.includes("vibe low") || norm.includes("energy low")) {
    return { recognized: true, handler: "setVibeLow", query: norm };
  }
  if (norm.includes("vibe high") || norm.includes("energy high")) {
    return { recognized: true, handler: "setVibeHigh", query: norm };
  }

  for (const action of defaultQuickActions) {
    const keys = quickActionKeywords[action.id] || [];
    if (keys.some((k) => norm.includes(normalize(k)))) {
      return { recognized: true, handler: action.handler, query: norm };
    }
  }

  return { recognized: false, handler: "", query: norm };
}
