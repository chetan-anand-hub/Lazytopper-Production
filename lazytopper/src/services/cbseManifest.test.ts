import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CBSE_MANIFEST_PATH,
  cbseCircularFeed,
  cbsePaperLink,
  cbseStorageUrl,
  fetchCbseManifest,
  formatCheckedOn,
  formatCircularDate,
  newestImportantCircular,
  parseCbseManifest,
  type CbseManifest,
} from "./cbseManifest";
import { CBSE_CIRCULARS, CBSE_CIRCULARS_CHECKED_ON, CBSE_SUBJECTS } from "../pages/cbse2027Sources";

/**
 * GUARD — the client side of the CBSE mirror (CBSE-AUTO-1 C11).
 *
 * ★ THE PROPERTY THAT MATTERS MOST IS THE FALLBACK: every way the manifest can fail
 * must come back as `null` — never a throw, never a half-parsed object — because
 * `null` is what makes the page render its committed self. Each failure mode is its
 * own case, and each is paired with the success case that differs from it only in
 * the one thing that broke.
 */

const BUCKET = "test-bucket.firebasestorage.app";
const SCIENCE_SQP = CBSE_SUBJECTS[0].papers.find((p) => p.id === "science-sqp")!;
const SCIENCE_SYLLABUS = CBSE_SUBJECTS[0].papers.find((p) => p.id === "science-syllabus")!;

function manifestFixture(overrides: Partial<CbseManifest> = {}): CbseManifest {
  return {
    v: 1,
    generatedAt: "2026-09-26T00:31:00.000Z",
    papers: [
      { id: "science-sqp", sourceUrl: SCIENCE_SQP.href, storagePath: "cbse/files/science-sqp.pdf", sessionYear: "2026-27", status: "ok" },
      { id: "science-syllabus", sourceUrl: SCIENCE_SYLLABUS.href, storagePath: "cbse/files/science-syllabus.pdf", sessionYear: "2027-28", status: "ok" },
      { id: "science-ms", sourceUrl: "https://cbseacademic.nic.in/x/Science-MS.pdf", storagePath: "cbse/files/science-ms.pdf", sessionYear: "2025-26", status: "stale" },
      { id: "science-question-bank", sourceUrl: "https://cbseacademic.nic.in/x/ScienceX.pdf", storagePath: "cbse/files/science-question-bank.pdf", sessionYear: null, status: "source-missing" },
    ],
    circulars: [
      { id: "c1", date: "2026-09-23", title: "Streamlining corrections", href: "https://www.cbse.gov.in/a.pdf", source: "document", important: false, headline: "" },
      { id: "c2", date: "2026-09", title: "Sample Question Papers 2026-27", href: "https://cbseacademic.nic.in/b.pdf", source: "document", important: true, headline: "New CBSE sample papers are out" },
      { id: "c3", date: "2025-08-05", title: "Attendance", href: "https://www.cbse.gov.in/c.pdf", source: "document", important: false, headline: "" },
    ],
    circularsCheckedAt: "2026-09-26T00:31:00.000Z",
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("fetchCbseManifest — every failure is null", () => {
  it("SUCCESS CONTROL: a valid manifest from the P8 URL is returned parsed", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => jsonResponse(manifestFixture()));
    const result = await fetchCbseManifest({ bucket: BUCKET, fetchImpl });
    expect(result?.papers).toHaveLength(4);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe(
      `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/cbse%2Fmanifest.json?alt=media`,
    );
    expect(cbseStorageUrl(BUCKET, CBSE_MANIFEST_PATH)).toBe(fetchImpl.mock.calls[0][0]);
  });

  it("★ the DEFAULT path — no bucket configured — is null WITHOUT a request", async () => {
    vi.stubEnv("VITE_FIREBASE_STORAGE_BUCKET", "");
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => jsonResponse(manifestFixture()));
    expect(await fetchCbseManifest({ fetchImpl })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reads the bucket from VITE_FIREBASE_STORAGE_BUCKET when none is passed", async () => {
    vi.stubEnv("VITE_FIREBASE_STORAGE_BUCKET", BUCKET);
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => jsonResponse(manifestFixture()));
    expect(await fetchCbseManifest({ fetchImpl })).not.toBeNull();
    expect(String(fetchImpl.mock.calls[0][0])).toContain(`/v0/b/${BUCKET}/`);
  });

  it("404 → null", async () => {
    expect(await fetchCbseManifest({ bucket: BUCKET, fetchImpl: async () => jsonResponse({}, 404) })).toBeNull();
  });

  it("network error → null (and does not throw)", async () => {
    const fetchImpl = async () => {
      throw new TypeError("Failed to fetch");
    };
    await expect(fetchCbseManifest({ bucket: BUCKET, fetchImpl })).resolves.toBeNull();
  });

  it("a body that is not JSON → null", async () => {
    const fetchImpl = async () => new Response("<html>oops</html>", { status: 200 });
    expect(await fetchCbseManifest({ bucket: BUCKET, fetchImpl })).toBeNull();
  });

  it("the wrong version or shape → null", async () => {
    for (const body of [{ ...manifestFixture(), v: 2 }, { v: 1 }, [], "x", null]) {
      expect(await fetchCbseManifest({ bucket: BUCKET, fetchImpl: async () => jsonResponse(body) })).toBeNull();
    }
  });

  it("★ a manifest slower than the 5 s timeout → null", async () => {
    vi.useFakeTimers();
    const fetchImpl = (_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
    const pending = fetchCbseManifest({ bucket: BUCKET, fetchImpl: fetchImpl as typeof fetch });
    await vi.advanceTimersByTimeAsync(4_999);
    let settled = false;
    void pending.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    expect(await pending).toBeNull();
  });
});

describe("parseCbseManifest — defensive per row", () => {
  it("drops a malformed row but keeps the rest", () => {
    const m = manifestFixture();
    const parsed = parseCbseManifest({
      ...m,
      papers: [...m.papers, { id: "x", sourceUrl: "javascript:alert(1)", status: "ok" }],
      circulars: [...m.circulars, { ...m.circulars[0], id: "bad", href: "javascript:alert(1)" }],
    });
    expect(parsed?.papers.map((p) => p.id)).toEqual(m.papers.map((p) => p.id));
    expect(parsed?.circulars.map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
  });

  it("refuses a storagePath outside cbse/files/", () => {
    const m = manifestFixture();
    const parsed = parseCbseManifest({ ...m, papers: [{ ...m.papers[0], storagePath: "ncert/x.pdf" }] });
    expect(parsed?.papers[0].storagePath).toBeNull();
    expect(cbsePaperLink(SCIENCE_SQP, parsed, BUCKET).label).toBe("Open");
  });
});

describe("cbsePaperLink — C11", () => {
  it("status ok → the Storage URL and 'Download'", () => {
    const link = cbsePaperLink(SCIENCE_SQP, manifestFixture(), BUCKET);
    expect(link).toEqual({
      href: `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/cbse%2Ffiles%2Fscience-sqp.pdf?alt=media`,
      label: "Download",
      title: "Sample paper",
    });
  });

  it("★ stale, source-missing, and no entry → the committed href and 'Open'", () => {
    const m = manifestFixture();
    for (const id of ["science-ms", "science-question-bank", "science-toppers"]) {
      const paper = CBSE_SUBJECTS[0].papers.find((p) => p.id === id)!;
      expect(cbsePaperLink(paper, m, BUCKET), id).toEqual({ href: paper.href, label: "Open", title: paper.title });
    }
  });

  it("★ no manifest, or no bucket → the committed row exactly", () => {
    expect(cbsePaperLink(SCIENCE_SQP, null, BUCKET)).toEqual({ href: SCIENCE_SQP.href, label: "Open", title: SCIENCE_SQP.title });
    expect(cbsePaperLink(SCIENCE_SQP, manifestFixture(), "")).toEqual({ href: SCIENCE_SQP.href, label: "Open", title: SCIENCE_SQP.title });
  });

  it("P16 — a mirrored copy's session year replaces the one in the title", () => {
    // PRECONDITION: the committed title carries a session year to replace.
    expect(SCIENCE_SYLLABUS.title).toBe("Syllabus 2026-27");
    expect(cbsePaperLink(SCIENCE_SYLLABUS, manifestFixture(), BUCKET).title).toBe("Syllabus 2027-28");
    expect(cbsePaperLink(SCIENCE_SYLLABUS, null, BUCKET).title).toBe("Syllabus 2026-27");
  });
});

describe("the circular feed and its dates", () => {
  it("uses the manifest's rows and checked date when it carries both", () => {
    const feed = cbseCircularFeed(manifestFixture(), CBSE_CIRCULARS, CBSE_CIRCULARS_CHECKED_ON);
    expect(feed.checkedOn).toBe("26 September 2026");
    expect(feed.rows.map((r) => r.date)).toEqual(["23 Sep", "Sep", "5 Aug 25"]);
    expect(feed.rows.map((r) => r.key)).toEqual(["c1", "c2", "c3"]);
  });

  it("★ falls back to the committed rows AND date together — never a mix", () => {
    for (const manifest of [
      null,
      manifestFixture({ circulars: [] }),
      manifestFixture({ circularsCheckedAt: null }),
    ]) {
      const feed = cbseCircularFeed(manifest, CBSE_CIRCULARS, CBSE_CIRCULARS_CHECKED_ON);
      expect(feed.checkedOn).toBe(CBSE_CIRCULARS_CHECKED_ON);
      expect(feed.rows.map((r) => r.title)).toEqual(CBSE_CIRCULARS.map((c) => c.title));
      expect(feed.rows.map((r) => r.date)).toEqual(CBSE_CIRCULARS.map((c) => c.date));
    }
  });

  it("formats without a clock", () => {
    expect(formatCircularDate("2026-09-10", 2026)).toBe("10 Sep");
    expect(formatCircularDate("2025-08-05", 2026)).toBe("5 Aug 25");
    expect(formatCircularDate("2026-09", 2026)).toBe("Sep");
    expect(formatCircularDate("2025-08", 2026)).toBe("Aug 2025");
    expect(formatCheckedOn("2026-09-26T00:31:00.000Z")).toBe("26 September 2026");
    expect(formatCheckedOn("nonsense")).toBeNull();
  });
});

describe("newestImportantCircular — C12's input", () => {
  it("picks the newest important row with a headline", () => {
    const m = manifestFixture({
      circulars: [
        ...manifestFixture().circulars,
        { id: "c4", date: "2026-09-25", title: "Date sheet", href: "https://www.cbse.gov.in/d.pdf", source: "document", important: true, headline: "The 2027 board exam date sheet is out" },
      ],
    });
    expect(newestImportantCircular(m)?.id).toBe("c4");
    expect(newestImportantCircular(manifestFixture())?.id).toBe("c2");
  });

  it("is null with no manifest, and with no important row", () => {
    expect(newestImportantCircular(null)).toBeNull();
    const m = manifestFixture();
    expect(newestImportantCircular({ ...m, circulars: m.circulars.map((c) => ({ ...c, important: false, headline: "" })) })).toBeNull();
  });
});
