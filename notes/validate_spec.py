#!/usr/bin/env python3
"""
validate_spec.py — the note-spec validator gate (schema v1.2).

The anti-fabrication gate that makes the ~35-note parallel fan-out safe: it
mechanically rejects any spec with unsourced NCERT content, out-of-syllabus
material, or a malformed shape, so the owner's review compresses to pedagogy
and this can run as a SubagentStop hook.

There is NO --force / skip flag, and rules are NEVER loosened to make a spec
pass. (Same doctrine as scope:guard — never force-green.)

It reads two live dependencies at runtime and NEVER hardcodes their contents:
  - scripts/src/syllabusGuard.ts  -> SURFACE_BANNED_PHRASES (the curated,
    trap-safe, prose-surface phrase list; word-boundary, case-insensitive)
  - lazytopper/src/lib/desktop/topics.ts -> the set of valid `slug` topic keys

Usage:
  python notes/validate_spec.py <spec.json>      validate one spec
  python notes/validate_spec.py --all            validate notes/specs/*.json
  python notes/validate_spec.py <spec.json> --json   machine output for the hook

stdlib only (json, re, sys, pathlib) — no new deps.
"""

import json
import re
import sys
from pathlib import Path

# ── Repo layout (this file lives at <repo>/notes/validate_spec.py) ──
NOTES_DIR = Path(__file__).resolve().parent
REPO_ROOT = NOTES_DIR.parent
SYLLABUS_GUARD = REPO_ROOT / "scripts" / "src" / "syllabusGuard.ts"
TOPICS_TS = REPO_ROOT / "lazytopper" / "src" / "lib" / "desktop" / "topics.ts"
SPECS_DIR = NOTES_DIR / "specs"

# ── Schema v1.2 constants ──
REQUIRED_TOP_LEVEL = [
    "schema_version", "meta", "board_asks", "big_idea", "definitions",
    "concepts", "examples", "strategies", "pitfalls", "formula_strip",
    "mindmap", "third_tab_content", "figures", "source_ledger",
]
REQUIRED_META = [
    "topic_key", "subject", "chapter_no", "title", "weightage",
    "third_tab", "source_edition",
]
VALID_THIRD_TAB_KINDS = {"proof", "rules", "derivations", "reactions", "diagrams"}
VALID_EXAMPLE_KINDS = {"numerical", "reaction", "process"}
SUBJECT_EXAMPLE_KINDS = {
    "physics": {"numerical"},
    "maths": {"numerical"},
    "chemistry": {"reaction", "numerical"},
    "biology": {"process", "numerical"},
}
VALID_FIGURE_BUCKETS = {"ncert", "authored_svg", "generated"}
# Mojibake / encoding-corruption markers (rule 6).
MOJIBAKE_MARKERS = ["(cid:", "�", "Ã", "Â", "â€"]


# ─────────────────────────────────────────────────────────────────────────────
# Live-dependency extraction (read at runtime; never hardcode)
# ─────────────────────────────────────────────────────────────────────────────
def _strip_line_comments(ts_body: str) -> str:
    """Remove // line comments so quoted words inside comments (e.g. the
    `"Evolution"/"Fossil"/"Darwin" deliberately omitted` note) are NOT
    mistaken for banned phrases. Phrases never contain `//`, so this is safe."""
    out = []
    for line in ts_body.splitlines():
        idx = line.find("//")
        out.append(line[:idx] if idx != -1 else line)
    return "\n".join(out)


def load_banned_phrases():
    """Extract SURFACE_BANNED_PHRASES (the trap-safe prose list) live from
    syllabusGuard.ts. Used for prose surfaces like notes — NOT the
    question-bank `bannedSubtopics` list, which holds bare generics
    ('Evolution', 'Constructions', ...) meant only for exact subtopic-field
    matching and would false-flag prose."""
    if not SYLLABUS_GUARD.exists():
        raise FileNotFoundError(f"syllabusGuard.ts not found at {SYLLABUS_GUARD}")
    text = SYLLABUS_GUARD.read_text(encoding="utf-8")
    m = re.search(
        r"export\s+const\s+SURFACE_BANNED_PHRASES\s*:\s*string\[\]\s*=\s*\[(.*?)\];",
        text, re.DOTALL,
    )
    if not m:
        raise ValueError("Could not locate SURFACE_BANNED_PHRASES in syllabusGuard.ts")
    body = _strip_line_comments(m.group(1))
    phrases = re.findall(r'"((?:[^"\\]|\\.)*)"', body)
    phrases = [p.strip() for p in phrases if p.strip()]
    if not phrases:
        raise ValueError("SURFACE_BANNED_PHRASES parsed empty — extraction bug")
    return phrases


def load_topic_keys():
    """Build the valid topic_key set live from topics.ts `slug` fields."""
    if not TOPICS_TS.exists():
        raise FileNotFoundError(f"topics.ts not found at {TOPICS_TS}")
    text = TOPICS_TS.read_text(encoding="utf-8")
    slugs = set(re.findall(r'slug:\s*"([^"]+)"', text))
    if not slugs:
        raise ValueError("No slugs parsed from topics.ts — extraction bug")
    return slugs


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
def walk_strings(node, path="$"):
    """Yield (json_path, string) for every string value in the spec."""
    if isinstance(node, str):
        yield (path, node)
    elif isinstance(node, dict):
        for k, v in node.items():
            yield from walk_strings(v, f"{path}.{k}")
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from walk_strings(v, f"{path}[{i}]")


def source_is_empty(obj):
    """A `source` is missing/empty if absent, None, empty dict, or empty string."""
    if obj is None:
        return True
    if isinstance(obj, dict):
        return len(obj) == 0
    if isinstance(obj, str):
        return obj.strip() == ""
    return False  # any other truthy value counts as present


def phrase_regex(phrase):
    """Whole-phrase, case-insensitive, alnum-boundary — mirrors syllabusGuard's
    scanContentForPhrases (so 'Ogive' won't match 'Ogives')."""
    return re.compile(
        r"(?<![A-Za-z0-9])" + re.escape(phrase) + r"(?![A-Za-z0-9])",
        re.IGNORECASE,
    )


# ─────────────────────────────────────────────────────────────────────────────
# The validator — 10 rules. Each appends {rule, path, detail} on failure.
# ─────────────────────────────────────────────────────────────────────────────
def validate(spec, banned_phrases, topic_keys):
    v = []  # violations

    def fail(rule, path, detail):
        v.append({"rule": rule, "path": path, "detail": detail})

    meta = spec.get("meta") or {}

    # ── Rule 9 (structural) — run first so later rules can assume shape ──
    for key in REQUIRED_TOP_LEVEL:
        if key not in spec:
            fail(9, f"$.{key}", f"required top-level key '{key}' missing")
    for key in REQUIRED_META:
        if key not in meta:
            fail(9, f"$.meta.{key}", f"required meta field '{key}' missing")
    third_tab_meta = meta.get("third_tab") or {}
    if "kind" not in third_tab_meta:
        fail(9, "$.meta.third_tab.kind", "meta.third_tab.kind missing")
    if "label" not in third_tab_meta:
        fail(9, "$.meta.third_tab.label", "meta.third_tab.label missing")

    figures = spec.get("figures") or {}

    # Rule 9 (referential): every figure_ref used resolves to figures{}.
    def check_ref(ref, path):
        if ref and ref not in figures:
            fail(9, path, f"figure_ref '{ref}' does not resolve to an entry in figures{{}}")

    for i, c in enumerate(spec.get("concepts") or []):
        check_ref(c.get("figure_ref"), f"$.concepts[{i}].figure_ref")
    ttc = spec.get("third_tab_content") or {}
    check_ref(ttc.get("figure_ref"), "$.third_tab_content.figure_ref")
    if ttc.get("kind") == "diagrams":
        for i, d in enumerate(ttc.get("diagrams") or []):
            check_ref(d, f"$.third_tab_content.diagrams[{i}]")

    # ── Rule 1 — missing/empty source on sourced fields ──
    # definitions (BOTH tiers), examples, figures(bucket==ncert).
    # formula_strip source is OPTIONAL (v1.1) — excluded.
    for i, d in enumerate(spec.get("definitions") or []):
        if source_is_empty(d.get("source")):
            fail(1, f"$.definitions[{i}].source",
                 f"definition '{d.get('id', i)}' (tier={d.get('tier')}) has missing/empty source")
    for i, e in enumerate(spec.get("examples") or []):
        if source_is_empty(e.get("source")):
            fail(1, f"$.examples[{i}].source",
                 f"example '{e.get('id', i)}' has missing/empty source")
    for fid, fig in figures.items():
        if (fig or {}).get("bucket") == "ncert" and source_is_empty((fig or {}).get("source")):
            fail(1, f"$.figures.{fid}.source",
                 f"ncert figure '{fid}' has missing/empty source")

    # ── Rule 2 — meta.topic_key not in topics.ts ──
    tk = meta.get("topic_key")
    if tk not in topic_keys:
        fail(2, "$.meta.topic_key",
             f"topic_key '{tk}' is not a slug in topics.ts")

    # ── Rule 3 — banned syllabus phrase in any text field ──
    compiled = [(p, phrase_regex(p)) for p in banned_phrases]
    for path, s in walk_strings(spec):
        for phrase, rx in compiled:
            if rx.search(s):
                fail(3, path, f"banned syllabus phrase '{phrase}' present")

    # ── Rule 4 — third_tab_content.kind vs meta + shape ──
    meta_kind = third_tab_meta.get("kind")
    ttc_kind = ttc.get("kind")
    if ttc_kind != meta_kind:
        fail(4, "$.third_tab_content.kind",
             f"third_tab_content.kind '{ttc_kind}' != meta.third_tab.kind '{meta_kind}'")
    else:
        if ttc_kind == "rules":
            blocks = ttc.get("blocks")
            if not isinstance(blocks, list) or not blocks:
                fail(4, "$.third_tab_content.blocks", "kind 'rules' requires a non-empty blocks[]")
            else:
                for i, b in enumerate(blocks):
                    bp = f"$.third_tab_content.blocks[{i}]"
                    if not isinstance(b, dict) or "heading" not in b:
                        fail(4, bp, "block missing 'heading'")
                        continue
                    btype = b.get("type")
                    if btype not in ("sign-table", "rule-list"):
                        fail(4, f"{bp}.type", f"block type '{btype}' not in [sign-table, rule-list]")
                    elif btype == "sign-table" and not isinstance(b.get("rows"), list):
                        fail(4, f"{bp}.rows", "sign-table block requires rows[]")
                    elif btype == "rule-list" and not isinstance(b.get("items"), list):
                        fail(4, f"{bp}.items", "rule-list block requires items[]")
        elif ttc_kind == "proof":
            if not isinstance(ttc.get("steps"), list) or not ttc.get("steps"):
                fail(4, "$.third_tab_content.steps", "kind 'proof' requires a non-empty steps[]")
        elif ttc_kind == "derivations":
            if not isinstance(ttc.get("derivations"), list) or not ttc.get("derivations"):
                fail(4, "$.third_tab_content.derivations", "kind 'derivations' requires a non-empty derivations[]")
        elif ttc_kind == "reactions":
            if not isinstance(ttc.get("reactions"), list) or not ttc.get("reactions"):
                fail(4, "$.third_tab_content.reactions", "kind 'reactions' requires a non-empty reactions[]")
        elif ttc_kind == "diagrams":
            if not isinstance(ttc.get("diagrams"), list) or not ttc.get("diagrams"):
                fail(4, "$.third_tab_content.diagrams", "kind 'diagrams' requires a non-empty diagrams[]")

    # ── Rule 5 — examples[].kind invalid / not in subject's allowed set ──
    subject = meta.get("subject")
    allowed = SUBJECT_EXAMPLE_KINDS.get(subject, VALID_EXAMPLE_KINDS)
    for i, e in enumerate(spec.get("examples") or []):
        kind = e.get("kind")
        if kind not in VALID_EXAMPLE_KINDS:
            fail(5, f"$.examples[{i}].kind", f"kind '{kind}' not in {sorted(VALID_EXAMPLE_KINDS)}")
        elif kind not in allowed:
            fail(5, f"$.examples[{i}].kind",
                 f"kind '{kind}' not allowed for subject '{subject}' (allowed: {sorted(allowed)})")

    # ── Rule 6 — mojibake in any text field ──
    for path, s in walk_strings(spec):
        for marker in MOJIBAKE_MARKERS:
            if marker in s:
                shown = "U+FFFD" if marker == "�" else marker
                fail(6, path, f"mojibake/encoding artifact '{shown}' present")

    # ── Rule 7 — source_ledger row-count == #definitions + #examples + #ncert-figures ──
    n_def = len(spec.get("definitions") or [])
    n_ex = len(spec.get("examples") or [])
    n_fig = sum(1 for f in figures.values() if (f or {}).get("bucket") == "ncert")
    expected = n_def + n_ex + n_fig
    ledger = spec.get("source_ledger") or []
    if len(ledger) != expected:
        expected_items = (
            [f"definition: {d.get('term', d.get('id'))}" for d in (spec.get("definitions") or [])]
            + [f"example: {e.get('shape', e.get('id'))}" for e in (spec.get("examples") or [])]
            + [f"ncert-figure: {fid}" for fid, f in figures.items() if (f or {}).get("bucket") == "ncert"]
        )
        ledger_items = [r.get("item", "?") for r in ledger]
        fail(7, "$.source_ledger",
             f"ledger has {len(ledger)} rows but {expected} sourced fields "
             f"({n_def} definitions + {n_ex} examples + {n_fig} ncert figures).\n"
             f"      expected sourced items: {expected_items}\n"
             f"      ledger items:           {ledger_items}")

    # ── Rule 8 — figure manifest invalid ──
    for fid, fig in figures.items():
        fig = fig or {}
        bucket = fig.get("bucket")
        if bucket not in VALID_FIGURE_BUCKETS:
            fail(8, f"$.figures.{fid}.bucket", f"bucket '{bucket}' not in {sorted(VALID_FIGURE_BUCKETS)}")
            continue
        if bucket == "authored_svg" and not fig.get("svg_ref"):
            fail(8, f"$.figures.{fid}.svg_ref", "authored_svg figure missing svg_ref")
        if bucket == "generated":
            if not fig.get("generator"):
                fail(8, f"$.figures.{fid}.generator", "generated figure missing generator")
            if fig.get("params") is None:
                fail(8, f"$.figures.{fid}.params", "generated figure missing params")

    # ── Rule 10 (v1.2) — per-step marks sum to marks_total ──
    # Fires ONLY for examples that carry mark data. When an example declares a
    # `marks_total` OR any solution step carries a `mark`, BOTH must be present
    # and the per-step marks (a step with no `mark` contributes 0) must sum to
    # marks_total. Half-mark steps are real in the CBSE step-marking scheme, so
    # each present mark must be a positive multiple of 0.5. Examples that carry
    # no mark data at all are untouched (backward-compatible with pre-v1.2 specs).
    def _is_num(x):
        return isinstance(x, (int, float)) and not isinstance(x, bool)

    for i, e in enumerate(spec.get("examples") or []):
        steps = [s for s in (e.get("solution_steps") or []) if isinstance(s, dict)]
        present = [(j, s.get("mark")) for j, s in enumerate(steps) if s.get("mark") is not None]
        total = e.get("marks_total")
        has_total = total is not None
        if not present and not has_total:
            continue  # no mark data on this example — allowed
        ex_id = e.get("id", i)
        if not has_total:
            fail(10, f"$.examples[{i}].marks_total",
                 f"example '{ex_id}' has per-step marks but no marks_total to sum to")
            continue
        if not _is_num(total) or total <= 0:
            fail(10, f"$.examples[{i}].marks_total",
                 f"example '{ex_id}' marks_total must be a positive number, got {total!r}")
            continue
        if not present:
            fail(10, f"$.examples[{i}].solution_steps",
                 f"example '{ex_id}' declares marks_total={total} but no solution step carries a mark")
            continue
        running = 0.0
        bad = False
        for j, m in present:
            if not _is_num(m) or m <= 0 or round(m * 2) != m * 2:
                fail(10, f"$.examples[{i}].solution_steps[{j}].mark",
                     f"step mark must be a positive multiple of 0.5, got {m!r}")
                bad = True
            else:
                running += m
        if not bad and abs(running - total) > 1e-9:
            fail(10, f"$.examples[{i}].solution_steps",
                 f"per-step marks sum to {running:g} but marks_total is {total:g} "
                 f"(CBSE step marks must sum to the example total)")

    return v


# ─────────────────────────────────────────────────────────────────────────────
# Rule descriptions (for the human report)
# ─────────────────────────────────────────────────────────────────────────────
RULES = {
    1: "every definition / example / ncert-figure carries a non-empty source",
    2: "meta.topic_key is a real slug in topics.ts",
    3: "no banned-syllabus phrase (live from syllabusGuard.ts) in any text field",
    4: "third_tab_content.kind matches meta + has the kind's required shape",
    5: "examples[].kind is valid for the subject",
    6: "no mojibake / cid / U+FFFD artifacts in any text field",
    7: "source_ledger row-count == number of sourced fields",
    8: "figure manifest buckets + required keys are valid",
    9: "required keys present + every figure_ref resolves",
    10: "per-step marks (when present) sum to the example's marks_total",
}


def validate_file(path, banned_phrases, topic_keys):
    """Returns (violations, error_str). error_str set on read/parse failure."""
    try:
        spec = json.loads(Path(path).read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None, f"file not found: {path}"
    except json.JSONDecodeError as e:
        return None, f"invalid JSON: {e}"
    return validate(spec, banned_phrases, topic_keys), None


def print_human_report(path, violations, error):
    print(f"\n=== validate_spec: {path} ===")
    if error:
        print(f"  ERROR: {error}")
        print(f"  VERDICT: INVALID")
        return
    by_rule = {}
    for viol in violations:
        by_rule.setdefault(viol["rule"], []).append(viol)
    for rnum in sorted(RULES):
        hits = by_rule.get(rnum, [])
        if not hits:
            print(f"  [rule {rnum}] PASS - {RULES[rnum]}")
        else:
            print(f"  [rule {rnum}] FAIL - {RULES[rnum]}")
            for h in hits:
                print(f"           -> {h['path']}: {h['detail']}")
    print(f"  VERDICT: {'VALID' if not violations else 'INVALID'}")


def main(argv):
    args = argv[1:]
    json_mode = "--json" in args
    all_mode = "--all" in args
    spec_args = [a for a in args if not a.startswith("--")]

    # No bypass / force flag exists — by design.
    try:
        banned_phrases = load_banned_phrases()
        topic_keys = load_topic_keys()
    except (FileNotFoundError, ValueError) as e:
        msg = f"FATAL: could not load live dependencies: {e}"
        if json_mode:
            print(json.dumps({"valid": False, "violations": [{"rule": 0, "path": "$", "detail": msg}]}))
        else:
            print(msg)
        return 2

    if all_mode:
        targets = sorted(str(p) for p in SPECS_DIR.glob("*.json"))
        if not targets:
            print(f"No specs found in {SPECS_DIR}")
            return 1
    elif spec_args:
        targets = spec_args
    else:
        print(__doc__)
        return 2

    results = []
    any_invalid = False
    for t in targets:
        violations, error = validate_file(t, banned_phrases, topic_keys)
        invalid = error is not None or bool(violations)
        any_invalid = any_invalid or invalid
        results.append((t, violations, error))

    if json_mode:
        if all_mode or len(results) > 1:
            payload = [
                {"spec": t, "valid": not (error or violations),
                 "violations": ([{"rule": 0, "path": "$", "detail": error}] if error else violations)}
                for (t, violations, error) in results
            ]
            print(json.dumps({"valid": not any_invalid, "results": payload}, ensure_ascii=False))
        else:
            t, violations, error = results[0]
            payload = {
                "valid": not (error or violations),
                "violations": ([{"rule": 0, "path": "$", "detail": error}] if error else violations),
            }
            print(json.dumps(payload, ensure_ascii=False))
    else:
        for (t, violations, error) in results:
            print_human_report(t, violations, error)

    return 1 if any_invalid else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
