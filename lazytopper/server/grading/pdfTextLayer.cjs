'use strict';
// server/grading/pdfTextLayer.cjs — the TEXT LAYER of a typed PDF, with no new dependency
// (GRADER-CORE-1 PR-3, C10). Node's zlib is the only decoder used.
//
// WHY. Question detection read a typed question paper through the model's eyes and lost
// symbols: the owner's paper prints "2x² − 7x + 3 = 0" and "(2, −3)" (U+2212) in its text
// layer, and detection returned "2x² 7x + 3 = 0" and "(2, 3)". A typed PDF already carries
// the exact characters; this module reads them so detection can copy instead of transcribe.
//
// SCOPE (deliberately small, fails CLOSED to "no text layer"): unencrypted PDFs; FlateDecode
// or unfiltered content streams; object streams (PDF 1.5+, e.g. Word exports); fonts with a
// ToUnicode CMap (bfchar / bfrange, 1- or 2-byte codes) or simple 8-bit fonts (WinAnsi).
// Anything it cannot decode — a scanned page, an encrypted file, an unknown filter, a font
// with no usable mapping — yields no text for that part, never invented text. Bounded:
// inputs over MAX_PDF_BYTES and more than MAX_STREAMS decoded streams are not read.

const zlib = require('zlib');

const MAX_PDF_BYTES = 12 * 1024 * 1024;
const MAX_STREAMS = 600;
const MAX_INFLATED_BYTES = 8 * 1024 * 1024;

// cp1252 code points for 0x80–0x9F (the rest of WinAnsi is Latin-1).
const CP1252 = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02c6,
  0x89: 0x2030, 0x8a: 0x0160, 0x8b: 0x2039, 0x8c: 0x0152, 0x8e: 0x017d, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201c,
  0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02dc, 0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a,
  0x9c: 0x0153, 0x9e: 0x017e, 0x9f: 0x0178,
};

function winAnsi(code) {
  if (code >= 0x80 && code <= 0x9f) return CP1252[code] ? String.fromCodePoint(CP1252[code]) : '';
  return String.fromCharCode(code);
}

function utf16beHex(hex) {
  const h = hex.length % 4 === 0 ? hex : hex.padStart(Math.ceil(hex.length / 4) * 4, '0');
  const units = [];
  for (let i = 0; i < h.length; i += 4) units.push(parseInt(h.slice(i, i + 4), 16));
  return String.fromCharCode(...units);
}

/* ── objects ─────────────────────────────────────────────────────────────── */

function parseObjects(buf, s) {
  const objects = new Map(); // num -> { dict, stream: Buffer|null }
  const re = /(\d+)\s+(\d+)\s+obj\b/g;
  let m;
  while ((m = re.exec(s))) {
    const num = Number(m[1]);
    const start = m.index + m[0].length;
    const end = s.indexOf('endobj', start);
    if (end < 0) break;
    const body = s.slice(start, end);
    const si = body.search(/\bstream\r?\n/);
    let dict = body;
    let stream = null;
    if (si >= 0) {
      dict = body.slice(0, si);
      const nl = body.indexOf('\n', si) + 1;
      const absStart = start + nl;
      const lenM = dict.match(/\/Length\s+(\d+)(?!\s+\d+\s+R)/);
      let absEnd = lenM ? absStart + Number(lenM[1]) : -1;
      if (!(absEnd > absStart && absEnd <= end)) {
        const es = s.lastIndexOf('endstream', end);
        absEnd = es > absStart ? es : absStart;
        while (absEnd > absStart && (s[absEnd - 1] === '\n' || s[absEnd - 1] === '\r')) absEnd -= 1;
      }
      stream = buf.subarray(absStart, absEnd);
    }
    objects.set(num, { dict, stream });
    re.lastIndex = end + 6;
  }
  return objects;
}

function ascii85(buf) {
  const s = buf.toString('latin1').replace(/\s+/g, '');
  const end = s.indexOf('~>');
  const body = (end >= 0 ? s.slice(0, end) : s).replace(/^<~/, '');
  const out = [];
  let group = [];
  for (const ch of body) {
    if (ch === 'z' && group.length === 0) { out.push(0, 0, 0, 0); continue; }
    const v = ch.charCodeAt(0) - 33;
    if (v < 0 || v > 84) throw new Error('bad ascii85');
    group.push(v);
    if (group.length === 5) {
      let n = 0;
      for (const g of group) n = n * 85 + g;
      out.push((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
      group = [];
    }
  }
  if (group.length) {
    const k = group.length;
    while (group.length < 5) group.push(84);
    let n = 0;
    for (const g of group) n = n * 85 + g;
    const bytes = [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
    out.push(...bytes.slice(0, k - 1));
  }
  return Buffer.from(out);
}

function asciiHex(buf) {
  let hex = buf.toString('latin1').replace(/\s+/g, '').replace(/>.*$/, '');
  if (hex.length % 2) hex += '0';
  return Buffer.from(hex, 'hex');
}

function makeDecoder(budget) {
  return function decode(obj) {
    if (!obj || !obj.stream) return null;
    if (budget.streams >= MAX_STREAMS) return null;
    budget.streams += 1;
    const filterSpec = (obj.dict.match(/\/Filter\s*(\[[^\]]*\]|\/\w+)/) || [])[1] || '';
    const filters = [...filterSpec.matchAll(/\/(\w+)/g)].map((m) => m[1]);
    let data = obj.stream;
    try {
      for (const f of filters) {
        if (f === 'FlateDecode' || f === 'Fl') {
          try { data = zlib.inflateSync(data, { maxOutputLength: MAX_INFLATED_BYTES }); } catch { data = zlib.inflateRawSync(data, { maxOutputLength: MAX_INFLATED_BYTES }); }
        } else if (f === 'ASCII85Decode' || f === 'A85') data = ascii85(data);
        else if (f === 'ASCIIHexDecode' || f === 'AHx') data = asciiHex(data);
        else return null; // an image codec or anything else: not text (fail closed)
      }
    } catch {
      return null;
    }
    budget.inflated += data.length;
    return budget.inflated > MAX_INFLATED_BYTES * 4 ? null : data;
  };
}

function expandObjectStreams(objects, decode) {
  for (const [, obj] of [...objects]) {
    if (!/\/Type\s*\/ObjStm\b/.test(obj.dict)) continue;
    const data = decode(obj);
    if (!data) continue;
    const n = Number((obj.dict.match(/\/N\s+(\d+)/) || [])[1]);
    const first = Number((obj.dict.match(/\/First\s+(\d+)/) || [])[1]);
    if (!(n > 0) || !(first >= 0)) continue;
    const text = data.toString('latin1');
    const head = text.slice(0, first).trim().split(/\s+/).map(Number);
    for (let i = 0; i < n; i += 1) {
      const num = head[2 * i];
      const off = head[2 * i + 1];
      const next = i + 1 < n ? head[2 * (i + 1) + 1] : text.length - first;
      if (!Number.isFinite(num) || !Number.isFinite(off)) continue;
      if (!objects.has(num)) objects.set(num, { dict: text.slice(first + off, first + next), stream: null });
    }
  }
}

const refOf = (v) => { const m = String(v || '').match(/^\s*(\d+)\s+\d+\s+R/); return m ? Number(m[1]) : null; };

/** The value text after `/Key` in a dict (a ref, a <<…>> dict, an […] array or a token). */
function dictValue(dict, key) {
  const i = dict.search(new RegExp('/' + key + '(?![A-Za-z0-9])'));
  if (i < 0) return null;
  let j = i + key.length + 1;
  while (j < dict.length && /\s/.test(dict[j])) j += 1;
  if (dict.startsWith('<<', j)) {
    let depth = 0;
    for (let k = j; k < dict.length - 1; k += 1) {
      if (dict.startsWith('<<', k)) { depth += 1; k += 1; } else if (dict.startsWith('>>', k)) { depth -= 1; k += 1; if (depth === 0) return dict.slice(j, k + 1); }
    }
    return null;
  }
  if (dict[j] === '[') { const e = dict.indexOf(']', j); return e > 0 ? dict.slice(j, e + 1) : null; }
  const ref = dict.slice(j).match(/^(\d+\s+\d+\s+R)/);
  if (ref) return ref[1];
  const tok = dict.slice(j).match(/^([^\s/<>[\]()]+|\/[^\s/<>[\]()]+)/);
  return tok ? tok[1] : null;
}

/* ── fonts ───────────────────────────────────────────────────────────────── */

function parseCMap(text) {
  const map = new Map();
  let bytes = 1;
  const cs = text.match(/begincodespacerange\s*<([0-9A-Fa-f]+)>/);
  if (cs) bytes = Math.max(1, Math.ceil(cs[1].length / 2));
  for (const block of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const m of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>/g)) map.set(parseInt(m[1], 16), utf16beHex(m[2]));
  }
  for (const block of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const m of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(\[[^\]]*\]|<[0-9A-Fa-f]*>)/g)) {
      const lo = parseInt(m[1], 16);
      const hi = parseInt(m[2], 16);
      if (hi - lo > 65535) continue;
      if (m[3].startsWith('[')) {
        const items = [...m[3].matchAll(/<([0-9A-Fa-f]*)>/g)].map((x) => x[1]);
        for (let c = lo; c <= hi && c - lo < items.length; c += 1) map.set(c, utf16beHex(items[c - lo]));
      } else {
        const base = m[3].slice(1, -1);
        const baseStr = utf16beHex(base);
        const lastCode = baseStr.charCodeAt(baseStr.length - 1);
        for (let c = lo; c <= hi; c += 1) map.set(c, baseStr.slice(0, -1) + String.fromCharCode(lastCode + (c - lo)));
      }
    }
  }
  return { map, bytes };
}

function loadFont(objects, decode, fontDict) {
  const subtype = (fontDict.match(/\/Subtype\s*\/(\w+)/) || [])[1] || '';
  const twoByte = subtype === 'Type0' || /\/Identity-H|\/Identity-V/.test(fontDict);
  const tu = refOf(dictValue(fontDict, 'ToUnicode'));
  if (tu !== null) {
    const data = decode(objects.get(tu));
    if (data) {
      const cm = parseCMap(data.toString('latin1'));
      return { map: cm.map, bytes: twoByte ? 2 : cm.bytes, simple: !twoByte };
    }
  }
  if (twoByte) return { map: null, bytes: 2, simple: false }; // no mapping → undecodable (fail closed)
  return { map: null, bytes: 1, simple: true };
}

function decodeString(bytes, font) {
  if (!font) return '';
  let out = '';
  const step = font.bytes === 2 ? 2 : 1;
  for (let i = 0; i + step - 1 < bytes.length; i += step) {
    const code = step === 2 ? (bytes[i] << 8) | bytes[i + 1] : bytes[i];
    if (font.map && font.map.has(code)) out += font.map.get(code);
    else if (font.simple) out += winAnsi(code);
  }
  return out;
}

/* ── content streams ─────────────────────────────────────────────────────── */

function tokenize(buf) {
  const s = buf.toString('latin1');
  const toks = [];
  let i = 0;
  const n = s.length;
  while (i < n) {
    const c = s[i];
    if (/\s/.test(c)) { i += 1; continue; }
    if (c === '%') { while (i < n && s[i] !== '\n' && s[i] !== '\r') i += 1; continue; }
    if (c === '(') {
      let depth = 1;
      i += 1;
      const bytes = [];
      while (i < n && depth > 0) {
        const ch = s[i];
        if (ch === '\\') {
          const nx = s[i + 1];
          const esc = { n: 10, r: 13, t: 9, b: 8, f: 12, '(': 40, ')': 41, '\\': 92 };
          if (nx in esc) { bytes.push(esc[nx]); i += 2; continue; }
          if (/[0-7]/.test(nx)) { const oct = s.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)[0]; bytes.push(parseInt(oct, 8) & 255); i += 1 + oct.length; continue; }
          if (nx === '\n' || nx === '\r') { i += 2; if (nx === '\r' && s[i] === '\n') i += 1; continue; }
          i += 1;
          continue;
        }
        if (ch === '(') depth += 1;
        else if (ch === ')') { depth -= 1; if (depth === 0) { i += 1; break; } }
        bytes.push(ch.charCodeAt(0) & 255);
        i += 1;
      }
      toks.push({ t: 'str', v: Buffer.from(bytes) });
      continue;
    }
    if (c === '<' && s[i + 1] !== '<') {
      const e = s.indexOf('>', i);
      if (e < 0) break;
      let hex = s.slice(i + 1, e).replace(/\s+/g, '');
      if (hex.length % 2) hex += '0';
      toks.push({ t: 'str', v: Buffer.from(hex, 'hex') });
      i = e + 1;
      continue;
    }
    if (c === '<' || c === '>') { i += 2; toks.push({ t: 'op', v: c === '<' ? '<<' : '>>' }); continue; }
    if (c === '[' || c === ']') { toks.push({ t: c }); i += 1; continue; }
    if (c === '/') { let j = i + 1; while (j < n && !/[\s/<>[\]()%]/.test(s[j])) j += 1; toks.push({ t: 'name', v: s.slice(i + 1, j) }); i = j; continue; }
    let j = i;
    while (j < n && !/[\s/<>[\]()%]/.test(s[j])) j += 1;
    if (j === i) { i += 1; continue; }
    const w = s.slice(i, j);
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(w)) toks.push({ t: 'num', v: Number(w) });
    else toks.push({ t: 'op', v: w });
    i = j;
  }
  return toks;
}

function pageText(content, fonts) {
  const toks = tokenize(content);
  const lines = [];
  let line = '';
  let font = null;
  let y = null;
  const stack = [];
  const newline = () => { if (line.trim()) lines.push(line.replace(/\s+/g, ' ').trim()); line = ''; };
  const moveTo = (ny) => { if (y !== null && Math.abs(ny - y) > 1) newline(); y = ny; };
  for (let k = 0; k < toks.length; k += 1) {
    const tk = toks[k];
    if (tk.t === 'op') {
      const op = tk.v;
      if (op === 'Tf') { const nm = stack[stack.length - 2]; font = nm && nm.t === 'name' ? fonts.get(nm.v) || null : null; }
      else if (op === 'Td' || op === 'TD') {
        const ty = stack[stack.length - 1]; const tx = stack[stack.length - 2];
        if (ty && ty.t === 'num' && ty.v !== 0) moveTo((y || 0) + ty.v);
        else if (tx && tx.t === 'num' && tx.v > 0 && line && !/\s$/.test(line)) line += ' ';
      } else if (op === 'Tm') { const f = stack[stack.length - 1]; if (f && f.t === 'num') moveTo(f.v); }
      else if (op === 'T*') newline();
      else if (op === 'Tj' || op === "'" || op === '"') {
        if (op !== 'Tj') newline();
        const st = stack[stack.length - 1];
        if (st && st.t === 'str') line += decodeString(st.v, font);
      } else if (op === 'TJ') {
        const arr = stack.length ? stack[stack.length - 1] : null;
        if (arr && arr.t === 'arr') {
          for (const it of arr.v) {
            if (it.t === 'str') line += decodeString(it.v, font);
            else if (it.t === 'num' && it.v < -200 && line && !/\s$/.test(line)) line += ' ';
          }
        }
      } else if (op === 'ET') { /* keep y: the next BT's Tm decides */ }
      stack.length = 0;
      continue;
    }
    if (tk.t === '[') {
      const arr = [];
      k += 1;
      while (k < toks.length && toks[k].t !== ']') { arr.push(toks[k]); k += 1; }
      stack.push({ t: 'arr', v: arr });
      continue;
    }
    stack.push(tk);
  }
  newline();
  return lines;
}

/* ── pages ───────────────────────────────────────────────────────────────── */

function resolveDict(objects, v) {
  if (!v) return null;
  const r = refOf(v);
  if (r !== null) { const o = objects.get(r); return o ? o.dict : null; }
  return v;
}

function collectPages(objects) {
  const root = [...objects.values()].find((o) => /\/Type\s*\/Catalog\b/.test(o.dict));
  const out = [];
  const seen = new Set();
  const walk = (num, inherited) => {
    if (num === null || seen.has(num) || out.length > 500) return;
    seen.add(num);
    const o = objects.get(num);
    if (!o) return;
    const res = dictValue(o.dict, 'Resources') || inherited;
    if (/\/Type\s*\/Pages\b/.test(o.dict)) {
      const kids = dictValue(o.dict, 'Kids') || '';
      for (const m of kids.matchAll(/(\d+)\s+\d+\s+R/g)) walk(Number(m[1]), res);
    } else if (/\/Type\s*\/Page\b/.test(o.dict)) {
      out.push({ dict: o.dict, resources: res });
    }
  };
  if (root) walk(refOf(dictValue(root.dict, 'Pages')), null);
  if (out.length === 0) for (const o of objects.values()) if (/\/Type\s*\/Page\b/.test(o.dict)) out.push({ dict: o.dict, resources: dictValue(o.dict, 'Resources') });
  return out;
}

/**
 * The text layer of a PDF, page by page, or null when there is none it can read.
 * @param {Buffer|string} input  the PDF bytes (or their base64)
 * @returns {{ pages: string[][], text: string }|null}
 */
function extractPdfText(input) {
  let buf;
  try { buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input || ''), 'base64'); } catch { return null; }
  if (!buf || buf.length < 64 || buf.length > MAX_PDF_BYTES) return null;
  const s = buf.toString('latin1');
  if (!s.startsWith('%PDF-')) return null;
  if (/\/Encrypt\s+\d+\s+\d+\s+R|\/Encrypt\s*<</.test(s)) return null;
  try {
    const budget = { streams: 0, inflated: 0 };
    const decode = makeDecoder(budget);
    const objects = parseObjects(buf, s);
    expandObjectStreams(objects, decode);
    const fontCache = new Map();
    const pages = [];
    for (const page of collectPages(objects)) {
      const resources = resolveDict(objects, page.resources) || '';
      const fontDict = resolveDict(objects, dictValue(resources, 'Font')) || '';
      const fonts = new Map();
      for (const m of fontDict.matchAll(/\/([^\s/<>[\]()]+)\s+(\d+)\s+\d+\s+R/g)) {
        const num = Number(m[2]);
        if (!fontCache.has(num)) { const fo = objects.get(num); fontCache.set(num, fo ? loadFont(objects, decode, fo.dict) : null); }
        fonts.set(m[1], fontCache.get(num));
      }
      const contents = dictValue(page.dict, 'Contents') || '';
      const parts = [];
      for (const m of contents.matchAll(/(\d+)\s+\d+\s+R/g)) {
        const data = decode(objects.get(Number(m[1])));
        if (data) parts.push(data);
      }
      pages.push(parts.length ? pageText(Buffer.concat(parts.flatMap((p) => [p, Buffer.from('\n')])), fonts) : []);
    }
    const text = pages.map((ls) => ls.join('\n')).join('\n').trim();
    return text ? { pages, text } : null;
  } catch {
    return null;
  }
}

/**
 * A text layer good enough to copy questions from: enough characters, mostly readable, and
 * something that looks like a numbered question. Otherwise detection ignores it.
 */
function usableQuestionText(layer) {
  if (!layer || typeof layer.text !== 'string') return false;
  const t = layer.text;
  if (t.length < 40) return false;
  const readable = (t.match(/[\p{L}\p{N}\s.,;:()[\]+\-−=×÷/'"?!%°²³√π]/gu) || []).length;
  if (readable / t.length < 0.85) return false;
  return /(^|\n)\s*(Q\s*\.?\s*\d+|\d+\s*[.)])\s*\S/.test(t);
}

module.exports = { extractPdfText, usableQuestionText, parseCMap, tokenize, MAX_PDF_BYTES };
