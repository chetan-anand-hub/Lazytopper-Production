// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import { PACK_CHAPTER_SLUGS, chaptersOfSubject } from "../../services/packs";
import {
  PASS_OFFERS_SNOOZE_KEY,
  PASS_OFFERS_SNOOZE_MS,
  PASS_SUCCESS_LEAD,
  passOfferBuyHref,
  passOffersSnoozed,
  pickPassOwnerOffer,
  singleChapterSlug,
  snoozePassOffers,
} from "./passOwnerOffersModel";
import { readBuyResume } from "../packs/PacksShop";
// GST-EXCL-1: expected prices are read through the shared helpers, so the copy is right on both sides of 7 Nov 2026.
import { packPayLabel } from "../../services/packs";

const ids = (...xs: string[]) => xs.map((packId) => ({ packId }));
const MATHS_CH = chaptersOfSubject("maths")[0];
const SCI_CH = chaptersOfSubject("science")[0];
const ALL_CHAPTERS = PACK_CHAPTER_SLUGS.map((s) => `pack_chapter:${s}`);

describe("pass_success - the CBQ Packs, both subjects, worded as essential", () => {
  it("offers Maths and Science at the pack-constant price, with the owner's sentence", () => {
    const o = pickPassOwnerOffer("pass_success", {}, [])!;
    expect(o.lead).toBe(PASS_SUCCESS_LEAD);
    expect(o.lead).toContain("Your Board Pass is on. Prefer practising on paper too? The CBQ Packs put the case-based questions in print");
    expect(o.items.map((i) => i.label)).toEqual([`Maths ${packPayLabel("pack_cbq")}`, `Science ${packPayLabel("pack_cbq")}`]);
    expect(o.lead.toLowerCase()).not.toContain("optional");
  });
  it("never an owned pack: one subject owned -> only the other; both owned -> nothing", () => {
    expect(pickPassOwnerOffer("pass_success", {}, ids("pack_cbq:maths"))!.items.map((i) => i.target)).toEqual(["science"]);
    expect(pickPassOwnerOffer("pass_success", {}, ids("pack_cbq:maths", "pack_cbq:science"))).toBeNull();
  });
});

describe("pass_download - the matching pack for that chapter / subject", () => {
  it("a known chapter -> its Chapter Pack (₹49)", () => {
    const o = pickPassOwnerOffer("pass_download", { chapterSlug: MATHS_CH, chapterName: "Real Numbers" }, [])!;
    expect(o.items).toEqual([{ sku: "pack_chapter", target: MATHS_CH, label: `Chapter Pack ${packPayLabel("pack_chapter")}` }]);
    expect(o.lead).toContain("Real Numbers Chapter Pack");
  });
  it("covered by the chapter, its Subject Pack or the Bundle -> nothing", () => {
    expect(pickPassOwnerOffer("pass_download", { chapterSlug: MATHS_CH }, ids(`pack_chapter:${MATHS_CH}`))).toBeNull();
    expect(pickPassOwnerOffer("pass_download", { chapterSlug: MATHS_CH }, ids("pack_subject:maths"))).toBeNull();
    expect(pickPassOwnerOffer("pass_download", { chapterSlug: MATHS_CH }, ids("pack_bundle:all"))).toBeNull();
  });
  it("another subject's pack does not cover it", () => {
    expect(pickPassOwnerOffer("pass_download", { chapterSlug: MATHS_CH }, ids("pack_subject:science"))).not.toBeNull();
  });
  it("no chapter (a Full Mock / mixed worksheet) -> the subject's Subject Pack; unknown chapter slug is never guessed", () => {
    expect(pickPassOwnerOffer("pass_download", { subject: "science" }, [])!.items[0]).toMatchObject({ sku: "pack_subject", target: "science" });
    expect(pickPassOwnerOffer("pass_download", { chapterSlug: "not-a-chapter", subject: "maths" }, [])!.items[0].sku).toBe("pack_subject");
    expect(pickPassOwnerOffer("pass_download", {}, [])).toBeNull();
    expect(pickPassOwnerOffer("pass_download", { subject: "maths" }, ids("pack_subject:maths"))).toBeNull();
  });
  it("a chapter slug alone tells the subject", () => {
    expect(pickPassOwnerOffer("pass_download", { chapterSlug: SCI_CH }, ids(`pack_chapter:${SCI_CH}`))).toBeNull();
  });
});

describe("pass_mock - the Mock Pack of that subject (the Bundle when the subject is unknown)", () => {
  it("Mock Pack ₹99 for the subject", () => {
    expect(pickPassOwnerOffer("pass_mock", { subject: "maths" }, [])!.items).toEqual([
      { sku: "pack_mock", target: "maths", label: `Maths Mock Pack ${packPayLabel("pack_mock")}` },
    ]);
  });
  it("owned (or covered by the Subject Pack / Bundle) -> nothing", () => {
    expect(pickPassOwnerOffer("pass_mock", { subject: "maths" }, ids("pack_mock:maths"))).toBeNull();
    expect(pickPassOwnerOffer("pass_mock", { subject: "maths" }, ids("pack_bundle:all"))).toBeNull();
  });
  it("no subject -> the Bundle, unless owned", () => {
    expect(pickPassOwnerOffer("pass_mock", {}, [])!.items[0].sku).toBe("pack_bundle");
    expect(pickPassOwnerOffer("pass_mock", {}, ids("pack_bundle:all"))).toBeNull();
  });
});

describe("pass_me - one small card", () => {
  it("the CBQ Packs first, then the Bundle, then nothing", () => {
    expect(pickPassOwnerOffer("pass_me", {}, [])!.items.map((i) => i.sku)).toEqual(["pack_cbq", "pack_cbq"]);
    const both = ids("pack_cbq:maths", "pack_cbq:science");
    expect(pickPassOwnerOffer("pass_me", {}, both)!.items).toEqual([{ sku: "pack_bundle", target: undefined, label: `Maths + Science Bundle ${packPayLabel("pack_bundle")}` }]);
    expect(pickPassOwnerOffer("pass_me", {}, [...both, ...ids("pack_mock:maths", "pack_mock:science", ...ALL_CHAPTERS)])).toBeNull();
  });
});

describe("the buy link is the central /packs one-tap resume (PacksShop.readBuyResume accepts it)", () => {
  it("chapter, subject, cbq and bundle", () => {
    const cases = [
      { sku: "pack_chapter" as const, target: MATHS_CH, label: "" },
      { sku: "pack_mock" as const, target: "science", label: "" },
      { sku: "pack_cbq" as const, target: "maths", label: "" },
      { sku: "pack_bundle" as const, target: undefined, label: "" },
    ];
    for (const item of cases) {
      const href = passOfferBuyHref(item);
      expect(href.startsWith("/packs?buy=")).toBe(true);
      expect(readBuyResume(href.slice("/packs".length))).toEqual({ sku: item.sku, target: item.target });
    }
  });
});

describe("singleChapterSlug", () => {
  it("one shared slug, else null", () => {
    expect(singleChapterSlug(["a", "a", ""])).toBe("a");
    expect(singleChapterSlug(["a", "b"])).toBeNull();
    expect(singleChapterSlug([])).toBeNull();
  });
});

describe('"Not now" hides every offer for one day on this device', () => {
  afterEach(() => window.localStorage.clear());
  const T = Date.parse("2026-11-04T10:00:00Z");
  it("snoozed for exactly a day", () => {
    expect(passOffersSnoozed(T)).toBe(false);
    snoozePassOffers(T);
    expect(window.localStorage.getItem(PASS_OFFERS_SNOOZE_KEY)).toBe(String(T + PASS_OFFERS_SNOOZE_MS));
    expect(passOffersSnoozed(T + PASS_OFFERS_SNOOZE_MS - 1)).toBe(true);
    expect(passOffersSnoozed(T + PASS_OFFERS_SNOOZE_MS)).toBe(false);
  });
  it("a garbage or far-future value is ignored", () => {
    window.localStorage.setItem(PASS_OFFERS_SNOOZE_KEY, "nope");
    expect(passOffersSnoozed(T)).toBe(false);
    window.localStorage.setItem(PASS_OFFERS_SNOOZE_KEY, String(T + 10 * PASS_OFFERS_SNOOZE_MS));
    expect(passOffersSnoozed(T)).toBe(false);
  });
});
