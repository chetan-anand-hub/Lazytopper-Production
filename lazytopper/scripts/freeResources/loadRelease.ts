/** loadRelease - FREE-RES-1. Reads a downloaded release directory (the PDFs + manifest.json) into memory. Shared by build and upload. */
import fs from "node:fs";
import path from "node:path";
import { parseReleaseManifest, type ReleaseManifest } from "./freeManifest";

export function loadRelease(dir: string): { manifest: ReleaseManifest; assets: Map<string, Uint8Array> } {
  const root = path.resolve(dir);
  const manifestPath = path.join(root, "manifest.json");
  if (!fs.existsSync(manifestPath)) throw new Error(`no manifest.json in ${root}`);
  const manifest = parseReleaseManifest(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
  const assets = new Map<string, Uint8Array>();
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name === "manifest.json" || entry.name.startsWith(".")) continue;
    assets.set(entry.name, new Uint8Array(fs.readFileSync(path.join(root, entry.name))));
  }
  return { manifest, assets };
}
