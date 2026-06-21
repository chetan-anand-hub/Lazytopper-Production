// src/components/worksheet/worksheetPdf.ts
//
// PR-E2a — the TWO downloadable worksheet PDFs, built to the locked design
// (docs/design/worksheet_PDF_design_mockup_v1_2026-06-20.html + spec §11/§11.1):
//
//   1. downloadQuestionsPdf  — questions ONLY. Numbered Q1…QN, grouped by Section
//      A–E with per-section mark labels, generous answer space (dotted rules), the
//      printed instruction "Label each answer with its question number". VERY faint
//      diagonal "LazyTopper" watermark (~5%) — the student writes on this sheet.
//   2. downloadAnswerKeyPdf  — answer key + step-by-step solutions, a SEPARATE
//      file with an "ANSWER KEY & SOLUTIONS" badge so the student attempts before
//      revealing. Per-step CBSE mark annotations. Slightly stronger watermark (~10%).
//
// Shared identity (matched set): LazyTopper masthead (logo + name + CBSE line +
// subject + date, 2px green underline) and a small page-N-of-M footer. Built to
// stay LEGIBLE IN BLACK-AND-WHITE — the green is a dark-enough shade to read as a
// mid-grey when printed mono, and meaning never depends on colour.
//
// Anti-fabrication: solutions render the question bank's real solutionSteps /
// finalAnswer only. The "where students lose marks" pitfall line from the mockup
// is OMITTED here because no real per-question pitfall data exists in the bank yet
// — honest omission beats a fabricated pitfall (spec §11.1 guardrail). It can be
// added when genuine per-question examiner-mistake data lands.
//
// Implementation reuses the existing jsPDF approach (no new dependency). jsPDF's
// standard helvetica is Latin-1 only, so non-Latin maths symbols are mapped to
// readable ASCII (√→sqrt, θ→theta, …) rather than dropped to "?".

import type { PersistedWorksheet, PersistedWorksheetQuestion } from "../../services/worksheetSessionStore";

// ── B&W-legible palette (RGB) ────────────────────────────────────────────────
const GREEN: [number, number, number] = [44, 150, 100]; // hsl(152,55%,38%) — reads as mid-grey mono
const GREEN_DARK: [number, number, number] = [30, 103, 69]; // hsl(152,55%,26%)
const INK: [number, number, number] = [26, 26, 26];
const MUTED: [number, number, number] = [85, 85, 85];
const LINE: [number, number, number] = [216, 216, 216];
const AMBER_FILL: [number, number, number] = [253, 246, 232];

const PAGE_W = 210;
const PAGE_H = 297;
const M_L = 16;
const M_R = 16;
const M_T = 16;
const M_B = 16;
const CONTENT_W = PAGE_W - M_L - M_R;

const SECTION_LABEL: Record<string, string> = {
  A: "Section A · MCQ / Assertion-Reason",
  B: "Section B · Short Answer I",
  C: "Section C · Short Answer II",
  D: "Section D · Long Answer",
  E: "Section E · Case-based",
};
const SECTION_MARK_HINT: Record<string, string> = {
  A: "1 mark each",
  B: "2 marks each",
  C: "3 marks each",
  D: "5 marks each",
  E: "4 marks each",
};
const SECTION_ORDER = ["A", "B", "C", "D", "E"];

// Map common maths unicode to readable ASCII (helvetica is Latin-1 only).
function sanitize(s: unknown): string {
  let t = String(s ?? "");
  const map: Array<[RegExp, string]> = [
    [/[‘’]/g, "'"],
    [/[“”]/g, '"'],
    [/—/g, "--"],
    [/–/g, "-"],
    [/…/g, "..."],
    [/√/g, "sqrt"],
    [/θ/g, "theta"],
    [/π/g, "pi"],
    [/Δ/g, "delta"],
    [/∆/g, "delta"],
    [/≤/g, "<="],
    [/≥/g, ">="],
    [/≠/g, "!="],
    [/∴/g, "therefore"],
    [/→/g, "->"],
    [/°/g, " deg"],
  ];
  for (const [re, rep] of map) t = t.replace(re, rep);
  // Keep Latin-1 (covers · × ÷ ² ³ ± µ etc.); replace anything else with "?".
  return t.replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ]/g, "?").trim();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

type Doc = import("jspdf").jsPDF;

function setFill(doc: Doc, c: [number, number, number]): void {
  doc.setFillColor(c[0], c[1], c[2]);
}
function setText(doc: Doc, c: [number, number, number]): void {
  doc.setTextColor(c[0], c[1], c[2]);
}
function setDraw(doc: Doc, c: [number, number, number]): void {
  doc.setDrawColor(c[0], c[1], c[2]);
}

// Faint, tiled diagonal "LazyTopper" watermark behind the content.
function drawWatermark(doc: Doc, opacity: number): void {
  doc.saveGraphicsState();
  doc.setGState(doc.GState({ opacity }));
  setText(doc, GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  for (let y = 40; y < PAGE_H; y += 60) {
    for (let x = -10; x < PAGE_W; x += 80) {
      doc.text("LazyTopper", x, y, { angle: 30 });
    }
  }
  doc.restoreGraphicsState();
}

function drawMasthead(doc: Doc, ws: PersistedWorksheet, y: number): number {
  // Logo square
  setFill(doc, GREEN);
  doc.roundedRect(M_L, y, 9, 9, 1.6, 1.6, "F");
  setText(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("LT", M_L + 4.5, y + 6.2, { align: "center" });

  // Name + tagline
  setText(doc, INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("LazyTopper", M_L + 13, y + 4.2);
  setText(doc, MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("CBSE Class 10 · Board-exam practice", M_L + 13, y + 8.4);

  // Right side — subject + generated date
  setText(doc, GREEN_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(ws.subject, PAGE_W - M_R, y + 4, { align: "right" });
  setText(doc, MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Generated ${formatDate(ws.createdAt)}`, PAGE_W - M_R, y + 8, { align: "right" });

  // 2px green underline
  const uy = y + 12;
  setDraw(doc, GREEN);
  doc.setLineWidth(0.7);
  doc.line(M_L, uy, PAGE_W - M_R, uy);
  return uy + 6;
}

function drawFooters(doc: Doc): void {
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p += 1) {
    doc.setPage(p);
    setDraw(doc, LINE);
    doc.setLineWidth(0.2);
    doc.line(M_L, PAGE_H - 11, PAGE_W - M_R, PAGE_H - 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setText(doc, MUTED);
    doc.text(`Page ${p} of ${pageCount}`, M_L, PAGE_H - 7);
    doc.text("LazyTopper · lazytopper.com · © LazyTopper", PAGE_W - M_R, PAGE_H - 7, {
      align: "right",
    });
  }
}

function slugify(s: string): string {
  return sanitize(s).replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase().replace(/(^-|-$)/g, "").slice(0, 40);
}

function groupBySection(questions: PersistedWorksheetQuestion[]): Array<[string, PersistedWorksheetQuestion[]]> {
  const groups = new Map<string, PersistedWorksheetQuestion[]>();
  for (const q of questions) {
    const sec = String(q.section || "").toUpperCase();
    const key = SECTION_ORDER.includes(sec) ? sec : "?";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(q);
  }
  // Stable section order A→E, then any "?" bucket last.
  const ordered: Array<[string, PersistedWorksheetQuestion[]]> = [];
  for (const sec of SECTION_ORDER) if (groups.has(sec)) ordered.push([sec, groups.get(sec)!]);
  if (groups.has("?")) ordered.push(["?", groups.get("?")!]);
  return ordered;
}

// ── Document 1 — Worksheet (questions only) ──────────────────────────────────
export async function downloadQuestionsPdf(ws: PersistedWorksheet): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  let y = M_T;
  drawWatermark(doc, 0.05);
  y = drawMasthead(doc, ws, y);

  const newPage = () => {
    doc.addPage();
    drawWatermark(doc, 0.05);
    y = M_T;
  };
  const ensure = (needed: number) => {
    if (y + needed > PAGE_H - M_B - 6) newPage();
  };

  // Title block
  setText(doc, INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(sanitize(ws.title), M_L, y + 2);
  y += 7;
  setText(doc, MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `${ws.questions.length} questions · ${ws.totalMarks} marks · ${ws.sectionFilter}`,
    M_L,
    y,
  );
  y += 6;

  // Instruction box
  setFill(doc, [250, 250, 250]);
  setDraw(doc, LINE);
  doc.setLineWidth(0.25);
  doc.roundedRect(M_L, y, CONTENT_W, 13, 1.5, 1.5, "FD");
  setText(doc, MUTED);
  doc.setFontSize(7.8);
  doc.text(
    "Instructions: Solve on this sheet or separate paper. Label each answer with its question number (Q1, Q2 ...). When done, upload one PDF of all your answers on LazyTopper to get it graded with full solutions.",
    M_L + 3,
    y + 4.5,
    { maxWidth: CONTENT_W - 6 },
  );
  y += 18;

  const groups = groupBySection(ws.questions);
  for (const [sec, qs] of groups) {
    ensure(14);
    // Section header
    setText(doc, GREEN_DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(sec === "?" ? "Other questions" : SECTION_LABEL[sec], M_L, y);
    if (sec !== "?") {
      setText(doc, MUTED);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(SECTION_MARK_HINT[sec], PAGE_W - M_R, y, { align: "right" });
    }
    y += 2.5;
    setDraw(doc, LINE);
    doc.setLineWidth(0.25);
    doc.line(M_L, y, PAGE_W - M_R, y);
    y += 5;

    for (const q of qs) {
      const marks = Number(q.marks) || 1;
      const qHead = `Q${q.qNumber}.`;
      const qLines = doc.splitTextToSize(sanitize(q.questionText), CONTENT_W - 14);
      const lineH = 4.6;
      const hasOptions = Array.isArray(q.options) && q.options.length > 0;
      const answerSpace = hasOptions ? 0 : Math.min(34, Math.max(10, marks * 6));
      ensure(qLines.length * lineH + answerSpace + 8);

      setText(doc, INK);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(qHead, M_L, y);
      // marks (right)
      setText(doc, MUTED);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const marksStr = `[${marks}]`;
      doc.text(marksStr, PAGE_W - M_R, y, { align: "right" });

      setText(doc, INK);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text(qLines, M_L + 9, y);
      y += qLines.length * lineH + 1.5;

      if (hasOptions) {
        const letters = ["a", "b", "c", "d", "e"];
        doc.setFontSize(9);
        setText(doc, [55, 55, 55]);
        for (let oi = 0; oi < q.options!.length; oi += 1) {
          const optLines = doc.splitTextToSize(
            `(${letters[oi] ?? oi + 1}) ${sanitize(q.options![oi])}`,
            CONTENT_W - 18,
          );
          ensure(optLines.length * 4.4 + 2);
          doc.text(optLines, M_L + 12, y);
          y += optLines.length * 4.4;
        }
        y += 3;
      } else {
        // Generous dotted answer space.
        const rules = Math.max(2, Math.round(answerSpace / 6));
        setDraw(doc, LINE);
        doc.setLineWidth(0.2);
        // dotted look via short dashes
        for (let r = 0; r < rules; r += 1) {
          y += 5.5;
          ensure(2);
          for (let x = M_L + 9; x < PAGE_W - M_R; x += 4) {
            doc.line(x, y, x + 2, y);
          }
        }
        y += 4;
      }
    }
    y += 2;
  }

  drawFooters(doc);
  doc.save(`lazytopper-worksheet-${slugify(ws.title)}.pdf`);
}

// Even per-step mark distribution (rounded to 0.5, summing to total), mirroring
// CBSE step-marking where each authored step carries roughly equal weight.
function perStepMarks(total: number, n: number): number[] {
  if (n <= 0) return [];
  const out: number[] = [];
  let remaining = total;
  for (let i = 0; i < n; i += 1) {
    if (i === n - 1) {
      out.push(Math.max(0, Math.round(remaining * 2) / 2));
    } else {
      const share = Math.round((total / n) * 2) / 2;
      out.push(share);
      remaining -= share;
    }
  }
  return out;
}

// ── Document 2 — Answer key + step-by-step solutions ─────────────────────────
export async function downloadAnswerKeyPdf(ws: PersistedWorksheet): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  let y = M_T;
  drawWatermark(doc, 0.1);
  y = drawMasthead(doc, ws, y);

  const newPage = () => {
    doc.addPage();
    drawWatermark(doc, 0.1);
    y = M_T;
  };
  const ensure = (needed: number) => {
    if (y + needed > PAGE_H - M_B - 6) newPage();
  };

  // Title + ANSWER KEY badge
  setText(doc, INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(sanitize(ws.title), M_L, y + 2);
  // badge
  const badge = "ANSWER KEY & SOLUTIONS";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  const bw = doc.getTextWidth(badge) + 6;
  setFill(doc, GREEN_DARK);
  doc.roundedRect(PAGE_W - M_R - bw, y - 3, bw, 6, 1.2, 1.2, "F");
  setText(doc, [255, 255, 255]);
  doc.text(badge, PAGE_W - M_R - bw / 2, y + 1.1, { align: "center" });
  y += 8;

  setText(doc, MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    "Step-by-step solutions with CBSE step-marking. Open this AFTER you've attempted the worksheet — try first, then check.",
    M_L,
    y,
    { maxWidth: CONTENT_W },
  );
  y += 8;

  for (const q of ws.questions) {
    const marks = Number(q.marks) || 1;
    const steps = Array.isArray(q.solutionSteps) ? q.solutionSteps.filter(Boolean) : [];
    const finalAns = q.finalAnswer || q.answer || "";

    ensure(12);
    setText(doc, GREEN_DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(`Q${q.qNumber}.`, M_L, y);
    setText(doc, MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`[${marks} mark${marks === 1 ? "" : "s"}]`, PAGE_W - M_R, y, { align: "right" });
    y += 5;

    if (steps.length > 0) {
      const marksPerStep = perStepMarks(marks, steps.length);
      doc.setFontSize(8.6);
      for (let si = 0; si < steps.length; si += 1) {
        const hasOwnMark = /\[\s*\d/.test(steps[si]);
        const tag = hasOwnMark ? "" : `  [${marksPerStep[si]} mark${marksPerStep[si] === 1 ? "" : "s"}]`;
        const lines = doc.splitTextToSize(`${si + 1}. ${sanitize(steps[si])}${tag}`, CONTENT_W - 8);
        ensure(lines.length * 4.4 + 2);
        setText(doc, [55, 55, 55]);
        doc.text(lines, M_L + 5, y);
        y += lines.length * 4.4 + 1;
      }
    }

    if (finalAns) {
      ensure(7);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(doc, GREEN_DARK);
      const ansLines = doc.splitTextToSize(`Answer: ${sanitize(finalAns)}`, CONTENT_W - 8);
      doc.text(ansLines, M_L + 5, y);
      y += ansLines.length * 4.6;
    } else if (steps.length === 0) {
      ensure(6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setText(doc, MUTED);
      doc.text("Worked solution not available for this question.", M_L + 5, y);
      y += 5;
    }

    y += 3;
    setDraw(doc, LINE);
    doc.setLineWidth(0.15);
    doc.line(M_L, y - 1, PAGE_W - M_R, y - 1);
    y += 2;
  }

  // Reference the amber pitfall palette so it is available when real per-question
  // examiner-mistake data lands (kept here to document the locked design intent).
  void AMBER_FILL;

  drawFooters(doc);
  doc.save(`lazytopper-answer-key-${slugify(ws.title)}.pdf`);
}
