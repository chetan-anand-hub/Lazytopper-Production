import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

const connectivityPath = path.join(
  repoRoot,
  ".project_memory",
  "ops",
  "out",
  "styles_connectivity_graph.json"
);
const impactPath = path.join(
  repoRoot,
  ".project_memory",
  "ops",
  "out",
  "styles_change_impact_graph.json"
);
const stylesPath = path.join(repoRoot, "src", "styles.css");
const outJsonPath = path.join(repoRoot, ".project_memory", "ops", "out", "styles_uiux_audit.json");
const outMdPath = path.join(repoRoot, ".project_memory", "ops", "out", "styles_uiux_audit.md");

function pct(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((Number(numerator || 0) / Number(denominator || 1)) * 1000) / 10;
}

function countMatches(text, re) {
  const matches = text.match(re);
  return matches ? matches.length : 0;
}

function uniqStrings(values) {
  return [...new Set(values.map((v) => String(v || "").trim()).filter(Boolean))].sort();
}

function severityRank(level) {
  if (level === "high") return 0;
  if (level === "medium") return 1;
  return 2;
}

function summarizeTopRows(rows, count, mapper) {
  return (rows || []).slice(0, count).map(mapper);
}

function ensureArray(v) {
  return Array.isArray(v) ? v : [];
}

async function run() {
  const [connectivityRaw, impactRaw, stylesText] = await Promise.all([
    fs.readFile(connectivityPath, "utf8"),
    fs.readFile(impactPath, "utf8"),
    fs.readFile(stylesPath, "utf8"),
  ]);

  const connectivity = JSON.parse(connectivityRaw);
  const impact = JSON.parse(impactRaw);

  const rulesWithClassTokens = Number(connectivity.rules_with_class_tokens || 0);
  const unresolvedRules = Number(connectivity.rules_unresolved || 0);
  const unresolvedRatio = pct(unresolvedRules, rulesWithClassTokens);

  const duplicateSelectors = ensureArray(connectivity.duplicate_selectors).length;
  const duplicateNonIdentical = ensureArray(
    connectivity.duplicate_selector_blocks_nonidentical
  ).length;
  const globalCollisions = ensureArray(connectivity.global_collision_selectors);

  const fontFamilies = uniqStrings(
    [...stylesText.matchAll(/font-family:\s*([^;]+);/g)].map((m) => m[1])
  );
  const colorLiteralCount = countMatches(stylesText, /#[0-9a-fA-F]{3,8}\b/g);
  const mediaQueryCount = countMatches(stylesText, /@media\s*\(/g);
  const keyframeCount = countMatches(stylesText, /@keyframes\s+/g);
  const hasFocusVisible = /:focus-visible\b/.test(stylesText);
  const hasReducedMotion = /prefers-reduced-motion/.test(stylesText);
  const hasRootTokens = /:root\s*\{[\s\S]*--/.test(stylesText);

  const topHighRiskSelectors = summarizeTopRows(
    ensureArray(impact.selector_rollup).filter((row) => row.risk_level === "high"),
    12,
    (row) => ({
      selector: row.selector,
      usage_routes: ensureArray(row.usage_routes).length,
      duplicate_selector_count: row.duplicate_selector_count,
      global_collision: Boolean(row.global_collision),
    })
  );

  const topRoutesByTouch = summarizeTopRows(
    ensureArray(impact.routes).sort((a, b) => {
      const byRules = Number(b.rules_touching_route || 0) - Number(a.rules_touching_route || 0);
      if (byRules !== 0) return byRules;
      return String(a.path || "").localeCompare(String(b.path || ""));
    }),
    10,
    (route) => ({
      path: route.path,
      rules_touching_route: Number(route.rules_touching_route || 0),
      selectors_touching_route: Number(route.selectors_touching_route || 0),
      entry_files: ensureArray(route.entry_files),
    })
  );

  const findings = [];

  if (unresolvedRatio >= 60) {
    findings.push({
      severity: "high",
      area: "Connectivity confidence",
      title: "Most class-token rules are not resolved to runtime usage",
      evidence: `Unresolved ratio ${unresolvedRatio}% (${unresolvedRules}/${rulesWithClassTokens}).`,
      recommendation:
        "Do not bulk-delete unresolved rules. Clean by route namespace and verify via impact graph plus visual smoke.",
    });
  }

  if (duplicateNonIdentical >= 80) {
    findings.push({
      severity: "high",
      area: "Cascade predictability",
      title: "Many selectors have non-identical duplicate blocks",
      evidence: `duplicate_nonidentical=${duplicateNonIdentical}, duplicate_selectors=${duplicateSelectors}.`,
      recommendation:
        "Consolidate duplicate selector blocks into one canonical block per selector/feature scope.",
    });
  }

  if (globalCollisions.length > 0) {
    findings.push({
      severity: "high",
      area: "Global namespace safety",
      title: "Generic global selectors collide across flows",
      evidence: `Global collision selectors: ${globalCollisions
        .map((x) => x.selector)
        .join(", ")}.`,
      recommendation:
        "Namespace globals by route context or migrate to feature-prefixed tokens before deletion pass.",
    });
  }

  if (!hasFocusVisible) {
    findings.push({
      severity: "medium",
      area: "Accessibility",
      title: "No explicit :focus-visible treatment found",
      evidence: "Keyboard focus state is likely inconsistent across controls.",
      recommendation:
        "Define a consistent focus ring token and apply it to buttons, links, inputs, chips, and toggles.",
    });
  }

  if (!hasReducedMotion) {
    findings.push({
      severity: "medium",
      area: "Accessibility and comfort",
      title: "No reduced-motion fallback",
      evidence: "Animations/transitions exist but prefers-reduced-motion guard was not found.",
      recommendation:
        "Add a reduced-motion media query to disable non-essential animation for sensitive learners.",
    });
  }

  if (fontFamilies.length > 4) {
    findings.push({
      severity: "medium",
      area: "Visual consistency",
      title: "Too many font-family declarations",
      evidence: `Distinct font-family declarations: ${fontFamilies.length}.`,
      recommendation:
        "Constrain to a typography scale with one display family and one text family across the product.",
    });
  }

  const strengths = [];
  if (hasRootTokens) {
    strengths.push("Theme tokens are centralized in :root and can support a controlled refactor.");
  }
  if (mediaQueryCount >= 8) {
    strengths.push(
      `Responsive behavior is already present (${mediaQueryCount} media queries), reducing mobile-regression risk.`
    );
  }
  if (topRoutesByTouch.length > 0) {
    strengths.push("Route-level style impact is now measurable for runtime page flows.");
  }
  if (keyframeCount > 0) {
    strengths.push(`Motion primitives exist (${keyframeCount} keyframes) and can be standardized.`);
  }

  findings.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  const restructureSteps = [
    {
      step: "S1",
      title: "Baseline map freeze",
      objective: "Capture current style connectivity and blast radius before edits.",
      test_commands: [
        "npm run test:styles:graph",
        "npm run test:styles:connectivity",
        "npm run test:styles:impact-graph",
        "npm run test:styles:impact-acceptance",
      ],
      acceptance: "All commands pass and reports are generated under .project_memory/ops/out.",
    },
    {
      step: "S2",
      title: "Namespace and collision hardening",
      objective: "Resolve global selector collisions (.page/.pill/.section*) before deletions.",
      test_commands: [
        "npm run test:styles:impact-graph -- --selector .page",
        "npm run test:styles:impact-graph -- --selector .pill",
        "npm run test:styles:impact-acceptance",
      ],
      acceptance: "Colliding selectors mapped with explicit impacted routes and replacement strategy.",
    },
    {
      step: "S3",
      title: "Duplicate consolidation",
      objective: "Merge repeated non-identical selectors into canonical per-feature blocks.",
      test_commands: [
        "npm run test:styles:impact-graph",
        "npm run test:styles:trim-candidates",
        "npm run test:styles:trim-acceptance",
      ],
      acceptance: "Duplicate selector count drops with no loss of route-critical selectors.",
    },
    {
      step: "S4",
      title: "Conservative delete lane",
      objective: "Delete only graph-backed safe ranges; avoid unresolved mass trim.",
      test_commands: [
        "npm run test:styles:trim-candidates",
        "npm run test:styles:trim-acceptance",
        "npm run test:styles:impact-acceptance",
      ],
      acceptance:
        "Only high-confidence candidates are removed and all style acceptance checks remain green.",
    },
    {
      step: "S5",
      title: "Gen-Z education polish",
      objective: "Strengthen educational UX flow, clarity, and energy without visual noise.",
      test_commands: [
        "npm run test:styles:uiux-audit",
        "npm run test:styles:impact-graph -- --selector .mentor-panel",
        "npm run test:styles:impact-graph -- --selector .topic-card",
      ],
      acceptance:
        "Key learning routes maintain readability, hierarchy, and action clarity on desktop + mobile.",
    },
    {
      step: "S6",
      title: "Regression gate",
      objective: "Validate product-level stability after each style batch.",
      test_commands: ["npm run lint:ci", "npm run build", "npm run test:matrix:execution"],
      acceptance: "Build + matrix remain green; no new runtime regression from style edits.",
    },
  ];

  const report = {
    generated_at: new Date().toISOString(),
    persona:
      "UI/UX audit lens: 20+ years educational product design and learning-flow optimization.",
    inputs: {
      styles_path: "src/styles.css",
      connectivity_report: ".project_memory/ops/out/styles_connectivity_graph.json",
      impact_report: ".project_memory/ops/out/styles_change_impact_graph.json",
    },
    metrics: {
      rules_with_class_tokens: rulesWithClassTokens,
      unresolved_rules: unresolvedRules,
      unresolved_ratio_pct: unresolvedRatio,
      duplicate_selectors: duplicateSelectors,
      duplicate_nonidentical: duplicateNonIdentical,
      global_collision_selectors: globalCollisions.map((x) => x.selector),
      font_family_declarations: fontFamilies.length,
      media_query_count: mediaQueryCount,
      keyframe_count: keyframeCount,
      color_literal_count: colorLiteralCount,
      has_focus_visible: hasFocusVisible,
      has_reduced_motion: hasReducedMotion,
    },
    strengths,
    findings,
    top_high_risk_selectors: topHighRiskSelectors,
    top_routes_by_style_touch: topRoutesByTouch,
    restructure_steps: restructureSteps,
  };

  const md = [
    "# LazyTopper styles.css UI/UX Audit",
    "",
    "## Perspective",
    report.persona,
    "",
    "## Snapshot Metrics",
    `- Rules with class tokens: ${report.metrics.rules_with_class_tokens}`,
    `- Unresolved rules: ${report.metrics.unresolved_rules} (${report.metrics.unresolved_ratio_pct}%)`,
    `- Duplicate selectors: ${report.metrics.duplicate_selectors}`,
    `- Duplicate non-identical blocks: ${report.metrics.duplicate_nonidentical}`,
    `- Global collision selectors: ${report.metrics.global_collision_selectors.join(", ") || "none"}`,
    `- Font-family declarations: ${report.metrics.font_family_declarations}`,
    `- Media queries: ${report.metrics.media_query_count}`,
    `- Keyframes: ${report.metrics.keyframe_count}`,
    `- Focus-visible present: ${report.metrics.has_focus_visible}`,
    `- Reduced-motion support: ${report.metrics.has_reduced_motion}`,
    "",
    "## Strengths",
    ...(strengths.length ? strengths.map((s) => `- ${s}`) : ["- None identified."]),
    "",
    "## Findings",
    ...(findings.length
      ? findings.map(
          (f) =>
            `- [${f.severity.toUpperCase()}] ${f.title} | ${f.area} | Evidence: ${f.evidence} | Recommendation: ${f.recommendation}`
        )
      : ["- No critical findings."]),
    "",
    "## Top High-Risk Selectors",
    ...(topHighRiskSelectors.length
      ? topHighRiskSelectors.map(
          (r) =>
            `- ${r.selector}: routes=${r.usage_routes}, duplicates=${r.duplicate_selector_count}, global_collision=${r.global_collision}`
        )
      : ["- None"]),
    "",
    "## Top Routes By Style Touch",
    ...(topRoutesByTouch.length
      ? topRoutesByTouch.map(
          (r) =>
            `- ${r.path}: rules_touching=${r.rules_touching_route}, selectors_touching=${r.selectors_touching_route}, entries=${r.entry_files.join(", ")}`
        )
      : ["- None"]),
    "",
    "## Restructure Process And Tests",
    ...restructureSteps.map(
      (s) =>
        `- ${s.step} ${s.title}: ${s.objective} | Tests: ${s.test_commands.join(" ; ")} | Acceptance: ${s.acceptance}`
    ),
    "",
  ].join("\n");

  await fs.mkdir(path.dirname(outJsonPath), { recursive: true });
  await fs.writeFile(outJsonPath, JSON.stringify(report, null, 2), "utf8");
  await fs.writeFile(outMdPath, md, "utf8");

  console.log(
    `styles_uiux_audit: findings=${findings.length}, highRiskSelectors=${topHighRiskSelectors.length}, output=${path
      .relative(repoRoot, outJsonPath)
      .replaceAll("\\", "/")}`
  );
  console.log(`report_md=${path.relative(repoRoot, outMdPath).replaceAll("\\", "/")}`);
}

run().catch(async (err) => {
  await fs.mkdir(path.dirname(outJsonPath), { recursive: true });
  await fs.writeFile(
    outJsonPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        error: String(err?.stack || err),
      },
      null,
      2
    ),
    "utf8"
  );
  console.error("styles_uiux_audit errored.");
  console.error(String(err?.stack || err));
  process.exitCode = 1;
});

