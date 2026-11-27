/**
 * FREE-TS-WEEKLY (owner ruling 27 Nov 2026, 13:14 IST) - which route is a TEST SERIES paper? The SAME reading the two pages make of
 * their own URL (ChapterTestPage `seriesTest`, FullMockPage `seriesN` / `focusSet`), so the gate and the page can never disagree:
 * a chapter test needs `?series=1` on a board chapter (+ optional `&paper=2..5`), a full-length test `?paper=1..25`, a focus set
 * `?focus=FS-…`. Returns the paper's manifest key ("TS-CT-M01"), or null for an ordinary (non-series) paper. PURE.
 *
 * Heavy (series tables): MockViewGate loads this lazily, only for a student the weekly rule can apply to.
 */
import { FOCUS_PARAM, focusSetKey, focusSetOf } from "./focusSets";
import {
  CT_PAPER_PARAM,
  CT_SERIES_PARAM,
  FM_PAPER_PARAM,
  isChapterTestSeriesRequest,
  seriesChapterPaperNumber,
  seriesChapterTestOf,
  seriesFullMocks,
  seriesMockNumber,
} from "./testSeries";

import { paperSurfaceOfRoute } from "./freeTsWeeklyStore";

export function seriesPaperKeyOfRoute(pathname: string, search = ""): string | null {
  if (import.meta.env?.VITE_TEST_SERIES_DISABLED === "1") return null;
  const segs = String(pathname || "").trim().replace(/\/+$/, "").split("/").filter(Boolean);
  let sp: URLSearchParams;
  try {
    sp = new URLSearchParams(String(search || ""));
  } catch {
    return null;
  }
  const surface = paperSurfaceOfRoute(pathname);
  if (surface === "chapter-test") {
    const topicKey = segs[3] || "";
    const k = seriesChapterPaperNumber(sp.get(CT_PAPER_PARAM));
    if (k === null || !isChapterTestSeriesRequest(sp.get(CT_SERIES_PARAM), topicKey)) return null;
    const t = seriesChapterTestOf(topicKey, k);
    return t ? `TS-${t.code}` : null;
  }
  if (surface === "full-mock") {
    const subject = String(segs[2] || "").toLowerCase().includes("science") ? "Science" : "Maths";
    const n = seriesMockNumber(sp.get(FM_PAPER_PARAM));
    if (n !== null) {
      const m = seriesFullMocks().find((x) => x.subject === subject && x.n === n);
      return m ? `TS-${m.code}` : null;
    }
    const f = focusSetOf(sp.get(FOCUS_PARAM), subject);
    return f ? focusSetKey(f.code) : null;
  }
  return null;
}
