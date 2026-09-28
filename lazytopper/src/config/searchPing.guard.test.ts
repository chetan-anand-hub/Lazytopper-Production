// @vitest-environment node
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";

import {
  INDEXNOW_KEY,
  PING_STEP_NAME,
  REQUIRED_CONSECUTIVE_READS,
  ROLLOUT_TIMEOUT_MS,
  changedUrls,
  gscSubmitUrl,
  indexNowAccepted,
  indexNowBody,
  parseSitemap,
  pingRunSha,
  resolveBefore,
  waitForRollout,
  type PingRun,
  type RolloutDeps,
} from "../../scripts/seo/searchPing";

/**
 * GUARD — SEO-FRESH-1 F4/F5: the post-deploy search ping.
 *
 * ★ WHAT MUST NEVER HAPPEN: a ping from a PREVIEW deployment (a preview URL announced as a
 * page to index), a ping from Railway's backend deploy (its environment name also contains
 * "production"), or a ping that announces unchanged pages. The trigger condition is
 * therefore EVALUATED against the real event shapes this repo receives — quoted from
 * `gh api repos/chetan-anand-hub/Lazytopper-Production/deployments` on 2026-09-27 — not
 * compared as a string, so a rewrite that means the same thing still passes and one that
 * means something different fails.
 */

const REPO_ROOT = resolve(process.cwd(), ".."); // vitest runs with cwd = lazytopper/
const WORKFLOW = resolve(REPO_ROOT, ".github", "workflows", "search-ping.yml");

const SITEMAP_BEFORE = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.lazytopper.com/app/</loc>
    <lastmod>2026-09-01</lastmod>
  </url>
  <url>
    <loc>https://www.lazytopper.com/app/pricing</loc>
    <lastmod>2026-09-01</lastmod>
  </url>
  <url>
    <loc>https://www.lazytopper.com/app/notes/electricity</loc>
    <lastmod>2026-09-01</lastmod>
  </url>
  <url>
    <loc>https://www.lazytopper.com/app/legal/retired</loc>
    <lastmod>2026-09-01</lastmod>
  </url>
</urlset>
`;

// pricing restamped, a new notes page, the root unchanged, legal/retired removed.
const SITEMAP_AFTER = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.lazytopper.com/app/</loc>
    <lastmod>2026-09-01</lastmod>
  </url>
  <url>
    <loc>https://www.lazytopper.com/app/pricing</loc>
    <lastmod>2026-09-27</lastmod>
  </url>
  <url>
    <loc>https://www.lazytopper.com/app/notes/electricity</loc>
    <lastmod>2026-09-01</lastmod>
  </url>
  <url>
    <loc>https://www.lazytopper.com/app/notes/light-reflection-and-refraction</loc>
    <lastmod>2026-09-27</lastmod>
  </url>
</urlset>
`;

describe("search-ping — the changed-URL diff", () => {
  it("parses every <url> of a sitemap", () => {
    expect(parseSitemap(SITEMAP_AFTER).size).toBe(4);
    expect(parseSitemap(SITEMAP_AFTER).get("https://www.lazytopper.com/app/pricing")).toBe("2026-09-27");
  });

  it("announces exactly the new and restamped URLs, in sitemap order", () => {
    expect(changedUrls(SITEMAP_BEFORE, SITEMAP_AFTER)).toEqual([
      "https://www.lazytopper.com/app/pricing",
      "https://www.lazytopper.com/app/notes/light-reflection-and-refraction",
    ]);
  });

  it("CONTROL — an unchanged sitemap announces nothing (so no request is sent)", () => {
    expect(changedUrls(SITEMAP_AFTER, SITEMAP_AFTER)).toEqual([]);
  });

  it("with no sitemap at the parent, every URL is new", () => {
    expect(changedUrls(null, SITEMAP_AFTER)).toHaveLength(4);
  });
});

describe("search-ping — the IndexNow request body", () => {
  it("carries host, key, keyLocation and urlList", () => {
    const urls = changedUrls(SITEMAP_BEFORE, SITEMAP_AFTER);
    expect(indexNowBody(urls)).toEqual({
      host: "www.lazytopper.com",
      key: "a6c1861da61f4d36898e5e27a71c36d6",
      keyLocation: "https://www.lazytopper.com/a6c1861da61f4d36898e5e27a71c36d6.txt",
      urlList: urls,
    });
  });

  it("the key's proof file ships in public/ and contains exactly the key (P7)", () => {
    const keyFile = resolve(process.cwd(), "public", `${INDEXNOW_KEY}.txt`);
    expect(existsSync(keyFile)).toBe(true);
    expect(readFileSync(keyFile, "utf8").trim()).toBe(INDEXNOW_KEY);
  });

  it("refuses a URL list that spans hosts, and an empty one", () => {
    expect(() =>
      indexNowBody(["https://www.lazytopper.com/app/", "https://evil.example/app/"]),
    ).toThrow(/2 hosts/);
    expect(() => indexNowBody([])).toThrow(/no URLs/);
  });

  it("only 200 and 202 count as accepted", () => {
    expect(indexNowAccepted(200)).toBe(true);
    expect(indexNowAccepted(202)).toBe(true);
    for (const status of [204, 400, 403, 422, 429, 500]) expect(indexNowAccepted(status)).toBe(false);
  });

  it("Search Console: sitemaps.submit on the public sitemap, nothing else", () => {
    expect(gscSubmitUrl("https://www.lazytopper.com/")).toBe(
      "https://www.googleapis.com/webmasters/v3/sites/https%3A%2F%2Fwww.lazytopper.com%2F" +
        "/sitemaps/https%3A%2F%2Fwww.lazytopper.com%2Fsitemap.xml",
    );
    const source = readFileSync(resolve(process.cwd(), "scripts", "seo", "searchPing.ts"), "utf8");
    expect(source, "the Indexing API is not permitted for these pages").not.toContain("indexing.googleapis.com");
  });
});

// ── The workflow's trigger filter ──────────────────────────────────────────────────────

/** The slice of the Actions expression context the conditions read. */
interface IfContext {
  github: { event_name: string; event: Record<string, unknown> };
  steps?: Record<string, { outputs: Record<string, string> }>;
}

/**
 * Evaluate a workflow `if:` against a context. Supports exactly the grammar these conditions
 * use — `path == 'lit'` operands over `github.*` / `steps.*`, joined by `&&` / `||`, with
 * parentheses — and THROWS on anything else, so a condition this cannot read fails loudly
 * instead of being judged permissive. An ABSENT `if:` is `true` (GitHub's default).
 */
function evaluateIf(condition: string | undefined, context: IfContext): boolean {
  if (condition === undefined) return true;
  const source = condition.replace(/^\s*\$\{\{\s*|\s*\}\}\s*$/g, "");
  const tokens = source.match(/\(|\)|&&|\|\||[\w.-]+\s*==\s*'[^']*'|\S+/g) ?? [];
  let at = 0;
  const lookup = (path: string): unknown =>
    path.split(".").reduce<unknown>(
      (node, key) => (node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined),
      context,
    );
  const operand = (): boolean => {
    const token = tokens[at++];
    if (token === "(") {
      const value = orExpr();
      if (tokens[at++] !== ")") throw new Error(`unbalanced ( in if: "${source}"`);
      return value;
    }
    const match = /^((?:github|steps)\.[\w.-]+)\s*==\s*'([^']*)'$/.exec(token ?? "");
    if (!match) throw new Error(`unsupported token "${token}" in if: "${source}"`);
    return lookup(match[1]) === match[2];
  };
  const andExpr = (): boolean => {
    let value = operand();
    while (tokens[at] === "&&") {
      at += 1;
      value = operand() && value;
    }
    return value;
  };
  const orExpr = (): boolean => {
    let value = andExpr();
    while (tokens[at] === "||") {
      at += 1;
      value = andExpr() || value;
    }
    return value;
  };
  const result = orExpr();
  if (at !== tokens.length) throw new Error(`trailing tokens in if: "${source}"`);
  return result;
}

const deploymentEvent = (environment: string, state: string): IfContext => ({
  github: {
    event_name: "deployment_status",
    event: { deployment: { environment }, deployment_status: { state } },
  },
});
const dispatchEvent: IfContext = { github: { event_name: "workflow_dispatch", event: { inputs: {} } } };
const pushEvent: IfContext = {
  github: { event_name: "push", event: { ref: "refs/heads/base/approved-thru-437" } },
};

describe("search-ping.yml — the trigger filter", () => {
  const workflow = parseYaml(readFileSync(WORKFLOW, "utf8")) as {
    on: Record<string, unknown>;
    jobs: Record<string, { if?: string }>;
  };
  const jobs = Object.values(workflow.jobs);

  it("is triggered by deployment_status, a TRUNK push and a manual dispatch ONLY — never a pull request", () => {
    expect(Object.keys(workflow.on).sort()).toEqual(["deployment_status", "push", "workflow_dispatch"]);
  });

  it("SEARCHPING-3 — the push trigger is base/approved-thru-437 ONLY, with no path filter", () => {
    const push = workflow.on.push as Record<string, unknown>;
    expect(push.branches).toEqual(["base/approved-thru-437"]);
    // Docs-only pushes deploy too (changed=0 expected); a path filter would skip a live release.
    for (const key of ["paths", "paths-ignore", "branches-ignore", "tags"]) expect(push[key], key).toBeUndefined();
  });

  it("every job is gated (an ungated job would run on every deployment event)", () => {
    expect(jobs.length).toBeGreaterThan(0);
    for (const job of jobs) expect(typeof job.if, "a job in search-ping.yml has no if:").toBe("string");
  });

  it("fires on a SUCCESSFUL PRODUCTION Vercel deployment", () => {
    for (const job of jobs) expect(evaluateIf(job.if, deploymentEvent("Production", "success"))).toBe(true);
  });

  it("SEARCHPING-2b — fires on a manual dispatch", () => {
    for (const job of jobs) expect(evaluateIf(job.if, dispatchEvent)).toBe(true);
  });

  it("SEARCHPING-3 — fires on a trunk push", () => {
    for (const job of jobs) expect(evaluateIf(job.if, pushEvent)).toBe(true);
  });

  it("CONTROL — does NOT fire on a pull_request-shaped event", () => {
    const pr: IfContext = { github: { event_name: "pull_request", event: {} } };
    for (const job of jobs) expect(evaluateIf(job.if, pr)).toBe(false);
  });

  it("★ does NOT fire on a preview deployment, a failed/pending one, or Railway's backend", () => {
    const refused = [
      deploymentEvent("Preview", "success"),
      deploymentEvent("Production", "failure"),
      deploymentEvent("Production", "pending"),
      deploymentEvent("Production", "in_progress"),
      deploymentEvent("lazytopper-backend / production", "success"),
      deploymentEvent("production", "success"),
    ];
    for (const job of jobs) {
      for (const candidate of refused) {
        expect(
          evaluateIf(job.if, candidate),
          `search-ping would fire on ${JSON.stringify(candidate)}`,
        ).toBe(false);
      }
    }
  });
});

// ── SEARCHPING-2 — S2: wait for the rollout before pinging ─────────────────────────────

const NEW = "1111111111111111111111111111111111111111";
const OLD = "0000000000000000000000000000000000000000";
const NEWER = "2222222222222222222222222222222222222222";
const INTERVAL = 15_000;

/** A fake www: serves `reads` in order (the last one repeats), on a fake clock. */
function fakeWww(reads: Array<string | null>, descendants: string[] = []) {
  let clock = 0;
  let index = 0;
  const lines: string[] = [];
  const deps: RolloutDeps = {
    readServedSha: async () => reads[Math.min(index++, reads.length - 1)],
    isDescendant: (served) => descendants.includes(served),
    sleep: async (ms) => {
      clock += ms;
    },
    now: () => clock,
    log: (line) => lines.push(line),
  };
  return { deps, lines, readCount: () => index };
}

describe("search-ping — S2 the rollout wait", () => {
  it("the owner-fixed thresholds: 5 consecutive reads, 30 minutes", () => {
    expect(REQUIRED_CONSECUTIVE_READS).toBe(5);
    expect(ROLLOUT_TIMEOUT_MS).toBe(30 * 60 * 1000);
  });

  it("5 consecutive reads of this commit → live, and every read is logged with its SHA", async () => {
    const www = fakeWww([OLD, OLD, NEW, NEW, NEW, NEW, NEW]);
    await expect(waitForRollout(NEW, www.deps, { intervalMs: INTERVAL })).resolves.toEqual({
      outcome: "live",
      reads: 7,
    });
    expect(www.lines).toHaveLength(7);
    expect(www.lines[6]).toContain(`www serves sha=${NEW}`);
    expect(www.lines[6]).toContain("streak=5/5");
  });

  it("★ FLAPPING reads (a rolling release mid-way) reset the streak — 4 in a row is not live", async () => {
    // 4 new, old, 4 new, unreadable, then finally 5 new.
    const flap = [NEW, NEW, NEW, NEW, OLD, NEW, NEW, NEW, NEW, null, NEW, NEW, NEW, NEW, NEW];
    const www = fakeWww(flap);
    await expect(waitForRollout(NEW, www.deps, { intervalMs: INTERVAL })).resolves.toEqual({
      outcome: "live",
      reads: flap.length,
    });
    expect(www.lines[4]).toContain("streak=0/5");
    expect(www.lines[9]).toContain("sha=(none) ");
  });

  it("www serving a NEWER commit that descends from this one → clean 'superseded' exit", async () => {
    const www = fakeWww([OLD, NEW, NEW, NEWER], [NEWER]);
    await expect(waitForRollout(NEW, www.deps, { intervalMs: INTERVAL })).resolves.toEqual({
      outcome: "superseded",
      servedSha: NEWER,
      reads: 4,
    });
  });

  it("CONTROL — a different commit that is NOT a descendant (the old release) keeps it waiting", async () => {
    const www = fakeWww([OLD, OLD, NEW, NEW, NEW, NEW, NEW], [NEWER]);
    await expect(waitForRollout(NEW, www.deps, { intervalMs: INTERVAL })).resolves.toMatchObject({
      outcome: "live",
    });
  });

  it("★ timeout → throws (the job fails visibly), after polling for the whole 30 minutes", async () => {
    const www = fakeWww([OLD, NEW, NEW, NEW, NEW, OLD]); // never 5 in a row
    await expect(waitForRollout(NEW, www.deps, { intervalMs: INTERVAL })).rejects.toThrow(
      /did not reach www .* within 30 minutes .*Nothing was pinged/,
    );
    expect(www.readCount()).toBe(ROLLOUT_TIMEOUT_MS / INTERVAL + 1);
  });
});

// ── SEARCHPING-2 — S3: "before" is the last release that was pinged ─────────────────────

describe("search-ping — S3 diff from the last successful ping", () => {
  const SHA = "3333333333333333333333333333333333333333";
  const LAST_PING = "4444444444444444444444444444444444444444";
  const SUPERSEDED = "5555555555555555555555555555555555555555";
  const UNRELATED = "6666666666666666666666666666666666666666";
  const runs: PingRun[] = [
    { id: 30, headSha: UNRELATED }, // newest — not an ancestor of SHA
    { id: 20, headSha: SUPERSEDED }, // success, but its ping step was skipped
    { id: 10, headSha: LAST_PING }, // success AND pinged
  ];
  const ancestors = new Set([SUPERSEDED, LAST_PING]);
  const deps = {
    successfulRuns: () => runs,
    pinged: (run: PingRun) => run.headSha !== SUPERSEDED,
    isAncestorOrSelf: (candidate: string) => ancestors.has(candidate),
  };

  it("★ uses the newest run that PINGED and that this release descends from", () => {
    expect(resolveBefore(SHA, deps)).toEqual({ ref: LAST_PING, source: "last-ping", runId: 10 });
  });

  it("so a superseded deploy's restamped page is still announced when the next release lands", () => {
    // LAST_PING carried SITEMAP_BEFORE; SUPERSEDED restamped /app/pricing; SHA carries SITEMAP_AFTER.
    // Against the parent (= SUPERSEDED, already restamped) pricing would look unchanged.
    expect(resolveBefore(SHA, deps).ref).toBe(LAST_PING);
    expect(changedUrls(SITEMAP_BEFORE, SITEMAP_AFTER)).toContain("https://www.lazytopper.com/app/pricing");
  });

  it("falls back to the parent ONLY when no pinged ancestor run exists", () => {
    expect(resolveBefore(SHA, { ...deps, pinged: () => false })).toEqual({ ref: `${SHA}^`, source: "parent" });
    expect(
      resolveBefore(SHA, { successfulRuns: () => [], pinged: () => true, isAncestorOrSelf: () => true }),
    ).toEqual({ ref: `${SHA}^`, source: "parent" });
  });
});

// ── SEARCHPING-2 — the workflow never pings before the wait says live ─────────────────

interface WorkflowStep {
  name?: string;
  id?: string;
  if?: string;
  run?: string;
  uses?: string;
  with?: Record<string, unknown>;
  env?: Record<string, string>;
}

/** Whether a step runs, for BOTH triggers, given the wait step's outputs. */
function stepRunsFor(
  step: WorkflowStep,
  trigger: IfContext,
  outputs: Record<string, Record<string, string>>,
): boolean {
  const steps = Object.fromEntries(Object.entries(outputs).map(([id, out]) => [id, { outputs: out }]));
  return evaluateIf(step.if, { ...trigger, steps });
}
const TRIGGERS: Array<[string, IfContext]> = [
  ["deployment_status", deploymentEvent("Production", "success")],
  ["workflow_dispatch", dispatchEvent],
  ["push", pushEvent],
];

const PINGED_SHA = "${{ github.event.deployment.sha || inputs.sha || github.sha }}";

describe("search-ping.yml — S2 gate: no ping until the release is live", () => {
  const workflow = parseYaml(readFileSync(WORKFLOW, "utf8")) as {
    "run-name"?: string;
    on: { workflow_dispatch?: { inputs?: Record<string, { required?: boolean; default?: string }> } };
    concurrency?: { group?: string; "cancel-in-progress"?: boolean };
    jobs: Record<string, { steps: WorkflowStep[] }>;
  };
  const steps = Object.values(workflow.jobs).flatMap((job) => job.steps);
  const ping = steps.find((step) => step.name === PING_STEP_NAME);
  const wait = steps.find((step) => typeof step.run === "string" && /searchPing\.ts\b.*--wait\b/.test(step.run));

  it("the ping step exists under the exact name S3 looks for", () => {
    expect(ping, `no step named "${PING_STEP_NAME}"`).toBeDefined();
  });

  it("a wait step (with an id) runs searchPing.ts --wait BEFORE the ping step", () => {
    expect(wait, "no step runs searchPing.ts --wait").toBeDefined();
    expect(wait?.id).toBeTruthy();
    expect(steps.indexOf(wait as WorkflowStep)).toBeLessThan(steps.indexOf(ping as WorkflowStep));
  });

  it("★ the ping step runs ONLY when the wait step's output live == 'true' — for EVERY trigger", () => {
    const id = wait?.id as string;
    for (const [name, trigger] of TRIGGERS) {
      expect(stepRunsFor(ping as WorkflowStep, trigger, { [id]: { live: "true" } }), name).toBe(true);
      expect(
        stepRunsFor(ping as WorkflowStep, trigger, { [id]: { live: "false" } }),
        `${name}: pings a superseded release`,
      ).toBe(false);
      expect(stepRunsFor(ping as WorkflowStep, trigger, {}), `${name}: pings without waiting`).toBe(false);
    }
  });

  it("★ SEARCHPING-3 — the wait step itself runs for EVERY trigger, push included (no ping skips the wait)", () => {
    for (const [name, trigger] of TRIGGERS) expect(stepRunsFor(wait as WorkflowStep, trigger, {}), name).toBe(true);
  });

  it("S4 — the ping step still carries the GSC secret/variable, unchanged", () => {
    expect(ping?.env?.GSC_SERVICE_ACCOUNT).toBe("${{ secrets.GSC_SERVICE_ACCOUNT }}");
    expect(ping?.env?.GSC_SITE_URL).toBe("${{ vars.GSC_SITE_URL }}");
    expect(ping?.run).toContain('scripts/seo/searchPing.ts --sha="$DEPLOY_SHA"');
    expect(ping?.run).not.toContain("--wait");
  });

  it("SEARCHPING-2b — ONE pinged SHA everywhere: deployment sha, else the dispatch input, else the ref's HEAD", () => {
    expect(workflow.on.workflow_dispatch?.inputs?.sha?.required).toBe(false);
    expect(wait?.env?.DEPLOY_SHA).toBe(PINGED_SHA);
    expect(ping?.env?.DEPLOY_SHA).toBe(PINGED_SHA);
    const checkout = steps.find((step) => String(step.uses).startsWith("actions/checkout"));
    expect(checkout?.with?.ref).toBe(PINGED_SHA);
    // S3 reads the pinged SHA from the run title (a dispatched run's headSha is the ref's HEAD).
    expect(workflow["run-name"]).toBe(`search-ping ${PINGED_SHA}`);
  });

  it("SEARCHPING-2b/3 — push, dispatched and event runs for the same SHA share one concurrency group", () => {
    expect(workflow.concurrency?.group).toBe(`search-ping-${PINGED_SHA}`);
    expect(workflow.concurrency?.["cancel-in-progress"]).toBe(false);
  });
});

describe("search-ping — S3 reads the pinged SHA of a past run (SEARCHPING-2b)", () => {
  const HEAD = "7777777777777777777777777777777777777777";
  const INPUT = "8888888888888888888888888888888888888888";

  it("a titled run ('search-ping <sha>') pinged the SHA in its title, not its headSha", () => {
    expect(pingRunSha({ headSha: HEAD, displayTitle: `search-ping ${INPUT}` })).toBe(INPUT);
  });

  it("an untitled (pre-2b) run pinged its headSha", () => {
    expect(pingRunSha({ headSha: HEAD, displayTitle: "search-ping" })).toBe(HEAD);
    expect(pingRunSha({ headSha: HEAD })).toBe(HEAD);
  });
});
