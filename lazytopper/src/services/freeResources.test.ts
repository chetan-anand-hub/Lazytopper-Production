import { describe, it, expect, vi } from "vitest";

import {
  EMPTY_FREE_LIST, FREE_LINK_ENDPOINT, FREE_LIST_ENDPOINT, FREE_RETURN_PATH, FREE_SIGN_IN_PATH, fetchFreeResources, formatBytes, parseFreeList, requestFreeLink,
} from "./freeResources";
import { isSafeInternalPath } from "../utils/safeInternalPath";
import { isUsableSigninTarget } from "../pages/Login";

const good = {
  ok: true,
  resources: [
    { id: "mcq-maths-real-numbers", kind: "mcq_bank", subject: "Maths", chapter: "Real Numbers", title: "Real Numbers · MCQ Practice Bank", bytes: 1_500_000, pages: 12, questions: 40 },
    { id: "mcq-science-light", kind: "mcq_bank", subject: "Science", chapter: "Light", title: "Light", bytes: 900_000, pages: 9, questions: null },
  ],
  zips: [{ id: "zip-maths", group: "maths", bytes: 1_500_000, count: 1 }],
};
const json = (body: unknown, status = 200): Response => new Response(typeof body === "string" ? body : JSON.stringify(body), { status });

describe("freeResources service", () => {
  it("parses a good list", () => {
    const out = parseFreeList(good);
    expect(out.resources).toHaveLength(2);
    expect(out.zips).toEqual([{ id: "zip-maths", group: "maths", bytes: 1_500_000, count: 1 }]);
  });

  it("every malformed shape is the EMPTY list (never a throw)", () => {
    for (const bad of [null, undefined, 5, "x", [], {}, { ok: false, resources: good.resources }, { ok: true, resources: "nope" }, { ok: true, resources: [] }, { ok: true, resources: [{ id: "x" }] }]) {
      expect(parseFreeList(bad)).toBe(EMPTY_FREE_LIST);
    }
  });

  it("drops an entry with an unknown kind or subject but keeps the good ones", () => {
    const out = parseFreeList({ ...good, resources: [{ ...good.resources[0], kind: "answer_key" }, { ...good.resources[0], id: "b", subject: "English" }, good.resources[1]] });
    expect(out.resources.map((r) => r.id)).toEqual(["mcq-science-light"]);
  });

  it("a kit entry parses (subject All), but only a kit may use subject All", () => {
    const kit = { id: "kit", kind: "kit", subject: "All", chapter: "K", title: "Boards 2027 Excellence Kit", bytes: 10, pages: 3, questions: null };
    expect(parseFreeList({ ...good, resources: [...good.resources, kit] }).resources.map((r) => r.kind)).toContain("kit");
    expect(parseFreeList({ ...good, resources: [{ ...kit, kind: "mcq_bank" }] })).toBe(EMPTY_FREE_LIST);
  });

  it("a list with zips but no resources is empty (nothing to download, nothing shown)", () => {
    expect(parseFreeList({ ok: true, resources: [], zips: good.zips })).toBe(EMPTY_FREE_LIST);
  });

  it("fetchFreeResources: GETs the public endpoint with NO credentials", async () => {
    const fetchImpl = vi.fn(async () => json(good));
    const out = await fetchFreeResources({ fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(out.resources).toHaveLength(2);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(FREE_LIST_ENDPOINT);
    expect(JSON.stringify(init.headers ?? {})).not.toMatch(/authorization/i);
  });

  it("fetchFreeResources: network error, 404, 500, non-JSON (an SPA fallback page) and a timeout are all the empty list", async () => {
    const cases: Array<() => Promise<Response>> = [
      async () => {
        throw new Error("offline");
      },
      async () => json({ error: "nf" }, 404),
      async () => json("boom", 500),
      async () => json("<!doctype html><html></html>"),
    ];
    for (const c of cases) expect(await fetchFreeResources({ fetchImpl: vi.fn(c) as unknown as typeof fetch })).toBe(EMPTY_FREE_LIST);
    const hang = vi.fn((_u: string, init?: RequestInit) => new Promise<Response>((_res, rej) => init?.signal?.addEventListener("abort", () => rej(new Error("aborted")))));
    expect(await fetchFreeResources({ fetchImpl: hang as unknown as typeof fetch, timeoutMs: 5 })).toBe(EMPTY_FREE_LIST);
  });

  it("requestFreeLink: POSTs { id } with the bearer header and returns the https url", async () => {
    const fetchImpl = vi.fn(async () => json({ ok: true, url: "https://storage.googleapis.com/x?sig=1", filename: "LazyTopper-Free-MCQ-Bank-Maths-Real-Numbers.pdf" }));
    const out = await requestFreeLink("mcq-maths-real-numbers", { fetchImpl: fetchImpl as unknown as typeof fetch, headers: async () => ({ Authorization: "Bearer t" }) });
    expect(out).toEqual({ ok: true, url: "https://storage.googleapis.com/x?sig=1", filename: "LazyTopper-Free-MCQ-Bank-Maths-Real-Numbers.pdf" });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(FREE_LINK_ENDPOINT);
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ id: "mcq-maths-real-numbers" }));
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer t");
  });

  it("requestFreeLink: signed out (no token) never reaches the network", async () => {
    const fetchImpl = vi.fn();
    const out = await requestFreeLink("x", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      headers: async () => {
        throw new Error("signed-out");
      },
    });
    expect(out).toEqual({ ok: false, reason: "signed_out" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("requestFreeLink: maps 401 / 429 / 404 / 500 and refuses a non-https url", async () => {
    const headers = async () => ({ Authorization: "Bearer t" });
    const run = (res: () => Response) => requestFreeLink("x", { headers, fetchImpl: (async () => res()) as unknown as typeof fetch });
    expect(await run(() => json({}, 401))).toEqual({ ok: false, reason: "signed_out" });
    expect(await run(() => json({}, 429))).toEqual({ ok: false, reason: "busy" });
    expect(await run(() => json({}, 404))).toEqual({ ok: false, reason: "unavailable" });
    expect(await run(() => json({}, 500))).toEqual({ ok: false, reason: "refused" });
    expect(await run(() => json({ ok: true, url: "http://insecure.example/x" }))).toEqual({ ok: false, reason: "bad_response" });
    expect(await run(() => json({ ok: true, url: "javascript:alert(1)" }))).toEqual({ ok: false, reason: "bad_response" });
    expect(await run(() => json("not json"))).toEqual({ ok: false, reason: "bad_response" });
  });

  it("formatBytes", () => {
    expect(formatBytes(820 * 1024)).toBe("820 KB");
    expect(formatBytes(1_500_000)).toBe("1.4 MB");
    expect(formatBytes(30 * 1024 * 1024)).toBe("30 MB");
  });

  it("the sign-in return is a fixed SAME-ORIGIN path that Login itself accepts (and the guard rejects every external form)", () => {
    expect(FREE_RETURN_PATH).toBe("/cbse/class-10#free");
    expect(isSafeInternalPath(FREE_RETURN_PATH)).toBe(true);
    expect(isUsableSigninTarget(FREE_RETURN_PATH)).toBe(true);
    expect(FREE_SIGN_IN_PATH).toBe("/login?redirect=%2Fcbse%2Fclass-10%23free");
    expect(new URL(FREE_SIGN_IN_PATH, "https://lazytopper.com").searchParams.get("redirect")).toBe(FREE_RETURN_PATH);
    for (const evil of ["https://evil.example/", "//evil.example", "/\\evil.example", "javascript:alert(1)", "/\t/evil.example"]) {
      expect(isUsableSigninTarget(evil), evil).toBe(false);
    }
  });
});
