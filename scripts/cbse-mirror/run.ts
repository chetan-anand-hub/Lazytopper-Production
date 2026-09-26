/**
 * run — the entry point `.github/workflows/cbse-mirror.yml` executes:
 *
 *   pnpm --filter @workspace/scripts exec node --import tsx/esm cbse-mirror/run.ts
 *
 * Environment (all set by the workflow step, nothing read from disk):
 *   EVENT_NAME               github.event_name — "schedule" runs for real
 *   INPUT_DRY_RUN            the workflow_dispatch `dry_run` input (default true)
 *   FIREBASE_SERVICE_ACCOUNT the service-account JSON — only needed, and only read,
 *                            when this is NOT a dry run
 *   FIREBASE_STORAGE_BUCKET  the bucket name
 *   CBSE_MIRROR_LIVE         the repository variable; a writing run is refused unless "1" (CA-4)
 *   GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_SERVER_URL, GITHUB_RUN_ID
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { githubIssueTracker } from "./issues";
import { liveRunRefusal, resolveDryRun, runMirror } from "./mirror";
import { firebaseStorage, readOnlyStorage } from "./storage";

const DEFAULT_BUCKET = "lazzyy-topper.firebasestorage.app";

async function main(): Promise<void> {
  const env = process.env;
  const dryRun = resolveDryRun(env.EVENT_NAME, env.INPUT_DRY_RUN);
  // CA-4 — before anything else is read or written.
  const refusal = liveRunRefusal(dryRun, env.CBSE_MIRROR_LIVE);
  if (refusal) throw new Error(refusal);
  const bucket = (env.FIREBASE_STORAGE_BUCKET || DEFAULT_BUCKET).trim();
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const log = (line: string) => process.stdout.write(`${line}\n`);

  log(`cbse-mirror: event=${env.EVENT_NAME ?? "(none)"} dry_run=${dryRun} bucket=${bucket}`);

  let storage;
  let issues = null;
  if (dryRun) {
    storage = readOnlyStorage(bucket);
  } else {
    const key = env.FIREBASE_SERVICE_ACCOUNT;
    if (!key) throw new Error("cbse-mirror: FIREBASE_SERVICE_ACCOUNT is not set for a real run");
    if (!env.GITHUB_TOKEN || !env.GITHUB_REPOSITORY) {
      throw new Error("cbse-mirror: GITHUB_TOKEN and GITHUB_REPOSITORY are required for a real run");
    }
    storage = firebaseStorage({ repoRoot, serviceAccountJson: key, bucket });
    issues = githubIssueTracker({ repository: env.GITHUB_REPOSITORY, token: env.GITHUB_TOKEN });
  }

  const runUrl =
    env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID
      ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`
      : undefined;

  const result = await runMirror({ now: new Date(), fetch, storage, issues, dryRun, log, runUrl });
  log(
    `cbse-mirror: done — ${result.plan.length} plan lines, ${result.issues.length} issue(s) wanted, ` +
      `${result.opened.length} opened${dryRun ? " (dry run: nothing written)" : ""}`,
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
