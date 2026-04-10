export type ExamDateSource = "official" | "predicted";

export type CbseExamDateResult = {
  studentClass: "10" | "12";
  examDate: string;
  source: ExamDateSource;
  noticeUrl?: string;
  note?: string;
  phase?: "phase1" | "phase2";
};

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001/api";
const ADMIN_OVERRIDE_KEY = "lazytopper.cbse.exam.admin_override.v1";

function toIsoDate(value: string): string | null {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type AdminOverrideMap = Partial<Record<"10" | "12", { examDate: string; note?: string; updatedAt: string }>>;

function readAdminOverrideMap(): AdminOverrideMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(ADMIN_OVERRIDE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as AdminOverrideMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAdminOverrideMap(next: AdminOverrideMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ADMIN_OVERRIDE_KEY, JSON.stringify(next));
  } catch {
  }
}

export function getCbseExamDateAdminOverride(studentClass: "10" | "12"): CbseExamDateResult | null {
  const map = readAdminOverrideMap();
  const entry = map[studentClass];
  if (!entry) return null;
  const normalized = toIsoDate(String(entry.examDate || ""));
  if (!normalized) return null;
  return {
    studentClass,
    examDate: normalized,
    source: "official",
    note: entry.note || "Admin override",
  };
}

export function setCbseExamDateAdminOverride(
  studentClass: "10" | "12",
  examDate: string,
  note = "Admin confirmed official CBSE date."
): CbseExamDateResult {
  const normalized = toIsoDate(examDate);
  if (!normalized) {
    throw new Error("Invalid date format. Use YYYY-MM-DD.");
  }
  const map = readAdminOverrideMap();
  map[studentClass] = {
    examDate: normalized,
    note,
    updatedAt: new Date().toISOString(),
  };
  writeAdminOverrideMap(map);
  return {
    studentClass,
    examDate: normalized,
    source: "official",
    note,
  };
}

export function clearCbseExamDateAdminOverride(studentClass: "10" | "12"): void {
  const map = readAdminOverrideMap();
  if (!map[studentClass]) return;
  delete map[studentClass];
  writeAdminOverrideMap(map);
}

export function predictCbseExamDate(studentClass: "10" | "12"): string {
  const officialDates: Record<string, Record<string, string>> = {
    "2025-26": { "10": "2026-02-17", "12": "2026-02-17" },
  };

  const now = new Date();
  const month = now.getMonth() + 1;
  const academicYear = month >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  const sessionKey = `${academicYear}-${String(academicYear + 1).slice(2)}`;

  const official = officialDates[sessionKey]?.[studentClass];
  if (official) {
    const officialUtc = new Date(`${official}T00:00:00Z`).getTime();
    const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    if (officialUtc >= todayUtc) return official;
  }

  let year = month >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  const tentativeDay = 17;
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  let examUtc = Date.UTC(year, 1, tentativeDay);
  if (examUtc < todayUtc) {
    year += 1;
    examUtc = Date.UTC(year, 1, tentativeDay);
  }
  return new Date(examUtc).toISOString().slice(0, 10);
}

export const CBSE_PHASE2_DATE = "2026-05-15";
export const CBSE_PHASE2_END = "2026-06-01";

export function predictCbsePhase2Date(): string {
  return CBSE_PHASE2_DATE;
}

export function daysLeftFromIsoDate(isoDate: string): number {
  const today = new Date();
  const target = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) return 0;
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
}

export async function fetchCbseExamDate(studentClass: "10" | "12"): Promise<CbseExamDateResult> {
  const fallbackDate = predictCbseExamDate(studentClass);
  const override = getCbseExamDateAdminOverride(studentClass);
  if (override) return override;
  try {
    const res = await fetch(`${API_BASE}/cbse-exam-date?class=${encodeURIComponent(studentClass)}`, {
      method: "GET",
    });
    if (!res.ok) throw new Error(`CBSE endpoint returned ${res.status}`);
    const data = (await res.json()) as Record<string, unknown>;
    const source = String(data.source || "predicted") === "official" ? "official" : "predicted";
    const examDateRaw = String(data.examDate || "");
    const normalized = toIsoDate(examDateRaw);
    return {
      studentClass,
      examDate: normalized || fallbackDate,
      source: normalized ? source : "predicted",
      noticeUrl: typeof data.noticeUrl === "string" ? data.noticeUrl : undefined,
      note: typeof data.note === "string" ? data.note : undefined,
      phase: "phase1",
    };
  } catch {
    return {
      studentClass,
      examDate: fallbackDate,
      source: "predicted",
      note: "Using predicted board start date from prior CBSE trends.",
      phase: "phase1",
    };
  }
}

export function fetchCbsePhase1Date(studentClass: "10" | "12"): CbseExamDateResult {
  return {
    studentClass,
    examDate: predictCbseExamDate(studentClass),
    source: "predicted",
    note: "Phase 1 — compulsory board exam. All subjects. Both exams cover the full syllabus.",
    phase: "phase1",
  };
}

export function fetchCbsePhase2Date(studentClass: "10" | "12"): CbseExamDateResult {
  return {
    studentClass,
    examDate: CBSE_PHASE2_DATE,
    source: "predicted",
    note: "Phase 2 — optional re-attempt for up to 3 subjects. Best score counts. Full syllabus covered.",
    phase: "phase2",
  };
}

export function getPhaseDeadline(phase: "phase1" | "phase2", studentClass: "10" | "12"): string {
  return phase === "phase2" ? CBSE_PHASE2_DATE : predictCbseExamDate(studentClass);
}
