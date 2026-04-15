#!/usr/bin/env node
/**
 * Acceptance test for [HIGHLIGHT: ...] annotation stripping.
 * Verifies that tutor text annotations are invisible to students
 * and that keywords are extracted correctly.
 */

const HIGHLIGHT_RE = /\[HIGHLIGHT:\s*([^\]]+)\]/gi;

function parseAndStripHighlights(text) {
  const keywords = [];
  const cleanText = text.replace(HIGHLIGHT_RE, (_, captured) => {
    captured.split(",").map((k) => k.trim()).filter(Boolean).forEach((k) => keywords.push(k));
    return "";
  });
  return { cleanText: cleanText.replace(/ {2,}/g, " ").trim(), keywords };
}

let passed = 0;
let failed = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ": " + detail : ""}`);
    failed++;
  }
}

console.log("\n=== [HIGHLIGHT] Annotation Stripping Acceptance Tests ===\n");

// 1. Basic single annotation
{
  const input = "Look at the [HIGHLIGHT: axon] — this carries signals.";
  const { cleanText, keywords } = parseAndStripHighlights(input);
  assert("Single annotation stripped from text", !cleanText.includes("[HIGHLIGHT:"), cleanText);
  assert("Single annotation: no raw brackets remain", !cleanText.includes("["), cleanText);
  assert("Single annotation: keyword extracted", keywords.includes("axon"), JSON.stringify(keywords));
  assert("Single annotation: text still readable", cleanText.includes("— this carries signals."), cleanText);
}

// 2. Multiple annotations in one message
{
  const input = "The [HIGHLIGHT: cerebellum] controls balance, while the [HIGHLIGHT: cerebrum] handles thinking.";
  const { cleanText, keywords } = parseAndStripHighlights(input);
  assert("Multiple annotations stripped", !cleanText.includes("[HIGHLIGHT:"), cleanText);
  assert("Multiple annotations: cerebellum extracted", keywords.includes("cerebellum"), JSON.stringify(keywords));
  assert("Multiple annotations: cerebrum extracted", keywords.includes("cerebrum"), JSON.stringify(keywords));
  assert("Multiple annotations: exactly 2 keywords", keywords.length === 2, `got ${keywords.length}`);
}

// 3. Comma-separated keywords inside one annotation
{
  const input = "Drag [HIGHLIGHT: a slider, b slider] to see the change.";
  const { cleanText, keywords } = parseAndStripHighlights(input);
  assert("Comma-separated: annotation stripped", !cleanText.includes("[HIGHLIGHT:"), cleanText);
  assert("Comma-separated: first keyword extracted", keywords.includes("a slider"), JSON.stringify(keywords));
  assert("Comma-separated: second keyword extracted", keywords.includes("b slider"), JSON.stringify(keywords));
}

// 4. Single-character keyword (a, b)
{
  const input = "Adjust [HIGHLIGHT: a] and watch the curve.";
  const { cleanText, keywords } = parseAndStripHighlights(input);
  assert("Short keyword 'a' extracted", keywords.includes("a"), JSON.stringify(keywords));
  assert("Short keyword: annotation stripped", !cleanText.includes("[HIGHLIGHT:"), cleanText);
}

// 5. No annotations — text passes through unchanged
{
  const input = "This is a normal message with no highlights.\nNew line preserved.";
  const { cleanText, keywords } = parseAndStripHighlights(input);
  assert("No annotation: cleanText unchanged", cleanText === input.trim(), `got: ${cleanText}`);
  assert("No annotation: no keywords extracted", keywords.length === 0, JSON.stringify(keywords));
}

// 6. Newlines are preserved (no \s{2,} collapsing)
{
  const input = "First paragraph.\n\nSecond paragraph after [HIGHLIGHT: axon].";
  const { cleanText } = parseAndStripHighlights(input);
  assert("Newlines preserved after stripping", cleanText.includes("\n\n"), `got: ${JSON.stringify(cleanText)}`);
}

// 7. Annotation at end of sentence — no double spaces in result
{
  const input = "See the [HIGHLIGHT: x-axis] here.";
  const { cleanText } = parseAndStripHighlights(input);
  assert("No double spaces after stripping", !cleanText.includes("  "), `got: ${JSON.stringify(cleanText)}`);
}

// 8. No annotation leaks
{
  const msgs = [
    "Look at [HIGHLIGHT: dendrite] for more info.",
    "Click [HIGHLIGHT: Reflex Arc] tab now.",
    "Note [HIGHLIGHT: a, b] sliders above.",
  ];
  msgs.forEach((msg, i) => {
    const { cleanText } = parseAndStripHighlights(msg);
    assert(`Annotation invisibility test ${i + 1}`, !cleanText.includes("[HIGHLIGHT"), cleanText);
  });
}

console.log(`\n${passed + failed} checks: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) {
  console.error(`FAIL — ${failed} check(s) failed`);
  process.exit(1);
} else {
  console.log("PASS — all annotation stripping checks passed");
  process.exit(0);
}
