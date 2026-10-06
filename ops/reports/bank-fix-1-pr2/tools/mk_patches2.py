"""decisions2.json + mechanical sets -> patches2.json (apply.py format) + withholds2.json."""
import json, sys, collections, re
F = '/tmp/claude-0/-home-user-Lazytopper-Production/6630b33a-ac3b-56af-992f-ac80dde5a3d3/scratchpad/fix/'
A = '/tmp/claude-0/-home-user-Lazytopper-Production/6630b33a-ac3b-56af-992f-ac80dde5a3d3/scratchpad/a/'
d = json.load(open(F + 'decisions2.json'))
fin = d['final']
items = {i['id']: i for i in json.load(open(F + 'pr2_items.json'))}
base = json.load(open(F + 'base2b.json'))
raw = {r['id']: r for r in base['raw']}
pred = {r['id']: r for r in base['predM'] + base['predS']}
hpqrows = {}
for bk in base['hpq']:
    for q in bk.get('questions') or []: hpqrows[q['id']] = q
ra = {r['id']: r for r in json.load(open(A + 'rows.json'))}
mech = json.load(open(F + 'pr2_mech_sets.json'))

def runtime(i):
    return raw.get(i) or pred.get(i) or hpqrows.get(i)

def file_of(i):
    if i in items: return items[i]['file']
    loc = (ra.get(i) or {}).get('_loc') or ''
    if loc: return loc.split(':')[0]
    if i in pred:
        return 'lazytopper/src/data/predictedQuestions.ts' if any(r['id'] == i for r in base['predM']) else 'lazytopper/src/data/predictedQuestionsScience.ts'
    raise KeyError(i)

patches = {}
def add(i, fields, why, override=False):
    p = patches.setdefault(i, {'id': i, 'file': file_of(i), 'fields': {}, 'old': {}, 'override': False, 'why': []})
    rr = runtime(i)
    for k, v in fields.items():
        p['fields'][k] = v
        p['old'][k] = rr.get(k) if rr else None
    p['override'] = p['override'] or override
    p['why'].append(why)

AR_OPTS = ['Both A and R are true, and R is the correct explanation of A.',
           'Both A and R are true, but R is not the correct explanation of A.',
           'A is true, R is false.', 'A is false, R is true.']
def ar_index(ans):
    a = (ans or '').lower()
    if re.search(r'assertion is false|a is false', a): return 3
    if re.search(r'reason is false|r is false', a): return 2
    if re.search(r'not (the )?correct explanation|not explain', a): return 1
    if re.search(r'correct explanation', a): return 0
    raise ValueError(ans)

EXTRA_WITHHOLD = {'REP2-046': 'out-of-syllabus'}  # double fertilisation: not in the Class 10 syllabus; LT-authored, no natural repair
for i, r in EXTRA_WITHHOLD.items():
    fin[i] = {'verdict': 'withhold', 'reason': r, 'fields': {}, 'surface': 'bank', 'source': 'lane', 'rationale': 'double fertilisation is Class 12 content'}

override = set(d['override']) | set(d['unconfirmed'])
for i, v in fin.items():
    if v['verdict'] == 'fix' and v['surface'] != 'promptD':
        add(i, v['fields'], v['source'], override=i in override)

# mechanical 1: objective items are 1-mark Section A
for i in json.load(open(F + 'mech_obj.json')):
    if i in fin and fin[i]['verdict'] == 'withhold': continue
    rr = runtime(i)
    f = {'marks': 1, 'section': 'A'}
    if rr and 'cbseFormat' in rr: f['cbseFormat'] = 'A'
    add(i, {k: v for k, v in f.items() if rr.get(k) != v}, 'mech:objective-1-mark')
# mechanical 2: option-less Assertion-Reason rows get the standard four options
for i in mech['noopt_ar']:
    rr = runtime(i)
    k = ar_index(rr.get('answer') or rr.get('finalAnswer'))
    f = {'options': AR_OPTS, 'answer': AR_OPTS[k], 'marks': 1, 'section': 'A'}
    if 'finalAnswer' in rr: f['finalAnswer'] = AR_OPTS[k]
    if 'cbseFormat' in rr: f['cbseFormat'] = 'A'
    add(i, {kk: vv for kk, vv in f.items() if rr.get(kk) != vv}, 'mech:ar-options')
# mechanical 3: format follows marks
for i, fmt in {'AP2-019': 'Short', 'CC2-051': 'Short', 'REP2-047': 'Short', 'MNM2-024': 'Short', 'MNM2-046': 'Short', 'PL2-038': 'Short',
               'CFPQ-S-CARB-017': 'Case-Based', 'CFPQ-S-LIFE-012': 'Case-Based', 'CFPQ-S-LIFE-015': 'Case-Based'}.items():
    if i in fin and fin[i]['verdict'] == 'withhold': continue
    add(i, {'format': fmt}, 'mech:format-follows-marks')
# unconfirmed-year rows with no other change still move to Others
for i in sorted(override):
    if not (i in fin and fin[i]['verdict'] == 'withhold'):
        add(i, {}, 'override:unconfirmed-source', override=True)

for p in patches.values():
    p['fields'] = {k: v for k, v in p['fields'].items()}
P = [p for p in patches.values() if p['fields'] or p['override']]
W = {i: {'reason': v['reason'], 'source': v['source'], 'rationale': v['rationale'], 'surface': v['surface']} for i, v in fin.items() if v['verdict'] == 'withhold'}
json.dump(P, open(F + 'patches2.json', 'w'), ensure_ascii=False, indent=1)
json.dump(W, open(F + 'withholds2.json', 'w'), ensure_ascii=False, indent=1)
print('patches', len(P), 'override', sum(p['override'] for p in P), 'withholds', len(W))
print(collections.Counter(p['file'].split('/')[-1] for p in P).most_common(8))
print(collections.Counter(w['surface'] for w in W.values()))
