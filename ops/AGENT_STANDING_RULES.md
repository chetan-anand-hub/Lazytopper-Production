
---

## STANDING RULES (all lanes, all agents)

### Test proportionality
Before writing any test ask: "if this failed in six months, would it tell me
something I'd want to know?"

FULL DISCIPLINE (mutation-verified, failing output captured) when the test pins
a DECISION: a product promise (advertised quota vs enforced cap), a safety
property (account enumeration, minors' data, fail-closed), a derived value whose
inputs live elsewhere (spend cap to ceiling), an invariant a future change could
silently break (App.tsx zero-diff, one [CURRENT] marker), or a correctness fix.
Never thin these.

THIN (one or two assertions, no ceremony) when the test only re-verifies the
framework: that a logger logs, a getter gets, a library does what it documents.

THE TEST: does it encode a judgement someone made, or does it check that
JavaScript still works? Pin the first, thin the second. If unsure, keep it and
say so in your report.

### Local vs CI test split
WHY: the owner machine has 7.8GB RAM. Two agents running test:matrix:all
concurrently OOM-killed the editor and lost two sessions. The full matrix
already runs in CI on every PR.

RUN LOCALLY: scope:guard PRE-COMMIT (reads the working tree, CI cannot run it
meaningfully); tsc --noEmit; check:mojibake; YOUR OWN changed test files, scoped;
MUTATION runs scoped to the affected file only.

RUN IN CI, never locally: test:matrix:all; full vitest across src; convergence
and overlay acceptance gates; every commit-scoped base...HEAD gate.

WORKFLOW: local set, then commit and PUSH as DRAFT (pushing is what runs CI, and
it means an OOM cannot destroy your work). Wait for CI. READ THE LOG. Report
local output, CI log evidence, PR link. Wait for owner approval. No self-merge.

THE BLIND SPOT THIS CREATES: a suite that is present, wired and SKIPPED reports
green, and this repo has shipped exactly that. For every suite you rely on,
quote the invocation line AND the result line proving it EXECUTED. For
node --test that is "# pass N  # fail 0  # skipped 0  # todo 0" -- the skipped
and todo counts matter, not the pass count. "CI was green" is not a
verification.

Any local vitest run uses --poolOptions.threads.maxThreads=2.

WHAT THIS DOES NOT CHANGE: nothing merges unverified. Only WHERE gates run and
WHO watches them.
