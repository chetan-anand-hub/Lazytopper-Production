import type { PracticeQuestion } from "../../data/predictionDataService";

/**
 * Section scope for worksheet filtering.
 *   "All"      = all sections A–E (no filtering applied)
 *   string[]   = specific section letters, e.g. ["A","B"] or ["C","D","E"]
 */
export type SectionScope = "All" | string[];

export interface WorksheetOptions {
  topicLabel: string;
  subjectKey: string;
  grade: string;
  difficulty: string;
  sectionFilter: SectionScope;
  questions: PracticeQuestion[];
}

export const WORKSHEET_MAX_QUESTIONS = 50;

function sectionLabel(s: string): string {
  const map: Record<string, string> = {
    A: "Section A (1 mark)",
    B: "Section B (2 marks)",
    C: "Section C (3 marks)",
    D: "Section D (5 marks)",
    E: "Section E — Case-Based (4 marks)",
  };
  return map[s] || `Section ${s}`;
}

/**
 * Human-readable label for a SectionScope value.
 * Used on the generator screen, ready screen, and PDF header.
 *   "All"        → "All sections (A–E)"
 *   ["A","B"]    → "Sections A + B"
 *   ["C","D","E"]→ "Sections C + D + E"
 *   ["A"]        → "Section A"
 */
export function sectionScopeLabel(scope: SectionScope): string {
  if (scope === "All") return "All sections (A–E)";
  if (scope.length === 1) return sectionLabel(scope[0]);
  return `Sections ${scope.join(" + ")}`;
}

function difficultyLabel(d: string): string {
  if (d === "All") return "All levels";
  return d;
}

function sanitizeText(s: unknown): string {
  return String(s ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2014/g, "--")
    .replace(/\u2013/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uD7FF]/g, "?")
    .trim();
}

export async function downloadWorksheetPdf(opts: WorksheetOptions): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const {
    topicLabel,
    subjectKey,
    grade,
    difficulty,
    sectionFilter,
    questions,
  } = opts;

  const cappedQuestions = questions.slice(0, WORKSHEET_MAX_QUESTIONS);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = 210;
  const pageH = 297;
  const marginL = 16;
  const marginR = 16;
  const marginT = 18;
  const marginB = 18;
  const contentW = pageW - marginL - marginR;

  const totalMarks = cappedQuestions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let y = marginT;

  function ensureSpace(needed: number): void {
    if (y + needed > pageH - marginB) {
      doc.addPage();
      y = marginT;
    }
  }

  function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [0, 0, 0];
    return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
  }

  function setColor(hex: string): void {
    const [r, g, b] = hexToRgb(hex);
    doc.setTextColor(r, g, b);
  }

  function space(mm: number): void {
    y += mm;
  }

  function checkPageBreak(minRemaining = 20): void {
    if (y > pageH - marginB - minRemaining) {
      doc.addPage();
      y = marginT;
    }
  }

  const blue = "#1d4ed8";
  const muted = "#6b7280";
  const heading = "#111827";
  const green = "#059669";

  const [br, bg, bb] = hexToRgb(blue);

  doc.setDrawColor(br, bg, bb);
  doc.setLineWidth(0.6);
  doc.line(marginL, y, pageW - marginR, y);
  space(2);

  setColor(blue);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("LAZYTOPPER · CBSE BOARD PREP", marginL, y);
  space(5);

  setColor(heading);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(sanitizeText(topicLabel), marginL, y);
  space(6);

  setColor(muted);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Class ${grade} · ${subjectKey} · Difficulty: ${difficultyLabel(difficulty)} · ${sectionScopeLabel(sectionFilter)}`, marginL, y);
  space(4);

  doc.setFontSize(9);
  doc.text(`${cappedQuestions.length} questions · Total: ${totalMarks} marks · ${dateStr}`, marginL, y);
  space(5);

  setColor("#374151");
  doc.setFontSize(8);
  const nameY = y;
  doc.text("Name: _______________________________", marginL, nameY);
  doc.text("Roll No: ______________", marginL + 82, nameY);
  doc.text(`Date: ___________`, marginL + 128, nameY);
  space(5);

  const [lgr, lgg, lgb] = hexToRgb("#d1d5db");
  doc.setDrawColor(lgr, lgg, lgb);
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageW - marginR, y);
  space(3);

  setColor("#0c4a6e");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Instructions: Read all questions carefully. Show full working for non-MCQ questions — CBSE awards marks for method. No negative marking. Attempt all questions.",
    marginL, y,
    { maxWidth: contentW }
  );
  space(6);

  doc.setDrawColor(lgr, lgg, lgb);
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageW - marginR, y);
  space(5);

  for (let i = 0; i < cappedQuestions.length; i++) {
    const q = cappedQuestions[i];
    const marks = Number(q.marks) || 1;
    const sec = String(q.section || "").toUpperCase();
    const secStr = (sec === "A" || sec === "B" || sec === "C" || sec === "D" || sec === "E")
      ? ` [§${sec}]` : "";
    const marksStr = `[${marks} mark${marks !== 1 ? "s" : ""}]`;

    checkPageBreak(20);

    const qNum = `Q${i + 1}.${secStr}`;
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    setColor(heading);

    doc.text(qNum, marginL, y);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setColor(muted);
    doc.text(marksStr, pageW - marginR - doc.getTextWidth(marksStr), y);

    space(5);

    const qLines = doc.splitTextToSize(sanitizeText(q.questionText), contentW - 4);
    const qLineH = 9.5 * 0.352778 * 1.4;
    ensureSpace(qLines.length * qLineH + 4);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    setColor("#1f2937");
    doc.text(qLines, marginL + 4, y);
    y += qLines.length * qLineH;

    if (Array.isArray(q.options) && q.options.length > 0) {
      const optLetters = ["A", "B", "C", "D", "E"];
      for (let oi = 0; oi < q.options.length; oi++) {
        space(2.5);
        ensureSpace(5);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        setColor("#374151");
        const optText = `(${optLetters[oi] ?? oi + 1}) ${sanitizeText(q.options[oi])}`;
        const optLines = doc.splitTextToSize(optText, contentW - 10);
        doc.text(optLines, marginL + 8, y);
        y += optLines.length * 9 * 0.352778 * 1.35;
      }
      space(3);
    } else {
      const blankCount = Math.max(2, Math.min(6, marks * 2));
      space(2);
      for (let bi = 0; bi < blankCount; bi++) {
        ensureSpace(6);
        doc.setDrawColor(lgr, lgg, lgb);
        doc.setLineWidth(0.25);
        doc.line(marginL + 4, y, pageW - marginR, y);
        space(5.5);
      }
    }

    space(4);

    if (i < cappedQuestions.length - 1) {
      doc.setDrawColor(lgr, lgg, lgb);
      doc.setLineWidth(0.15);
      doc.line(marginL, y - 1, pageW - marginR, y - 1);
    }
  }

  if (cappedQuestions.length > 0) {
    doc.addPage();
    y = marginT;

    const [gr, gg, gbv] = hexToRgb(green);
    doc.setDrawColor(gr, gg, gbv);
    doc.setLineWidth(0.6);
    doc.line(marginL, y, pageW - marginR, y);
    space(4);

    setColor(green);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Answer Key / Model Answers", marginL, y);
    space(6);

    setColor(muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      `${sanitizeText(topicLabel)} · Class ${grade} ${subjectKey} · Note: CBSE awards marks for correct method, not just final answer.`,
      marginL, y,
      { maxWidth: contentW }
    );
    space(6);

    const [gr2, gg2, gb2] = hexToRgb("#d1d5db");
    doc.setDrawColor(gr2, gg2, gb2);
    doc.setLineWidth(0.3);
    doc.line(marginL, y, pageW - marginR, y);
    space(5);

    for (let i = 0; i < cappedQuestions.length; i++) {
      const q = cappedQuestions[i];
      const marks = Number(q.marks) || 1;

      checkPageBreak(16);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      setColor(heading);
      doc.text(`Q${i + 1}.  [${marks} mark${marks !== 1 ? "s" : ""}]`, marginL, y);
      space(5);

      const hasSolutionSteps = Array.isArray(q.solutionSteps) && q.solutionSteps.length > 0;
      const finalAnswer = q.finalAnswer || q.answer;

      if (hasSolutionSteps) {
        for (let si = 0; si < (q.solutionSteps as string[]).length; si++) {
          const stepText = `${si + 1}. ${sanitizeText((q.solutionSteps as string[])[si])}`;
          const stepLines = doc.splitTextToSize(stepText, contentW - 6);
          const stepH = 8.5 * 0.352778 * 1.35;
          ensureSpace(stepLines.length * stepH + 2);
          doc.setFontSize(8.5);
          doc.setFont("helvetica", "normal");
          setColor("#374151");
          doc.text(stepLines, marginL + 6, y);
          y += stepLines.length * stepH;
          space(1);
        }
      }

      if (finalAnswer) {
        space(2);
        ensureSpace(8);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        setColor(green);
        const ansLines = doc.splitTextToSize(`Therefore: ${sanitizeText(finalAnswer)}`, contentW - 6);
        doc.text(ansLines, marginL + 6, y);
        y += ansLines.length * 9 * 0.352778 * 1.35;
      } else if (!hasSolutionSteps) {
        ensureSpace(7);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        setColor(muted);
        doc.text("Answer not available for this question.", marginL + 6, y);
        y += 8.5 * 0.352778 * 1.35;
      }

      space(5);

      doc.setDrawColor(lgr, lgg, lgb);
      doc.setLineWidth(0.15);
      doc.line(marginL, y - 1, pageW - marginR, y - 1);
    }
  }

  const pageCount = (doc as unknown as { internal: { getNumberOfPages(): number } }).internal.getNumberOfPages();
  for (let pi = 1; pi <= pageCount; pi++) {
    doc.setPage(pi);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    setColor(muted);
    doc.text(
      `Generated by LazyTopper · lazytopper.in · Page ${pi} of ${pageCount}`,
      pageW / 2,
      pageH - 8,
      { align: "center" }
    );
  }

  const slug = sanitizeText(topicLabel).replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase().slice(0, 40);
  doc.save(`lazytopper-worksheet-${slug}.pdf`);
}

export async function downloadWorksheet(opts: WorksheetOptions): Promise<void> {
  const cappedOpts = { ...opts, questions: opts.questions.slice(0, WORKSHEET_MAX_QUESTIONS) };
  await downloadWorksheetPdf(cappedOpts);
}
