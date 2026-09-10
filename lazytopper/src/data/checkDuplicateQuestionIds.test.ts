import { describe, it, expect, vi, afterEach } from "vitest";
import { checkDuplicateQuestionIds } from "./checkDuplicateQuestionIds";

// PERF-1 §2.2 — the duplicate-id check moves OUT of the browser and INTO the gate.
//
// ★ WHY THIS FILE EXISTS AT ALL. `main.tsx` used to call `checkDuplicateQuestionIds()`
// at module scope, which is the single eager import that dragged 7.87 MiB of question
// bank into the main bundle for every visitor — including the ones who never open a
// question. Worse, the check could not even fail there: its throw is guarded by
// `import.meta.env.DEV` (checkDuplicateQuestionIds.ts:64), so a shipped build only ever
// wrote to the student's console. It cost everyone and protected no one.
//
// ⚠ A CHECK MOVED SOMEWHERE NOTHING INVOKES IT IS A CHECK DELETED. This is a vitest
// suite, and CI runs the WHOLE vitest suite as a required gate with no exclusions
// (quality-gate.yml: "a red vitest suite fails CI, which is the point"). So a duplicate
// id now fails a BUILD, which is strictly stronger than the dev-only throw it replaces
// and costs a student nothing.
//
// ★ IT EXERCISES THE SHIPPED FUNCTION, NOT A COPY OF IT. An earlier shape of this test
// re-implemented `findDuplicates` locally, which would have kept passing if the real
// function were deleted. Here the real `checkDuplicateQuestionIds` is imported and run.
//
// ★ BOTH OF ITS REPORTING CHANNELS FAIL THIS TEST, AND THAT WAS VERIFIED BY MUTATION
// RATHER THAN ASSUMED. Injecting a duplicate id into one bank made the real function
// THROW at checkDuplicateQuestionIds.ts:65 — `import.meta.env.DEV` is TRUE under vitest,
// so the dev-only throw is live here in CI, and it arrives BEFORE the console.error
// assertion below is reached. The spy is kept regardless: console.error is the channel a
// non-DEV build reports through, so asserting on it keeps this test meaningful if that
// DEV guard is ever changed. Either way, a duplicate id turns this suite red.

describe("PERF-1 §2.2 — question ids are unique, enforced in CI", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("CONTROL: the spy observes console.error when something does report one", () => {
    // Without this, a test asserting "console.error was not called" passes just as
    // happily when the spy is broken, when the import failed, or when the function
    // silently returned early. It must be shown capable of seeing a call at all.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    console.error("[control] a deliberate call");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("reports no duplicate ids across every shipped bank", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    checkDuplicateQuestionIds();

    // The function reports duplicates by console.error, both per-bank and across banks.
    // Any call at all means a duplicate id shipped.
    if (spy.mock.calls.length > 0) {
      // Surface WHICH ids, so a failure is actionable instead of just red.
      const detail = spy.mock.calls.map((c) => c.map(String).join(" ")).join("\n");
      throw new Error("Duplicate question ids detected:\n" + detail);
    }
    expect(spy).not.toHaveBeenCalled();
  });
});
