import type { DesktopStream, DesktopSubject } from "./navigation";

export type DesktopTrendTier = "high" | "medium" | "low";

export interface DesktopTopicSummary {
  slug: string;
  name: string;
  subject: DesktopSubject;
  stream: DesktopStream;
  trendTier: DesktopTrendTier;
  weight: number;
  marks: string;
  blurb: string;
}

const TOPICS: DesktopTopicSummary[] = [
  {
    slug: "quadratic-equations",
    name: "Quadratic Equations",
    subject: "Maths",
    stream: "All",
    trendTier: "high",
    weight: 14,
    marks: "12-14 marks",
    blurb: "Repeated board favourite covering factorisation, formula, discriminant and word problems.",
  },
  {
    slug: "trigonometry-heights-distances",
    name: "Trigonometry & Heights",
    subject: "Maths",
    stream: "All",
    trendTier: "high",
    weight: 12,
    marks: "10-12 marks",
    blurb: "High-frequency identity, ratio and application questions with strong scoring potential.",
  },
  {
    slug: "probability",
    name: "Probability",
    subject: "Maths",
    stream: "All",
    trendTier: "medium",
    weight: 6,
    marks: "5-6 marks",
    blurb: "Short, reliable scoring topic with direct board-style questions.",
  },
  {
    slug: "statistics",
    name: "Statistics",
    subject: "Maths",
    stream: "All",
    trendTier: "medium",
    weight: 6,
    marks: "5-6 marks",
    blurb: "Formula-heavy topic where clean tabulation and substitution matter.",
  },
  {
    slug: "light-reflection-refraction",
    name: "Light – Reflection & Refraction",
    subject: "Science",
    stream: "Physics",
    trendTier: "high",
    weight: 10,
    marks: "8-10 marks",
    blurb: "Ray diagrams, lens formula and image formation remain major board patterns.",
  },
  {
    slug: "electricity",
    name: "Electricity",
    subject: "Science",
    stream: "Physics",
    trendTier: "high",
    weight: 10,
    marks: "10 marks",
    blurb: "Numericals and circuit reasoning make this a high-return Physics topic.",
  },
  {
    slug: "acids-bases-salts",
    name: "Acids, Bases & Salts",
    subject: "Science",
    stream: "Chemistry",
    trendTier: "medium",
    weight: 8,
    marks: "6-8 marks",
    blurb: "Reaction-based and concept explanation questions appear regularly.",
  },
  {
    slug: "heredity",
    name: "Heredity",
    subject: "Science",
    stream: "Biology",
    trendTier: "medium",
    weight: 5,
    marks: "4-5 marks",
    blurb: "Mendel, traits and inheritance diagrams offer concise scoring opportunities.",
  },
];

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const desktopTopicBySlug = (slug: string): DesktopTopicSummary | undefined => {
  const key = normalize(slug);
  return TOPICS.find((topic) => topic.slug === key || normalize(topic.name) === key);
};

export const desktopTopicsBySubject = (subject: DesktopSubject, stream: DesktopStream = "All"): DesktopTopicSummary[] => {
  return TOPICS.filter((topic) => {
    if (topic.subject !== subject) return false;
    if (subject !== "Science" || stream === "All") return true;
    return topic.stream === stream;
  });
};

export const displayDesktopTopicNames = (slugs: string[]): string[] => {
  return slugs.map((slug) => desktopTopicBySlug(slug)?.name ?? slug);
};

export const desktopTopicSlugFromName = (name: string): string => desktopTopicBySlug(name)?.slug ?? normalize(name);
