#!/usr/bin/env python3
"""
verify_note_conformance.py - gate 3 of the notes drift-gate stack (schema v1.2).

Mandate (AGENT_FABLE_notes_orchestrator_2026-07-11.md, gate 3):
  "structure/depth >= the subject's locked exemplar."

It diffs a spec's STRUCTURE against the locked exemplar for its subject and
rejects a stub or a shape that drifts from the subject-adaptive template:
  physics   -> light-reflection-and-refraction
  maths     -> quadratic-equations
  biology   -> life-processes
  chemistry -> the ChemicalReactions prototype (no JSON twin yet -> a structural
               baseline of absolute minimums is used; the first chemistry chapter
               is additionally eyeballed by the owner + auditor). See CHEMISTRY note.

WHAT IT CHECKS
  1. STRUCTURE   - every required top-level + meta section is present and (for the
     core sections) non-empty.
  2. DISCRIMINATORS - third_tab_content.kind == meta.third_tab.kind AND that kind is
     valid for the subject; every examples[].kind is valid for the subject. (These
     are the two switches that drive all subject-adaptivity - they must match the
     subject's exemplar family, or the note renders wrong.)
  3. THIRD-TAB SHAPE - third_tab_content carries the non-empty payload its kind
     requires (rules->blocks, proof->steps, derivations->derivations,
     reactions->reactions, diagrams->diagrams).
  4. DEPTH FLOORS - core sections meet a floor derived LIVE from the exemplar:
        floor = max(ABS_MIN, ceil(exemplar_count * 0.5))
     The 0.5 ratio ties depth to the subject's exemplar without demanding an exact
     count (which would force padding - forbidden by doctrine: "shorter-but-true
     passes; padded-to-look-full FAILS"). ABS_MIN independently kills stubs. The
     quality-variable sections (strategies / pitfalls / formula_strip) are required
     PRESENT but NOT count-floored, so an honest empty/thin section passes and no
     one is pushed to fabricate a pitfall or a formula.

This gate reads the exemplar spec LIVE at runtime (never hardcodes counts), so it
tracks the locked exemplars as they are edited.

Usage:
  python notes/verify_note_conformance.py <spec.json>
  python notes/verify_note_conformance.py --all
  python notes/verify_note_conformance.py <spec.json> --json
  python notes/verify_note_conformance.py --selftest      goldens PASS / fixtures FAIL

Non-zero exit on ANY shortfall. No --force / skip flag - by design. stdlib only.
"""

import json
import math
import sys
from pathlib import Path

NOTES_DIR = Path(__file__).resolve().parent
SPECS_DIR = NOTES_DIR / "specs"

EXEMPLAR_BY_SUBJECT = {
    "physics": "light-reflection-and-refraction",
    "maths": "quadratic-equations",
    "biology": "life-processes",
    "chemistry": None,   # no locked JSON twin yet -> baseline of ABS_MIN (see CHEMISTRY)
}

# Subject-adaptive discriminators (mirror the schema + validate_spec).
SUBJECT_THIRD_TAB_KINDS = {
    "physics": {"rules", "derivations"},
    "maths": {"proof", "derivations"},
    "chemistry": {"reactions"},
    "biology": {"diagrams"},
}
SUBJECT_EXAMPLE_KINDS = {
    "physics": {"numerical"},
    "maths": {"numerical"},
    "chemistry": {"reaction", "numerical"},
    "biology": {"process", "numerical"},
}

# Payload each third_tab kind must carry (non-empty).
THIRD_TAB_PAYLOAD = {
    "rules": "blocks", "proof": "steps", "derivations": "derivations",
    "reactions": "reactions", "diagrams": "diagrams",
}

REQUIRED_TOP_LEVEL = [
    "schema_version", "meta", "board_asks", "big_idea", "definitions",
    "concepts", "examples", "strategies", "pitfalls", "formula_strip",
    "mindmap", "third_tab_content", "figures", "source_ledger",
]
REQUIRED_META = ["topic_key", "subject", "chapter_no", "title", "weightage",
                 "third_tab", "source_edition"]

# Core sections must be non-empty (a note without these is not a note).
CORE_NONEMPTY = ["definitions", "concepts", "examples", "mindmap", "figures",
                 "third_tab_content", "board_asks", "big_idea"]

# Depth floors: floor = max(ABS_MIN, ceil(exemplar_count * FLOOR_RATIO)).
FLOOR_RATIO = 0.5
ABS_MIN = {
    "definitions": 5, "concepts": 3, "examples": 1,
    "figures": 1, "mindmap_branches": 2,
}


def section_counts(spec):
    mm = spec.get("mindmap") or {}
    return {
        "definitions": len(spec.get("definitions") or []),
        "concepts": len(spec.get("concepts") or []),
        "examples": len(spec.get("examples") or []),
        "figures": len(spec.get("figures") or {}),
        "strategies": len(spec.get("strategies") or []),
        "pitfalls": len(spec.get("pitfalls") or []),
        "formula_strip": len(spec.get("formula_strip") or []),
        "mindmap_branches": len(mm.get("branches") or []),
    }


def load_exemplar_counts(subject):
    """Return (counts, source_label). For chemistry (no twin) -> ABS_MIN baseline."""
    name = EXEMPLAR_BY_SUBJECT.get(subject)
    if not name:
        base = {k: ABS_MIN.get(k, 1) for k in
                ("definitions", "concepts", "examples", "figures",
                 "strategies", "pitfalls", "formula_strip", "mindmap_branches")}
        return base, "ABS_MIN baseline (no locked %s exemplar)" % subject
    spec = json.loads((SPECS_DIR / (name + ".json")).read_text(encoding="utf-8"))
    return section_counts(spec), name


def is_empty(val):
    if val is None:
        return True
    if isinstance(val, (list, dict, str)):
        return len(val) == 0
    return False


def validate(spec):
    """Return list of {check, detail} violations ([] == conformant)."""
    v = []

    def fail(check, detail):
        v.append({"check": check, "detail": detail})

    meta = spec.get("meta") or {}
    subject = meta.get("subject")

    # 1. STRUCTURE ----------------------------------------------------------
    for key in REQUIRED_TOP_LEVEL:
        if key not in spec:
            fail("structure", "missing required top-level section '%s'" % key)
    for key in REQUIRED_META:
        if key not in meta:
            fail("structure", "missing required meta.%s" % key)
    for key in CORE_NONEMPTY:
        if key in spec and is_empty(spec.get(key)):
            fail("structure", "core section '%s' is present but empty" % key)

    if subject not in EXEMPLAR_BY_SUBJECT:
        fail("structure", "unknown subject '%s' (no exemplar mapping)" % subject)
        return v  # can't compute floors/discriminators without a known subject

    # 2. DISCRIMINATORS -----------------------------------------------------
    ttc = spec.get("third_tab_content") or {}
    meta_kind = (meta.get("third_tab") or {}).get("kind")
    ttc_kind = ttc.get("kind")
    allowed_tt = SUBJECT_THIRD_TAB_KINDS.get(subject, set())
    if ttc_kind != meta_kind:
        fail("discriminator", "third_tab_content.kind '%s' != meta.third_tab.kind '%s'"
             % (ttc_kind, meta_kind))
    if meta_kind not in allowed_tt:
        fail("discriminator", "third_tab kind '%s' not valid for subject '%s' (allowed: %s)"
             % (meta_kind, subject, sorted(allowed_tt)))
    allowed_ex = SUBJECT_EXAMPLE_KINDS.get(subject, set())
    for i, e in enumerate(spec.get("examples") or []):
        if e.get("kind") not in allowed_ex:
            fail("discriminator", "examples[%d].kind '%s' not valid for subject '%s' (allowed: %s)"
                 % (i, e.get("kind"), subject, sorted(allowed_ex)))

    # 3. THIRD-TAB SHAPE ----------------------------------------------------
    payload_key = THIRD_TAB_PAYLOAD.get(ttc_kind)
    if payload_key is not None:
        payload = ttc.get(payload_key)
        if not isinstance(payload, list) or not payload:
            fail("third_tab_shape", "third_tab_content.kind '%s' requires a non-empty '%s'"
                 % (ttc_kind, payload_key))

    # 4. DEPTH FLOORS -------------------------------------------------------
    ex_counts, ex_label = load_exemplar_counts(subject)
    counts = section_counts(spec)
    for sec, absmin in ABS_MIN.items():
        floor = max(absmin, math.ceil(ex_counts.get(sec, 0) * FLOOR_RATIO))
        got = counts.get(sec, 0)
        if got < floor:
            fail("depth", "%s = %d < floor %d [max(ABS_MIN %d, ceil(%s %d * %.1f))]"
                 % (sec, got, floor, absmin, ex_label, ex_counts.get(sec, 0), FLOOR_RATIO))
    return v


def verify_file(path):
    try:
        spec = json.loads(Path(path).read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None, "file not found: %s" % path
    except json.JSONDecodeError as e:
        return None, "invalid JSON: %s" % e
    return validate(spec), None


def print_report(path, violations, error):
    print("\n=== verify_note_conformance: %s ===" % path)
    if error:
        print("  ERROR: %s" % error)
        print("  VERDICT: INVALID")
        return
    if not violations:
        print("  all conformance checks PASS (structure, discriminators, shape, depth)")
    else:
        by = {}
        for viol in violations:
            by.setdefault(viol["check"], []).append(viol["detail"])
        for check in ("structure", "discriminator", "third_tab_shape", "depth"):
            for d in by.get(check, []):
                print("  [FAIL %s] %s" % (check, d))
    print("  VERDICT: %s" % ("VALID" if not violations else "INVALID"))


def run_selftest():
    goldens = ["light-reflection-and-refraction", "quadratic-equations", "life-processes"]
    ok = True
    print("== CONFORMANCE SELF-TEST ==")
    for name in goldens:
        viols, err = verify_file(SPECS_DIR / (name + ".json"))
        passed = (not err) and not viols
        ok = ok and passed
        print("  [%s] golden %s expected VALID -> %s"
              % ("PASS" if passed else "XXXX", name, "VALID" if passed else "INVALID"))
        if not passed:
            print_report(name, viols, err)
    for fx in sorted((SPECS_DIR / "_test").glob("0*.json")):
        viols, err = verify_file(fx)
        failed = bool(err) or bool(viols)
        ok = ok and failed
        print("  [%s] fixture %s expected INVALID -> %s"
              % ("PASS" if failed else "XXXX", fx.name, "INVALID" if failed else "VALID (LEAK!)"))
    print("\nCONFORMANCE SELF-TEST:", "OK" if ok else "FAILED")
    return 0 if ok else 1


def main(argv):
    args = argv[1:]
    if "--selftest" in args:
        return run_selftest()
    json_mode = "--json" in args
    all_mode = "--all" in args
    spec_args = [a for a in args if not a.startswith("--")]

    if all_mode:
        targets = sorted(str(p) for p in SPECS_DIR.glob("*.json"))
    elif spec_args:
        targets = spec_args
    else:
        print(__doc__)
        return 2

    results = [(t,) + verify_file(t) for t in targets]
    any_invalid = any(err or viols for (_, viols, err) in results)
    if json_mode:
        payload = {"valid": not any_invalid, "results": [
            {"spec": t, "valid": not (err or viols), "error": err, "violations": viols or []}
            for (t, viols, err) in results]}
        print(json.dumps(payload, ensure_ascii=False))
    else:
        for (t, viols, err) in results:
            print_report(t, viols, err)
    return 1 if any_invalid else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
