# LOW-END-REMEASURE: how fast is the live site today on budget phones and slow networks?

**Scout S-4 · report only · 2026-10-06 · spec `ops/.specs/LOW-END-REMEASURE.md` (sha256 `d03e22881784…`, hash verified) · production only · no AI calls**

**VERDICT: PASS-WITH-FOLLOW-UP.** Every question in §3 is answered with measurements. The lab link was much slower than assumed, so the timing tables come from Lighthouse simulated throttling (link-independent), and the observed runs are used as evidence for bytes, elements and causes (§1c). §6 lists what is not established.

---

## 0. The answer in ten lines

1. **On a real budget-Android connection (profile A, Fast 4G) every page reaches LCP in 1.4–2.5 s**, which is "good". This is Lighthouse-simulated at the spec's 9 Mbps / 170 ms / CPU 4×. **On 3G (profile B) every page is slower: 2.1–5.8 s.** The slowest are Notes Trigonometry 5.8 s, Check & Improve 5.0 s, Topic Hub 4.3 s, Exam Trends 4.2 s and Check Your Answer 4.2 s.
2. **Field (CrUX, owner-supplied) says LCP p75 4.6 s, FCP 4.0 s, TTFB 2.0 s.** The lab with Lighthouse's own mobile preset gives LCP 1.3–4.5 s, FCP 1.3–3.9 s and TTFB ≈ 0.15 s. **The lab does not reproduce the 2.0 s field TTFB.** From India the edge answers in **~60 ms** (HIT, bom1) and **~550 ms** (MISS). The field TTFB is therefore network (connection setup on mobile radios, redirects), not server work (§2d).
3. **The network decides LCP; page work hardly moves it.** Re-auditing the same loads with CPU 1× instead of 4× moves mobile LCP by **≤ 0.3 s on every page**. With no network cost at all, LCP would be 0.4–1.4 s.
4. **First paint waits for one 19.6 KB stylesheet that has to share the pipe with ~455 KB of preloaded JS.** In 42 of 42 prerendered mobile runs, FCP came after `index-*.css` finished (median FCP = CSS end + 615 ms). That CSS took a median 1.1 s, because the HTML `modulepreload`s the 352 KB entry and up to 8 route chunks at the same moment.
5. **On prerendered pages, LCP is recorded when React re-creates the page, not when the student first sees it.** `createRoot` replaces the prerendered nodes. When the new node is even slightly larger, Chrome records a fresh LCP at commit time. This shows on Notes, Topic Hub, Exam Trends, Check Your Answer and HPQ. On Notes the big "What the board actually asks" paragraph is **never** an LCP candidate in the prerendered copy (verified with the app JS blocked). It only counts after React renders it.
6. **Check Your Answer shifts by CLS 0.349 on phones and 0.898 on desktop, in every run.** At React's commit the hero block grows (desktop 106 → 271 px tall) and pushes the body down by 250 px.
7. **Compared with 4 Oct on the same 4-Oct "B" profile, Notes is slower: 9.9 s → 17.4 / 20.8 s observed and 16.0 s in Lighthouse.** Both methods agree. Which change caused it is not established (§6).
8. **Signed in, on a link close to honest profile A (3–6 Mbps):** Me is readable in 5.1 s (median). Quick Practice from a direct link shows Question 1 in **7.6 s**, with TBT 2.1–2.4 s and 1.3 s long tasks, so it is CPU-bound. From the hub, Start → Question 1 takes 3.3 s (two taps).
9. **The Vercel edge is healthy from India.** Every response came from **bom1**. `Vary: User-Agent` does **not** fragment the cache (24/24 HITs across six real phone UAs, same `age`). The Node-runtime middleware adds about **20 ms** on a HIT. The redirects do cost time: `lazytopper.com` → `www` and legacy `/app/…` → root each add a connection (160–350 ms here; several radio RTTs on a phone).
10. **Ranked fixes are in §5.** The two largest: (1) stop the preload contention so the CSS (and so FCP) is not delayed, and (2) keep the prerendered first screen instead of re-creating it, so LCP lands at first paint.

---

## 1. Trunk SHA, live SHA, §0c

### 1a. §0c pre-flight (verbatim)
```
$ node scripts/premise_ledger_check.mjs ops/.specs/LOW-END-REMEASURE.md --worktree=. --strict-anchor
PASS  ops/.specs/LOW-END-REMEASURE.md  (2 premises)
  ✓ ledger complete, evidence well-formed
  coverage: 1/1 claim rows had their anchor RESOLVED · 0 UNCHECKED · 1 UNVERIFIED (open by design)
premise-ledger: 1/1 specs passed (evidence resolved against .)
exit=0
```
The spec's base is `5cd9d97e`. The pre-flight ran at `613d8996`, and P1's anchor `lazytopper/scripts/seo/searchPing.ts:59` resolved there unchanged. The spec copy is gitignored (`.gitignore:107 ops/.specs/`) and not committed.

### 1b. What production was during each measurement
| set | window (UTC) | live SHA (`/version.json`, read before and after every run) |
|---|---|---|
| observed matrix, 117 runs | 12:27–12:58 | `613d8996` (runs 1–92), then `b52d46c5` (#959, **docs-only**) from Pricing A run 2 onward |
| re-runs, Lighthouse gathers, TTFB probes, signed-in | 12:58–13:59 | `b52d46c5` |
| last signed-in run (`qp-hub` #2) | 13:59 | `a21457d2` (#957) |

- `b52d46c5` changed only `handoff/` files.
- #957 (`a21457d2`, live at about 14:00Z, after the measurements) changes server grading code plus one client file, `src/pages/tutor/tutorContextBrief.ts`, which is in the lazily loaded tutor chunk that no measured page loads. The live entry chunk is 352.2 KB br against 352.6 KB during the runs, so **the numbers below hold for the current tip**.
- Side finding: the docs-only deploy **renamed every JS chunk** (`index-2SGFpCOD.js` → `index-Dq3mVS-l.js`, and `PricingPage-*`, `ReturnContextBar-*` too). The old names now return 404. See §6.

### 1c. Method, and what the lab link did to it (read this before the tables)
- **Observed harness:** Playwright 1.59.1 (the repo pin) with Chromium 147, throttled through CDP. Each run used a fresh browser process with the cache disabled, analytics beacons blocked in-browser (none sent), and `navigator.webdriver = true`, so **GA4 is not loaded** (`index.html` gate). A real student also loads GA4, deferred since #926. Profiles followed spec §2: A = 9/1.5 Mbps, 170 ms, CPU 4×, 390×844 DPR 2; B = 1.6/0.75 Mbps, 300 ms, CPU 4×, 390×844; C = unthrottled, 1440×900. **"Bold"** = the 4-Oct B profile (0.4/0.4 Mbps, 300 ms, CPU 6×, 360×740), run only for the comparison in §3.
- **The lab's Wi-Fi link was the bottleneck.** The download rate of each run's first parallel wave (`eff.mjs`) had a median of **≈1.1 Mbps in every profile, unthrottled C included** (A range 0.27–5.97, B 0.30–1.39, C 0.26–9.87). Document TTFB was bimodal: ~100 ms, or **1–6 s stalls in 57 of 117 runs**. curl to cdnjs and jsDelivr showed the same link (0.4–5 Mbps).
  - **So the owner's premise "B and C are unaffected" did not hold here.** C (unthrottled) runs at whatever the link gives. B's 1.6 Mbps cap sat above the link's median. Only the 0.4 Mbps "Bold" profile sat reliably below it.
  - **Profile A is therefore reported as conservative.** Observed A ran at about 1 Mbps, not 9.
- **Primary timing source: Lighthouse 12.8.2 with simulated throttling (Lantern),** which is the owner's chosen control. Each page was loaded once per run (3 runs, mobile at 390×844 and desktop at 1440×900). The same recorded load was then audited under each profile by rewriting only `settings.throttling` in the saved artifacts.
  - Lantern simulates downloads at the configured throughput from the request graph, so the lab link's speed does not set the result (one gather had an 18 s first byte and its simulated LCP was still 3.2 s).
  - Profiles audited: A (170 ms, 9,000 kbps, 4×), B (300 ms, 1,600 kbps, 4×), **LH-mobile** (Lighthouse's own mobile preset: 150 ms, 1,638 kbps, 4×, i.e. what PageSpeed Insights uses), C (Lighthouse desktop preset: 40 ms, 10,240 kbps, 1×, as the stand-in for unthrottled) and Bold.
  - A Lantern run is not an observed run, and Lantern is known to under-weight main-thread contention. The observed long tasks are reported next to it.
- **PageSpeed Insights API: skipped.** The keyless daily quota was exhausted (HTTP 429, `Queries per day`). Per the owner's instruction, the local Lighthouse run replaces it.
- Host: AC power, CPU 31–97% busy from other agents (logged per run as `hostCpuPct`). Lantern's CPU side uses the recorded task durations × the multiplier, so host load does leak into it.

---

## 2. Page × profile

### 2a. Primary table: Lighthouse simulated throttling, median of 3 (link-independent)

LCP in seconds (the three runs in brackets):

| page | **A** LCP | **B** LCP | LH-mobile LCP | **C** LCP | A FCP | B FCP | A TBT ms | B TBT ms | CLS mobile / desktop | LCP element (mobile) | DOM nodes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` landing | 1.4 (2.3/1.3/1.4) | 2.6 (4.8/2.5/2.6) | 1.5 | 0.8 | 1.4 | 2.0 | 337 | 354 | 0.000 / 0.000 | `picture > img.lt-landing-bgmark` | 105 |
| `/practice-hub` | 1.8 (2.1/1.4/1.8) | 3.0 (3.0/2.4/4.1) | 1.9 | 0.3 | 1.8 | 3.0 | 506 | 323 | 0.000 / 0.001 | (text, no node reported) | 194 |
| `/exam-trends` | 1.8 (1.8/1.3/1.8) | 4.2 (4.2/2.1/4.3) | 3.2 | 2.5 | 1.7 | 3.9 | 534 | 464 | 0.000 / 0.001 | `div > h1` | 304 |
| `/topic-hub/trigonometry` | 2.5 (2.7/2.5/1.8) | 4.3 (3.6/5.0/4.3) | 3.4 | 1.2 | 2.5 | 4.3 | 262 | 62 | 0.000 / 0.001 | `p.lt-spine__row-use` | 134 |
| `/notes/trigonometry` | 2.4 (2.6/2.4/2.4) | **5.8** (6.2/5.8/5.7) | 4.5 | 0.6 | 2.1 | 4.9 | **1,275** | 620 | 0.000 / 0.008 | `div.lt-note__board-asks > p` | **4,147** |
| `/notes/statistics` | 2.4 (2.4/2.5/2.3) | 3.8 (3.8/3.8/5.7) | 2.6 | 0.6 | 2.0 | 3.0 | **1,209** | **1,010** | 0.000 / 0.005 | `div.lt-note__board-asks > p` | **4,979** |
| `/notes/electricity` | 2.2 (2.5/1.8/2.2) | 3.4 (3.4/3.0/3.4) | 2.2 | 0.6 | 1.9 | 2.7 | **1,100** | **1,095** | 0.000 / 0.007 | `div.lt-note__board-asks > p` | **3,337** |
| `/check-your-answer` | 2.0 (1.5/2.0/2.8) | 4.2 (2.3/4.2/5.0) | 3.3 | 0.7 | 1.4 | 2.4 | 377 | 326 | **0.349 / 0.898** | `section > p` | 145 |
| `/check-improve` | 2.1 (2.2/2.1/2.1) | **5.0** (4.9/5.0/5.0) | 4.0 | 0.5 | 1.7 | 4.0 | 268 | 253 | 0.000 / 0.001 | `ol > li` | 103 |
| `/login` | 1.9 (3.4/1.3/1.9) | 4.1 (6.5/2.1/4.1) | 3.1 | 0.5 | 1.6 | 3.8 | 368 | 368 | 0.000 / 0.000 | `p.lt-login-linkwarn` | 99 |
| `/pricing` | 1.4 (2.1/1.4/1.3) | 2.1 (4.3/2.1/2.1) | 1.3 | 0.4 | 1.4 | 2.0 | 480 | 480 | 0.000 / 0.004 | `p.lt-pricing-subtitle` | 144 |
| `/highly-probable/10/Maths` | 1.7 (1.7/1.7/1.6) | 3.3 (3.3/3.3/3.3) | 2.1 | 0.5 | 1.6 | 3.2 | 1,042 | 526 | 0.000 / 0.001 | `div > p` | 1,294 |

The spec's `/topic-hub/10/Maths` sends a signed-out visitor to `/login`, and `/topic-hub` redirects to `/exam-trends`. The Topic Hub page measured is therefore the sitemap's `/topic-hub/trigonometry`, the same page measured on 4 Oct. The Predicted Questions page is `/highly-probable/10/Maths` (sitemap).

**Profile A treated as ≥ 5 Mbps (owner's question): the conclusions do not change. If anything they get sharper.**
- At an honest 9 Mbps every page is ≤ 2.5 s LCP.
- The observed A runs (≈1 Mbps) read 1.2–15.4 s because they were really a sub-3G link (§2b).
- The page ranking is the same either way: Notes and Topic Hub are slowest, and Pricing and Landing fastest.
- The problem is **3G and slower**, plus field TTFB (§2d). It is not Fast 4G.
- The one observation that matters at ≥ 5 Mbps is CPU: the signed-in runs at 3–6 Mbps still took 7.6 s to show Quick Practice Question 1, with 2.1–2.4 s TBT (§2e).

### 2b. Observed runs: HTML and JS bytes, elements, and link-bound timings

Only runs whose document TTFB was under the stall threshold count (A ≤ 1.0 s, B ≤ 1.5 s, C ≤ 0.8 s, Bold ≤ 1.7 s). Where no run was clean, all runs are used (shown as `0/n`). **The timings are bounded by the effective link column. Read them as "this link", not as the profile.** The byte columns are exact.

| page | prof | clean/all | LCP s | FCP s | TBT ms | longest task ms | CLS | HTML KB br (decoded) | JS KB br (decoded) | CSS KB | font KB | img KB | total KB | req | effective link Mbps | LCP element |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| landing | A | 3/3 | **3.9** | 2.0 | 405 | 520 | 0 | 11.3 (30.1) | 355 (1141.8) | 19.6 | 34.8 | 131.2 | 552.7 | 12 | 1.7 | IMG.lt-landing-bgmark "" |
| landing | B | 3/4 | **4.6** | 2.6 | 795 | 619 | 0 | 11.3 (30.1) | 354.9 (1141.8) | 19.7 | 34.8 | 131.2 | 552.7 | 12 | 1.0 | IMG.lt-landing-bgmark "" |
| landing | C | 3/5 | **1.0** | 0.5 | 14 | 80 | 0 | 11.3 (30.1) | 354.9 (1141.8) | 19.7 | 34.8 | 219.7 | 641.3 | 10 | 6.0 | IMG.lt-landing-bgmark "" |
| practicehub | A | 3/5 | **1.2** | 1.2 | 526 | 411 | 0 | 11 (45) | 375.6 (1207.2) | 19.7 | 34.8 | 0 | 441.9 | 10 | 1.9 | P "Pick a scope, then choose wh" |
| practicehub | B | 1/3 | **3.3** | 3.3 | 954 | 583 | 0 | 11 (45) | 375.7 (1207.2) | 19.6 | 34.8 | 0 | 441.9 | 10 | 1.0 | P "Pick a scope, then choose wh" |
| practicehub | C | 1/3 | **2.4** | 2.3 | 0 | 63 | 0.0 | 11.6 (47.7) | 375.7 (1207.2) | 19.6 | 34.8 | 0 | 442.5 | 10 | 2.5 | P "Mistake-aware practice needs" |
| trends | A | 2/3 | **6.5** | 3.8 | 352 | 483.5 | 0 | 13.1 (51) | 403.7 (1321.7) | 19.6 | 34.8 | 0 | 472.1 | 11 | 0.9 | H1 "Exam Trends" |
| trends | B | 2/3 | **2.5** | 2.4 | 594 | 523.5 | 0 | 13.1 (51) | 403.6 (1321.7) | 19.6 | 34.8 | 0 | 472.1 | 11 | 1.3 | H1 "Exam Trends" |
| trends | C | 1/3 | **1.8** | 1.8 | 22 | 76 | 0.0 | 13.8 (53.7) | 403.6 (1321.7) | 19.7 | 34.8 | 0 | 472.8 | 11 | 0.4 | P "Every chapter ranked into th" |
| trends | Bold | 0/3 | **7.5** | 7.2 | 805 | 1266 | 0 | 13.1 (51) | 403.7 (1321.7) | 19.6 | 34.9 | 0 | 472.1 | 11 | — | H1 "Exam Trends" |
| topichub | A | 1/3 | **15.4** | 5.5 | 774 | 601 | 0 | 10.8 (37.6) | 424.9 (1410.1) | 19.6 | 34.9 | 0 | 490.9 | 16 | 0.3 | P.lt-spine__row-use "Define each ratio from the l" |
| topichub | B | 1/3 | **7.7** | 4.8 | 695 | 611 | 0 | 10.8 (37.6) | 425 (1410.1) | 19.6 | 34.8 | 0 | 490.9 | 16 | 0.7 | P.lt-spine__row-use "Define each ratio from the l" |
| topichub | C | 1/3 | **0.4** | 0.4 | 33 | 98 | 0.0 | 11.5 (40.5) | 424.8 (1410.1) | 19.7 | 34.9 | 0 | 491.6 | 16 | 0.3 | P.lt-spine__row-use "Define each ratio from the l" |
| topichub | Bold | 1/3 | **6.0** | 6.0 | 1161 | 1324 | 0 | 10.8 (37.6) | 424.9 (1410.1) | 19.6 | 34.9 | 0 | 490.9 | 16 | — | H1 "Topic Hub" |
| notesTrig | A | 3/3 | **11.1** | 3.5 | 1417 | 1281 | 0 | 29 (220.4) | 499.9 (1591.1) | 27.5 | 77 | 29 | 663.1 | 22 | 0.7 | P "What the board actually asks" |
| notesTrig | B | 3/3 | **6.1** | 2.7 | 1719 | 1237 | 0 | 29 (220.4) | 499.9 (1591.1) | 27.6 | 76.9 | 43.5 | 677.6 | 23 | — | — |
| notesTrig | C | 1/3 | **0.8** | 0.8 | 61 | 188 | 0.0 | 29.7 (223.3) | 500 (1591.1) | 27.5 | 76.9 | 29.1 | 663.9 | 22 | 4.4 | P.lt-note__body-text "Fix an acute angle in a righ" |
| notesTrig | Bold | 2/3 | **19.1** | 7.5 | 6354 | 3168 | 0 | 29 (220.4) | 500 (1591.1) | 27.5 | 77 | 43.5 | 677.7 | 23 | — | P "What the board actually asks" |
| notesStat | A | 1/3 | **7.4** | 2.7 | 2726 | 1481 | 0 | 24.1 (241.7) | 498.6 (1586.3) | 27.5 | 80.5 | 71.5 | 702.9 | 21 | 1.1 | P "What the board actually asks" |
| notesStat | B | 2/3 | **10.1** | 4.1 | 2892 | 1325.5 | 0 | 24.1 (241.7) | 498.6 (1586.3) | 27.6 | 80.5 | 107.2 | 738.7 | 22 | — | P "What the board actually asks" |
| notesStat | C | 1/3 | **0.5** | 0.5 | 85 | 176 | 0.0 | 24.8 (244.6) | 498.7 (1586.3) | 27.5 | 80.5 | 107.2 | 739.4 | 22 | 0.3 | P.lt-note__body-text "In Class IX you found the me" |
| notesElec | A | 0/3 | **14.6** | 5.9 | 1165 | 1478 | 0 | 27.8 (183.3) | 497.8 (1582.9) | 27.6 | 76.9 | 41.8 | 672.7 | 23 | 0.6 | — |
| notesElec | B | 2/3 | **10.5** | 3.6 | 2053 | 1149.5 | 0 | 27.8 (183.3) | 497.8 (1582.9) | 27.5 | 77 | 41.7 | 672.5 | 23 | — | P "What the board actually asks" |
| notesElec | C | 3/3 | **2.0** | 2.0 | 91 | 184 | 0.0 | 28.3 (186.2) | 497.7 (1582.9) | 27.6 | 77 | 41.7 | 673 | 23 | 0.6 | P.lt-note__body-text "One relation, V=IR, ties tog" |
| cya | A | 1/3 | **3.3** | 1.9 | 615 | 405 | 0.3 | 9.1 (25.6) | 358.2 (1149.4) | 21 | 34.8 | 0 | 423.9 | 8 | 1.8 | P "A Class 10 board answer wort" |
| cya | B | 3/3 | **4.3** | 1.6 | 704 | 490 | 0.3 | 9.1 (25.6) | 358.2 (1149.4) | 21 | 34.8 | 0 | 423.9 | 8 | 1.4 | P "A Class 10 board answer wort" |
| cya | C | 0/3 | **1.7** | 1.7 | 32 | 82 | 0.9 | 8.6 (21.9) | 358.2 (1149.4) | 21.1 | 34.8 | 0 | 423.4 | 8 | 1.2 | P "A Class 10 board answer wort" |
| ci | A | 2/3 | **5.2** | 3.0 | 525 | 574.5 | 0 | 5.2 (12.2) | 509.1 (1614.6) | 29.8 | 34.8 | 0 | 579.7 | 24 | 2.5 | LI "We call our examiner-style g" |
| ci | B | 2/3 | **7.6** | 4.0 | 611 | 688 | 0 | 5.2 (12.2) | 509.1 (1614.6) | 29.6 | 34.8 | 0 | 579.7 | 24 | 1.3 | LI "We call our examiner-style g" |
| ci | C | 3/3 | **6.9** | 4.8 | 17 | 70 | 0.0 | 5.2 (12.2) | 509.1 (1614.6) | 29.7 | 34.8 | 0 | 579.7 | 24 | 0.8 | DIV "Tip: even lighting and a fla" |
| login | A | 3/3 | **2.5** | 2.5 | 170 | 456 | 0 | 5.8 (12.7) | 488.8 (1543) | 19.6 | 34.8 | 0 | 550.2 | 12 | 2.7 | P.lt-login-linkwarn "Use the same method every ti" |
| login | B | 2/3 | **4.5** | 4.5 | 224 | 586.5 | 0 | 5.8 (12.7) | 488.8 (1543) | 19.6 | 34.8 | 0 | 550.3 | 12 | 1.2 | P.lt-login-linkwarn "Use the same method every ti" |
| login | C | 3/3 | **0.8** | 0.8 | 0 | 76 | 0 | 5.8 (12.7) | 488.8 (1543) | 19.6 | 34.8 | 0 | 550.2 | 12 | 4.2 | H1.lt-login-title "Sign in when your work needs" |
| pricing | A | 3/3 | **1.5** | 1.4 | 492 | 476 | 0 | 10.7 (36.7) | 364.5 (1173.2) | 19.6 | 34.8 | 0 | 430.4 | 8 | 3.9 | P.lt-pricing-subtitle "Browse first. Sign in for a " |
| pricing | B | 3/3 | **2.0** | 2.0 | 543 | 639 | 0 | 10.7 (36.7) | 364.5 (1173.2) | 19.6 | 34.8 | 0 | 430.4 | 8 | 1.4 | P.lt-pricing-subtitle "Browse first. Sign in for a " |
| pricing | C | 2/3 | **4.2** | 3.8 | 18 | 143.5 | 0.0 | 10.7 (36.7) | 364.5 (1173.2) | 19.6 | 34.8 | 0 | 430.4 | 8 | 5.2 | H1.lt-pricing-title "Simple, Student-Friendly Pla" |
| hpq | A | 1/3 | **8.6** | 4.3 | 548 | 501 | 0 | 15.5 (219.1) | 499.9 (1692.9) | 27.5 | 34.8 | 0 | 578.5 | 18 | 0.7 | P "The question shapes that rec" |
| hpq | B | 1/3 | **7.8** | 2.7 | 803 | 837 | 0 | 15.5 (219.1) | 499.9 (1692.9) | 27.6 | 34.8 | 0 | 578.5 | 18 | 0.8 | P "The question shapes that rec" |
| hpq | C | 2/3 | **5.0** | 5.0 | 132 | 164 | 0.0 | 16.3 (221.9) | 500 (1692.9) | 27.5 | 34.9 | 0 | 579.3 | 18 | 0.6 | P "The question shapes that rec" |

- **The bytes are identical across profiles**, which confirms the throttling was the only difference.
- **Every page ships 355–509 KB of JS (br), 1.14–1.69 MB decoded.** The entry chunk is 352 KB br.
- Total weight is 424–739 KB. That is down from 650–1,070 KB on 4 Oct (§3).
- Notes HTML is 24–29 KB br but **183–242 KB decoded**, and HPQ is 219 KB decoded.

### 2c. CrUX (owner-supplied) beside the lab

| metric | **CrUX field** (origin, mobile, p75, 28 days to 4 Oct) | Lab, LH-mobile preset (median over pages; range) | Lab, B (3G) | Lab, A (Fast 4G) |
|---|---|---|---|---|
| LCP | **4.6 s** (39% good) | 2.4 s; 1.3–4.5 s | 4.2 s; 2.1–5.8 s | 2.0 s; 1.4–2.5 s |
| FCP | **4.0 s** | 2.0 s; 1.3–3.9 s | 3.0 s; 2.0–4.9 s | 1.7 s; 1.4–2.5 s |
| TTFB | **2.0 s** | ~0.15 s (simulated server response) | — | — |
| CLS | **0** | 0 on 11 of 12 pages; **0.349** on `/check-your-answer` | same | same |
| CWV | **FAILED** | — | — | — |

How to read this:
- **Field LCP − field FCP is only 0.6 s, and field FCP − field TTFB is 2.0 s.** In the field, most of the 4.6 s passes **before first paint**: 2.0 s before the first byte, then about 2 s to download what the first paint waits for.
- The lab reproduces the second part (§4, cause A: CSS stuck behind preloads). It does **not** reproduce the 2.0 s TTFB.
- The CrUX window (to 4 Oct) **predates** #926 (lighter first load), #927 (per-device prerender), #928, #930, #949 and #958. The field number describes an older build. CrUX moves on a 28-day window.
- The field CLS of 0 is an origin p75. `/check-your-answer` (CLS 0.35/0.90 in the lab) launched on 4 Oct (#928) and is outside that window.

### 2d. TTFB from India: phases, edge, cache, middleware

curl from the lab (India), 5 reps per page per UA, a fresh connection per request, `Accept: text/html`, 13:07–13:12Z. Times in ms. Server wait = `time_starttransfer − time_appconnect`.

| path | UA | n | DNS | connect | TLS | server wait HIT | server wait MISS | TTFB median (min–max) | HIT/MISS/other | edge |
|---|---|---|---|---|---|---|---|---|---|---|
| / | M | 5 | 10 | 63 | 149 | 189 | - | 325 (117–716) | 5/0/0 | bom1 |
| /practice-hub | M | 5 | 12 | 98 | 64 | 53 | - | 282 (119–588) | 5/0/0 | bom1 |
| /exam-trends | M | 5 | 7 | 87 | 157 | 231 | - | 393 (117–1123) | 5/0/0 | bom1 |
| /topic-hub/trigonometry | M | 5 | 9 | 149 | 244 | 125 | - | 527 (135–914) | 5/0/0 | bom1 |
| /notes/trigonometry | M | 5 | 9 | 149 | 264 | 301 | - | 603 (576–3538) | 5/0/0 | bom1 |
| /notes/statistics | M | 5 | 10 | 360 | 485 | 435 | 574 | 1473 (113–2931) | 4/1/0 | bom1 |
| /notes/electricity | M | 5 | 12 | 120 | 102 | 108 | 782 | 1011 (121–3124) | 4/1/0 | bom1 |
| /check-your-answer | M | 5 | 9 | 4 | 57 | 67 | 488 | 130 (112–1525) | 4/1/0 | bom1 |
| /check-improve | M | 5 | 8 | 173 | 166 | 48 | - | 303 (121–1914) | 5/0/0 | bom1 |
| /login | M | 5 | 9 | 23 | 108 | 87 | - | 690 (118–2527) | 5/0/0 | bom1 |
| /pricing | M | 5 | 7 | 82 | 64 | 57 | - | 353 (120–1321) | 5/0/0 | bom1 |
| /highly-probable/10/Maths | M | 5 | 9 | 5 | 64 | 67 | - | 192 (135–530) | 5/0/0 | bom1 |
| /favicon.svg | M | 5 | 8 | 4 | 61 | 51 | - | 134 (102–356) | 5/0/0 | bom1 |
| /robots.txt | M | 5 | 17 | 4 | 60 | 53 | 783 | 181 (123–1031) | 4/1/0 | bom1 |
| /assets/index-BUeEFq71.css | M | 5 | 12 | 6 | 64 | 33 | - | 137 (101–331) | 5/0/0 | bom1 |
| / | D | 5 | 10 | 24 | 62 | 59 | - | 141 (126–311) | 5/0/0 | bom1 |
| /practice-hub | D | 5 | 9 | 150 | 57 | 49 | 529 | 254 (139–1184) | 4/1/0 | bom1 |
| /exam-trends | D | 5 | 12 | 7 | 66 | 51 | - | 139 (120–704) | 5/0/0 | bom1 |
| /topic-hub/trigonometry | D | 5 | 12 | 56 | 54 | 58 | - | 307 (110–852) | 5/0/0 | bom1 |
| /notes/trigonometry | D | 5 | 8 | 117 | 68 | 78 | - | 238 (118–3164) | 5/0/0 | bom1 |
| /notes/statistics | D | 5 | 8 | 88 | 57 | 56 | 551 | 269 (111–1230) | 4/1/0 | bom1 |
| /notes/electricity | D | 5 | 11 | 5 | 63 | 53 | 583 | 145 (137–743) | 4/1/0 | bom1 |
| /check-your-answer | D | 5 | 13 | 45 | 61 | 53 | 502 | 164 (108–736) | 4/1/0 | bom1 |
| /check-improve | D | 5 | 11 | 4 | 58 | 57 | - | 162 (114–917) | 5/0/0 | bom1 |
| /login | D | 5 | 13 | 7 | 61 | 45 | - | 131 (110–473) | 5/0/0 | bom1 |
| /pricing | D | 5 | 8 | 3 | 61 | 70 | - | 136 (123–810) | 5/0/0 | bom1 |
| /highly-probable/10/Maths | D | 5 | 10 | 5 | 52 | 86 | - | 158 (134–830) | 5/0/0 | bom1 |
| /favicon.svg | D | 5 | 10 | 7 | 61 | 48 | - | 128 (99–616) | 5/0/0 | bom1 |
| /robots.txt | D | 5 | 18 | 5 | 72 | 63 | - | 400 (113–661) | 5/0/0 | bom1 |
| /assets/index-BUeEFq71.css | D | 5 | 11 | 207 | 124 | 37 | - | 540 (274–1485) | 5/0/0 | bom1 |

- **Edge:** every one of the 150 responses carried `x-vercel-id: bom1::…` (Mumbai).
- **Server work is small.** Server wait on a **HIT is about 60 ms** (median over 113 page HITs). On a **MISS it is about 550 ms** (7 MISSes: `/notes/statistics`, `/notes/electricity`, `/check-your-answer`, `/practice-hub`, `/robots.txt`).
- **Connect and TLS are where the variance is:** 4–360 ms and 52–485 ms. That is the lab link. TTFB maxima of 3.1–3.5 s are link stalls, not server time: the same paths HIT in about 60 ms on the next request.
- **Per profile:** the observed document TTFB per page and profile is below. It is mostly the link stall (bimodal); CDP adds the profile latency once per request. Lantern simulates TTFB as server response plus RTT: ~0.15 s on LH-mobile.

| page | A TTFB ms median (min–max) | B | C |
|---|---|---|---|
| landing | 97 (84–498) n=3 | 1129 (95–2230) n=4 | 248 (109–4041) n=5 |
| practicehub | 262 (86–2501) n=5 | 1546 (329–2855) n=3 | 1527 (790–4771) n=3 |
| trends | 758 (734–2620) n=3 | 644 (472–1773) n=3 | 1429 (204–1859) n=3 |
| topichub | 2223 (122–3303) n=3 | 2460 (1075–3707) n=3 | 1409 (98–1853) n=3 |
| notesTrig | 242 (101–373) n=3 | 872 (654–1210) n=3 | 1735 (379–2143) n=3 |
| notesStat | 1184 (709–3712) n=3 | 1096 (358–4008) n=3 | 3111 (86–3660) n=3 |
| notesElec | 2907 (1559–3324) n=3 | 972 (95–6178) n=3 | 113 (102–120) n=3 |
| cya | 2375 (288–3701) n=3 | 100 (84–1281) n=3 | 1328 (1028–1666) n=3 |
| ci | 210 (205–1944) n=3 | 434 (89–3415) n=3 | 331 (80–697) n=3 |
| login | 121 (96–604) n=3 | 578 (93–1908) n=3 | 192 (92–202) n=3 |
| pricing | 188 (144–342) n=3 | 295 (94–356) n=3 | 686 (308–4513) n=3 |
| hpq | 4037 (108–4400) n=3 | 1743 (1177–3708) n=3 | 124 (123–2350) n=3 |

- **Middleware latency.** `middleware.ts` (matcher: every path except `assets/`, `api/`, `_vercel/`, `app/`; `runtime: "nodejs"`) runs on every page document. It sets `Vary: User-Agent, Sec-CH-UA-Mobile` and rewrites desktop clients to `/__desktop/…`.
  - Measured cost on a HIT: page server wait **~60 ms** against **33–37 ms** for `/assets/*.css`, which the matcher excludes, and **48–51 ms** for `/favicon.svg`, which is matched but a no-op.
  - **So the middleware adds roughly 15–25 ms.** It does not explain a 2.0 s field TTFB.
  - The `x-vercel-id` shows one hop (`bom1::<id>`). Which region the Node-runtime middleware executes in is not visible in the header (§6).
- **`Vary: User-Agent` does not fragment the cache.**
  - 6 real-world phone UAs (Samsung A14, Redmi Note 11, vivo, realme, OPPO on Chrome 144–146, and iPhone Safari) × 2 pages × 2 requests gave **24/24 HIT**.
  - The `age` values were continuous across UAs (1029 → 1069 s for Notes), so all UAs share one cached object per variant. Raw: `ua-fragmentation.json`.
- **Redirects add a connection each** (measured from the lab):
  - `https://lazytopper.com/…` → 308 → `www`: +160–200 ms.
  - `http://lazytopper.com/`: 2 hops, +200 ms, with one run at 1.9 s.
  - Legacy `/app/notes/…` → 308 → root: +330–410 ms.
  - On a 3G radio a new host costs DNS + TCP + TLS ≈ 3 RTTs, about 0.9 s at 300 ms.
  - `https://www.lazytopper.com/notes/trigonometry/` (trailing slash) returns **200** with no redirect.

**Which part of the 4.6 s field LCP is network and which is page work?**
- **Lab decomposition (Lantern, same recorded loads):**
  - Holding the network and moving CPU from 1× to 4× adds **0.0–0.3 s** of LCP on every mobile page (Notes 0.3 s on B, Check & Improve 0.1 s).
  - Removing network cost entirely (0 ms RTT, 1 Gbps, CPU 4×) gives LCP **0.4–1.4 s**: Notes 1.4, Topic Hub 1.2, everything else ≤ 0.6.
  - On every page **≥ 75% of LH-mobile LCP is network** (download of the HTML, the render-blocking CSS, the entry JS and the route chunks). Page work is at most 1.4 s and mostly overlaps with downloads.
- **Field arithmetic:** 4.6 s p75 = **2.0 s TTFB** (network: DNS/TCP/TLS/redirects on mobile radios; edge server work measured at 0.06–0.55 s) + **2.0 s to FCP** (render-blocking CSS behind ~455 KB of preloads, §4 cause A) + **0.6 s FCP → LCP** (React re-render, §4 cause B).
  - On that reading, **about 3.5–4 s of the 4.6 s is network and ≤ 1 s is page work.**
  - This is an inference from lab mechanisms applied to field aggregates. CrUX gives no per-phase breakdown here (§6).
- Caveat in the other direction: the observed runs show real main-thread blocks the simulation discounts. Notes has **1.0–1.5 s single tasks at CPU 4× and 2.8–3.5 s at CPU 6×**, and TBT 1.2–2.9 s. These hurt interactivity even where LCP is network-bound.

LCP split table (Lantern, median of 3 recorded loads, seconds):

| page | LH-mobile LCP | same, CPU 1× (network only) | added by CPU 4× | work-only LCP (0 RTT, 1 Gbps, CPU 4×) | B LCP | B, CPU 1× | added by CPU 4× | A LCP | A, CPU 1× |
|---|---|---|---|---|---|---|---|---|---|
| landing | 1.5 | 1.5 | 0.0 | 0.6 | 2.6 | 2.6 | 0.0 | 1.4 | 1.4 |
| practicehub | 1.9 | 1.9 | 0.0 | 0.6 | 3.0 | 3.0 | 0.0 | 1.8 | 1.8 |
| trends | 3.2 | 3.2 | 0.0 | 0.6 | 4.2 | 4.2 | 0.0 | 1.8 | 1.8 |
| topichub | 3.4 | 3.4 | 0.0 | 1.2 | 4.3 | 4.3 | 0.0 | 2.5 | 2.5 |
| notesTrig | 4.5 | 4.5 | 0.0 | 1.4 | 5.8 | 5.5 | 0.3 | 2.4 | 2.2 |
| notesStat | 2.6 | 2.5 | 0.1 | 1.4 | 3.8 | 3.6 | 0.1 | 2.4 | 1.9 |
| notesElec | 2.2 | 2.2 | 0.0 | 1.2 | 3.4 | 3.4 | 0.0 | 2.2 | 1.8 |
| cya | 3.3 | 3.3 | 0.0 | 0.6 | 4.2 | 4.2 | 0.0 | 2.0 | 2.0 |
| ci | 4.0 | 3.9 | 0.1 | 0.4 | 5.0 | 4.9 | 0.1 | 2.1 | 2.0 |
| login | 3.1 | 3.1 | 0.0 | 0.5 | 4.1 | 4.0 | 0.1 | 1.9 | 1.8 |
| pricing | 1.3 | 1.2 | 0.1 | 0.6 | 2.1 | 2.1 | 0.0 | 1.4 | 1.2 |
| hpq | 2.1 | 2.1 | 0.0 | 0.6 | 3.3 | 3.3 | 0.0 | 1.7 | 1.6 |

### 2e. Signed-in sample (profile A, one throwaway account, deleted)

The effective link during these runs was **3.1–5.9 Mbps**, the closest to an honest profile A of anything in this scout.

| flow | measure | run 1 / 2 / 3 | median |
|---|---|---|---|
| **Me** (`/me`) | page title rendered (`.lt-me__title`) | 3.9 / 5.1 / 6.0 s | **5.1 s** |
| | FCP · LCP · TBT | 1.7/2.9/2.9 s · 4.3/6.7/6.0 s · 696/861/853 ms | 2.9 s · 6.0 s · 853 ms |
| **Quick Practice, direct link** (`/practice/10/Maths?topic=trigonometry`) | navigation → "Question 1" on screen | 7.6 / 8.5 / 6.9 s | **7.6 s** |
| | FCP · LCP · TBT · longest task | 2.8/2.2/2.0 s · 5.4/6.3/4.5 s · 2,061/2,318/2,398 ms · 1,321/1,337/1,292 ms | 2.2 s · 5.4 s · 2,318 ms · 1.3 s |
| **Quick Practice from the hub** (`/practice-hub` → pick Trigonometry → "Start quick practice" → preset screen → "Start practising →") | hub control live | 2.1 / 1.8 / 2.1 s | 2.1 s |
| | tap Start → "Question 1" | 3.3 / 3.2 / 5.6 s | **3.3 s** |
| | of which Start → preset screen · Start practising → Q1 | 2.9/2.7/4.8 s · 0.46/0.48/0.79 s | 2.9 s · 0.48 s |

- API calls during the sample: only `GET /api/usage/me` (200) and `GET /api/user/progress` (**404** for a new account). **No AI endpoint was called.**
- Quick Practice is CPU-bound even on a good link: TBT 2.1–2.4 s with 1.3 s single tasks. That matches the 4 Oct finding (`getLikelyQuestionsForConcept` scoring the whole chapter, `predictionCore.ts`). I did not re-trace it today.
- The same fresh account saw two different Me titles: "Your journey" in runs 1–2 and "This is where your marks will show up." in run 3 (§6).

---

## 3. Compared with 4 Oct

The 4 Oct figures (SEO-5 OR-LIVE AFTER-AC at `965d1025`, i.e. after #927 and before #926) were measured on this host with the old B profile, which this scout calls **Bold**. Bold's 0.4 Mbps sits below the lab link, so the observed Bold runs are mostly faithful (stalls excepted).

| page (Bold profile, LCP) | pre-#927 | 4 Oct after #927 | **today, observed** (clean runs) | **today, Lantern** | read |
|---|---|---|---|---|---|
| Notes `/notes/trigonometry` | 5.4 (bimodal 5.4/22.8/5.1) | **9.9** | **17.4 / 20.8** (2 clean; 3rd stalled at 17.6) | **16.0** (16.2/16.0/15.7) | **slower.** Both methods agree |
| Topic Hub `/topic-hub/trigonometry` | 2.9 | **6.5** | 6.0 (1 clean; all runs 6.0/16.5/28.2) | 11.8 (4.2/12.8/11.8) | not established; the spread is too wide |
| Exam Trends `/exam-trends` | 2.9 | **6.5** | 7.5 (0 clean; 7.5/14.8/6.0) | 11.4 (11.4/2.7/11.5) | not established |

**Weight is down a lot since 4 Oct** (same pages, first visit):

| page | 4 Oct JS br / total KB | today JS br / total KB |
|---|---|---|
| Landing | 469 / 890 | 355 / 553 |
| Notes | 756 / 1,059 | 500 / 663–678 |
| Topic Hub | 694 / 883 | 425 / 491 |
| Exam Trends | 521 / 693 | 404 / 472 |
| Pricing | 478 / 684 | 365 / 430 |
| Sign-in | 469 / 650 | 489 / 550 |

- Fonts dropped from 136–295 KB to **35 KB** (one self-hosted Fraunces 700, #926), plus 42 KB of KaTeX fonts on Notes.
- The Firebase auth iframe and gapi (134 KB) no longer load at start-up.
- **Yet Notes is slower on the slow profile.** The Notes evidence (2 clean Bold runs):
  - the document ends at 2.2–3.0 s;
  - one **2.8–3.5 s** main-thread task follows (before the entry JS has arrived, so it is HTML parse / style / layout of a 220 KB, 4,147-node document);
  - the entry JS ends at 12.6–13.4 s and React commits at 15.7–17.1 s;
  - the KaTeX CSS is requested only after that (14.3–15.4 s) and the per-chapter spec chunk `trigonometry-*.js` last (18.4 s);
  - LCP lands at 17.4 / 20.8 s, with TBT 6.2–6.5 s.
- Candidate causes since `965d1025`: #926 (per-chapter notes and on-demand KaTeX add late, serial fetches), #949 (more notes content) and #958 (NCERT figures). Which one, and how much each, is §6.

---

## 4. The 5 slowest page × profile cells: LCP element and measured cause

Ranked by Lighthouse-simulated LCP on the spec profiles (link-independent). All five are profile B. Observed evidence is from the link-bound runs in `main.json` and `bold.json`.

### 1. Notes Trigonometry · B · LCP 5.8 s (FCP 4.9 s)
- **Element:** `div.lt-note__board-asks > p` ("What the board actually asks: …"), 216×291 px at 390 px.
- **Cause, measured:**
  - **(a) First paint waits for `index-*.css` (19.6 KB), which downloads alongside 540 KB of preloaded JS.** The HTML `modulepreload`s the entry (352 KB), `Note` (36.6), `noteSpecRegistry` (15.4), `katex` (78), `NcertPageModal`, `DesktopNotesPage`, `Card`, `ReturnTicket` and `tokens`, all at high priority, in the same instant as the CSS. In the observed B runs the CSS took 0.5–1.0 s and FCP followed it by 0.6–1.3 s.
  - **(b) The prerendered board-asks paragraph is never an LCP candidate.** With every app JS blocked, the prerendered page's only LCP entry is the H2 title (18,216 px²), although the paragraph is visible at 216×291, opacity 1, with no hidden ancestor (`prerender-probe`).
  - React's `createRoot` commit removes the prerendered nodes (`lcpConnectedAtEnd: false` in most runs), and React's own paragraph (62,496 px²) then becomes the LCP. That happens after the entry JS, the route chunks, the KaTeX CSS (requested only after the entry runs: 9.6 s in an A run) and the per-chapter spec chunk (last request).
  - **(c) Main thread:** a 1.0–1.5 s single task at CPU 4× before the entry JS arrives (parse/style/layout of 220 KB decoded HTML, 4,147 DOM nodes); TBT 1.2–1.7 s.
- **Why the paragraph is not a candidate in its prerendered form is not established** (§6). That it only counts after React is measured.

### 2. Check & Improve · B · LCP 5.0 s (FCP 4.0 s)
- **Element:** `ol > li` ("We call our examiner-style grader and show…").
- **Cause, measured:**
  - **No prerendered body.** The page serves the 12.2 KB app shell, and FCP is React's "Loading..." H3.
  - The route chunk group (12 chunks: `DesktopCheckImprovePage` 19.4 KB, `scorecardVariants` 14.5, `PageTray` 10.9, `aiClient`, `sessionRecords`, …) is requested only **after the 352 KB entry has run**. In an A run: entry ends 3.3 s, chunks requested 4.0 s, finished 5.1–5.6 s.
  - **KaTeX JS (78 KB) and CSS (7.9 KB) download during the first screen.** LCP lands within 0.07–0.33 s of KaTeX finishing in 4 of 4 clean runs (LCP / KaTeX end: 7.73 / 7.66 s, 2.72 / 2.76, 5.51 / 5.83, 9.67 / 9.85 s). So LCP comes **before** KaTeX finishes in 3 of 4 runs: KaTeX shares the pipe with the first screen, but it is **not proven to gate it**.
  - What does gate the first screen is the **serial chain**: entry → route chunk group → render.

### 3. Topic Hub · B · LCP 4.3 s (FCP 4.3 s)
- **Element:** `p.lt-spine__row-use` ("Define each ratio from the labelled…").
- **Cause, measured:**
  - FCP is gated by the same CSS-behind-preloads contention: 460 KB in flight with the CSS, and FCP = CSS end + 0.5–0.6 s in the observed runs.
  - The prerendered H1 "Topic Hub" and H2 "Trigonometry" paint pre-commit (sizes 1,660 and 5,760 px²). The row paragraph that becomes LCP (14,580 px²) appears **post-commit**, after the entry plus `topicHubContent` (25.4 KB) and `noteSpecRegistry` (15.4 KB).
  - In Lantern, FCP ≈ LCP, so on this page the paint gate (cause A) is the larger part.

### 4. Exam Trends · B · LCP 4.2 s (FCP 3.9 s)
- **Element:** `div > h1` "Exam Trends".
- **Cause, measured:**
  - FCP is behind the CSS (439 KB in flight with it).
  - The prerendered H1 (2,080 px²) is the first LCP entry. **React re-creates it 40 px² larger (2,120 px²) at commit, which records a new LCP at commit time** (observed A: pre-commit H1 at 2.96 s, post-commit H1 at 7.04 s). LCP therefore tracks React's commit, not the first paint.

### 5. Check Your Answer · B · LCP 4.2 s (FCP 2.4 s): also the CLS page
- **Element:** `section > p` ("A Class 10 board answer worth 2, 3 or 5 marks…").
- **Cause, measured:**
  - The prerendered paragraph is the LCP at FCP (65,352 px², pre-commit). React re-creates it at **66,928 px²** at commit, so a **new LCP is recorded at commit** (1.5–4.5 s FCP → 3.3–6.5 s LCP observed). That is the 1.8 s FCP→LCP gap in Lantern, the largest of any page.
  - **The same commit causes the layout shift:** CLS 0.349 at 390 px and 0.898 at 1440 px, identical in every run (9/9 observed, 6/6 Lighthouse). The sources (`layout-shift` entries, `clsprobe`):
    - the hero `div.lt-cya__w` grows **212 → 266 px** tall at 390 and **106 → 271 px** at 1440;
    - the body `div.lt-cya__w.lt-cya__body` moves **269 → 377 px** at 390 and **163 → 412 px** at 1440;
    - this happens at 1.07 s (390) and 0.43 s (1440) unthrottled, which is React's commit.
  - The prerendered hero and React's hero are different heights.

**Observed (link-bound) top 5, for completeness:** HPQ A 8.6 s (1 clean), Notes Electricity A 14.6 s (0 clean), Topic Hub A 15.4 s (1 clean), Notes Trigonometry A 11.1 s, Notes Statistics B 10.1 s. These are Notes, Topic Hub and HPQ: the same pages, with the same LCP elements and mechanisms, at about 1 Mbps.

**Landing (not in the top 5, but notable):** the mobile LCP element is the **decorative fingerprint image** `img.lt-landing-bgmark` (`Welcome.tsx:243`: `opacity:.065`, 82vw, 131 KB of brand PNGs), which is almost invisible. On B it costs 0.5 s of FCP→LCP (Lantern 2.0 → 2.6 s).

---

## 5. Ranked fixes for STUDENT-1 (expected gain each)

Gains are Lighthouse-simulated LCP deltas on B (3G) unless stated. They are estimates, ordered by gain × breadth. No pick is made here.

| # | fix | where (evidence) | expected gain |
|---|---|---|---|
| 1 | **Stop preloads competing with the render-blocking CSS.** Drop or defer the route `modulepreload`s from the prerendered HTML, or inline the critical CSS, so first paint does not wait behind ~455 KB of JS | `<link rel="modulepreload">` ×8–9 in each prerendered page's head; FCP = CSS end + 615 ms in 42/42 runs; CSS median 1.1 s observed | FCP and LCP on **every** prerendered page: the CSS alone needs ≈ 0.1 s transfer + 1 RTT at 1.6 Mbps, against 0.5–1.1 s now. **≈ 0.5–1.0 s earlier first paint on B.** This is also the part of field FCP (4.0 s) the lab reproduces |
| 2 | **Keep the prerendered first screen rather than re-create it** (adopt the prerendered nodes or hydrate, or make React's first render node-identical) | `main.tsx` `createRoot` + `App.tsx:206-227` `PrerenderedRouteBody`; LCP entries at commit on Notes, Topic Hub, Exam Trends, CYA, HPQ | LCP → FCP on those pages: **Notes −0.7 to −0.9 s, CYA −1.8 s, Check & Improve n/a, Exam Trends −0.3 s** (Lantern FCP→LCP gaps). It also removes the "dead controls" window (§6) |
| 3 | **Fix the Check Your Answer hero mismatch** (prerendered and React heroes are different heights) | `layout-shift` sources above | **CLS 0.349 → ~0 on phones, 0.898 → ~0 on desktop.** This page fails CLS outright today |
| 4 | **Check & Improve: fetch the route chunk group earlier and KaTeX later** (preload the ~12 route chunks with the entry instead of after it runs; load KaTeX only when maths is shown) | route chunks requested only after the 352 KB entry has run; KaTeX (86 KB) downloads alongside the first screen, LCP within 0.3 s of it | Removing one serial round trip plus 86 KB from a 1.6 Mbps pipe ≈ **0.7 s on B** (estimate); C&I B 5.0 → ≈ 4.3 s |
| 5 | **Shrink the Notes document's first render** (render below-the-fold sections later or use `content-visibility`; 220–242 KB decoded HTML, 3,337–4,979 DOM nodes) | 1.0–1.5 s single task at CPU 4×, 2.8–3.5 s at 6×; TBT 1.1–1.3 s (Lantern A) | **TBT −0.5 to −1 s on A**, and the 4-Oct-profile Notes regression (16–20 s) is most exposed here. Small LCP effect per Lantern |
| 6 | **Make sure no link, ad or share points at `lazytopper.com` or `/app/…`** (canonical `https://www.lazytopper.com/…` only) | 308 hops measured: +160–410 ms here, ≈ 0.9 s per new host at 300 ms RTT | **Up to ~1 s of field TTFB per redirected visit.** Field share unknown (§6) |
| 7 | **Quick Practice CPU:** the first-question render blocks the main thread | TBT 2.1–2.4 s, 1.3 s single tasks at 3–6 Mbps (signed in) | Question 1 at 7.6 s → about 5–6 s if the 1.3 s tasks are split or deferred (estimate) |
| 8 | **Landing LCP image:** stop the near-invisible fingerprint (opacity .065) being the mobile LCP (CSS background, or don't ship it below 1000 px) | `img.lt-landing-bgmark` is the LCP element on mobile | Landing B 2.6 → 2.0 s (Lantern FCP) |
| — | Not worth doing for speed: middleware runtime, cache `Vary` | measured: +15–25 ms; 0 cache fragmentation | — |

---

## 6. Facts not established

1. **Why the prerendered Notes paragraph is never an LCP candidate.** Its rect, opacity and ancestors are normal. Only React's re-created node counts. Mechanism unknown; a Chrome trace of LCP candidate selection is needed.
2. **Which change made Notes slower on the 4-Oct profile** (9.9 → 16–21 s): #926, #949 or #958. Needs the same harness against preview builds of each.
3. **Topic Hub and Exam Trends against 4 Oct.** Too few clean observed runs (0–1), and observed and Lantern disagree.
4. **The composition of the 2.0 s field TTFB.** The lab cannot reproduce it (server 60–550 ms at bom1). How much comes from radio connection setup, redirects (apex/`http`/`/app`), DNS or edge MISSes needs field timing (e.g. Navigation Timing phases in RUM). The 4.6 s network/work split in §2d is an inference.
5. **The region where the Node-runtime middleware executes.** `x-vercel-id` shows a single `bom1` hop. The measured cost is ~20 ms either way.
6. **Why a docs-only deploy renamed every JS chunk** (`b52d46c5`: `index-2SGFpCOD.js` → `index-Dq3mVS-l.js` and all lazy chunks). The old names 404 immediately. Consequences: every returning student re-downloads ~355 KB+ after any merge, docs-only included, and an open tab on the old build loses its lazy chunks (CHUNK-RESILIENCE-1 handles that path). The cause (a build-time value in the entry) was not found in `vite.config.ts`.
7. **"Dead controls" on prerendered first routes.** By code (`App.tsx:206-227`) the prerendered region is plain DOM with no handlers until the route chunk commits. Signed in, I measured no dead window on the hub (≤ 85 ms). Signed out, the window is FCP → route commit (on Notes A observed, about 1.6–9 s). A tap inside it was not exercised signed out.
8. **The Me page title for one fresh account differed between loads** ("Your journey" ×2, "This is where your marks will show up." ×1). Not investigated.
9. `GET /api/user/progress` returns **404** for a new account on every load. Expected behaviour or not is unverified.
10. **The real-device calibration of "CPU 4×".** The host is an i3-1125G4 shared with other agents (31–97% busy).
11. **GA4's cost today.** The harness keeps GA4 off (`navigator.webdriver`). It was +0.8 s FCP on 4 Oct before #926 deferred it, and it was not re-measured.

---

## Appendix A: accounts, AI, side effects
- **One throwaway account**, `lem-scout-muwpv8mzjn7u@example.com`, created through the real sign-up at 13:30:45Z. It was held on "Confirm your email", which app pages treat as signed in.
  - Its password and session lived only in `%TEMP%\lem-secret\` and were never written to the repo or Desktop.
  - **Erased at 13:56:29Z** via `POST /api/account/erase` with the account's own token → **200** `{"ok":true,"complete":false,…}`. `complete:false` is by design (`accountErasure.cjs:601`: the browser-SDK and third-party locations are always listed). The account never opened a tutor session.
  - **Proof:** password sign-in afterwards → **400 `INVALID_LOGIN_CREDENTIALS`**. The secret directory was deleted (verified absent).
- **AI calls caused: 0.** Endpoints hit: `/api/usage/me`, `/api/user/progress`, `/api/cbse-exam-date`, `/api/account/erase`.
- **Beacons:** GA4 was not loaded (webdriver), and Vercel insights `view`/`event` and Google Ads patterns were blocked in-browser in every run.
- **Nothing tracked was edited.** The branch adds only `ops/reports/low-end-remeasure/`.

## Appendix B: raw data in this folder
`main.json` (117 observed runs), `bold.json` (4-Oct profile), `rerun.json` (stall re-runs before the effective-link finding stopped them), `lh.json` (Lighthouse rows), `lh-summary.json`, `lhsplit.json` + `lhsplit-summary.json` (network/work split), `signedin.json`, `qphub.json`, `ttfb.json` (curl phases), `ua-fragmentation.json`, `account-erasure.json`.
- Every row carries `shaBefore`/`shaAfter`, `hostCpuPct` and (observed) the full request list.
- The public Firebase web key that appears in request URLs is redacted as `REDACTED`.
- The harness scripts are in the Desktop copy's folder (`Desktop\diff\low-end-remeasure\harness\`).
