"""Minimal TS object-literal locator/editor for LazyTopper bank files."""
import re, json

def _skip_str(s, i):
    q = s[i]; i += 1
    while i < len(s):
        c = s[i]
        if c == '\\': i += 2; continue
        if q == '`' and c == '$' and i + 1 < len(s) and s[i+1] == '{':
            depth = 1; i += 2
            while i < len(s) and depth:
                if s[i] in '"\'`': i = _skip_str(s, i); continue
                if s[i] == '{': depth += 1
                elif s[i] == '}': depth -= 1
                i += 1
            continue
        if c == q: return i + 1
        i += 1
    raise ValueError('unterminated string')

def _skip_comment(s, i):
    if s.startswith('//', i):
        j = s.find('\n', i); return len(s) if j < 0 else j
    if s.startswith('/*', i):
        return s.index('*/', i) + 2
    return i

def brace_map(s):
    """Map of '{' index -> matching '}' index, string/comment aware."""
    st, m, i = [], {}, 0
    n = len(s)
    while i < n:
        c = s[i]
        if c in '"\'`': i = _skip_str(s, i); continue
        if c == '/' and i + 1 < n and s[i+1] in '/*':
            # avoid treating regex/division edge cases in data files: data files have no regex
            i = _skip_comment(s, i); continue
        if c in '{[(': st.append((c, i))
        elif c in '}])':
            o, oi = st.pop()
            if o == '{': m[oi] = i
        i += 1
    return m

def find_object(s, rid, bm=None):
    bm = bm or brace_map(s)
    pat = re.compile(r'''(?:(?<![\w$])(?:id|questionId)|["']id["']|["']questionId["'])\s*:\s*(["'`])''' + re.escape(rid) + r'''\1''')
    hits = [mm.start() for mm in pat.finditer(s)]
    objs = []
    for h in hits:
        best = None
        for o, c in bm.items():
            if o < h < c and (best is None or o > best[0]): best = (o, c)
        if best: objs.append(best)
    return objs

def value_end(s, i):
    depth = 0; n = len(s)
    while i < n:
        c = s[i]
        if c in '"\'`': i = _skip_str(s, i); continue
        if c == '/' and i + 1 < n and s[i+1] in '/*': i = _skip_comment(s, i); continue
        if c in '{[(': depth += 1
        elif c in '}])':
            if depth == 0: return i
            depth -= 1
        elif c == ',' and depth == 0: return i
        i += 1
    return i

def _ws(s, i):
    while True:
        j = i
        while j < len(s) and s[j] in ' \t\r\n': j += 1
        k = _skip_comment(s, j)
        if k == j: return j
        i = k

def props(s, o, c):
    out = []; i = o + 1
    while True:
        i = _ws(s, i)
        if i >= c: break
        if s.startswith('...', i):
            e = value_end(s, i); out.append(('...', i, i, e)); i = e + 1; continue
        if s[i] in '"\'':
            e = _skip_str(s, i); key = parse_literal(s[i:e]); ks = i; i = e
        else:
            mm = re.compile(r'[A-Za-z_$][\w$]*').match(s, i)
            if not mm: raise ValueError(f'bad key at {i}: {s[i:i+30]!r}')
            key = mm.group(0); ks = i; i = mm.end()
        i = _ws(s, i)
        if s[i] != ':':  # shorthand
            out.append((key, ks, None, i)); i = value_end(s, i) + 1; continue
        i = _ws(s, i + 1); vs = i; ve = value_end(s, i)
        out.append((key, ks, vs, ve))
        i = ve + 1
    return out

class Unparsable(Exception): pass

def parse_literal(t):
    t = t.strip()
    p = _P(t); v = p.val(); p.ws()
    if p.i != len(t): raise Unparsable(t[:60])
    return v

class _P:
    def __init__(s, t): s.t = t; s.i = 0
    def ws(s):
        while True:
            while s.i < len(s.t) and s.t[s.i] in ' \t\r\n': s.i += 1
            j = _skip_comment(s.t, s.i)
            if j == s.i: return
            s.i = j
    def val(s):
        s.ws(); t = s.t; c = t[s.i] if s.i < len(t) else ''
        if c in '"\'`':
            e = _skip_str(t, s.i); raw = t[s.i+1:e-1]; s.i = e
            if c == '`' and '${' in raw: raise Unparsable('template expr')
            return _unescape(raw, c)
        if c == '[':
            s.i += 1; arr = []
            while True:
                s.ws()
                if t[s.i] == ']': s.i += 1; return arr
                arr.append(s.val()); s.ws()
                if t[s.i] == ',': s.i += 1
        if c == '{':
            s.i += 1; obj = {}
            while True:
                s.ws()
                if t[s.i] == '}': s.i += 1; return obj
                if t[s.i] in '"\'':
                    e = _skip_str(t, s.i); k = _unescape(t[s.i+1:e-1], t[s.i]); s.i = e
                else:
                    mm = re.compile(r'[A-Za-z_$][\w$]*').match(t, s.i)
                    if not mm: raise Unparsable('key')
                    k = mm.group(0); s.i = mm.end()
                s.ws()
                if t[s.i] != ':': raise Unparsable('shorthand')
                s.i += 1; obj[k] = s.val(); s.ws()
                if t[s.i] == ',': s.i += 1
        mm = re.compile(r'-?\d+(\.\d+)?([eE][-+]?\d+)?').match(t, s.i)
        if mm: s.i = mm.end(); x = mm.group(0); return float(x) if ('.' in x or 'e' in x.lower()) else int(x)
        for w, v in (('true', True), ('false', False), ('null', None), ('undefined', None)):
            if t.startswith(w, s.i) and not re.match(r'[\w$]', t[s.i+len(w):s.i+len(w)+1] or ' '):
                s.i += len(w); return v
        raise Unparsable(t[s.i:s.i+40])

def _unescape(raw, q):
    out = []; i = 0
    while i < len(raw):
        c = raw[i]
        if c == '\\' and i + 1 < len(raw):
            n = raw[i+1]
            m = {'n': '\n', 't': '\t', 'r': '\r', 'b': '\b', 'f': '\f', 'v': '\v', '0': '\0', '\\': '\\', "'": "'", '"': '"', '`': '`', '\n': ''}
            if n in m: out.append(m[n]); i += 2; continue
            if n == 'u':
                if raw[i+2] == '{':
                    j = raw.index('}', i); out.append(chr(int(raw[i+3:j], 16))); i = j + 1; continue
                out.append(chr(int(raw[i+2:i+6], 16))); i += 6; continue
            if n == 'x': out.append(chr(int(raw[i+2:i+4], 16))); i += 4; continue
            out.append(n); i += 2; continue
        out.append(c); i += 1
    s = ''.join(out)
    # fold surrogate pairs from 😀 style escapes
    try: s = s.encode('utf-16', 'surrogatepass').decode('utf-16')
    except Exception: pass
    return s

def ts_value(v, indent=''):
    return json.dumps(v, ensure_ascii=False)

def match_close(s, o):
    """Forward string-aware scan from '{' at o to its matching '}'."""
    depth = 0; i = o; n = len(s)
    while i < n:
        c = s[i]
        if c in '"\'`': i = _skip_str(s, i); continue
        if c == '/' and i + 1 < n and s[i+1] in '/*': i = _skip_comment(s, i); continue
        if c in '{[(': depth += 1
        elif c in '}])':
            depth -= 1
            if depth == 0: return i
        i += 1
    return -1

def find_object_local(s, rid):
    pat = re.compile(r'''(?:(?<![\w$])(?:id|questionId)|["']id["']|["']questionId["'])\s*:\s*(["'`])''' + re.escape(rid) + r'''\1''')
    out = []
    for mm in pat.finditer(s):
        h = mm.start(); o = h
        while True:
            o = s.rfind('{', 0, o)
            if o < 0: break
            try: c = match_close(s, o)
            except Exception: c = -1
            if c > h:
                # ensure the id key sits at depth 1 of this object
                ps = props(s, o, c)
                if any(k in ('id', 'questionId') and vs is not None and vs <= mm.end() <= ve + 1 for k, _, vs, ve in ps):
                    out.append((o, c)); break
    return out
