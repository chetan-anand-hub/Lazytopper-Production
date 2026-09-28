/**
 * THE RELEASE MARKER (SEARCHPING-2, S1). Every build publishes `/app/version.json`:
 *
 *   { "sha": "<the commit this build was made from>" }
 *
 * and nothing else. `search-ping` polls it on www to learn when a production release has
 * actually reached visitors (Rolling Releases serves the old deployment to most traffic for
 * ~15 minutes after the new one is "ready"), and only then tells search engines.
 *
 *   tsx scripts/seo/writeVersion.ts                 (last step of `pnpm run build`)
 *   tsx scripts/seo/writeVersion.ts --out=<dir>     (write into another built app dir)
 *
 * ★ WHERE THE SHA COMES FROM. Vercel exposes the deployed commit to the build as the system
 * environment variable `VERCEL_GIT_COMMIT_SHA`. Anywhere else (CI, a dev box) the checkout's
 * own `git rev-parse HEAD` is the commit. No SHA at all FAILS the build, visibly: a marker
 * that names the wrong commit, or none, would make search-ping wait for a release it can
 * never see — or announce one that is not live.
 */

import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const LAZYTOPPER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** The marker's file name inside the built app (served at `/app/version.json`). */
export const VERSION_FILE = "version.json";

const FULL_SHA = /^[0-9a-f]{40}$/;

/** The one allowed shape of the marker — `{"sha": "<40-hex>"}`, no other field. */
export function versionMarker(sha: string): string {
  const normalised = sha.trim().toLowerCase();
  if (!FULL_SHA.test(normalised)) {
    throw new Error(`writeVersion: "${sha}" is not a full 40-character commit SHA`);
  }
  return `${JSON.stringify({ sha: normalised })}\n`;
}

/**
 * The commit this build was made from: Vercel's `VERCEL_GIT_COMMIT_SHA` first, then the
 * checkout's HEAD. `gitHead` is injected so the order is testable without a repository.
 */
export function resolveCommitSha(
  env: Record<string, string | undefined>,
  gitHead: () => string | null,
): string {
  const fromVercel = (env.VERCEL_GIT_COMMIT_SHA ?? "").trim();
  if (fromVercel !== "") return fromVercel;
  const fromGit = (gitHead() ?? "").trim();
  if (fromGit !== "") return fromGit;
  throw new Error(
    "writeVersion: no commit SHA — VERCEL_GIT_COMMIT_SHA is unset and `git rev-parse HEAD` failed. " +
      "The release marker cannot be written honestly, so the build stops here.",
  );
}

function gitHead(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: LAZYTOPPER_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}

/**
 * Where `vite build` put the app — resolved from `vite.config.ts` exactly as
 * `writeStaticHeads.ts` does (see the NODE_ENV note there: `vite build` sets
 * `NODE_ENV=production` inside its own process, and this is a separate one).
 */
async function resolveOutDir(): Promise<string> {
  const override = process.argv.find((arg) => arg.startsWith("--out="));
  if (override) return resolve(override.slice("--out=".length));
  process.env.NODE_ENV = process.env.NODE_ENV || "production";
  const viteConfig = (await import("../../vite.config")).default;
  const outDir = (viteConfig as { build?: { outDir?: string } }).build?.outDir;
  if (typeof outDir !== "string" || outDir.length === 0) {
    throw new Error("writeVersion: vite.config.ts declares no build.outDir");
  }
  return resolve(LAZYTOPPER_ROOT, outDir);
}

async function main(): Promise<void> {
  const outDir = await resolveOutDir();
  if (!existsSync(join(outDir, "index.html"))) {
    throw new Error(
      `writeVersion: no built app at ${outDir}. This script runs AFTER vite build; ` +
        `pass --out=<dir> if the build wrote somewhere else.`,
    );
  }
  const marker = versionMarker(resolveCommitSha(process.env, gitHead));
  writeFileSync(join(outDir, VERSION_FILE), marker, "utf8");
  // eslint-disable-next-line no-console
  console.log(`writeVersion: ${join(outDir, VERSION_FILE)} = ${marker.trim()}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  });
}
