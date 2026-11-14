/**
 * buildFreeResources - FREE-RES-1. Verify a release and build its three zips. NEVER needs, reads or receives the Storage key, so it is
 * the whole of a dry run:
 *
 *   tsx scripts/freeResources/buildFreeResources.ts --assets <dir with the PDFs + manifest.json> [--out <dir>]
 *
 * Checks every file's sha256, byte size and PDF header against manifest.json (and rejects unknown kinds/subjects, duplicate ids, missing
 * or unlisted assets), builds the STORE-only zips, and prints what would be published. With --out it also writes the zips and the
 * finished current.json there so they can be inspected.
 */
import fs from "node:fs";
import path from "node:path";
import { planFreeRelease } from "./freeManifest";
import { loadRelease } from "./loadRelease";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const dir = arg("assets");
  if (!dir) throw new Error("usage: --assets <dir> [--out <dir>]");
  const { manifest, assets } = loadRelease(dir);
  const { current, zips } = await planFreeRelease(manifest, assets);
  console.log(`verified ${manifest.resources.length} resources (sha256 + size + PDF header)`);
  for (const z of zips) console.log(`zip ${z.group}: ${z.count} files, ${z.data.length} bytes -> ${z.path}`);
  const out = arg("out");
  if (out) {
    const root = path.resolve(out);
    fs.mkdirSync(path.join(root, "zips"), { recursive: true });
    for (const z of zips) fs.writeFileSync(path.join(root, "zips", `${z.group}.zip`), z.data);
    fs.writeFileSync(path.join(root, "current.json"), `${JSON.stringify(current, null, 2)}\n`);
    console.log(`wrote the zips and current.json to ${root}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
