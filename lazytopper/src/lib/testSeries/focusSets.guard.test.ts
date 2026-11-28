/**
 * TS-THEMES-1 - the 30 FOCUS SETS are pinned papers: focusSetIds.json (client, lazy chunk) and server/data/testSeriesFocusSets.json
 * (server admission, same shape as testSeriesPapers.json). This guard proves every committed set meets its theme rule and the
 * series' row rules, and that the two files and the server loader agree.
 *
 * CREATE / APPEND (write mode, one-time, APPEND-ONLY - a set that exists is never changed):
 *   LT_WRITE_TS_FOCUS_SETS=1 pnpm exec vitest run src/lib/testSeries/focusSets.guard.test.ts
 */
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { SYLLABUS_2026_27 } from "../../config/syllabus2026-27";
import {
  SURFACE_BANNED_PHRASES,
  bannedSubtopicsFor,
  buildSyllabusMatcher,
  foldForCompare,
  matchFreeText,
  matchLabel,
  scanContentForPhrases,
} from "../../../../scripts/src/syllabusGuard";
import type { CanonicalQuestion } from "../../data/predictionTypes";
import { ensureAllBankChapters, getBankRowsForSubject } from "../../data/bankChapters/loader";
import { lensHits } from "../../test/packSyllabusLenses";
import { questionKey } from "../../utils/questionKey";
import { canonicalQuestionText, type SeriesPaperManifestEntry } from "./paperManifest";
import {
  FOCUS_MAX_MARKS,
  FOCUS_MIN_MARKS,
  drawFocusSetsForTheme,
  focusSectionOf,
  isFocusEligible,
  themeAdmits,
  type DrawnFocusSet,
} from "./focusSetDraw";
import { FOCUS_SETS_PER_THEME, FOCUS_THEMES, focusSetCount, focusSetMinutes, focusSetWorksheetId, focusSets, type FocusSubject } from "./focusSets";
import type { FocusSetIds } from "./pinnedFocusSet";
import { seriesTotals } from "./testSeries";

const CLIENT_FILE = resolve(__dirname, "focusSetIds.json");
const SERVER_FILE = resolve(__dirname, "../../../server/data/testSeriesFocusSets.json");
const SERIES_FILE = resolve(__dirname, "../../../server/data/testSeriesPapers.json");
const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");
const serverChecks = createRequire(import.meta.url)("../../../server/services/testSeriesChecks.cjs") as {
  canonicalQuestionTextHash: (t: unknown) => string;
  loadManifest: (file: string | string[], logger: { error: (m: string) => void }) => { count: number; dropped: number; papers: Array<{ key: string }> };
  MANIFEST_FILES: string[];
};

const MATCHER = buildSyllabusMatcher(SYLLABUS_2026_27 as never);
const BANNED = {
  Maths: new Set(bannedSubtopicsFor("Maths").map(foldForCompare)),
  Science: new Set(bannedSubtopicsFor("Science").map(foldForCompare)),
};

/**
 * The paid packs' syllabus scan (packSyllabus.guard.test.ts), with NO reviewed-incidental allowance: a focus set simply never takes a
 * row with any hit. Banned sub-topic, OUT / FORMATIVE reference item, non-board chapter, OUT phrase in any printed field, surface
 * phrase, content lens.
 */
function syllabusHits(q: CanonicalQuestion, subject: FocusSubject): string[] {
  const out: string[] = [];
  const sub = String(q.subtopic ?? "");
  if (sub && BANNED[subject].has(foldForCompare(sub))) out.push(`banned sub-topic "${sub}"`);
  if (sub && matchLabel(sub, MATCHER, q.topicKey)) out.push(`sub-topic "${sub}" matches an OUT item`);
  if (MATCHER.excludedChapterKeys.has(q.topicKey)) out.push(`chapter ${q.topicKey} is not a board chapter`);
  const fields = [q.questionText, ...(q.options ?? []), ...(q.solutionSteps ?? []), q.finalAnswer ?? "", q.answer ?? ""];
  for (const t of fields) {
    if (!t) continue;
    for (const h of matchFreeText(String(t), MATCHER, q.topicKey)) out.push(`OUT phrase "${h.term.term}"`);
    for (const [phrase] of scanContentForPhrases(String(t), SURFACE_BANNED_PHRASES)) out.push(`surface phrase "${phrase}"`);
  }
  for (const lens of lensHits(q)) out.push(`lens ${lens}`);
  return out;
}

/** The rows a theme may draw from (every rule, before the draw). The bank must be loaded. */
function qualifying(subject: FocusSubject, theme: (typeof FOCUS_THEMES)[number]["id"]): CanonicalQuestion[] {
  return getBankRowsForSubject(subject).filter((q) => isFocusEligible(q) && themeAdmits(theme, q) && syllabusHits(q, subject).length === 0);
}

function manifestEntry(set: DrawnFocusSet, subject: FocusSubject, byId: Map<string, CanonicalQuestion>): SeriesPaperManifestEntry {
  const f = focusSets().find((x) => x.code === set.code)!;
  const textHashes: Record<string, string> = {};
  for (const id of set.ids) textHashes[id] = sha256(canonicalQuestionText(byId.get(id)!.questionText));
  const prefixed = focusSetWorksheetId("fm-x", f);
  return {
    key: set.key,
    subject,
    // A focus set is a FULL-MOCK-surface paper (the server reads the kind from the `fm-` prefix); `kind` here is informational.
    kind: "focus" as SeriesPaperManifestEntry["kind"],
    number: f.n,
    paperCode: set.code,
    topicKey: null,
    worksheetIdPrefix: prefixed.slice(0, prefixed.indexOf("--") + 2),
    questionIds: [...set.ids],
    // Every question on a focus set is a written one (Sections B-E): all of them are what a check grades.
    sectionBEQuestionIds: [...set.ids],
    textHashes,
  };
}

const readClient = () => JSON.parse(readFileSync(CLIENT_FILE, "utf8")) as FocusSetIds;
const readServer = () => JSON.parse(readFileSync(SERVER_FILE, "utf8")) as SeriesPaperManifestEntry[];

describe("TS-THEMES-1 focus sets", () => {
  const byId = new Map<string, CanonicalQuestion>();
  beforeAll(async () => {
    await ensureAllBankChapters();
    for (const s of ["Maths", "Science"] as const) for (const q of getBankRowsForSubject(s)) byId.set(q.id, q);
  }, 300_000);

  it("WRITE MODE (LT_WRITE_TS_FOCUS_SETS=1 only): draws the sets the files do not have yet; never changes an existing set", () => {
    if (process.env.LT_WRITE_TS_FOCUS_SETS !== "1") return;
    const client: FocusSetIds = existsSync(CLIENT_FILE) ? readClient() : {};
    const server: SeriesPaperManifestEntry[] = existsSync(SERVER_FILE) ? readServer() : [];
    const added: string[] = [];
    for (const t of FOCUS_THEMES) {
      const rows = qualifying(t.subject, t.id);
      // eslint-disable-next-line no-console
      console.log(`TS-THEMES-1 qualifying rows ${t.subject} ${t.id}: ${rows.length}`);
      for (const set of drawFocusSetsForTheme(t.subject, t.id, rows)) {
        if (client[set.key]) continue;
        client[set.key] = { ids: set.ids, sections: set.sections, marks: set.marks, minutes: set.minutes };
        server.push(manifestEntry(set, t.subject, byId));
        added.push(set.key);
      }
    }
    writeFileSync(CLIENT_FILE, `${JSON.stringify(client)}\n`);
    writeFileSync(SERVER_FILE, `${JSON.stringify(server, null, 2)}\n`);
    // eslint-disable-next-line no-console
    console.log(`TS-THEMES-1 generator: added ${added.length} [${added.join(", ")}]`);
  }, 300_000);

  it("there are 30 sets: 3 themes x 5 sets per subject, every one pinned on both sides with the same ids", () => {
    const client = readClient();
    const server = readServer();
    expect(focusSetCount()).toBe(30);
    expect(Object.keys(client).sort()).toEqual(focusSets().map((f) => `TS-${f.code}`).sort());
    expect(server.map((e) => e.key).sort()).toEqual(Object.keys(client).sort());
    for (const e of server) {
      expect(client[e.key].ids, e.key).toEqual(e.questionIds);
      expect(e.sectionBEQuestionIds, e.key).toEqual(e.questionIds);
      expect(e.paperCode, e.key).toBe(e.key.replace(/^TS-/, ""));
    }
    expect(FOCUS_SETS_PER_THEME).toBe(5);
  });

  it("every set meets its theme rule and the row rules (served, step-marked, figure-safe, not MCQ, syllabus-clean)", () => {
    const client = readClient();
    for (const f of focusSets()) {
      const spec = client[`TS-${f.code}`];
      for (const id of spec.ids) {
        const q = byId.get(id);
        expect(q, `${f.code} ${id} is not a served bank row`).toBeTruthy();
        expect(q!.subject.toLowerCase().startsWith(f.subject === "Maths" ? "math" : "sci"), `${f.code} ${id} subject`).toBe(true);
        expect(isFocusEligible(q!), `${f.code} ${id} eligible`).toBe(true);
        expect(themeAdmits(f.theme, q!), `${f.code} ${id} meets theme ${f.theme}`).toBe(true);
        expect(syllabusHits(q!, f.subject), `${f.code} ${id} syllabus`).toEqual([]);
      }
    }
  });

  it("marks are in range, the stored marks / minutes / sections are derived (never typed), board order, mixed chapters", () => {
    const client = readClient();
    for (const f of focusSets()) {
      const spec = client[`TS-${f.code}`];
      const rows = spec.ids.map((id) => byId.get(id)!);
      const marks = rows.reduce((s, q) => s + Number(q.marks), 0);
      expect(spec.marks, f.code).toBe(marks);
      expect(marks, `${f.code} marks`).toBeGreaterThanOrEqual(FOCUS_MIN_MARKS);
      expect(marks, `${f.code} marks`).toBeLessThanOrEqual(FOCUS_MAX_MARKS);
      expect(spec.minutes, f.code).toBe(focusSetMinutes(marks));
      expect(spec.minutes, f.code).toBeGreaterThanOrEqual(40);
      expect(spec.minutes, f.code).toBeLessThanOrEqual(60);
      expect(spec.sections, f.code).toBe(rows.map((q) => focusSectionOf(Number(q.marks))).join(""));
      expect([...spec.sections].join(""), `${f.code} board order`).toBe([...spec.sections].sort().join(""));
      expect(new Set(rows.map((q) => q.topicKey)).size, `${f.code} mixes chapters`).toBeGreaterThan(1);
    }
  });

  it("no question repeats within a theme (by id or by question text)", () => {
    const client = readClient();
    for (const t of FOCUS_THEMES) {
      const ids = new Set<string>();
      const keys = new Set<string>();
      for (const f of focusSets().filter((x) => x.subject === t.subject && x.theme === t.id)) {
        for (const id of client[`TS-${f.code}`].ids) {
          expect(ids.has(id), `${f.code} repeats ${id}`).toBe(false);
          ids.add(id);
          const k = questionKey(byId.get(id)!);
          expect(keys.has(k), `${f.code} ${id} repeats a question`).toBe(false);
          keys.add(k);
        }
      }
    }
  });

  it("Hard rows are taken before Medium: no set holds a Medium/Easy row while an unused Hard row of its theme qualifies", () => {
    const client = readClient();
    for (const t of FOCUS_THEMES) {
      const sets = focusSets().filter((x) => x.subject === t.subject && x.theme === t.id);
      const used = new Set(sets.flatMap((f) => client[`TS-${f.code}`].ids));
      const usedRows = [...used].map((id) => byId.get(id)!);
      const hardLeft = qualifying(t.subject, t.id).filter((q) => q.difficulty === "Hard" && !used.has(q.id));
      if (usedRows.some((q) => q.difficulty !== "Hard")) {
        // Every unused Hard row must be a twin (same question key) of a used row.
        const usedKeys = new Set(usedRows.map((q) => questionKey(q)));
        expect(hardLeft.filter((q) => !usedKeys.has(questionKey(q))).map((q) => q.id), `${t.subject} ${t.id}`).toEqual([]);
      }
    }
  });

  it("the text hashes are the server's canonical-text hashes of the served rows; prefixes are unique and never a prefix of a series prefix", () => {
    const series = JSON.parse(readFileSync(SERIES_FILE, "utf8")) as SeriesPaperManifestEntry[];
    const prefixes = [...series, ...readServer()].map((e) => e.worksheetIdPrefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);
    for (const a of prefixes) for (const b of prefixes) if (a !== b) expect(b.startsWith(a), `${a} / ${b}`).toBe(false);
    for (const e of readServer()) {
      expect(e.worksheetIdPrefix, e.key).toMatch(/^fm-tsfs-[ms](la|cb|sa|nu)[1-5]--$/);
      for (const id of e.questionIds) expect(e.textHashes[id], `${e.key} ${id}`).toBe(serverChecks.canonicalQuestionTextHash(byId.get(id)!.questionText));
    }
  });

  it("the SERVER loads the series papers AND the focus sets together: 180 + 30, none dropped, nothing logged", () => {
    const errors: string[] = [];
    const m = serverChecks.loadManifest(serverChecks.MANIFEST_FILES, { error: (x) => errors.push(x) });
    expect(errors).toEqual([]);
    expect(m.dropped).toBe(0);
    expect(m.count).toBe(seriesTotals().total + focusSetCount());
    expect(m.papers.filter((p) => p.key.startsWith("TS-FS-")).length).toBe(30);
  });

  it("qualifying-row counts are non-vacuous (each theme can fill its 5 sets)", () => {
    for (const t of FOCUS_THEMES) expect(qualifying(t.subject, t.id).length, `${t.subject} ${t.id}`).toBeGreaterThanOrEqual(FOCUS_SETS_PER_THEME * 4);
  });
});
