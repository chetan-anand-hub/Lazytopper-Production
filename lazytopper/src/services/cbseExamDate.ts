export type ExamDateSource = "official" | "predicted";

export type CbseExamDateResult = {
  studentClass: "10" | "12";
  examDate: string;
  source: ExamDateSource;
  noticeUrl?: string;
  note?: string;
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
    // ignore local storage failures
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
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = month >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  const tentativeDay = studentClass === "10" ? 15 : 16;
  const d = new Date(Date.UTC(year, 1, tentativeDay));
  return d.toISOString().slice(0, 10);
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
    };
  } catch {
    return {
      studentClass,
      examDate: fallbackDate,
      source: "predicted",
      note: "Using predicted board start date from prior CBSE trends.",
    };
  }
}
