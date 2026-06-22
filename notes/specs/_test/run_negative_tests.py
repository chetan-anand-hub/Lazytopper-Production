#!/usr/bin/env python3
"""
run_negative_tests.py — the validator's self-test.

Asserts the positive reference spec PASSES and each negative fixture FAILS with
EXACTLY the one rule it is designed to trip. A gate that doesn't catch these is
not a gate.

Run:  python notes/specs/_test/run_negative_tests.py
Exit: 0 if all expectations hold, 1 otherwise.
"""
import json
import subprocess
import sys
from pathlib import Path

TEST_DIR = Path(__file__).resolve().parent
NOTES_DIR = TEST_DIR.parent.parent
VALIDATOR = NOTES_DIR / "validate_spec.py"
LIGHT = NOTES_DIR / "specs" / "light-reflection-and-refraction.json"

# fixture -> the single rule number it must trip (None = must be VALID)
EXPECT = {
    LIGHT: None,                                  # positive reference
    TEST_DIR / "01_missing_source.json": 1,
    TEST_DIR / "02_banned_phrase.json": 3,
    TEST_DIR / "03_bad_topic_key.json": 2,
    TEST_DIR / "04_ledger_count.json": 7,
    TEST_DIR / "05_third_tab_mismatch.json": 4,
}


def run(spec):
    r = subprocess.run(
        [sys.executable, str(VALIDATOR), str(spec), "--json"],
        capture_output=True, text=True,
    )
    data = json.loads(r.stdout)
    return r.returncode, data


def main():
    ok = True
    for spec, expected_rule in EXPECT.items():
        code, data = run(spec)
        rules_hit = sorted({v["rule"] for v in data.get("violations", [])})
        if expected_rule is None:
            passed = data["valid"] and code == 0 and not rules_hit
            verdict = "VALID" if passed else f"UNEXPECTED (valid={data['valid']}, rules={rules_hit})"
        else:
            passed = (not data["valid"]) and code == 1 and rules_hit == [expected_rule]
            verdict = (f"FAILS on rule {expected_rule} only"
                       if passed else f"UNEXPECTED (valid={data['valid']}, rules={rules_hit})")
        ok = ok and passed
        mark = "PASS" if passed else "XXXX"
        print(f"  [{mark}] {spec.name}: expected "
              f"{'VALID' if expected_rule is None else f'rule {expected_rule}'} -> {verdict}")
    print("\nSELF-TEST:", "OK" if ok else "FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
