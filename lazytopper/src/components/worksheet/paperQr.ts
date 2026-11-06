/**
 * GRADE-ROUTE-2 - the small QR printed in the footer of a paper's questions sheet. It encodes the paper code ONLY
 * (WS-/CT-/FM-...), nothing personal. Drawn as vector squares (crisp at any print scale) with the `qrcode` package
 * that is already a dependency (lazy import).
 */
type Rect = { setFillColor: (...c: number[]) => unknown; rect: (x: number, y: number, w: number, h: number, style?: string) => unknown };

/** The QR's dark modules for `code`, or null if it cannot be built (the PDF is then produced without it). */
export async function buildPaperQrMatrix(code: string): Promise<boolean[][] | null> {
  try {
    const QR = await import("qrcode");
    const q = QR.create(String(code), { errorCorrectionLevel: "Q" });
    const n = q.modules.size;
    const rows: boolean[][] = [];
    for (let r = 0; r < n; r += 1) {
      const row: boolean[] = [];
      for (let c = 0; c < n; c += 1) row.push(q.modules.get(r, c) === 1);
      rows.push(row);
    }
    return rows;
  } catch {
    return null;
  }
}

/** 18 mm square including a 2-module quiet zone: about 0.72 mm per module for a version-1 code at level Q. */
export const PAPER_QR_MM = 18;
const QUIET = 2;

/** Draw the QR with its top-left corner at (x0, y0) mm: a white plate, then the dark modules. */
export function drawPaperQr(pdf: Rect, rows: boolean[][], x0: number, y0: number): void {
  const n = rows.length;
  const mod = PAPER_QR_MM / (n + QUIET * 2);
  pdf.setFillColor(255, 255, 255);
  pdf.rect(x0, y0, PAPER_QR_MM, PAPER_QR_MM, "F");
  pdf.setFillColor(0, 0, 0);
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (rows[r][c]) pdf.rect(x0 + (c + QUIET) * mod, y0 + (r + QUIET) * mod, mod, mod, "F");
    }
  }
}
