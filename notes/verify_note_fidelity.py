#!/usr/bin/env python3
"""
verify_note_fidelity.py - gate 2 of the notes drift-gate stack (schema v1.2).

Mandate (AGENT_FABLE_notes_orchestrator_2026-07-11.md, gate 2):
  "every verbatim field literally present at its cited NCERT page."

For every NCERT-verbatim field in a spec, this opens the cited chapter PDF
(pymupdf ONLY - pdfplumber is banned for subset-font mojibake) and asserts the
verbatim text is literally present at the cited page. It is the mechanical half
of the anti-fabrication gate: it proves the string is really in the book at the
page the spec claims. (Whether it is the RIGHT string for the concept is the
INDEPENDENT AUDITOR's adversarial human sample - the gate checks presence, the
auditor checks correctness.)

WHAT IS CHECKED
  - definitions[].verbatim   (always - the tutor-critical NCERT-verbatim unit)
  - examples[].problem_verbatim  ONLY when it is an NCERT-sourced, non-authored,
    non-process problem (numerical/reaction with an ncert_page/ncert_example/
    ncert_exercise cite and no "[authored" marker). PYQ-sourced and authored
    process prompts are SKIPPED WITH A LOGGED REASON - they are real content but
    not NCERT-chapter verbatim, so NCERT fidelity cannot and must not judge them.

MATCHING (honest + robust to real NCERT PDF extraction)
  Two tiers, both anchored to the cited page (+/-1 to tolerate text that wraps a
  page boundary):
    Tier 1  contiguous alnum-skeleton substring of the whole fragment.
    Tier 2  (only if Tier 1 misses) every substantial PROSE run of the fragment
            (>= MIN_RUN skeleton chars, split OUT the 2D-typeset math regions
            that pymupdf reorders) must be a contiguous skeleton substring. The
            math regions are reported as "not linearly verifiable", never
            silently passed; a fragment with no verifiable prose run and no
            Tier-1 hit FAILS.
  A fragment split by "[editorial]" brackets or "..."/"..." ellipsis is checked
  per real-source sub-fragment; the bracketed/elided parts are acknowledged
  non-source and not matched (scholarly-quotation convention).

  Skeleton = NFKC, join hyphenated line-breaks, lowercase, keep [a-z0-9] only.
  This absorbs the extraction noise that is NOT a fidelity signal: line-break
  hyphenation, inconsistent spacing around superscripts, smart quotes/dashes,
  and Adobe-Symbol Private-Use glyphs (=/=, alpha, >=, +/-, sqrt render as U+F0xx
  and drop out equally on both sides). It does NOT absorb different WORDS -
  paraphrase changes the skeleton and fails.

Usage:
  python notes/verify_note_fidelity.py <spec.json>            one spec
  python notes/verify_note_fidelity.py --all                  notes/specs/*.json
  python notes/verify_note_fidelity.py <spec.json> --json     machine output
  python notes/verify_note_fidelity.py --selftest             goldens PASS / fixtures FAIL

Non-zero exit on ANY fidelity failure. No --force / skip flag - by design.
stdlib + pymupdf only.
"""

import json
import os
import re
import sys
import unicodedata
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    sys.stderr.write("FATAL: PyMuPDF (fitz) is required: pip install pymupdf\n")
    sys.exit(2)

# -- Repo + source layout -----------------------------------------------------
NOTES_DIR = Path(__file__).resolve().parent
REPO_ROOT = NOTES_DIR.parent
SPECS_DIR = NOTES_DIR / "specs"
DEFAULT_NCERT_ROOT = Path(os.environ.get(
    "NCERT_ROOT", r"C:\Users\Chetan\OneDrive\Desktop\NCERT Books"))
SUBJECT_DIR = {
    "physics": "Science class 10", "chemistry": "Science class 10",
    "biology": "Science class 10", "maths": "Mathematics class 10",
}
SUBJECT_PREFIX = {
    "physics": "jesc1", "chemistry": "jesc1", "biology": "jesc1", "maths": "jemh1",
}

MIN_RUN = 12          # min skeleton chars for a prose run to be individually required
PAGE_WINDOW = 1       # tolerate cited-page +/- this many pages (boundary wrap)

# Characters that mark a token as "math/typeset" (pymupdf reorders 2D math, and
# Symbol-font glyphs land in the U+F020..U+F0FF Private Use block).
_MATH_CHARS = set("=+*/^<>|~\\")
_MATH_UNICODE = set("−–—±×÷≠≤≥√∞∑∫∂∇°πθαβγδλμσφωΩ→⇒↔∈∉⊂⊃∪∩")


def _is_pua(ch):
    # Adobe Symbol-font glyphs land in U+F020..U+F0FF when pymupdf cannot map them.
    return 0xF020 <= ord(ch) <= 0xF0FF


# -- Normalisation ------------------------------------------------------------
def skeleton(s):
    """Alnum skeleton: NFKC, join hyphenated line-breaks, keep [a-z0-9]."""
    s = unicodedata.normalize("NFKC", s)
    s = re.sub(r"-\s*\n\s*", "", s)     # de-hyphenate line breaks
    return re.sub(r"[^a-z0-9]", "", s.lower())


def strip_authoring_artifacts(v):
    """Remove things a reader embeds in a verbatim field that are NOT source:
    trailing/inline page-cite parentheticals '(p.150-151)' / '(p. 43)', and
    stray straight/smart quote characters."""
    v = re.sub(r"\(\s*p\.?\s*[\d–—\-,\s]+\)", " ", v, flags=re.IGNORECASE)
    v = v.replace('"', " ").replace("“", " ").replace("”", " ")
    return v


def source_fragments(verbatim):
    """Split a verbatim into real-source fragments: drop [editorial] inserts and
    split on ...'/'...' ellipsis (scholarly quotation convention)."""
    v = strip_authoring_artifacts(verbatim)
    v = re.sub(r"\[[^\]]*\]", " ‖ ", v)     # editorial brackets -> break
    v = v.replace("…", " ‖ ")            # unicode ellipsis
    v = re.sub(r"\.\.\.+", " ‖ ", v)         # ascii ellipsis
    parts = [p.strip() for p in v.split("‖")]
    return [p for p in parts if len(skeleton(p)) >= 4]


def prose_runs(fragment):
    """Group the fragment's whitespace tokens into contiguous PROSE runs,
    splitting OUT math/typeset tokens (which pymupdf reorders). Returns the runs
    whose skeleton is >= MIN_RUN chars, plus the raw math tokens dropped."""
    runs, cur, math_tokens = [], [], []

    def is_math(tok):
        if any(c in _MATH_CHARS or c in _MATH_UNICODE or _is_pua(c) for c in tok):
            return True
        # superscripts/subscripts (Unicode cat 'No') and math symbols ('Sm').
        if any(unicodedata.category(c) in ("No", "Sm") for c in tok):
            return True
        core = tok.strip(",.;:()[]")
        if re.fullmatch(r"[0-9]+", core):        # bare number = formula noise
            return True
        # algebraic term glued from letters+digits: 2a, 4ac, ax2, b2.
        if re.search(r"[0-9]", core) and re.search(r"[A-Za-z]", core):
            return True
        return False

    for tok in fragment.split():
        if is_math(tok):
            math_tokens.append(tok)
            if cur:
                runs.append(" ".join(cur)); cur = []
        else:
            cur.append(tok)
    if cur:
        runs.append(" ".join(cur))
    long_runs = [r for r in runs if len(skeleton(r)) >= MIN_RUN]
    return long_runs, math_tokens


# -- PDF handling -------------------------------------------------------------
class Chapter:
    """One chapter PDF: page skeletons + printed-page -> pdf-index map.

    NCERT prints the page number as a standalone line, but figure/activity/
    exercise labels and (in chemistry/maths) bare coefficients, ratios and
    subscripts also extract as standalone integers. A first-occurrence map is
    therefore poisoned on low-numbered chapters (ch.1 prints pp.1-16, which
    collide constantly with content integers).

    Instead we detect the chapter's CONSTANT page-number offset k, where
    printed_page(pdf_index i) = i + k. The genuine page number is printed on
    EVERY page, so k_true collects one vote from every page (support ==
    page_count) while spurious integers scatter across other offsets with low
    support -- k_true cannot be beaten. printed page N then maps deterministically
    to pdf index N - k, and the printed range is [k, k + page_count - 1]."""
    def __init__(self, path):
        self.path = path
        self.doc = fitz.open(path)
        self.page_skel = [skeleton(self.doc[i].get_text()) for i in range(self.doc.page_count)]
        self._page_nums = []
        for i in range(self.doc.page_count):
            nums = set()
            for ln in self.doc[i].get_text().splitlines():
                ln = ln.strip()
                if re.fullmatch(r"\d{1,3}", ln):
                    nums.add(int(ln))
            self._page_nums.append(nums)
        self.offset = self._detect_offset()
        if self.offset is not None:
            self.page_lo = self.offset
            self.page_hi = self.offset + self.doc.page_count - 1
        else:
            self.page_lo = self.page_hi = None

    def _detect_offset(self):
        """Vote for the constant offset k s.t. printed(i) = i + k. Each page's
        genuine page number votes for k_true, so k_true wins with support ==
        page_count; require majority support to trust it."""
        votes = {}
        for i, nums in enumerate(self._page_nums):
            for n in nums:
                k = n - i
                if k >= 1:                 # printed page of pdf[0] is >= 1
                    votes[k] = votes.get(k, 0) + 1
        if not votes:
            return None
        k_best = max(votes, key=lambda k: (votes[k], -k))
        if votes[k_best] < max(3, self.doc.page_count // 2):
            return None                    # too weak to trust -> no reliable map
        return k_best

    def close(self):
        self.doc.close()

    def page_status(self, printed_page):
        """('located', window) | ('out_of_range', (lo,hi)) | ('no_map', None)."""
        if self.offset is None:
            return ("no_map", None)
        idx = printed_page - self.offset
        if 0 <= idx < self.doc.page_count:
            win = [i for i in range(idx - PAGE_WINDOW, idx + PAGE_WINDOW + 1)
                   if 0 <= i < self.doc.page_count]
            return ("located", win)
        return ("out_of_range", (self.page_lo, self.page_hi))

    def find_contiguous(self, text, pages):
        sk = skeleton(text)
        if len(sk) < 4:
            return None
        for i in pages:
            if sk in self.page_skel[i]:
                return i
        return None


def chapter_pdf_path(subject, chapter_no, explicit_pdf=None):
    root = DEFAULT_NCERT_ROOT
    if explicit_pdf:
        return root / SUBJECT_DIR.get(subject, "Science class 10") / "_unzipped" / (explicit_pdf + ".pdf")
    prefix = SUBJECT_PREFIX.get(subject)
    subdir = SUBJECT_DIR.get(subject)
    if not prefix or not subdir or chapter_no is None:
        return None
    return root / subdir / "_unzipped" / ("%s%02d.pdf" % (prefix, int(chapter_no)))


# -- Field verification -------------------------------------------------------
def verify_fragment(chapter, fragment, pages, all_pages):
    """Return (ok, detail). Tier 1 contiguous; Tier 2 prose-run fallback."""
    hit = chapter.find_contiguous(fragment, pages)
    if hit is not None:
        return True, "ok@pdf%d" % hit
    runs, math_tokens = prose_runs(fragment)
    if not runs:
        # nothing but math/short tokens and Tier-1 missed: look chapter-wide to
        # report where it really is, then FAIL (never silently pass).
        anywhere = chapter.find_contiguous(fragment, all_pages)
        if anywhere is not None:
            return False, "found@pdf%d but NOT at cited page (+/-%d)" % (anywhere, PAGE_WINDOW)
        return False, "NOT FOUND (no verifiable prose run; fragment is math/short)"
    missing = []
    hits = []
    for r in runs:
        h = chapter.find_contiguous(r, pages)
        if h is None:
            anywhere = chapter.find_contiguous(r, all_pages)
            missing.append("%r%s" % (r[:48], "" if anywhere is None else " (found@pdf%d)" % anywhere))
        else:
            hits.append("pdf%d" % h)
    if missing:
        return False, "prose run(s) NOT at cited page: " + "; ".join(missing)
    note = "prose verified@%s" % ",".join(sorted(set(hits)))
    if math_tokens:
        note += " (math region not linearly verifiable: %r)" % (" ".join(math_tokens)[:60])
    return True, note


def example_is_ncert_verbatim(ex):
    """True iff this example's problem_verbatim should be NCERT-fidelity-checked."""
    src = ex.get("source") or {}
    if ex.get("kind") == "process":
        return False, "process walkthrough (authored prompt)"
    pv = ex.get("problem_verbatim") or ""
    if "[authored" in pv.lower():
        return False, "authored prompt marker"
    if not any(k in src for k in ("ncert_page", "ncert_example", "ncert_exercise")):
        return False, "non-NCERT source (%s)" % ",".join(sorted(src.keys())) if src else "no source"
    return True, None


def verify_spec(path):
    """Returns dict: {spec, checks:[...], skipped:[...], valid, error}."""
    try:
        spec = json.loads(Path(path).read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {"spec": str(path), "error": "file not found", "valid": False}
    except json.JSONDecodeError as e:
        return {"spec": str(path), "error": "invalid JSON: %s" % e, "valid": False}

    meta = spec.get("meta") or {}
    subject = meta.get("subject")
    chap_meta = meta.get("chapter_no")
    checks, skipped = [], []

    # Resolve one Chapter per (subject, chapter) lazily.
    cache = {}

    def get_chapter(chapter_no, explicit_pdf=None):
        key = (chapter_no, explicit_pdf)
        if key in cache:
            return cache[key]
        p = chapter_pdf_path(subject, chapter_no, explicit_pdf)
        if p is None or not p.exists():
            cache[key] = (None, "chapter PDF not found: %s" % p)
            return cache[key]
        cache[key] = (Chapter(str(p)), None)
        return cache[key]

    def run_field(label, verbatim, src):
        ch_no = src.get("chapter") or chap_meta
        chapter, err = get_chapter(ch_no, src.get("pdf"))
        if err:
            checks.append({"field": label, "ok": False, "detail": err,
                           "page": src.get("ncert_page")})
            return
        all_pages = list(range(chapter.doc.page_count))
        page = src.get("ncert_page")
        page_note = None
        if page is None:
            # Example cited only by number (no page): confirm chapter-wide.
            pages = all_pages
            page_note = "no page cite; searched whole chapter"
        else:
            status, info = chapter.page_status(page)
            if status == "located":
                pages = info
            elif status == "out_of_range":
                lo, hi = info
                checks.append({"field": label, "ok": False,
                               "detail": "cited page %s is OUTSIDE chapter printed range %d-%d "
                                         "(cite error)" % (page, lo, hi), "page": page})
                return
            elif status == "gap":
                # inside the chapter span but that exact number did not extract
                # (rare) -> confirm chapter-wide with a loud warning.
                pages = all_pages
                page_note = ("cited page %s inside chapter span but not locatable; "
                             "searched whole chapter" % page)
            else:  # no_map
                pages = all_pages
                page_note = "chapter has no extractable page map; searched whole chapter"
        frags = source_fragments(verbatim)
        if not frags:
            checks.append({"field": label, "ok": False,
                           "detail": "no source fragment after stripping editorial inserts",
                           "page": page})
            return
        details, ok_all = [], True
        for fr in frags:
            ok, det = verify_fragment(chapter, fr, pages, all_pages)
            ok_all = ok_all and ok
            details.append(det)
        detail = " | ".join(details)
        if page_note:
            detail = page_note + " -> " + detail
        checks.append({"field": label, "ok": ok_all, "detail": detail, "page": page})

    for i, d in enumerate(spec.get("definitions") or []):
        src = d.get("source") or {}
        v = d.get("verbatim")
        label = "definitions[%d] %s" % (i, d.get("id", i))
        if not v:
            checks.append({"field": label, "ok": False, "detail": "empty verbatim", "page": None})
            continue
        if not src:
            checks.append({"field": label, "ok": False, "detail": "missing source", "page": None})
            continue
        run_field(label, v, src)

    for i, e in enumerate(spec.get("examples") or []):
        label = "examples[%d] %s" % (i, e.get("id", i))
        do_it, reason = example_is_ncert_verbatim(e)
        if not do_it:
            skipped.append({"field": label, "reason": reason})
            continue
        run_field(label, e.get("problem_verbatim") or "", e.get("source") or {})

    for ch, _ in cache.values():
        if ch:
            ch.close()

    valid = all(c["ok"] for c in checks) and bool(checks)
    return {"spec": str(path), "checks": checks, "skipped": skipped,
            "valid": valid, "error": None}


# -- Reporting ----------------------------------------------------------------
def print_report(res):
    print("\n=== verify_note_fidelity: %s ===" % res["spec"])
    if res.get("error"):
        print("  ERROR: %s" % res["error"])
        print("  VERDICT: INVALID")
        return
    for c in res["checks"]:
        mark = "PASS" if c["ok"] else "FAIL"
        pg = "" if c["page"] is None else " (cite p.%s)" % c["page"]
        print("  [%s] %s%s" % (mark, c["field"], pg))
        print("         -> %s" % c["detail"])
    for s in res["skipped"]:
        print("  [skip] %s -- %s" % (s["field"], s["reason"]))
    n_ok = sum(1 for c in res["checks"] if c["ok"])
    print("  %d/%d verbatim fields verified, %d skipped (non-NCERT)"
          % (n_ok, len(res["checks"]), len(res["skipped"])))
    print("  VERDICT: %s" % ("VALID" if res["valid"] else "INVALID"))


def run_selftest():
    goldens = ["light-reflection-and-refraction", "quadratic-equations", "life-processes"]
    ok = True
    print("== FIDELITY SELF-TEST ==")
    for name in goldens:
        res = verify_spec(SPECS_DIR / (name + ".json"))
        passed = res["valid"]
        ok = ok and passed
        print("  [%s] golden %s expected VALID -> %s"
              % ("PASS" if passed else "XXXX", name,
                 "VALID" if passed else "INVALID (see below)"))
        if not passed:
            print_report(res)
    for fx in sorted((SPECS_DIR / "_test").glob("0*.json")):
        res = verify_spec(fx)
        # Fixtures are stubs with a placeholder cite -> fidelity MUST reject.
        failed = (not res["valid"]) or bool(res.get("error"))
        ok = ok and failed
        print("  [%s] fixture %s expected INVALID -> %s"
              % ("PASS" if failed else "XXXX", fx.name,
                 "INVALID" if failed else "VALID (LEAK!)"))
    print("\nFIDELITY SELF-TEST:", "OK" if ok else "FAILED")
    return 0 if ok else 1


def main(argv):
    # The human report can print NCERT math glyphs (e.g. the U+2260 "!=" from a
    # math-region flag). On a Windows cp1252 console that raises UnicodeEncodeError
    # mid-report, hiding the VERDICT. Force UTF-8 with replacement so the gate is
    # honest on any console (no effect on linux/CI, which is UTF-8 already).
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass
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

    results = [verify_spec(t) for t in targets]
    any_invalid = any((not r["valid"]) or r.get("error") for r in results)
    if json_mode:
        payload = {"valid": not any_invalid,
                   "results": [{"spec": r["spec"], "valid": r["valid"],
                                "error": r.get("error"),
                                "checks": r.get("checks", []),
                                "skipped": r.get("skipped", [])} for r in results]}
        print(json.dumps(payload, ensure_ascii=False))
    else:
        for r in results:
            print_report(r)
    return 1 if any_invalid else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
