// @vitest-environment node
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";

/**
 * GUARD — ROOT-URL-1 M6: nothing may point at the retired `/app` base again.
 *
 * WHY. The app moved from `https://www.lazytopper.com/app/...` to the domain root. Every
 * old URL is ONE permanent redirect in `vercel.json`, so a stray `/app/...` literal does not
 * break loudly: it costs every visitor an extra hop, tells Google the old URL is still the
 * real one, and — for a server-written asset path or a canonical — can quietly point a
 * crawler at a redirect forever. The code derives URLs from `import.meta.env.BASE_URL`
 * (CLAUDE.md §7); this guard is what keeps a literal from creeping back.
 *
 * WHAT IS SCANNED: `lazytopper/src` (tests included, `src/data` excluded), `lazytopper/server`,
 * `lazytopper/scripts`, the root `scripts/`, `lazytopper/public`, the root `notes/`,
 * `lazytopper/index.html`, `middleware.ts` and `vercel.json`. Comments are stripped first:
 * history explaining why the base moved is not a URL anyone will request.
 *
 * WHAT COUNTS AS A `/app` LITERAL. A URL path that STARTS with the retired base — `/app`
 * followed by `/`, a quote, `?` or `#` — where the `/app` begins the path: after a quote,
 * whitespace, `(`, `=`, `,`, `[` or `>`, or straight after a host (`lazytopper.com/app/`,
 * `localhost:5173/app/`). A module specifier such as `firebase/app` or a source folder
 * such as `pages/app/` is NOT a URL and is not matched (the `/` there follows a letter).
 * One more shape is matched on purpose: `public/app`, the retired BUILD OUTPUT sub-folder
 * (`dist/public/app`), which is how a post-build script pointed at the old layout.
 *
 * ALLOWLIST — exactly the rules whose JOB is the old base, and nothing else:
 *   - vercel.json: the two permanent redirects (`/app` and `/app/:path(...)`) and the
 *     `/app/assets/:path(.*)` -> 404 rewrite (old tabs must 404 into chunk recovery).
 *   - lazytopper/src/lib/vercelMiddleware.test.ts: M3's "a request under the retired base
 *     is not pinned" cases.
 *   - this file, which has to name what it forbids.
 *
 * NOT A URL, SO NOT MATCHED (a classification, not an allowlist entry): under
 * `lazytopper/server/` only, a container FILE path below the backend image's `/app` WORKDIR
 * (`/app/lazytopper/...`, `/app/x.cjs`) — see CONTAINER_PATH.
 *
 * ★ MUTATION (ROOT-URL-1 M6): re-adding P10's literal to `server/routes/diagrams.cjs`
 * (`const filePathUrl = '/app/visuals/' + ...`) turns "no /app literal" RED.
 */

const LAZYTOPPER_ROOT = resolve(__dirname, "../..");
const REPO_ROOT = resolve(LAZYTOPPER_ROOT, "..");

const SCAN_DIRS = [
  "lazytopper/src",
  "lazytopper/server",
  "lazytopper/scripts",
  "scripts",
  "lazytopper/public",
  "notes",
];
const SCAN_FILES = ["lazytopper/index.html", "middleware.ts", "vercel.json"];

const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "coverage"]);
const SKIP_PREFIXES = ["lazytopper/src/data/"];
const TEXT_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".cjs", ".mjs", ".json", ".html", ".css",
  ".txt", ".xml", ".md", ".svg", ".sh", ".ps1", ".py", ".yml", ".yaml",
]);
const JS_LIKE = new Set([".ts", ".tsx", ".js", ".jsx", ".cjs", ".mjs"]);

const THIS_FILE = "lazytopper/src/config/noAppPrefix.guard.test.ts";

/** Allowed hits: file -> the exact (trimmed) lines that may carry the old base. */
const ALLOWLIST: Record<string, (line: string) => boolean> = {
  "vercel.json": (line) =>
    [
      `"source": "/app",`,
      `"source": "/app/:path((?!assets/).*)",`,
      `"source": "/app/assets/:path(.*)",`,
    ].includes(line.trim()),
  "lazytopper/src/lib/vercelMiddleware.test.ts": (line) =>
    line.includes(`for (const path of ["/app", "/app/", "/app/pricing", "/app/check-improve", "/app/notes/trigonometry"])`) ||
    line.includes(`for (const path of ["/app", "/app/", "/app/pricing", "/app/assets/x.js"])`),
  [THIS_FILE]: () => true,
};

/**
 * A URL path starting with the retired base. Group 1 is what precedes it (a delimiter or a
 * host), so a module specifier (`firebase/app`) or a folder (`pages/app/`) cannot match.
 */
const APP_URL = new RegExp(
  String.raw`(^|["'\x60\s(=,\[>]|\.com|\.app|localhost|:\d{2,5})\/app(?=[\/"'\x60?#]|$)`,
  "m",
);
/**
 * NOT A URL: the backend image's WORKDIR is `/app` (Dockerfile), so the server's stack-trace
 * and error-scrubbing tests carry container FILE paths — `/app/lazytopper/server/x.cjs`,
 * `(/app/x.cjs:1:1)`. Applied under `lazytopper/server/` only, and never to `/app/assets/`.
 */
const CONTAINER_PATH = /\/app\/(?!assets\/)(?:lazytopper\b|[\w.-]+\.[cm]?js\b)/g;

/** The retired build output sub-folder (`artifacts/lazytopper-app/dist/public/app`). */
const OLD_OUTDIR = /public[\\/]+app(?=[\\/"'\x60,)]|$)/m;

function walk(rel: string, out: string[]): void {
  const abs = join(REPO_ROOT, rel);
  if (!existsSync(abs)) return;
  for (const name of readdirSync(abs)) {
    if (SKIP_DIRS.has(name)) continue;
    const childRel = rel ? `${rel}/${name}` : name;
    if (SKIP_PREFIXES.some((p) => `${childRel}/`.startsWith(p))) continue;
    const st = statSync(join(abs, name));
    if (st.isDirectory()) walk(childRel, out);
    else if (TEXT_EXTENSIONS.has(extname(name).toLowerCase())) out.push(childRel);
  }
}

/**
 * Blank out comments, keeping every newline so line numbers survive. A small lexer, not a
 * regex: `https://` inside a string is not a comment, and `/* ... *\/` inside a template
 * literal is not one either.
 */
export function stripJsComments(src: string): string {
  let out = "";
  let i = 0;
  let prevSignificant = "";
  const n = src.length;
  const regexAllowedAfter = new Set(["", "(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "+", "-", "*", "%", "<", ">", "~", "^"]);
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (c === "/" && d === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && d === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] === "\n") out += "\n";
        i++;
      }
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      out += c;
      i++;
      while (i < n && src[i] !== quote) {
        if (src[i] === "\\") {
          out += src[i] + (src[i + 1] ?? "");
          i += 2;
          continue;
        }
        if (quote !== "`" && src[i] === "\n") break;
        out += src[i];
        i++;
      }
      if (i < n) out += src[i];
      i++;
      prevSignificant = quote;
      continue;
    }
    if (c === "/" && regexAllowedAfter.has(prevSignificant)) {
      // A regex literal: copy through to the closing unescaped `/` outside a class.
      out += c;
      i++;
      let inClass = false;
      while (i < n && src[i] !== "\n") {
        const ch = src[i];
        out += ch;
        i++;
        if (ch === "\\") {
          out += src[i] ?? "";
          i++;
          continue;
        }
        if (ch === "[") inClass = true;
        else if (ch === "]") inClass = false;
        else if (ch === "/" && !inClass) break;
      }
      prevSignificant = "/regex";
      continue;
    }
    out += c;
    if (!/\s/.test(c)) prevSignificant = /[A-Za-z0-9_$)\]]/.test(c) ? "word" : c;
    i++;
  }
  return out;
}

function stripBlockComments(src: string, open: string, close: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const start = src.indexOf(open, i);
    if (start === -1) {
      out += src.slice(i);
      break;
    }
    out += src.slice(i, start);
    const end = src.indexOf(close, start + open.length);
    const stop = end === -1 ? src.length : end + close.length;
    out += src.slice(start, stop).replace(/[^\n]/g, "");
    i = stop;
  }
  return out;
}

function codeOf(rel: string, src: string): string {
  const ext = extname(rel).toLowerCase();
  if (JS_LIKE.has(ext)) return stripJsComments(src);
  if (ext === ".css") return stripBlockComments(src, "/*", "*/");
  if (ext === ".html" || ext === ".svg" || ext === ".xml" || ext === ".md") {
    return stripBlockComments(src, "<!--", "-->");
  }
  return src;
}

type Hit = { file: string; line: number; text: string };

function scan(): { files: number; hits: Hit[] } {
  const files: string[] = [];
  for (const dir of SCAN_DIRS) walk(dir, files);
  for (const f of SCAN_FILES) if (existsSync(join(REPO_ROOT, f))) files.push(f);
  const hits: Hit[] = [];
  for (const rel of files) {
    const src = readFileSync(join(REPO_ROOT, rel), "utf8");
    if (!src.includes("/app") && !/public[\\/]+app/.test(src)) continue;
    let code = codeOf(rel, src);
    if (rel.startsWith("lazytopper/server/")) code = code.replace(CONTAINER_PATH, "<container-path>");
    const lines = code.split("\n");
    const allowed = ALLOWLIST[rel];
    lines.forEach((text, idx) => {
      if (!APP_URL.test(text) && !OLD_OUTDIR.test(text)) return;
      if (allowed && allowed(text)) return;
      hits.push({ file: rel, line: idx + 1, text: text.trim().slice(0, 160) });
    });
  }
  return { files: files.length, hits };
}

describe("ROOT-URL-1 M6 — no literal points at the retired /app base", () => {
  it("the matcher catches the shapes it must and ignores the ones it must not (CONTROL)", () => {
    for (const bad of [
      `const filePathUrl = '/app/visuals/' + rel;`,
      `<link rel="canonical" href="https://www.lazytopper.com/app/" />`,
      `fetch("/app")`,
      "const u = `/app/notes/${slug}`;",
      `http://localhost:5173/app/pricing`,
      `x = /app?gclid=1`,
    ]) {
      expect(APP_URL.test(bad), bad).toBe(true);
    }
    expect(OLD_OUTDIR.test(`path.join(__dirname, "../artifacts/lazytopper-app/dist/public/app")`)).toBe(true);
    // The container-path classification blanks WORKDIR file paths, never an old URL.
    const blank = (s: string) => s.replace(CONTAINER_PATH, "<container-path>");
    expect(APP_URL.test(blank(`'    at foo (/app/lazytopper/server/routes/x.cjs:1:1)'`))).toBe(false);
    expect(APP_URL.test(blank(`'(/app/x.cjs:1:1)'`))).toBe(false);
    expect(APP_URL.test(blank(`"/app/assets/index-AbC.js"`))).toBe(true);
    expect(APP_URL.test(blank(`'/app/visuals/x.html'`))).toBe(true);
    for (const fine of [
      `import { initializeApp } from "firebase/app";`,
      `const Intent = lazy(() => import("./pages/app/Intent"));`,
      `requireFromApp("firebase-admin/app")`,
      `"/application"`,
      `"/apps/x"`,
      `path.resolve(__dirname, "../artifacts/lazytopper-app/dist/public")`,
      `matcher: ["/((?!assets/|api/|shared-api/|_vercel/|app/|app$).*)"]`,
    ]) {
      expect(APP_URL.test(fine) || OLD_OUTDIR.test(fine), fine).toBe(false);
    }
  });

  it("comments are stripped, strings and regexes survive (CONTROL)", () => {
    const src = [
      `// see https://www.lazytopper.com/app/old`,
      `/* the app used to live at "/app/" */`,
      `const a = "https://x.test/keep"; // trailing /app/ note`,
      "const t = `a // b /* c */`;",
      `const r = /^\\/u\\//; const k = '/app/kept';`,
    ].join("\n");
    const code = stripJsComments(src);
    expect(code.split("\n")).toHaveLength(5);
    expect(code).not.toContain("lazytopper.com/app/old");
    expect(code).not.toContain(`"/app/"`);
    expect(code).toContain(`"https://x.test/keep"`);
    expect(code).not.toContain("trailing");
    expect(code).toContain("`a // b /* c */`");
    expect(code).toContain(`'/app/kept'`);
  });

  it("★ no /app literal in src, server, scripts, public, notes, index.html, middleware.ts or vercel.json", () => {
    const { files, hits } = scan();
    console.log(`NO_APP_PREFIX: files=${files} hits=${hits.length}`);
    expect(files, "the scan found nothing to read — the guard would pass vacuously").toBeGreaterThan(500);
    expect(hits.map((h) => `${h.file}:${h.line}  ${h.text}`)).toEqual([]);
  });

  it("the allowlisted rules are still there (an allowlist entry that matches nothing is stale)", () => {
    const vercel = readFileSync(join(REPO_ROOT, "vercel.json"), "utf8");
    const parsed = JSON.parse(vercel) as {
      redirects: Array<{ source: string; destination: string; permanent: boolean }>;
      rewrites: Array<{ source: string; destination: string }>;
    };
    expect(parsed.redirects).toEqual([
      { source: "/app", destination: "/", permanent: true },
      { source: "/app/:path((?!assets/).*)", destination: "/:path", permanent: true },
    ]);
    expect(parsed.rewrites).toContainEqual({ source: "/app/assets/:path(.*)", destination: "/__asset-not-found__" });
    const mw = readFileSync(join(LAZYTOPPER_ROOT, "src/lib/vercelMiddleware.test.ts"), "utf8");
    expect(mw).toContain(`"/app/check-improve"`);
  });

  it("server/routes/diagrams.cjs builds its visual URL from the Vite base, not a literal", () => {
    const req = createRequire(__filename);
    const { publicBase } = req(join(LAZYTOPPER_ROOT, "server/routes/diagrams.cjs")) as { publicBase: () => string };
    const viteConfig = readFileSync(join(LAZYTOPPER_ROOT, "vite.config.ts"), "utf8");
    const declared = /^\s*base:\s*"([^"]+)"/m.exec(viteConfig)?.[1];
    expect(declared).toBe("/");
    expect(publicBase()).toBe(declared);
  });
});
