// SERVER-PDF-1 PR-B - the server's "which owned pack covers this file" (server/services/packCovering.cjs) is the client's
// (buildPackFiles coveringRef / paidAtOf). A buyer's file prints ONE Order id and one paid date; if the two sides ever disagree the
// licence on a server-stamped PDF differs from the one the browser would have printed. This builds REAL files with the client for
// several ownership shapes and asks the server the same question for every one.
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { buildPackFiles, type BuildContext, type PackFile } from "./buildPackFiles";
import { packUnits, planAll, templateIdForPackFile, templateUnits, type PlanFile } from "./packTemplatePlan";
import type { OwnedPack, PackSku } from "../../services/packs";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const server = require("../../../server/services/packCovering.cjs") as {
  buyerRefFor: (manifest: unknown, owned: unknown[], packId: string, templateId: string) => { orderId: string; paidAtMs: number | undefined };
  fileIdFor: (packId: string, templateId: string) => string | null;
  templateIdForPackFile: (packId: string, fileId: string) => string | null;
};

const own = (packId: string, extra: Partial<OwnedPack> = {}): OwnedPack => {
  const [sku, target] = packId.split(":");
  return { packId, sku: sku as OwnedPack["sku"], target, pricePaidInr: 49, paidAt: 1_790_829_000_000, orderId: `order_${sku}_${target}`, ...extra } as OwnedPack;
};

/** The two things a manifest tells the server about covering: each file's group and each pack's file list (buildManifest's own rule). */
function fakeManifest(plan: PlanFile[]) {
  const files = Object.fromEntries(plan.map((f) => [f.templateId, { groupId: f.groupId }]));
  const packs = Object.fromEntries(
    packUnits().map((p) => [p.packId, { files: p.units.flatMap((u) => plan.filter((f) => f.unit.kind === u.kind && f.unit.key === u.key).map((f) => f.templateId)) }]),
  );
  return { files, packs };
}

const SCENARIOS: Array<{ name: string; owned: OwnedPack[] }> = [
  { name: "one chapter pack", owned: [own("pack_chapter:real-numbers")] },
  { name: "a chapter pack and the maths subject pack (different orders and times)", owned: [own("pack_chapter:real-numbers", { paidAt: 1_790_000_000_000 }), own("pack_subject:maths", { paidAt: 1_795_000_000_000 })] },
  { name: "the bundle alone", owned: [own("pack_bundle:all")] },
  { name: "bundle + an electricity chapter pack + the maths mock pack", owned: [own("pack_bundle:all", { paidAt: 1_790_100_000_000 }), own("pack_chapter:electricity", { paidAt: 1_791_000_000_000 }), own("pack_mock:maths", { paidAt: 1_792_000_000_000 })] },
  { name: "a CBQ pack and the science subject pack", owned: [own("pack_cbq:maths"), own("pack_subject:science")] },
  { name: "no order id, unknown paid time", owned: [own("pack_mock:science", { orderId: undefined, paidAt: undefined }), own("pack_subject:science", { orderId: "", paidAt: 0 })] },
];

/** First, last and an even spread of at most `n` items. */
function spread<T>(xs: T[], n: number): T[] {
  if (xs.length <= n) return xs;
  return Array.from({ length: n }, (_, i) => xs[Math.round((i * (xs.length - 1)) / (n - 1))]);
}

describe("SERVER-PDF-1 - client and server agree on the covering pack", () => {
  it("every sampled file of every listed pack prints the same Order id and paid date", async () => {
    const plan = await planAll(templateUnits());
    const manifest = fakeManifest(plan);
    let compared = 0;
    for (const sc of SCENARIOS) {
      for (const pack of sc.owned) {
        let seen: { orderId: string; paidAtMs: number | undefined } | null = null;
        const grab = (opts: { licensee?: { orderId: string }; paidAtMs?: number }) => {
          seen = { orderId: opts.licensee?.orderId ?? "", paidAtMs: opts.paidAtMs };
        };
        const ctx: BuildContext = {
          licensee: { name: "Asha Rao", email: "asha@example.in" },
          owned: sc.owned,
          nowIso: () => "2026-11-12T00:00:00.000Z",
          exportPdf: async (_ws, _mode, _code, opts) => {
            grab(opts as never);
            return "";
          },
          exportSetsPdf: async (_sets, _mode, opts) => {
            grab(opts as never);
            return "";
          },
        };
        const files = await buildPackFiles({ packId: pack.packId, sku: pack.sku as PackSku, target: pack.target }, ctx);
        expect(files.length, pack.packId).toBeGreaterThan(0);
        for (const file of spread(files, 14)) {
          seen = null;
          await file.build();
          const templateId = templateIdForPackFile(pack.packId, file.id);
          expect(templateId, `${pack.packId} ${file.id}`).not.toBeNull();
          const want = seen as unknown as { orderId: string; paidAtMs: number | undefined };
          const got = server.buyerRefFor(manifest, sc.owned, pack.packId, templateId as string);
          expect(got, `${sc.name} | ${pack.packId} | ${file.id}`).toEqual(want);
          compared += 1;
        }
      }
    }
    expect(compared).toBeGreaterThan(100);
  }, 240_000);

  it("a buyer's file id and its template id convert the same way on both sides, for every file of every pack", async () => {
    const plan = await planAll(templateUnits());
    const manifest = fakeManifest(plan);
    let n = 0;
    for (const [packId, pack] of Object.entries(manifest.packs)) {
      for (const templateId of pack.files) {
        const fileId = server.fileIdFor(packId, templateId);
        expect(fileId, `${packId} ${templateId}`).not.toBeNull();
        expect(templateIdForPackFile(packId, fileId as string)).toBe(templateId);
        expect(server.templateIdForPackFile(packId, fileId as string)).toBe(templateId);
        n += 1;
      }
    }
    expect(n).toBeGreaterThan(800);
  }, 120_000);
});
