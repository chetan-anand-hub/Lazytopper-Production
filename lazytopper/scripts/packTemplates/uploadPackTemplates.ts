/**
 * uploadPackTemplates - SERVER-PDF-1 PR-A. The ONLY place pack templates leave the CI machine. Used by .github/workflows/pack-templates.yml.
 *
 *   tsx scripts/packTemplates/uploadPackTemplates.ts list    --out existing.txt
 *   tsx scripts/packTemplates/uploadPackTemplates.ts put     --dir <render dir>
 *   tsx scripts/packTemplates/uploadPackTemplates.ts publish --plan <plan.json> --commit <sha>
 *   (add --dry-run to any of them: reads nothing remote, writes nothing, prints what it would do)
 *
 * SAFETY (the key is Storage Object Admin on the whole bucket, so the limits live here): every path passes assertPackPath (packs/ only);
 * objects are content-addressed and written with ifGenerationMatch=0 (never overwritten); `publish` checks the whole manifest and writes
 * packs/current.json LAST. Credentials: FIREBASE_SERVICE_ACCOUNT (the repo secret, JSON), FIREBASE_STORAGE_BUCKET. The key is read from
 * the environment, parsed in memory, never echoed and never written to a file. Without it only --dry-run works.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { cert, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { putRendered, publishManifest, type TemplateStore } from "../../src/lib/packs/packTemplatePublish";
import type { ManifestFont } from "../../src/lib/packs/packTemplateManifest";
import type { PlanFileJson } from "./generatePackTemplates";

const here = path.dirname(fileURLToPath(import.meta.url));
const sha = (t: string | Uint8Array): string => createHash("sha256").update(t).digest("hex");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const dryRun = process.argv.includes("--dry-run");

function gcsStore(): TemplateStore {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT;
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!key || !bucketName) throw new Error("FIREBASE_SERVICE_ACCOUNT and FIREBASE_STORAGE_BUCKET are required (or pass --dry-run)");
  const app = initializeApp({ credential: cert(JSON.parse(key)), storageBucket: bucketName });
  const bucket = getStorage(app).bucket();
  return {
    async list(prefix) {
      const [files] = await bucket.getFiles({ prefix, autoPaginate: true });
      return files.map((f) => f.name);
    },
    async read(p) {
      const f = bucket.file(p);
      const [exists] = await f.exists();
      return exists ? new Uint8Array((await f.download())[0]) : null;
    },
    async write(p, data, opts) {
      try {
        await bucket.file(p).save(Buffer.from(typeof data === "string" ? new TextEncoder().encode(data) : data), {
          contentType: opts.contentType,
          resumable: false,
          // private: no public ACL, no download token; only the server (admin SDK) reads these
          metadata: { cacheControl: "private, max-age=0" },
          preconditionOpts: opts.overwrite ? undefined : { ifGenerationMatch: 0 },
        });
      } catch (e) {
        if (!opts.overwrite && (e as { code?: number }).code === 412) return; // already there: content-addressed, so identical
        throw e;
      }
    },
  };
}

/** A store that records and writes nothing. */
function dryStore(): TemplateStore {
  return {
    async list() {
      return [];
    },
    async read() {
      return null;
    },
    async write(p, data) {
      console.log(`[dry-run] would write ${p} (${typeof data === "string" ? data.length : data.length} bytes)`);
    },
  };
}

function fontsOf(): ManifestFont[] {
  const dir = path.join(here, "fonts");
  return [[400, "Inter-Regular.otf"], [500, "Inter-Medium.otf"], [600, "Inter-SemiBold.otf"], [700, "Inter-Bold.otf"], [800, "Inter-ExtraBold.otf"]].map(([weight, file]) => ({
    family: "Inter" as const,
    weight: weight as number,
    file: `lazytopper/scripts/packTemplates/fonts/${file}`,
    sha256: sha(fs.readFileSync(path.join(dir, file as string))),
  }));
}

async function main(): Promise<void> {
  const cmd = process.argv.slice(2).find((a) => a !== "--");
  const store = dryRun ? dryStore() : gcsStore();
  if (cmd === "list") {
    const names = [...(await store.list("packs/files/")), ...(await store.list("packs/bridge/"))];
    fs.writeFileSync(path.resolve(arg("out") ?? "existing.txt"), `${names.join("\n")}\n`);
    console.log(`list: ${names.length} existing objects`);
  } else if (cmd === "put") {
    const dir = path.resolve(arg("dir") ?? "pack-templates/render");
    const objects: Array<{ path: string; data: Uint8Array; contentType: string }> = [];
    for (const sub of ["files", "bridge"]) {
      const d = path.join(dir, sub);
      if (!fs.existsSync(d)) continue;
      for (const name of fs.readdirSync(d)) {
        if (name.startsWith(".")) continue;
        objects.push({ path: `packs/${sub}/${name}`, data: fs.readFileSync(path.join(d, name)), contentType: name.endsWith(".json") ? "application/json" : "application/pdf" });
      }
    }
    const wrote = await putRendered(store, objects);
    console.log(`put: ${wrote.length} new of ${objects.length}`);
  } else if (cmd === "publish") {
    if (dryRun) {
      console.log("[dry-run] publish needs the rendered objects in storage: nothing to check here");
      return;
    }
    const plan = JSON.parse(fs.readFileSync(path.resolve(arg("plan") ?? "pack-templates/plan.json"), "utf8")) as PlanFileJson;
    const { manifest, wrote } = await publishManifest(store, {
      plan: plan.files,
      bridges: plan.bridges,
      packDefs: plan.packs,
      rendererVersion: plan.rendererVersion,
      fonts: fontsOf(),
      createdAt: new Date().toISOString(),
      commit: arg("commit") ?? "",
      sha: (t) => sha(t),
    });
    console.log(`publish: manifest ${manifest.contentHash.slice(0, 12)} - ${Object.keys(manifest.files).length} files, ${wrote.length} objects written, current.json last`);
  } else {
    throw new Error("usage: list --out f | put --dir d | publish --plan p --commit sha   [--dry-run]");
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
