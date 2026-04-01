import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const stylesPath = path.join(repoRoot, "src", "styles.css");
const defaultOutPath = path.join(
  repoRoot,
  ".project_memory",
  "ops",
  "out",
  "styles_connectivity_graph.json"
);

function parseArgs(argv) {
  const outIndex = argv.indexOf("--out");
  const outPath =
    outIndex >= 0 && argv[outIndex + 1]
      ? path.resolve(process.cwd(), argv[outIndex + 1])
      : defaultOutPath;
  return { outPath };
}

function isWhitespace(ch) {
  return ch === " " || ch === "\t" || ch === "\n" || ch === "\r" || ch === "\f";
}

function computeLineStarts(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "\n") starts.push(i + 1);
  }
  return starts;
}

function lineOfIndex(lineStarts, index) {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lineStarts[mid] <= index) lo = mid + 1;
    else hi = mid - 1;
  }
  return hi + 1;
}

function normalizeDeclarations(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([:;{},>+~])\s*/g, "$1")
    .trim();
}

function declarationHash(text) {
  return crypto.createHash("sha1").update(text).digest("hex");
}

function extractClassTokens(selectorText) {
  const out = [];
  const seen = new Set();
  const re = /\.([A-Za-z_][A-Za-z0-9_-]*)/g;
  let m;
  while ((m = re.exec(selectorText))) {
    const token = m[1];
    if (!seen.has(token)) {
      seen.add(token);
      out.push(token);
    }
  }
  return out;
}

function parseCssRules(cssText) {
  const lineStarts = computeLineStarts(cssText);
  const rules = [];
  const stack = [];
  let boundaryStart = 0;
  let inComment = false;
  let inString = false;
  let stringQuote = "";

  for (let i = 0; i < cssText.length; i += 1) {
    const ch = cssText[i];
    const next = cssText[i + 1];

    if (inComment) {
      if (ch === "*" && next === "/") {
        inComment = false;
        i += 1;
      }
      continue;
    }

    if (!inString && ch === "/" && next === "*") {
      inComment = true;
      i += 1;
      continue;
    }

    if (inString) {
      if (ch === "\\" && i + 1 < cssText.length) {
        i += 1;
        continue;
      }
      if (ch === stringQuote) {
        inString = false;
        stringQuote = "";
      }
      continue;
    }

    if (ch === "'" || ch === '"') {
      inString = true;
      stringQuote = ch;
      continue;
    }

    if (ch === "{") {
      let preludeStart = boundaryStart;
      while (preludeStart < i && isWhitespace(cssText[preludeStart])) preludeStart += 1;
      const prelude = cssText
        .slice(preludeStart, i)
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .trim();
      const parentAtRules = stack
        .map((b) => b.prelude)
        .filter((p) => String(p || "").startsWith("@"));
      stack.push({
        prelude,
        preludeStart,
        openIndex: i,
        depth: stack.length + 1,
        parentAtRules,
      });
      boundaryStart = i + 1;
      continue;
    }

    if (ch === "}") {
      const block = stack.pop();
      if (!block) {
        boundaryStart = i + 1;
        continue;
      }
      const declarations = cssText.slice(block.openIndex + 1, i);
      if (block.prelude && !block.prelude.startsWith("@")) {
        const normalized = normalizeDeclarations(declarations);
        const classTokens = extractClassTokens(block.prelude);
        rules.push({
          selector: block.prelude,
          start_line: lineOfIndex(lineStarts, block.preludeStart),
          end_line: lineOfIndex(lineStarts, i),
          depth: block.depth,
          inside_at_rule: block.parentAtRules.length > 0,
          parent_at_rules: block.parentAtRules,
          class_tokens: classTokens,
          declaration_hash: declarationHash(normalized),
        });
      }
      boundaryStart = i + 1;
      continue;
    }

    if (ch === ";" && stack.length === 0) {
      boundaryStart = i + 1;
    }
  }

  return rules;
}

async function listConsumerFiles() {
  const roots = [path.join(repoRoot, "src")];
  const out = [path.join(repoRoot, "index.html")];
  const allowExt = new Set([".ts", ".tsx", ".js", ".jsx", ".html"]);

  async function walk(dir) {
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        await walk(full);
      } else if (allowExt.has(path.extname(ent.name))) {
        out.push(full);
      }
    }
  }

  for (const root of roots) await walk(root);
  return out;
}

function extractTokensFromClassValue(raw) {
  const scrubbed = String(raw || "").replace(/\$\{[^}]*\}/g, " ");
  return scrubbed
    .split(/\s+/g)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => x.replace(/^[^A-Za-z_]+|[^A-Za-z0-9_-]+$/g, ""))
    .filter((x) => /^[A-Za-z_][A-Za-z0-9_-]*$/.test(x));
}

function addUsage(usageMap, token, fileRel, channel) {
  if (!usageMap.has(token)) {
    usageMap.set(token, {
      files: new Set(),
      channels: new Set(),
    });
  }
  const rec = usageMap.get(token);
  rec.files.add(fileRel);
  rec.channels.add(channel);
}

function collectUsageFromContent(fileRel, text, usageMap) {
  const patterns = [
    { re: /className\s*=\s*"([^"]+)"/g, channel: "className_literal" },
    { re: /className\s*=\s*'([^']+)'/g, channel: "className_literal" },
    { re: /class\s*=\s*"([^"]+)"/g, channel: "class_literal" },
    { re: /class\s*=\s*'([^']+)'/g, channel: "class_literal" },
    { re: /className\s*=\s*{`([\s\S]*?)`}/g, channel: "className_template" },
  ];

  for (const { re, channel } of patterns) {
    let m;
    while ((m = re.exec(text))) {
      for (const token of extractTokensFromClassValue(m[1])) {
        addUsage(usageMap, token, fileRel, channel);
      }
    }
  }

  // Capture string literals inside className expression values:
  // className={cond ? "a b" : "c"} / className={["a", active && "b"].join(" ")}
  const classExprRe = /className\s*=\s*{([\s\S]*?)}/g;
  let classExpr;
  while ((classExpr = classExprRe.exec(text))) {
    const expr = classExpr[1] || "";
    const strRe = /["'`]([^"'`]+)["'`]/g;
    let s;
    while ((s = strRe.exec(expr))) {
      for (const token of extractTokensFromClassValue(s[1])) {
        addUsage(usageMap, token, fileRel, "className_expression_strings");
      }
    }
  }

  const cxRe = /\b(?:cx|clsx|classNames|cn)\s*\(([\s\S]*?)\)/g;
  let cx;
  while ((cx = cxRe.exec(text))) {
    const args = cx[1];
    const strRe = /["'`]([^"'`]+)["'`]/g;
    let s;
    while ((s = strRe.exec(args))) {
      for (const token of extractTokensFromClassValue(s[1])) {
        addUsage(usageMap, token, fileRel, "cx_or_clsx");
      }
    }
  }
}

function isSafeUnresolvedSelector(rule, unresolvedTextHit) {
  if (rule.inside_at_rule) return false;
  if (!rule.class_tokens.length) return false;
  if (rule.selector.includes(":")) return false;
  if (rule.selector.includes("[") || rule.selector.includes(">")) return false;
  if (unresolvedTextHit) return false;
  return rule.class_tokens.every((t) => t.includes("-") && t.length >= 5);
}

export async function generateStylesConnectivityGraph(opts = {}) {
  const outPath = opts.outPath || defaultOutPath;
  const cssText = await fs.readFile(stylesPath, "utf8");
  const rules = parseCssRules(cssText);
  const consumers = await listConsumerFiles();
  const usageMap = new Map();
  const rawByFile = new Map();

  for (const abs of consumers) {
    let text = "";
    try {
      text = await fs.readFile(abs, "utf8");
    } catch {
      continue;
    }
    const rel = path.relative(repoRoot, abs).replaceAll("\\", "/");
    rawByFile.set(rel, text);
    collectUsageFromContent(rel, text, usageMap);
  }

  const tokenTextPresence = new Map();
  function hasTokenText(token) {
    if (tokenTextPresence.has(token)) return tokenTextPresence.get(token);
    const re = new RegExp(`\\b${token.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`);
    const present = [...rawByFile.values()].some((text) => re.test(text));
    tokenTextPresence.set(token, present);
    return present;
  }

  const enrichedRules = rules.map((rule) => {
    const usage = rule.class_tokens.map((t) => ({
      token: t,
      present: usageMap.has(t),
      files: usageMap.has(t) ? [...usageMap.get(t).files].sort() : [],
      channels: usageMap.has(t) ? [...usageMap.get(t).channels].sort() : [],
      text_hit: hasTokenText(t),
    }));
    const resolved = usage.some((u) => u.present);
    const unresolvedTextHit = usage.some((u) => u.text_hit);
    return {
      ...rule,
      resolved,
      usage,
      unresolved_text_hit: unresolvedTextHit,
    };
  });

  const selectorMap = new Map();
  for (const rule of enrichedRules) {
    if (!selectorMap.has(rule.selector)) selectorMap.set(rule.selector, []);
    selectorMap.get(rule.selector).push(rule);
  }

  const duplicateSelectors = [];
  const duplicateIdentical = [];
  const duplicateNonIdentical = [];

  for (const [selector, entries] of selectorMap.entries()) {
    if (entries.length < 2) continue;
    const hashes = new Set(entries.map((e) => e.declaration_hash));
    duplicateSelectors.push({
      selector,
      count: entries.length,
      lines: entries.map((e) => ({ start_line: e.start_line, end_line: e.end_line })),
    });
    if (hashes.size === 1) {
      duplicateIdentical.push({
        selector,
        declaration_hash: entries[0].declaration_hash,
        count: entries.length,
        entries: entries
          .map((e) => ({ start_line: e.start_line, end_line: e.end_line }))
          .sort((a, b) => a.start_line - b.start_line),
      });
    } else {
      duplicateNonIdentical.push({
        selector,
        count: entries.length,
        declaration_hashes: [...hashes],
        entries: entries
          .map((e) => ({
            start_line: e.start_line,
            end_line: e.end_line,
            declaration_hash: e.declaration_hash,
          }))
          .sort((a, b) => a.start_line - b.start_line),
      });
    }
  }

  const globalCollisionSelectors = duplicateSelectors
    .filter((d) => /^\.[A-Za-z0-9_-]+$/.test(d.selector))
    .filter((d) => {
      const token = d.selector.slice(1);
      const genericSet = new Set([
        "page",
        "card",
        "title",
        "subtitle",
        "section-title",
        "section-subtitle",
        "pill",
      ]);
      return genericSet.has(token) || !token.includes("-");
    })
    .sort((a, b) => b.count - a.count);

  const candidatesSafeRemove = [];

  for (const rule of enrichedRules) {
    if (rule.resolved) continue;
    const safe = isSafeUnresolvedSelector(rule, rule.unresolved_text_hit);
    if (!safe) continue;
    candidatesSafeRemove.push({
      start_line: rule.start_line,
      end_line: rule.end_line,
      selector: rule.selector,
      reason: "unresolved_no_usage",
      confidence: "high",
      inside_at_rule: rule.inside_at_rule,
    });
  }

  for (const d of duplicateIdentical) {
    const entries = [...d.entries].sort((a, b) => a.start_line - b.start_line);
    const keep = entries[entries.length - 1];
    for (const e of entries) {
      if (e.start_line === keep.start_line && e.end_line === keep.end_line) continue;
      candidatesSafeRemove.push({
        start_line: e.start_line,
        end_line: e.end_line,
        selector: d.selector,
        reason: "duplicate_identical_keep_latest",
        confidence: "high",
        inside_at_rule: false,
      });
    }
  }

  const dedupKey = new Set();
  const dedupedCandidates = [];
  for (const c of candidatesSafeRemove.sort((a, b) => a.start_line - b.start_line)) {
    const key = `${c.start_line}:${c.end_line}:${c.reason}`;
    if (dedupKey.has(key)) continue;
    dedupKey.add(key);
    dedupedCandidates.push(c);
  }

  const selectorCounts = {};
  for (const [selector, entries] of selectorMap.entries()) {
    selectorCounts[selector] = entries.length;
  }

  const report = {
    generated_at: new Date().toISOString(),
    source: {
      styles_path: path.relative(repoRoot, stylesPath).replaceAll("\\", "/"),
      consumer_files_scanned: consumers
        .map((f) => path.relative(repoRoot, f).replaceAll("\\", "/"))
        .sort(),
    },
    rules_total: enrichedRules.length,
    rules_with_class_tokens: enrichedRules.filter((r) => r.class_tokens.length > 0).length,
    rules_resolved: enrichedRules.filter((r) => r.class_tokens.length > 0 && r.resolved).length,
    rules_unresolved: enrichedRules.filter((r) => r.class_tokens.length > 0 && !r.resolved).length,
    duplicate_selectors: duplicateSelectors.sort((a, b) => b.count - a.count),
    duplicate_selector_blocks_identical: duplicateIdentical.sort((a, b) => b.count - a.count),
    duplicate_selector_blocks_nonidentical: duplicateNonIdentical.sort((a, b) => b.count - a.count),
    global_collision_selectors: globalCollisionSelectors,
    candidates_safe_remove: dedupedCandidates,
    selector_counts: selectorCounts,
    rules: enrichedRules,
  };

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  return { outPath, report };
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  const { outPath } = parseArgs(process.argv.slice(2));
  const { report } = await generateStylesConnectivityGraph({ outPath });
  console.log(
    `styles_connectivity_graph: rules=${report.rules_total}, resolved=${report.rules_resolved}, unresolved=${report.rules_unresolved}, duplicateSelectors=${report.duplicate_selectors.length}`
  );
  console.log(`report=${path.relative(repoRoot, outPath).replaceAll("\\", "/")}`);
}
