// CC27-SITE-1 - Crash Course 2027: names, chip text, file labels. PURE (no React, no services, no price).
//
// A FREE BONUS inside paid products, never sold alone. The server decides who may download what (server/services/cc27Bonus.cjs);
// this file only names things. No price appears here: a price is read from the pack constants where a page shows one.

export const CC27_NAME = "Crash Course 2027";
export const CC27_FULL_NAME = "Class 10 Crash Course 2027 — PYQs & Important Questions";
export const CC27_PATH = "/class-10-crash-course-2027";
export const CC27_SAMPLE_START_HERE = "/crash-course/cc27-start-here.pdf";
export const CC27_SAMPLE_CHAPTER = "/crash-course/cc27-maths-triangles-sample.pdf";
export const CC27_COVER = { maths: "/packs/cc27-cover-maths.webp", science: "/packs/cc27-cover-science.webp" } as const;
export const CC27_CREDIT = "Made by an IITian · IIT Kanpur";

/** Client kill switch: VITE_CC27_DISABLED=1 hides every chip, block and row (the server has CC27_BONUS_DISABLED). */
export function isCc27ClientEnabled(): boolean {
  return import.meta.env.VITE_CC27_DISABLED !== "1";
}

/** Which product a chip / block sits on. */
export type Cc27Product = "pass" | "ts" | "cbq" | "bank" | "bundle" | "subject" | "chapter";

/** The one-line chip scope, per product. */
export const CC27_CHIP_SCOPE: Readonly<Record<Cc27Product, string>> = {
  pass: "Maths & Science",
  ts: "Maths & Science",
  bundle: "Maths & Science",
  cbq: "for your subject",
  subject: "for your subject",
  chapter: "chapter sheet",
  bank: "in Bundle, Subject & Chapter Packs",
};

/** What is inside (the detail block). */
export const CC27_INSIDE: readonly string[] = [
  "A 1-page revision sheet for every chapter",
  "NCERT diagrams, ready to practise",
  "The most-asked board questions, with marking schemes",
  "A 75-day plan to the boards",
];

/** "Included free with ..." per product. */
export const CC27_INCLUDED: Readonly<Record<Cc27Product, string>> = {
  pass: "Included free with the Board Pass: the Maths and Science books and every chapter sheet.",
  ts: "Included free with the Test Series Pack: the Maths and Science books and every chapter sheet.",
  bundle: "Included free with the Maths + Science Bundle: both books and every chapter sheet.",
  subject: "Included free with a Subject Pack: that subject's book and its chapter sheets.",
  cbq: "Included free with a CBQ Pack: the book for your subject.",
  chapter: "Included free with a Chapter Pack: that chapter's sheet(s).",
  bank: "Included free with the Bundle, a Subject Pack or a Chapter Pack.",
};

const FILE_KEY = /^(book:(maths|science)|ch:(maths|science)-[a-z-]+)$/;
export function isCc27FileKey(v: unknown): v is string {
  return typeof v === "string" && FILE_KEY.test(v);
}

export function cc27Subject(key: string): "maths" | "science" {
  return key.includes("science") ? "science" : "maths";
}

/** A readable row label for a file key: "Maths book (PDF)" / "Triangles (PDF)". */
export function cc27FileLabel(key: string): string {
  if (key.startsWith("book:")) return `${cc27Subject(key) === "maths" ? "Maths" : "Science"} book (PDF)`;
  const name = key.replace(/^ch:(maths|science)-/, "").replace(/-/g, " ");
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} (PDF)`;
}

/** Split the server's keys into books and chapter sheets, each group by subject, stable order. */
export function groupCc27(keys: readonly string[]): { books: string[]; maths: string[]; science: string[] } {
  const ok = keys.filter(isCc27FileKey);
  return {
    books: ok.filter((k) => k.startsWith("book:")),
    maths: ok.filter((k) => k.startsWith("ch:maths-")),
    science: ok.filter((k) => k.startsWith("ch:science-")),
  };
}
