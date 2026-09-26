/**
 * issues — how the job tells the owner something happened (C5, C6, C7, C8).
 *
 * ★ DEDUPE (C5): never open a second OPEN issue with the same title. The open set is
 * read from GitHub once per run; a title already open is skipped, and two requests in
 * the same run with the same title collapse to one. A CLOSED issue does not block a
 * new one — closing it is the owner saying "seen", and a recurrence is news.
 *
 * The client talks to the REST API with the workflow's `GITHUB_TOKEN`, which needs
 * `permissions: issues: write` — this repo's default workflow token is READ-only
 * (measured 2026-09-26: `default_workflow_permissions: "read"`).
 */
export type IssueRequest = { readonly title: string; readonly body: string };

export const ISSUE_TITLES = {
  replaced: (label: string) => `CBSE mirror: replaced ${label}`,
  rejected: (label: string) => `CBSE mirror: rejected update for ${label}`,
  sourceMissing: (label: string) => `CBSE mirror: source missing for ${label}`,
  unmapped: (session: string) => `CBSE mirror: unmapped links in the ${session} sample-paper index`,
  circularsRejected: () => "CBSE mirror: circulars feed rejected",
} as const;

export function dedupeIssues(
  requests: readonly IssueRequest[],
  openTitles: ReadonlySet<string>,
): IssueRequest[] {
  const out: IssueRequest[] = [];
  const taken = new Set(openTitles);
  for (const request of requests) {
    if (taken.has(request.title)) continue;
    taken.add(request.title);
    out.push(request);
  }
  return out;
}

export interface IssueTracker {
  openTitles(): Promise<Set<string>>;
  create(request: IssueRequest): Promise<void>;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export function githubIssueTracker(options: {
  readonly repository: string;
  readonly token: string;
  readonly fetchImpl?: FetchLike;
  readonly apiBase?: string;
}): IssueTracker {
  const fetchImpl = options.fetchImpl ?? fetch;
  const api = options.apiBase ?? "https://api.github.com";
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${options.token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "lazytopper-cbse-mirror",
  };
  return {
    async openTitles() {
      const titles = new Set<string>();
      for (let page = 1; page <= 20; page += 1) {
        const response = await fetchImpl(
          `${api}/repos/${options.repository}/issues?state=open&per_page=100&page=${page}`,
          { headers },
        );
        if (!response.ok) throw new Error(`listing open issues failed: HTTP ${response.status}`);
        const batch = (await response.json()) as { title: string; pull_request?: unknown }[];
        for (const item of batch) if (!item.pull_request) titles.add(item.title);
        if (batch.length < 100) break;
      }
      return titles;
    },
    async create(request) {
      const response = await fetchImpl(`${api}/repos/${options.repository}/issues`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error(`creating issue failed: HTTP ${response.status}`);
    },
  };
}
