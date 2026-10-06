"""Aggregate PR-2 decisions -> decisions2.json (patches, withholds, unbinds, overrides, promptD ops, ledger)."""
import json, glob, re, sys, collections
sys.path.insert(0, '/tmp/claude-0/-home-user-Lazytopper-Production/6630b33a-ac3b-56af-992f-ac80dde5a3d3/scratchpad/fix/tools')
import meta
F = '/tmp/claude-0/-home-user-Lazytopper-Production/6630b33a-ac3b-56af-992f-ac80dde5a3d3/scratchpad/fix/'
A = '/tmp/claude-0/-home-user-Lazytopper-Production/6630b33a-ac3b-56af-992f-ac80dde5a3d3/scratchpad/a/'

items = {i['id']: i for i in json.load(open(F + 'pr2_items.json'))}
base = json.load(open(F + 'base2b.json'))
raw = {r['id']: r for r in base['raw']}
served = set(base['served'])
withheld_now = set(base['withheld'])
ra = {r['id']: r for r in json.load(open(A + 'rows.json'))}
ai = {i for i, r in ra.items() if r.get('_ai')}
figbound = set(l.split()[0] for l in open(A + 'figbound.txt') if l.strip())

fx = {}
for f in sorted(glob.glob(F + 'fx2out/b*.json')):
    for it in json.load(open(f)): fx[it['id']] = dict(it, batch=f[-8:-5])
fo = {}
for f in sorted(glob.glob(F + 'fig_out/f*.json')):
    for it in json.load(open(f)): fo[it['id']] = it

CONTENT = {'questionText', 'question', 'options', 'answer', 'finalAnswer', 'solutionSteps', 'explanation', 'assertion', 'reason', 'aROptions', 'correctOption'}
DROP = {'pyqYear', 'pyqSet', 'isPYQ'}  # handled by the source override
log = collections.defaultdict(list)

# ---- policy overrides (decided by the lane, recorded in the report) ----
POLICY_WITHHOLD = {
    # official rows whose first fix rebuilt a missing figure / set-up from memory or "the standard NCERT set-up"
    'PYQ-S-ACID-001': 'figure', 'PYQ-S-2026-ACID-001': 'figure', 'PYQ-S-2026-ACID-012': 'figure',
    'PYQ-M-2024-CIRC-010a': 'figure', 'PYQ-M-CIRC-001': 'figure', 'HERED-EXMPLR-8-LA-002': 'figure',
    # figure re-check answered from memory of the source, not from the figure
    'CTRL-EXMPLR-6-SA-003': 'figure',
}
POLICY_UNBIND = {'CBE-S-CTRL-E-001'}  # bound figure does not match; the fixed text is self-contained

final = {}  # id -> {verdict, reason, fields, surface, source}
for i, it in fx.items():
    v = {'verdict': it['verdict'], 'reason': it.get('withhold_reason'), 'fields': dict(it.get('fields') or {}),
         'surface': it['surface'], 'source': 'fixer:' + it['batch'], 'rationale': it.get('rationale', '')}
    if i in fo:
        g = fo[i]
        v['source'] += '+figure-recheck'
        v['rationale'] = g.get('rationale', '')
        if g['verdict'] == 'keep': v.update(verdict='reject', reason=None, fields={})
        elif g['verdict'] == 'fix': v.update(verdict='fix', reason=None, fields=dict(g.get('fields') or {}))
        else: v.update(verdict='withhold', reason='figure' if 'figure' in (g.get('withhold_reason') or '') or g.get('withhold_reason') == 'missing-data' else g.get('withhold_reason'), fields={})
    if i in POLICY_WITHHOLD:
        v.update(verdict='withhold', reason=POLICY_WITHHOLD[i], fields={}); v['source'] += '+policy'
    final[i] = v

# drop fields that are not runtime fields of the row
for i, v in final.items():
    rr = items[i]['runtime_row']
    for k in list(v['fields']):
        if k in DROP:
            v['fields'].pop(k); log['dropped-pyq-field'].append(i); continue
        if v['surface'] == 'promptD':
            if k not in ('text', 'marks', 'difficulty', 'questionType'):
                v['fields'].pop(k); log['dropped-promptD-field'].append((i, k))
            continue
        if k not in rr and k not in ('options', 'answer', 'finalAnswer', 'solutionSteps', 'explanation', 'requiresDiagram', 'diagramDescription', 'subtopic', 'difficulty'):
            v['fields'].pop(k); log['dropped-nonruntime-field'].append((i, k))
        elif k in rr and rr[k] == v['fields'][k]:
            v['fields'].pop(k)
    if v['verdict'] == 'fix' and not v['fields']:
        v['verdict'] = 'reject'; log['fix-without-change'].append(i)

# withholds only exist for bank rows (promptD gets its own filter)
for i, v in final.items():
    if v['verdict'] == 'withhold' and v['surface'] not in ('bank', 'promptD'):
        log['nonbank-withhold-ignored'].append(i); v['verdict'] = 'reject'

# ---- duplicates ----
dup = []
for f in ('dup/o1.json', 'dup/o2.json'): dup += json.load(open(F + f))
wset = {i for i, v in final.items() if v['verdict'] == 'withhold'} | withheld_now
dup_w = {}
changed = True
pairs = [d for d in dup if d['verdict'] == 'duplicate']
while changed:
    changed = False
    for d in pairs:
        loser, keep = d['withhold'], d['keep']
        if keep in wset or keep in dup_w:
            if loser in dup_w and dup_w[loser]['keep'] == keep:
                dup_w.pop(loser); changed = True
            continue
        if loser not in dup_w and loser not in wset:
            dup_w[loser] = {'keep': keep, 'group': d['group'], 'rationale': d['rationale']}; changed = True
for loser, d in dup_w.items():
    if loser in final and final[loser]['verdict'] == 'fix': log['dup-overrides-fix'].append(loser)
    final[loser] = {'verdict': 'withhold', 'reason': 'duplicate', 'fields': {}, 'surface': 'bank', 'source': 'duplicate:' + d['group'], 'rationale': f"duplicate of {d['keep']}: {d['rationale']}"}

# ---- source override set ----
override = set()
for i, v in final.items():
    if v['surface'] == 'bank' and v['verdict'] == 'fix' and (set(v['fields']) & CONTENT): override.add(i)
unconfirmed = set()
for r in base['raw']:
    if r['id'] in served and (r.get('pyqYear') or r.get('isPYQ')) and r.get('sourceOverride') != 'others':
        loc = (ra.get(r['id']) or {}).get('_loc') or ''
        o = meta.origin('bank', loc.split(':')[0], ai, r['id'])
        if not o.startswith('official('): unconfirmed.add(r['id'])

withholds = {i: v for i, v in final.items() if v['verdict'] == 'withhold'}
fixes = {i: v for i, v in final.items() if v['verdict'] == 'fix'}
unbind = sorted((set(withholds) & figbound) | POLICY_UNBIND)
out = dict(final=final, override=sorted(override), unconfirmed=sorted(unconfirmed - set(withholds)), unbind=unbind,
           dup=dup_w, log={k: v for k, v in log.items()})
json.dump(out, open(F + 'decisions2.json', 'w'), ensure_ascii=False, indent=1)
c = collections.Counter((v['surface'], v['verdict']) for v in final.values())
print(c)
print('withhold reasons', collections.Counter(v['reason'] for v in withholds.values()))
print('override(changed)', len(override), 'unconfirmed-year', len(unconfirmed - set(withholds)), 'union', len((override | unconfirmed) - set(withholds)))
print('unbind', unbind)
print({k: len(v) for k, v in log.items()})
print('nonruntime', log['dropped-nonruntime-field'][:30])
