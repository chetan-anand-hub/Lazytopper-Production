/** SERVER-PDF-1 PR-C: the server link path of a pack file, its silent fallbacks, the kill switch, and what gets registered. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const reg = vi.hoisted(() => ({ registerPackPaper: vi.fn(async () => undefined) }));
vi.mock("./packPaperRecord", async (orig) => ({ ...(await orig<typeof import("./packPaperRecord")>()), registerPackPaper: (...a: unknown[]) => (reg.registerPackPaper as (...x: unknown[]) => unknown)(...a) }));

import { buildPackFiles, type BuildContext } from "./buildPackFiles";
import { downloadFileFromServer, downloadGuestZipFromServer, downloadZipFromServer } from "./serverPdfDownload";
import { GUEST_ZIP_LINK_ENDPOINT, isServerPdfDisabled, requestFileLink, requestGuestZipLink, requestZipLink, SERVER_LINK_TIMEOUT_MS, SERVER_ZIP_TIMEOUT_MS } from "./serverPdfLinks";
import { groupIdForTemplateId, planUnit, templateIdForPackFile } from "./packTemplatePlan";
import type { OwnedPack } from "../../services/packs";

const NOW = "2026-11-13T09:00:00.000Z";
const URL_OK = "https://storage.googleapis.com/bucket/stamped/u1/abc/file.pdf?X-Goog-Signature=1";
const serverWs = { worksheetId: "pack-real-numbers-ct1", createdAt: "2026-01-01T00:00:00.000Z", title: "Real Numbers - Chapter Test 1", subject: "Maths", grade: "10", sectionFilter: "", totalMarks: 3, questions: [{ id: "q1" }], name: "Real Numbers - Chapter Test 1" };
const paper = { code: "PK-M-RN-CT1", reg: { kind: "chapter-test", name: "Real Numbers - Chapter Test 1", subject: "Maths", topicKey: "real-numbers" }, ws: serverWs };

const resp = (status: number, body: unknown = {}): Response => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;
const okBody = (over: Record<string, unknown> = {}) => ({ ok: true, url: URL_OK, filename: "LazyTopper-Real-Numbers-Chapter-Test-1-Questions.pdf", papers: [paper], ...over });
const headers = async () => ({ Authorization: "Bearer t" });

const pack: OwnedPack = { packId: "pack_chapter:real-numbers", sku: "pack_chapter", target: "real-numbers", pricePaidInr: 49, paidAt: 1, orderId: "order_Abc123Def456Gh" };
const CT1 = "pack_chapter:real-numbers|real-numbers|ct1-questions";

function harness(fetchImpl: typeof fetch, over: Partial<BuildContext> = {}) {
  const exportPdf = vi.fn(async () => "");
  const onDownload = vi.fn();
  const startDownload = vi.fn();
  const ctx: BuildContext = {
    licensee: { name: "Asha Rao", email: "asha@example.in" },
    owned: [pack],
    user: { uid: "u1" } as never,
    nowIso: () => NOW,
    exportPdf,
    onDownload,
    serverLinks: true,
    serverPdf: { fetchImpl, headers, startDownload, timeoutMs: 50 },
    ...over,
  };
  const build = async () => {
    const files = await buildPackFiles({ packId: pack.packId, sku: "pack_chapter", target: "real-numbers" }, ctx);
    const f = files.find((x) => x.id === CT1);
    if (!f) throw new Error("no ct1 file");
    await f.build();
    return files;
  };
  return { exportPdf, onDownload, startDownload, build };
}

beforeEach(() => {
  reg.registerPackPaper.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("the group id the browser derives is the one the plan records", () => {
  it("chapter, mocks and CBQ files agree with planUnit", async () => {
    for (const unit of [{ kind: "chapter", key: "real-numbers" }, { kind: "mocks", key: "maths" }, { kind: "cbq", key: "maths" }] as const) {
      const files = await planUnit(unit);
      expect(files.length).toBeGreaterThan(0);
      for (const f of files) expect(groupIdForTemplateId(f.templateId), f.templateId).toBe(f.groupId);
    }
  });
  it("a built file carries its pack and group ids", async () => {
    const h = harness((async () => resp(200, okBody())) as never);
    const files = await buildPackFiles({ packId: pack.packId, sku: "pack_chapter", target: "real-numbers" }, { licensee: { name: "A", email: "a@b.in" }, owned: [pack], exportPdf: h.exportPdf });
    for (const f of files) {
      expect(f.packId).toBe(pack.packId);
      expect(f.groupId).toBe("real-numbers");
      expect(templateIdForPackFile(f.packId, f.id)).toBeTruthy();
    }
  });
});

describe("requestFileLink / requestZipLink", () => {
  it("returns the link, the filename and the papers on a good answer, and posts the ids", async () => {
    const f = vi.fn(async () => resp(200, okBody()));
    const r = await requestFileLink(pack.packId, CT1, { fetchImpl: f as never, headers });
    expect(r).toEqual({ ok: true, link: { url: URL_OK, filename: "LazyTopper-Real-Numbers-Chapter-Test-1-Questions.pdf", papers: [paper] } });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/packs/file-link");
    expect(JSON.parse(String(init.body))).toEqual({ packId: pack.packId, fileId: CT1 });
    const z = await requestZipLink(pack.packId, "real-numbers", { fetchImpl: (async () => resp(200, okBody({ files: [{ fileId: CT1, filename: "a.pdf", label: "x", codes: ["PK-M-RN-CT1"] }] }))) as never, headers });
    expect(z.ok && z.link.files).toEqual([{ fileId: CT1, filename: "a.pdf", label: "x", codes: ["PK-M-RN-CT1"] }]);
  });

  it.each([
    [404, "unavailable"],
    [503, "not_ready"],
    [429, "busy"],
    [403, "refused"],
    [500, "refused"],
  ])("HTTP %i is a quiet %s", async (status, reason) => {
    expect(await requestFileLink(pack.packId, CT1, { fetchImpl: (async () => resp(status as number)) as never, headers })).toEqual({ ok: false, reason });
  });

  it("a network error, a timeout (the call is aborted), a signed-out buyer and a malformed answer are quiet failures too", async () => {
    expect(await requestFileLink(pack.packId, CT1, { fetchImpl: (async () => Promise.reject(new TypeError("offline"))) as never, headers })).toEqual({ ok: false, reason: "network" });
    const hang = ((_u: string, init: RequestInit) => new Promise((_res, rej) => init.signal?.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError"))))) as never;
    expect(await requestFileLink(pack.packId, CT1, { fetchImpl: hang, headers, timeoutMs: 20 })).toEqual({ ok: false, reason: "timeout" });
    expect(await requestFileLink(pack.packId, CT1, { fetchImpl: (async () => resp(200, okBody())) as never, headers: async () => Promise.reject(new Error("signed-out")) })).toEqual({ ok: false, reason: "network" });
    for (const bad of [{}, okBody({ url: "http://insecure/x.pdf" }), okBody({ url: 5 }), okBody({ papers: "no" }), okBody({ papers: [{ code: "X" }] })]) {
      expect(await requestFileLink(pack.packId, CT1, { fetchImpl: (async () => resp(200, bad)) as never, headers })).toEqual({ ok: false, reason: "bad_response", counted: true });
    }
    expect(SERVER_LINK_TIMEOUT_MS).toBe(20_000);
  });

  it("the kill switch answers without asking the server", async () => {
    const f = vi.fn();
    expect(await requestFileLink(pack.packId, CT1, { fetchImpl: f as never, headers, disabled: true })).toEqual({ ok: false, reason: "disabled" });
    expect(await requestZipLink(pack.packId, "real-numbers", { fetchImpl: f as never, headers, disabled: true })).toEqual({ ok: false, reason: "disabled" });
    expect(f).not.toHaveBeenCalled();
  });

  it("VITE_PACK_SERVER_PDF_DISABLED: 1 / true / on / yes turn it off; anything else leaves it on", () => {
    expect(isServerPdfDisabled()).toBe(false);
    for (const v of ["1", "true", "ON", "Yes"]) {
      vi.stubEnv("VITE_PACK_SERVER_PDF_DISABLED", v);
      expect(isServerPdfDisabled(), v).toBe(true);
    }
    for (const v of ["0", "", "false", "no"]) {
      vi.stubEnv("VITE_PACK_SERVER_PDF_DISABLED", v);
      expect(isServerPdfDisabled(), v).toBe(false);
    }
  });
});

describe("a pack file with serverLinks", () => {
  it("uses the server link: the browser is handed the signed URL, nothing is built here, and NO client pack_download is sent", async () => {
    const h = harness((async () => resp(200, okBody())) as never);
    await h.build();
    expect(h.startDownload).toHaveBeenCalledTimes(1);
    expect(h.startDownload).toHaveBeenCalledWith(URL_OK, "LazyTopper-Real-Numbers-Chapter-Test-1-Questions.pdf");
    expect(h.exportPdf).not.toHaveBeenCalled();
    expect(h.onDownload).not.toHaveBeenCalled();
  });

  it("R1: registers EXACTLY the server's ws, with only createdAt set to the download time", async () => {
    const h = harness((async () => resp(200, okBody())) as never);
    await h.build();
    expect(reg.registerPackPaper).toHaveBeenCalledTimes(1);
    const [user, r] = reg.registerPackPaper.mock.calls[0] as unknown as [unknown, Record<string, unknown>];
    expect(user).toEqual({ uid: "u1" });
    expect(r).toEqual({ kind: "chapter-test", code: "PK-M-RN-CT1", name: "Real Numbers - Chapter Test 1", subject: "Maths", topicKey: "real-numbers", paper: { ...serverWs, createdAt: NOW } });
  });

  it.each([
    ["404 kill switch", () => resp(404)],
    ["503 not_ready", () => resp(503, { ok: false, error: "not_ready" })],
    ["429", () => resp(429)],
    ["500", () => resp(500)],
  ])("falls back silently to the in-browser builder on %s", async (_n, answer) => {
    const h = harness((async () => answer()) as never);
    await h.build();
    expect(h.startDownload).not.toHaveBeenCalled();
    expect(h.exportPdf).toHaveBeenCalledTimes(1);
    expect(h.onDownload).toHaveBeenCalledTimes(1); // no link was issued, so the fallback counts its own download
  });

  it("a link was issued (the server counted) but the answer is unusable or the download cannot start: build here, send NO client pack_download", async () => {
    const malformed = harness((async () => resp(200, { ok: true })) as never);
    await malformed.build();
    expect(malformed.exportPdf).toHaveBeenCalledTimes(1);
    expect(malformed.onDownload).not.toHaveBeenCalled();
    const blocked = harness((async () => resp(200, okBody())) as never);
    blocked.startDownload.mockImplementation(() => {
      throw new Error("blocked");
    });
    await blocked.build();
    expect(blocked.exportPdf).toHaveBeenCalledTimes(1);
    expect(blocked.onDownload).not.toHaveBeenCalled();
    expect(reg.registerPackPaper).toHaveBeenCalledTimes(2); // one per fallback build; nothing from the unused links
  });

  it("grading safety: a returned paper list that does not cover the file's printed paper code falls back (and does not count twice)", async () => {
    const h = harness((async () => resp(200, okBody({ papers: [] }))) as never);
    await h.build();
    expect(h.startDownload).not.toHaveBeenCalled();
    expect(h.exportPdf).toHaveBeenCalledTimes(1);
    expect(h.onDownload).not.toHaveBeenCalled();
    const other = harness((async () => resp(200, okBody({ papers: [{ ...paper, code: "PK-M-RN-CT9" }] }))) as never);
    await other.build();
    expect(other.startDownload).not.toHaveBeenCalled();
    expect(other.exportPdf).toHaveBeenCalledTimes(1);
  });

  it("a several-paper (CBQ chapter) file: one server link, every paper registered from the server ws, one download, no client count; a short paper list falls back", async () => {
    const cbq: OwnedPack = { packId: "pack_cbq:maths", sku: "pack_cbq", target: "maths", pricePaidInr: 199, paidAt: 1, orderId: "order_Cbq1" };
    const mk = (over: Partial<BuildContext> = {}) => {
      const exportSetsPdf = vi.fn(async () => "");
      const onDownload = vi.fn();
      const startDownload = vi.fn();
      return { exportSetsPdf, onDownload, startDownload, ctx: { licensee: { name: "Asha Rao", email: "asha@example.in" }, owned: [cbq], user: { uid: "u1" } as never, nowIso: () => NOW, exportSetsPdf, onDownload, serverLinks: true, ...over } as BuildContext };
    };
    const probe = mk();
    const files = await buildPackFiles({ packId: cbq.packId, sku: "pack_cbq", target: "maths" }, probe.ctx);
    const file = files.find((f) => (f.codes?.length ?? 0) > 1);
    if (!file || !file.codes) throw new Error("no several-paper file");
    const papers = file.codes.map((code) => ({ ...paper, code, reg: { ...paper.reg, kind: "worksheet" }, ws: { ...serverWs, worksheetId: `ws-${code}` } }));
    const good = mk();
    good.ctx.serverPdf = { fetchImpl: (async () => resp(200, okBody({ papers }))) as never, headers, startDownload: good.startDownload };
    await (await buildPackFiles({ packId: cbq.packId, sku: "pack_cbq", target: "maths" }, good.ctx)).find((f) => f.id === file.id)!.build();
    expect(good.startDownload).toHaveBeenCalledTimes(1);
    expect(good.exportSetsPdf).not.toHaveBeenCalled();
    expect(good.onDownload).not.toHaveBeenCalled();
    expect(reg.registerPackPaper.mock.calls.map((c) => (c as unknown as [unknown, { code: string; paper: { createdAt: string } }])[1]).map((x) => [x.code, x.paper.createdAt])).toEqual(file.codes.map((c) => [c, NOW]));
    reg.registerPackPaper.mockClear();
    const short = mk();
    short.ctx.serverPdf = { fetchImpl: (async () => resp(200, okBody({ papers: papers.slice(0, 1) }))) as never, headers, startDownload: short.startDownload };
    await (await buildPackFiles({ packId: cbq.packId, sku: "pack_cbq", target: "maths" }, short.ctx)).find((f) => f.id === file.id)!.build();
    expect(short.startDownload).not.toHaveBeenCalled();
    expect(short.exportSetsPdf).toHaveBeenCalledTimes(1);
    expect(short.onDownload).not.toHaveBeenCalled(); // the server had counted this link
  });

  it("falls back on a network error and on a timeout", async () => {
    const net = harness((async () => Promise.reject(new TypeError("offline"))) as never);
    await net.build();
    expect(net.exportPdf).toHaveBeenCalledTimes(1);
    const hang = harness(((_u: string, init: RequestInit) => new Promise((_r, rej) => init.signal?.addEventListener("abort", () => rej(new Error("abort"))))) as never);
    await hang.build();
    expect(hang.exportPdf).toHaveBeenCalledTimes(1);
    expect(hang.startDownload).not.toHaveBeenCalled();
  });

  it("falls back when the browser cannot start the download (nothing was handed over)", async () => {
    const h = harness((async () => resp(200, okBody())) as never);
    h.startDownload.mockImplementation(() => {
      throw new Error("blocked");
    });
    await h.build();
    expect(h.exportPdf).toHaveBeenCalledTimes(1);
  });

  it("VITE_PACK_SERVER_PDF_DISABLED forces the in-browser builder and never calls the server", async () => {
    vi.stubEnv("VITE_PACK_SERVER_PDF_DISABLED", "1");
    const f = vi.fn(async () => resp(200, okBody()));
    const h = harness(f as never, { serverPdf: { fetchImpl: f as never, headers, startDownload: vi.fn() } });
    await h.build();
    expect(f).not.toHaveBeenCalled();
    expect(h.exportPdf).toHaveBeenCalledTimes(1);
  });

  it("without serverLinks (shop previews, samples, today's callers) the server is never asked", async () => {
    const f = vi.fn(async () => resp(200, okBody()));
    const h = harness(f as never, { serverLinks: false });
    await h.build();
    expect(f).not.toHaveBeenCalled();
    expect(h.exportPdf).toHaveBeenCalledTimes(1);
  });

  it("a buyer with no licensee contact still gets nothing: the guard runs before either path", async () => {
    const f = vi.fn(async () => resp(200, okBody()));
    const h = harness(f as never, { licensee: { name: "", email: "" } });
    await expect(h.build()).rejects.toThrow("licensee_unavailable");
    expect(f).not.toHaveBeenCalled();
  });
});

describe("downloadZipFromServer", () => {
  it("a ZIP waits up to 90 s for its link (a file link 20 s); a short paper list means no download", async () => {
    expect(SERVER_ZIP_TIMEOUT_MS).toBe(90_000);
    vi.useFakeTimers();
    try {
      let aborted = false;
      const slow = ((_u: string, init: RequestInit) => new Promise((_r, rej) => init.signal?.addEventListener("abort", () => { aborted = true; rej(new Error("abort")); }))) as never;
      const pending = requestZipLink(pack.packId, "real-numbers", { fetchImpl: slow, headers: async () => ({}) });
      await vi.advanceTimersByTimeAsync(30_000);
      expect(aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(61_000);
      expect(aborted).toBe(true);
      expect(await pending).toEqual({ ok: false, reason: "timeout" });
    } finally {
      vi.useRealTimers();
    }
    const startDownload = vi.fn();
    const r = await downloadZipFromServer({ packId: pack.packId, groupId: "real-numbers", expectCodes: ["PK-M-RN-CT1", "PK-M-RN-CT2"] }, { fetchImpl: (async () => resp(200, okBody({ files: [] }))) as never, headers, startDownload });
    expect(r).toEqual({ ok: false, reason: "bad_response", counted: true });
    expect(startDownload).not.toHaveBeenCalled();
  });

  it("starts the ZIP and registers every paper the ZIP prints from the server's ws (createdAt = the download time)", async () => {
    const two = { ...paper, code: "PK-M-RN-CT2", ws: { ...serverWs, worksheetId: "pack-real-numbers-ct2" } };
    const startDownload = vi.fn();
    const r = await downloadZipFromServer(
      { packId: pack.packId, groupId: "real-numbers", user: { uid: "u1" } as never },
      { fetchImpl: (async () => resp(200, okBody({ url: "https://storage.googleapis.com/z.zip", filename: "lazytopper-real-numbers.zip", papers: [paper, two], files: [] }))) as never, headers, startDownload, nowIso: () => NOW },
    );
    expect(r).toEqual({ ok: true });
    expect(startDownload).toHaveBeenCalledWith("https://storage.googleapis.com/z.zip", "lazytopper-real-numbers.zip");
    expect(reg.registerPackPaper.mock.calls.map((c) => (c as unknown as [unknown, { code: string; paper: { createdAt: string } }])[1]).map((x) => [x.code, x.paper.createdAt])).toEqual([["PK-M-RN-CT1", NOW], ["PK-M-RN-CT2", NOW]]);
  });

  it("downloads and registers nothing on a failure", async () => {
    for (const status of [404, 503, 429]) {
      const startDownload = vi.fn();
      const r = await downloadZipFromServer({ packId: pack.packId, groupId: "real-numbers" }, { fetchImpl: (async () => resp(status)) as never, headers, startDownload });
      expect(r.ok).toBe(false);
      expect(startDownload).not.toHaveBeenCalled();
    }
    expect(reg.registerPackPaper).not.toHaveBeenCalled();
  });

  it("downloadFileFromServer reports the reason so the caller can fall back", async () => {
    expect(await downloadFileFromServer({ packId: pack.packId, fileId: CT1 }, { fetchImpl: (async () => resp(503)) as never, headers })).toEqual({ ok: false, reason: "not_ready" });
  });
});

describe("GUEST-ZIP-1 - the signed-out whole-pack ZIP", () => {
  const proof = { orderId: "order_1", paymentId: "pay_1", signature: "ab".repeat(32) };
  const zipBody = () => okBody({ filename: "lazytopper-pack-cbq-maths.zip", files: [{ fileId: "f1", filename: "a.pdf", label: "A", codes: ["PK-M-RN-CT1"] }] });

  it("posts ONLY the receipt proof to the guest endpoint with NO auth header, and the longer ZIP timeout", async () => {
    const f = vi.fn(async () => resp(200, zipBody()));
    const r = await requestGuestZipLink(proof, { fetchImpl: f as never });
    expect(r.ok).toBe(true);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(GUEST_ZIP_LINK_ENDPOINT);
    expect(JSON.parse(String(init.body))).toEqual(proof);
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(SERVER_ZIP_TIMEOUT_MS).toBeGreaterThan(SERVER_LINK_TIMEOUT_MS);
  });

  it("downloads the ZIP once, files the papers with NO account (user null), and a refusal downloads nothing", async () => {
    const startDownload = vi.fn();
    const ok = await downloadGuestZipFromServer({ proof, expectCodes: ["PK-M-RN-CT1"] }, { fetchImpl: (async () => resp(200, zipBody())) as never, startDownload, nowIso: () => NOW });
    expect(ok).toEqual({ ok: true });
    expect(startDownload).toHaveBeenCalledTimes(1);
    expect(reg.registerPackPaper).toHaveBeenCalledTimes(1);
    expect((reg.registerPackPaper.mock.calls[0] as unknown[])[0]).toBeNull();
    startDownload.mockClear();
    expect(await downloadGuestZipFromServer({ proof }, { fetchImpl: (async () => resp(403, { ok: false, error: "expired" })) as never, startDownload })).toEqual({ ok: false, reason: "refused" });
    expect(await downloadGuestZipFromServer({ proof }, { fetchImpl: (async () => resp(404)) as never, startDownload })).toEqual({ ok: false, reason: "unavailable" });
    // the server's papers must cover every printed code, or nothing is downloaded
    expect(await downloadGuestZipFromServer({ proof, expectCodes: ["PK-OTHER"] }, { fetchImpl: (async () => resp(200, zipBody())) as never, startDownload })).toEqual({ ok: false, reason: "bad_response", counted: true });
    expect(startDownload).not.toHaveBeenCalled();
  });
});
