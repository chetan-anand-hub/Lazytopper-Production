#!/usr/bin/env node
// check_improve_overlay_additive_acceptance.mjs
//
// ⚠️ INVESTIGATION PROTOTYPE — the ENFORCEABLE form of report §5.1 point 3. It pins the
// three things NO existing check guards, which are EXACTLY what the overlay touches, so
// "the overlay is additive" is proven, not promised. The build lane adopts + extends this
// (adding a real direct-visit RENDER assertion, which needs the test runner in CI).
//
// It is the same DEFAULT-OFF proof shape that protected autoGrow and the document/photo
// QR copy: assert the no-overlay path is byte-identical.
//
// Run from lazytopper/: node scripts/ops/check_improve_overlay_additive_acceptance.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(resolve(here, p), "utf8");
const page = read("../../src/pages/desktop/DesktopCheckImprovePage.tsx");
const app = read("../../src/App.tsx");

let pass = 0;
let fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
};

console.log("CHECK & IMPROVE — overlay ADDITIVE guarantee (report §5.1)\n");

// GUARD 1 — the single most important one. A direct visit seeds an EMPTY question: the
// seed collapses to "" when `overlay` is absent. This is the default-off invariant.
check(
  "GUARD 1: question seed is default-off (overlay?.seedQuestion ?? \"\")",
  /useState<string>\(\s*overlay\?\.seedQuestion\s*\?\?\s*""\s*\)/.test(page),
);

// GUARD 2 — detection still fires ONLY on the button, never on seed/mount/overlay-open.
// There must be no auto-fire of handleReadQuestion (no call site inside a useEffect, and
// no call other than the onClick binding).
const readQuestionCalls = (page.match(/handleReadQuestion\b/g) || []).length;
check(
  "GUARD 2: handleReadQuestion is only DEFINED + bound to onClick (no auto-fire)",
  // one definition (`async function handleReadQuestion`) + one onClick binding = 2 refs.
  readQuestionCalls === 2 &&
    /onClick=\{handleReadQuestion\}/.test(page) &&
    !/handleReadQuestion\(\)/.test(page.replace(/async function handleReadQuestion/g, "")),
  `found ${readQuestionCalls} references to handleReadQuestion (expected exactly 2)`,
);

// GUARD 3 — the return path forks CLEANLY on `overlay`: overlay ⇒ onClose(); direct visit ⇒
// the original navigate(returnTicket.path), untouched. Both present, gated on overlay.
check(
  "GUARD 3a: overlay return calls onClose(), not navigate()",
  /overlay\s*\n?\s*\?\s*\{\s*label:[^}]*onReturn:\s*\(\)\s*=>\s*overlay\.onClose\(\)\s*\}/.test(page),
);
check(
  "GUARD 3b: direct-visit return is the original navigate(returnTicket.path)",
  /returnTicket\s*\n?\s*\?\s*\{\s*label:\s*returnTicket\.label,\s*onReturn:\s*\(\)\s*=>\s*navigate\(returnTicket\.path\)\s*\}/.test(page),
);

// GUARD 4 — the convergence gate's load-bearing :320 stays green: App.tsx renders the page
// UNCONDITIONALLY with NO props on the route. Option A mounts the overlay ELSEWHERE (inside
// the tutor), so the route element is untouched.
check(
  "GUARD 4: App route still renders <DesktopCheckImprovePage /> with NO props (gate :320)",
  /path="\/check-improve"\s*\n\s*element=\{withRouteSuspense\(<DesktopCheckImprovePage \/>\)\}/.test(app),
);

// GUARD 5 — the overlay prop is genuinely OPTIONAL (a bare <DesktopCheckImprovePage /> must
// still typecheck). Assert the signature is `{ overlay?: ... }`.
check(
  "GUARD 5: overlay prop is optional (React.FC<{ overlay?: CheckImproveOverlayProps }>)",
  /React\.FC<\{\s*overlay\?:\s*CheckImproveOverlayProps\s*\}>/.test(page),
);

console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
