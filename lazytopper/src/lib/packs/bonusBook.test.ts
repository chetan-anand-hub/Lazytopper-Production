/** BONUS-BOOK-1 - the CBQ Pack's complete-book bonus: the /mine field is read strictly, and the link asks the bonus route for that pack only. */
import { describe, expect, it } from "vitest";
import { readBonusBooks } from "../../services/packs";
import { PACK_BONUS_LINK_ENDPOINT, requestBonusLink } from "./serverPdfLinks";

describe("BONUS-BOOK-1", () => {
  it("readBonusBooks keeps only CBQ Pack ids", () => {
    expect(readBonusBooks(["pack_cbq:maths", "pack_cbq:science", "pack_subject:maths", "pack_bundle:all", 7, "pack_cbq:maths"])).toEqual(["pack_cbq:maths", "pack_cbq:science"]);
    expect(readBonusBooks(undefined)).toEqual([]);
    expect(readBonusBooks("pack_cbq:maths")).toEqual([]);
  });

  it("requestBonusLink posts {packId} to the bonus route and reads the signed link", async () => {
    const calls: Array<{ url: string; body: string }> = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body) });
      return new Response(JSON.stringify({ ok: true, url: "https://signed.example/book", filename: "LazyTopper-CBQ-Maths-Complete-Book.pdf", papers: [] }), { status: 200 });
    }) as unknown as typeof fetch;
    const res = await requestBonusLink("pack_cbq:maths", { fetchImpl, headers: async () => ({}), disabled: false });
    expect(calls).toEqual([{ url: PACK_BONUS_LINK_ENDPOINT, body: JSON.stringify({ packId: "pack_cbq:maths" }) }]);
    expect(res).toEqual({ ok: true, link: { url: "https://signed.example/book", filename: "LazyTopper-CBQ-Maths-Complete-Book.pdf", papers: [] } });
  });

  it("a not-uploaded book (503) and a switched-off route (404) are quiet failures", async () => {
    const mk = (status: number) => (async () => new Response("{}", { status })) as unknown as typeof fetch;
    expect(await requestBonusLink("pack_cbq:maths", { fetchImpl: mk(503), headers: async () => ({}), disabled: false })).toEqual({ ok: false, reason: "not_ready" });
    expect(await requestBonusLink("pack_cbq:maths", { fetchImpl: mk(404), headers: async () => ({}), disabled: false })).toEqual({ ok: false, reason: "unavailable" });
  });
});
