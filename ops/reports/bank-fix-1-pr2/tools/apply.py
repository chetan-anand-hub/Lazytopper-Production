"""Apply fixer patches to TS source objects. Usage: apply.py ROOT patches.json report.json"""
import json, sys, re
sys.path.insert(0, '/tmp/claude-0/-home-user-Lazytopper-Production/6630b33a-ac3b-56af-992f-ac80dde5a3d3/scratchpad/fix/tools')
from tslit import *
from rowsrc import locate

def val_of(s, vs, ve):
    try: return parse_literal(s[vs:ve])
    except Exception: return Unparsable

def indent_of(s, o, c):
    m = re.search(r'\n([ \t]+)\S', s[o:c])
    return m.group(1) if m else ' '

def set_prop(s, o, c, key, newval, oldval, file_key_alias=None):
    """Return (new_s, how). Replace the prop whose literal == oldval (prefer same key), else insert."""
    P = props(s, o, c)
    exact = [p for p in P if p[0] == (file_key_alias or key) and p[2] is not None]
    cands = [p for p in P if p[2] is not None and oldval is not None and val_of(s, p[2], p[3]) == oldval]
    pick = None
    for p in cands:
        if p[0] == (file_key_alias or key): pick = p
    if pick is None and len(cands) == 1 and (file_key_alias or key) not in [p[0] for p in P]: pick = cands[0]
    if pick is None and exact:
        v = val_of(s, exact[0][2], exact[0][3])
        if v is Unparsable: raise ValueError(f'{key}: source value is an expression, cannot replace mechanically')
        if oldval is None or v == oldval: pick = exact[0]
        else: raise ValueError(f'{key}: source literal != runtime value (derived field?)')
    if pick is not None:
        k, ks, vs, ve = pick
        return s[:vs] + fmt_like(s, vs, ve, newval) + s[ve:], f'replace {k}'
    # insert before closing brace
    j = c - 1
    while s[j] in ' \t\r\n': j -= 1
    sep = '' if s[j] in ',{' else ','
    ind = indent_of(s, o, c)
    multi = '\n' in s[o:c]
    ins = (sep + '\n' + ind + f'{key}: {ts_value(newval)},') if multi else (sep + f' {key}: {ts_value(newval)}')
    return s[:j+1] + ins + s[j+1:], f'insert {key}'

def fmt_like(s, vs, ve, newval):
    """Format newval like the literal it replaces: a multi-line array stays one element per line."""
    old = s[vs:ve]
    if isinstance(newval, list) and '\n' in old and old.lstrip().startswith('['):
        m = re.search(r'\[\s*\n([ \t]*)', old)
        ind = m.group(1) if m else '  '
        close_ind = re.search(r'\n([ \t]*)\]\s*$', old)
        ci = close_ind.group(1) if close_ind else ''
        if not newval: return '[]'
        return '[\n' + ',\n'.join(ind + ts_value(x) for x in newval) + ('\n' + ci + ']')
    return ts_value(newval)

def remove_prop(s, o, c, key):
    for k, ks, vs, ve in props(s, o, c):
        if k == key:
            e = ve
            if e < len(s) and s[e] == ',': e += 1
            # strip the whole line if prop sits alone on a line
            ls = s.rfind('\n', 0, ks) + 1
            if s[ls:ks].strip() == '':
                le = s.find('\n', e)
                if s[e:le].strip() == '': return s[:ls] + s[le+1:], True
            return s[:ks] + s[e:].lstrip(' '), True
    return s, False

FACTORY_FILES = ('trigonometry.pack1.ts',)

def apply(root, patches, report):
    byfile = {}
    for p in patches: byfile.setdefault(p['file'], []).append(p)
    for f, ps in byfile.items():
        path = root + '/' + f
        s = open(path, encoding='utf-8').read()
        for p in ps:
            objs = find_object_local(s, p['id'])
            if len(objs) != 1:
                report.append({'id': p['id'], 'file': f, 'status': 'ERROR', 'msg': f'{len(objs)} objects'}); continue
            o, c = objs[0]
            hows = []
            try:
                fields = dict(p['fields'])
                factory = f.endswith(FACTORY_FILES) and any(k == 'questionId' for k, *_ in props(s, o, c))
                if factory:
                    fields.pop('explanation', None)
                    if 'solutionSteps' in fields:
                        st = list(fields.pop('solutionSteps'))
                        if st and re.match(r'^(Therefore, (boxed final answer|final answers)|Final answer):', st[-1]): st = st[:-1]
                        fields['working'] = st
                for k, v in fields.items():
                    old = p['old'].get(k) if k != 'working' else None
                    s2, how = set_prop(s, o, c, k, v, old)
                    s = s2; hows.append(how)
                    o, c = find_object_local(s, p['id'])[0]
                if p.get('override') and not factory:
                    for k in ('pyqYear', 'pyqSet'):
                        s, rm = remove_prop(s, o, c, k)
                        if rm: hows.append('remove ' + k); o, c = find_object_local(s, p['id'])[0]
                    if 'sourceOverride' not in [k for k, *_ in props(s, o, c)]:
                        s, how = set_prop(s, o, c, 'sourceOverride', 'others', None); hows.append(how)
                report.append({'id': p['id'], 'file': f, 'status': 'ok', 'how': hows})
            except Exception as e:
                report.append({'id': p['id'], 'file': f, 'status': 'ERROR', 'msg': str(e), 'how': hows})
        open(path, 'w', encoding='utf-8').write(s)
    return report
