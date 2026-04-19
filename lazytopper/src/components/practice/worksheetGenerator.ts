import type { PracticeQuestion } from "../../data/predictionDataService";

export interface WorksheetOptions {
  topicLabel: string;
  subjectKey: string;
  grade: string;
  difficulty: string;
  sectionFilter: string;
  questions: PracticeQuestion[];
}

function sectionLabel(s: string): string {
  const map: Record<string, string> = {
    A: "Section A — 1 mark",
    B: "Section B — 2 marks",
    C: "Section C — 3 marks",
    D: "Section D — 5 marks",
    E: "Section E — Case-Based (4 marks)",
  };
  return map[s] || `Section ${s}`;
}

function difficultyLabel(d: string): string {
  if (d === "All") return "All levels";
  return d;
}

function escapeHtml(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderOptions(options: string[] | Record<string, string> | undefined): string {
  if (!options) return "";
  let items: string[];
  if (Array.isArray(options)) {
    items = options.map(String);
  } else if (typeof options === "object") {
    items = Object.values(options).map(String);
  } else {
    return "";
  }
  if (items.length === 0) return "";
  return `<ol type="A" style="margin:6px 0 0 18px;padding:0;font-size:13px;color:#374151;">
    ${items.map((v) => `<li style="margin-bottom:3px;">${escapeHtml(v)}</li>`).join("")}
  </ol>`;
}

function blankLines(marks: number): string {
  const lines = Math.max(2, Math.min(8, marks * 2));
  return Array(lines)
    .fill('<div style="border-bottom:1px solid #d1d5db;height:22px;margin-bottom:4px;"></div>')
    .join("");
}

export function generateWorksheetHtml(opts: WorksheetOptions): string {
  const { topicLabel, subjectKey, grade, difficulty, sectionFilter, questions } = opts;
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const filterLine = [
    `Difficulty: ${difficultyLabel(difficulty)}`,
    sectionFilter !== "ALL" ? `Type: ${sectionLabel(sectionFilter)}` : "All question types",
    `${questions.length} questions`,
  ].join(" · ");

  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);

  const questionItems = questions
    .map((q, i) => {
      const marks = Number(q.marks) || 1;
      const sec = String(q.section || "").toUpperCase();
      const secBadge = (sec === "A" || sec === "B" || sec === "C" || sec === "D" || sec === "E")
        ? `<span style="display:inline-block;background:#e0f2fe;color:#0369a1;border-radius:4px;padding:1px 6px;font-size:11px;font-weight:600;margin-left:6px;">§${sec}</span>`
        : "";
      const marksBadge = `<span style="float:right;font-size:12px;color:#6b7280;">[${marks} mark${marks !== 1 ? "s" : ""}]</span>`;
      const opts2 = q.options ? renderOptions(q.options) : "";
      const answer = opts2 ? "" : blankLines(marks);

      return `
        <div style="margin-bottom:22px;page-break-inside:avoid;">
          <div style="font-size:14px;font-weight:600;color:#111827;line-height:1.5;">
            ${marksBadge}
            <span style="color:#374151;">Q${i + 1}.</span>${secBadge}
            <span style="margin-left:4px;">${escapeHtml(q.questionText)}</span>
          </div>
          ${opts2}
          ${!opts2 ? `<div style="margin-top:8px;">${answer}</div>` : ""}
        </div>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Practice Worksheet — ${escapeHtml(topicLabel)}</title>
  <style>
    @page { margin: 18mm 16mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #111827;
      background: #fff;
      margin: 0;
      padding: 0;
    }
    .header {
      border-bottom: 2px solid #1d4ed8;
      padding-bottom: 10px;
      margin-bottom: 18px;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand { font-size: 12px; font-weight: 700; color: #1d4ed8; letter-spacing: 0.04em; }
    .title { font-size: 22px; font-weight: 800; color: #111827; margin: 4px 0 2px; }
    .subtitle { font-size: 13px; color: #4b5563; }
    .meta-row {
      display: flex;
      gap: 24px;
      margin-top: 10px;
      font-size: 12px;
      color: #6b7280;
    }
    .meta-row strong { color: #374151; }
    .student-line {
      display: flex;
      gap: 32px;
      margin-top: 10px;
      font-size: 12px;
      color: #374151;
    }
    .student-field {
      flex: 1;
      border-bottom: 1px solid #9ca3af;
      padding-bottom: 2px;
    }
    .student-field label { font-weight: 600; margin-right: 8px; }
    .instructions {
      background: #f0f9ff;
      border-left: 3px solid #38bdf8;
      padding: 8px 12px;
      font-size: 12px;
      color: #0c4a6e;
      margin-bottom: 20px;
      border-radius: 0 4px 4px 0;
    }
    .questions { margin-top: 4px; }
    .footer {
      margin-top: 28px;
      border-top: 1px solid #e5e7eb;
      padding-top: 8px;
      font-size: 11px;
      color: #9ca3af;
      text-align: center;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>

  <button class="no-print" onclick="window.print()" style="
    position:fixed;top:16px;right:16px;z-index:999;
    background:#1d4ed8;color:#fff;border:none;border-radius:8px;
    padding:10px 22px;font-size:14px;font-weight:700;cursor:pointer;
    box-shadow:0 2px 12px rgba(29,78,216,0.35);
  ">Print / Save PDF</button>

  <div class="header">
    <div class="header-top">
      <div>
        <div class="brand">LazyTopper · CBSE Board Prep</div>
        <div class="title">${escapeHtml(topicLabel)}</div>
        <div class="subtitle">Class ${escapeHtml(grade)} · ${escapeHtml(subjectKey)}</div>
      </div>
      <div style="text-align:right;font-size:12px;color:#6b7280;">
        <div>${dateStr}</div>
        <div style="font-size:16px;font-weight:800;color:#111827;margin-top:6px;">Total: ${totalMarks} marks</div>
      </div>
    </div>
    <div class="meta-row">
      <span>${filterLine}</span>
    </div>
    <div class="student-line">
      <div class="student-field"><label>Name:</label></div>
      <div class="student-field"><label>Roll No:</label></div>
      <div class="student-field"><label>Date:</label></div>
    </div>
  </div>

  <div class="instructions">
    <strong>Instructions:</strong>
    Read all questions carefully.
    Show full working for non-MCQ questions — CBSE awards marks for method.
    No negative marking.
    Attempt all questions.
  </div>

  <div class="questions">
    ${questionItems}
  </div>

  <div class="footer">
    Generated by LazyTopper · lazytopper.in · CBSE Class ${escapeHtml(grade)} ${escapeHtml(subjectKey)} — ${escapeHtml(topicLabel)}
  </div>

</body>
</html>`;
}

export function downloadWorksheet(opts: WorksheetOptions): void {
  const html = generateWorksheetHtml(opts);
  const win = window.open("", "_blank");
  if (!win) {
    alert("Pop-up blocked. Please allow pop-ups for this site to download the worksheet.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
