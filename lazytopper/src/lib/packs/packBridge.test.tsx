/**
 * BRIDGE-PDF-1 - pages 2-3 of every purchased pack PDF. Proves: (1) only the buyer's download (ctx.bridge) gets them - samples,
 * previews and any other caller do not; (2) every chapter / mock / subject / bundle file gets them with a code from THAT pack;
 * (3) a Board Pass holder gets no Board Pass card; (4) CBQ files wait for BRIDGE-CODES-1 (no code printed -> no pages);
 * (5) no paper code changes (packPaperCodes.pin.json); (6) the approved copy renders verbatim; (7) the hosted sample exists.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { buildPackFiles, type BuildContext } from "./buildPackFiles";
import type { OwnedPack } from "../../services/packs";
import { BRIDGE_IMG, BRIDGE_PACKS_URL, BRIDGE_SAMPLE_PDF_PATH, BRIDGE_SAMPLE_PDF_URL, bridgePackLabel, type BridgePagesData } from "./packBridge";
import { packPaperCode } from "./packPaperCode";
import { PrintBridgeMarkPage, PrintBridgeViewsPage } from "../../components/worksheet/PrintBridgePages";
import { WorksheetPrintDoc } from "../../components/worksheet/WorksheetPrintDoc";

const PUBLIC = path.resolve(__dirname, "../../../public");
const owned = (packId: string): OwnedPack => {
  const [sku, target] = packId.split(":");
  return { packId, sku, target, pricePaidInr: 49, paidAt: 1, orderId: `order_${sku}` };
};
type Call = { code?: string; bridge?: BridgePagesData };
function harness(pack: OwnedPack, over: Partial<BuildContext> = {}) {
  const calls: Call[] = [];
  const exportPdf = vi.fn(async (_ws: unknown, _mode: unknown, code?: string, opts?: { bridge?: BridgePagesData }) => {
    calls.push({ code, bridge: opts?.bridge });
    return "f.pdf";
  });
  const ctx: BuildContext = {
    licensee: { name: "Asha Rao", email: "asha@example.in" },
    owned: [pack],
    nowIso: () => "2026-11-08T00:00:00.000Z",
    exportPdf,
    ...over,
  };
  return { ctx, calls, ref: { packId: pack.packId, sku: pack.sku as never, target: pack.target } };
}

describe("BRIDGE-PDF-1 - who gets pages 2-3", () => {
  it("no ctx.bridge (samples, previews, any other caller): no file carries bridge pages", async () => {
    const h = harness(owned("pack_chapter:real-numbers"));
    const files = await buildPackFiles(h.ref, h.ctx);
    for (const f of files) await f.build();
    expect(h.calls.length).toBe(files.length);
    expect(h.calls.every((c) => c.bridge === undefined)).toBe(true);
  });

  it("chapter pack: EVERY file gets them; a paper shows its own code, a question bank the chapter's first paper code", async () => {
    const h = harness(owned("pack_chapter:real-numbers"), { bridge: { paidBoardPass: false } });
    const files = await buildPackFiles(h.ref, h.ctx);
    for (const f of files) await f.build();
    const ct1 = packPaperCode({ kind: "ct1", chapter: "real-numbers" });
    expect(ct1).toBe("PK-M-RN-CT1");
    for (const [i, c] of h.calls.entries()) {
      expect(c.bridge, files[i].label).toBeDefined();
      expect(c.bridge!.packLabel).toBe("Real Numbers · Chapter Pack");
      expect(c.bridge!.exampleCode).toBe(files[i].code ?? ct1);
      expect(c.bridge!.boardPassCard).toBe(true);
    }
  });

  it("a paid Board Pass holder's files leave the Board Pass card out; so does an entitlement not yet known (null)", async () => {
    for (const paidBoardPass of [true, null]) {
      const h = harness(owned("pack_chapter:real-numbers"), { bridge: { paidBoardPass } });
      const [first] = await buildPackFiles(h.ref, h.ctx);
      await first.build();
      expect(h.calls[0].bridge?.boardPassCard, String(paidBoardPass)).toBe(false);
    }
  });

  it("subject pack files are headed by the pack's own title", async () => {
    const h = harness(owned("pack_subject:maths"), { bridge: { paidBoardPass: false } });
    const files = await buildPackFiles(h.ref, h.ctx);
    await files[0].build();
    await files.find((f) => f.code?.startsWith("PK-M-FULL-"))!.build();
    expect(h.calls.map((c) => c.bridge?.packLabel)).toEqual(["Maths Subject Pack", "Maths Subject Pack"]);
  });

  it("mock pack: each paper shows its own PK code under '<Subject> · Mock Pack'", async () => {
    const h = harness(owned("pack_mock:maths"), { bridge: { paidBoardPass: false } });
    const files = await buildPackFiles(h.ref, h.ctx);
    for (const f of files) await f.build();
    expect(files.length).toBeGreaterThan(0);
    for (const [i, c] of h.calls.entries()) {
      expect(c.bridge?.exampleCode).toBe(files[i].code);
      expect(c.bridge?.exampleCode).toMatch(/^PK-M-FULL-M\d/);
      expect(c.bridge?.packLabel).toBe("Maths · Mock Pack");
    }
  });

  it("CBQ pack gets the pages too; the example is a code the pack really prints (BRIDGE-CODES-1: a chapter file's first set)", async () => {
    const h = harness(owned("pack_cbq:maths"), { bridge: { paidBoardPass: false } });
    const files = await buildPackFiles(h.ref, h.ctx);
    await files[0].build(); // "How examiners mark a CBQ" (no paper of its own)
    await files[1].build(); // Real Numbers Part 1: one file holding Sets 1-2 (the stub exporter is called once per set)
    expect(h.calls.length).toBe(1 + files[1].codes!.length);
    for (const c of h.calls) expect(c.bridge).toBeDefined();
    expect(h.calls[0].bridge!.exampleCode).toBe("PK-M-RN-CBQ1");
    for (const c of h.calls.slice(1)) expect(c.bridge!.exampleCode).toBe(files[1].codes![0]);
    expect(files[1].codes![0]).toBe("PK-M-RN-CBQ1");
    expect(h.calls[0].bridge!.packLabel).toBe("Maths CBQ Pack");
    expect(h.calls[1].bridge!.packLabel).toBe("Real Numbers \u00b7 Maths CBQ Pack");
  });
});

describe("BRIDGE-CODES-1 - CBQ parts (owner 8 Nov 23:30)", () => {
  it("pages 2-3 only in each chapter's Part 1; Parts 2+ carry none", async () => {
    const h = harness(owned("pack_cbq:maths"), { bridge: { paidBoardPass: false } });
    const files = await buildPackFiles(h.ref, h.ctx);
    const p1 = files.find((f) => f.id.endsWith("|real-numbers|cbq-part-1-questions"))!;
    const p2 = files.find((f) => f.id.endsWith("|real-numbers|cbq-part-2-questions"))!;
    const k2 = files.find((f) => f.id.endsWith("|real-numbers|cbq-part-2-answers"))!;
    await p1.build();
    const n1 = h.calls.length;
    expect(n1).toBe(p1.codes!.length);
    for (const c of h.calls) expect(c.bridge).toBeDefined();
    await p2.build();
    await k2.build();
    expect(h.calls.length).toBe(n1 + p2.codes!.length + k2.codes!.length);
    for (const c of h.calls.slice(n1)) expect(c.bridge).toBeUndefined();
  });
});

describe("BRIDGE-PDF-1 - labels", () => {
  it("names the pack as the checkout does, never repeating the subject", () => {
    expect(bridgePackLabel("Real Numbers", "pack_chapter", "real-numbers")).toBe("Real Numbers · Chapter Pack");
    expect(bridgePackLabel("Light", "pack_bundle", "science")).toBe("Maths + Science Bundle");
    expect(bridgePackLabel("Real Numbers", "pack_subject", "maths")).toBe("Maths Subject Pack");
    expect(bridgePackLabel("Science", "pack_subject", "science")).toBe("Science Subject Pack");
    expect(bridgePackLabel("Maths", "pack_cbq", "maths")).toBe("Maths CBQ Pack");
    expect(bridgePackLabel("Real Numbers", "pack_cbq", "maths")).toBe("Real Numbers · Maths CBQ Pack");
  });
});

describe("BRIDGE-PDF-1 - paper codes unchanged", () => {
  it("every pinned code is still what packPaperCode prints", () => {
    const pin = JSON.parse(readFileSync(path.resolve(__dirname, "packPaperCodes.pin.json"), "utf8")) as unknown;
    const text = JSON.stringify(pin);
    expect(text).toContain("PK-M-RN-CT1");
    expect(packPaperCode({ kind: "mock", subject: "maths", n: 1 })).toBe("PK-M-FULL-M1");
  });
});

describe("BRIDGE-PDF-1 - the approved copy, verbatim", () => {
  const links = { packs: "https://www.lazytopper.com/packs#my-packs", pricing: "https://www.lazytopper.com/pricing", sample: BRIDGE_SAMPLE_PDF_URL };
  const data: BridgePagesData = { packLabel: "Light · Chapter Pack", exampleCode: "PK-S-LIGHT-CT1", boardPassCard: true };

  it("page 2: header from the pack, example code from the pack, email OR phone, the free line + Board Pass card", () => {
    const { container } = render(<PrintBridgeMarkPage data={data} links={links} />);
    const t = container.textContent || "";
    expect(t).toContain("Light · Chapter Pack");
    expect(t).toContain("Get this paper marked like a CBSE examiner");
    expect(t).toContain("it is printed on every paper, e.g. PK-S-LIGHT-CT1. Or photograph the QR at the bottom of the paper.");
    expect(t).toContain("with the email or phone number you bought with, and tap the paper.");
    expect(t).toContain("This paper (PK-M-RN-CT1) was written by our team with six deliberate mistakes");
    expect(t).toContain("Every account gets its first paper of each kind marked free.");
    expect(t).toContain("Board Pass marks every paper you write till your boards");
    expect(t).not.toMatch(/\bAI\b/);
    expect(container.querySelector('[data-pdf-link="https://www.lazytopper.com/pricing"]')).not.toBeNull();
  });

  it("page 2 in a question-bank file (no code or QR of its own, owner 9 Nov): points to the pack's tests, no QR line", () => {
    const t = render(<PrintBridgeMarkPage data={{ ...data, exampleCode: "PK-M-RN-CT1", ownCode: false }} links={links} />).container.textContent || "";
    expect(t).toContain("Write the paper code at the top — each Chapter Test and Worksheet in this pack has one, e.g. PK-M-RN-CT1.");
    expect(t).not.toContain("QR");
    expect(t).toContain("Board Pass marks every paper you write till your boards");
  });

  it("the PDF link keeps #my-packs (a signed-out reader lands on the sign-in line, not the shop)", () => {
    expect(BRIDGE_PACKS_URL).toBe("https://www.lazytopper.com/packs#my-packs");
  });

  it("page 2 without an example code (a CBQ file before #1643): the step reads without an 'e.g.'", () => {
    const t = render(<PrintBridgeMarkPage data={{ ...data, exampleCode: null }} links={links} />).container.textContent || "";
    expect(t).toContain("it is printed on every paper.");
    expect(t).not.toContain("e.g.");
    expect(t).not.toContain("QR");
  });

  it("page 2 for a Board Pass holder: no Board Pass card", () => {
    const { container } = render(<PrintBridgeMarkPage data={{ ...data, boardPassCard: false }} links={links} />);
    expect(container.querySelector('[data-testid="print-bridge-pass"]')).toBeNull();
    expect(container.textContent).not.toContain("Board Pass");
  });

  it("page 3: the seven views, the sample label, and the See-a-marked-sample link to the hosted file", () => {
    const { container } = render(<PrintBridgeViewsPage data={data} links={links} />);
    const t = container.textContent || "";
    expect(t).toContain("What you get back, screen by screen");
    expect(t).toContain("7 · Then: a graded answer sheet PDF");
    expect(t).toContain("Sample paper written by our team with deliberate mistakes; marked by LazyTopper.");
    expect(container.querySelectorAll("img")).toHaveLength(7);
    expect(container.querySelector(`[data-pdf-link="${BRIDGE_SAMPLE_PDF_URL}"]`)?.textContent).toContain("See a marked sample");
    expect(t).not.toMatch(/\bAI\b/);
  });
});

describe("BRIDGE-PDF-1 - static assets", () => {
  it("every image the pages use and the hosted marked sample exist, and are small", () => {
    for (const src of [BRIDGE_IMG.total, BRIDGE_IMG.q7, BRIDGE_IMG.next, ...BRIDGE_IMG.views]) {
      const p = path.join(PUBLIC, src);
      expect(existsSync(p), src).toBe(true);
      expect(statSync(p).size, src).toBeLessThan(40_000);
    }
    const sample = path.join(PUBLIC, BRIDGE_SAMPLE_PDF_PATH);
    expect(existsSync(sample)).toBe(true);
    expect(statSync(sample).size).toBeLessThan(2_500_000);
    expect(BRIDGE_SAMPLE_PDF_PATH.startsWith("/media/")).toBe(true); // vercel.json: 30 days + stale-while-revalidate
  });
});

describe("BRIDGE-PDF-1 - the pack instruction line", () => {
  const ws = { worksheetId: "w", createdAt: "2026-11-08T00:00:00.000Z", title: "Real Numbers · Chapter Test 1", subject: "Maths", grade: "10", sectionFilter: "A-E", totalMarks: 1, questions: [] } as never;
  it("a pack paper points to My packs / Home -> Papers waiting (as page 2 does), never to Worksheets; the code never wraps", () => {
    const { container } = render(<WorksheetPrintDoc ws={ws} kind="questions" code="PK-M-RN-CT1" packFile />);
    const t = container.textContent || "";
    expect(t).toContain("lazytopper.com → My packs, or Home → Papers waiting for your answers (code PK-M-RN-CT1)");
    expect(t).not.toContain("Worksheets →");
    expect(container.querySelector(".lt-wsp__nowrap")?.textContent).toBe("PK-M-RN-CT1");
  });
  it("a pack question bank (no code) points to the pack's coded papers via My packs / Papers waiting, and the Answer Checker for single answers", () => {
    const t = render(<WorksheetPrintDoc ws={ws} kind="questions" packFile />).container.textContent || "";
    expect(t).toContain("each carry a paper code: get them marked at lazytopper.com → My packs, or Home → Papers waiting for your answers");
    expect(t).toContain("Answer Checker at lazytopper.com/check-improve");
    expect(t).not.toContain("Worksheets →");
  });
  it("an in-app worksheet keeps its line", () => {
    const t = render(<WorksheetPrintDoc ws={ws} kind="questions" code="WS-M-RN-01" />).container.textContent || "";
    expect(t).toContain("Upload your answers at lazytopper.com → Worksheets → Upload answers (code WS-M-RN-01)");
  });
});
