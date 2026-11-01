// TUTOR-KEYS-1 - a small string/comment/template-aware scanner that finds, for a bank row object literal with a
// given string `id`, the position of the closing quote of the LAST string element of its `solutionSteps: [...]`.
// It only ever answers "here is a plain string literal"; anything else (spread, call, concatenation) -> null.

export interface RowSite {
  id: string;
  /** index of the closing quote of the last solutionSteps literal (insert the suffix right before it) */
  insertAt: number;
  /** the raw text of that last literal (between the quotes) */
  rawLast: string;
  stepCount: number;
  /** "steps" = a solutionSteps array; "working" = a builder spec whose steps are working[] + a generated final line */
  via: "steps" | "working";
}

interface Obj { start: number; depth: number; id: string | null; stepsKey: number | null; via: "steps" | "working"; }

export function locateRows(src: string): Map<string, RowSite[]> {
  const out = new Map<string, RowSite[]>();
  const stack: Obj[] = [];
  const n = src.length;
  let i = 0;
  const readString = (q: string, from: number): number => {
    // returns index of the closing quote; for a template literal returns -1 if it has ${ }
    let j = from + 1;
    while (j < n) {
      const c = src[j];
      if (c === "\\") { j += 2; continue; }
      if (q === "`" && c === "$" && src[j + 1] === "{") return -2;
      if (c === q) return j;
      if (c === "\n" && q !== "`") return -1;
      j += 1;
    }
    return -1;
  };
  const skipTrivia = (from: number): number => {
    let j = from;
    for (;;) {
      while (j < n && /\s/.test(src[j])) j += 1;
      if (src.startsWith("//", j)) { while (j < n && src[j] !== "\n") j += 1; continue; }
      if (src.startsWith("/*", j)) { const e = src.indexOf("*/", j + 2); j = e < 0 ? n : e + 2; continue; }
      return j;
    }
  };
  const finishObj = (o: Obj) => {
    if (!o.id || o.stepsKey == null) return;
    // parse `solutionSteps : [ "..." , "..." ]`
    let j = skipTrivia(o.stepsKey);
    if (src[j] !== ":") return;
    j = skipTrivia(j + 1);
    if (src[j] !== "[") return;
    j = skipTrivia(j + 1);
    let last = -1, count = 0;
    let lastStart = -1;
    while (j < n && src[j] !== "]") {
      const q = src[j];
      if (q !== '"' && q !== "'" && q !== "`") return; // non-literal element
      const e = readString(q, j);
      if (e < 0) return;
      lastStart = j; last = e; count += 1;
      j = skipTrivia(e + 1);
      if (src[j] === ",") j = skipTrivia(j + 1);
      else if (src[j] !== "]") return; // concatenation / call
    }
    if (count === 0 || last < 0) return;
    const list = out.get(o.id) ?? [];
    list.push({ id: o.id, insertAt: last, rawLast: src.slice(lastStart + 1, last), stepCount: count, via: o.via });
    out.set(o.id, list);
  };
  // Property-name detection at the object's own level: look back from a literal/identifier start is hard, so we
  // lex tokens and track "identifier followed by :" when the top of stack is an object and bracket depth matches.
  const bracket: string[] = []; // '{' | '[' | '('
  const objAtBracket: (Obj | null)[] = [];
  while (i < n) {
    const c = src[i];
    if (c === "/" && (src[i + 1] === "/" || src[i + 1] === "*")) { i = skipTrivia(i); continue; }
    if (c === '"' || c === "'" || c === "`") {
      // a quoted key ("id": "X") or a value
      const e = readString(c, i);
      if (e === -2) { // template with expressions: skip conservatively to matching backtick
        let j = i + 1, d = 0;
        while (j < n) { const ch = src[j]; if (ch === "\\") { j += 2; continue; } if (ch === "$" && src[j + 1] === "{") { d += 1; j += 2; continue; } if (ch === "}" && d > 0) { d -= 1; j += 1; continue; } if (ch === "`" && d === 0) break; j += 1; }
        i = j + 1; continue;
      }
      if (e < 0) { i += 1; continue; }
      const top = objAtBracket[objAtBracket.length - 1];
      const after = skipTrivia(e + 1);
      if (top && bracket[bracket.length - 1] === "{" && src[after] === ":") {
        const key = src.slice(i + 1, e);
        if ((key === "solutionSteps" || key === "working") && top.stepsKey == null) { top.stepsKey = after; top.via = key === "working" ? "working" : "steps"; }
        if ((key === "id" || key === "questionId") && top.id == null) {
          const v = skipTrivia(after + 1);
          const q2 = src[v];
          if (q2 === '"' || q2 === "'") { const e2 = readString(q2, v); if (e2 > 0) top.id = src.slice(v + 1, e2); }
        }
      }
      i = e + 1; continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < n && /[\w$]/.test(src[j])) j += 1;
      const word = src.slice(i, j);
      const top = objAtBracket[objAtBracket.length - 1];
      if (top && bracket[bracket.length - 1] === "{") {
        const after = skipTrivia(j);
        if (src[after] === ":" && (word === "solutionSteps" || word === "working" || word === "id" || word === "questionId")) {
          if ((word === "solutionSteps" || word === "working") && top.stepsKey == null) { top.stepsKey = after; top.via = word === "working" ? "working" : "steps"; }
          if ((word === "id" || word === "questionId") && top.id == null) {
            const v = skipTrivia(after + 1);
            const q2 = src[v];
            if (q2 === '"' || q2 === "'") { const e2 = readString(q2, v); if (e2 > 0) top.id = src.slice(v + 1, e2); }
          }
        }
      }
      i = j; continue;
    }
    if (c === "{") { const o: Obj = { start: i, depth: bracket.length, id: null, stepsKey: null, via: "steps" }; bracket.push("{"); objAtBracket.push(o); stack.push(o); i += 1; continue; }
    if (c === "[" || c === "(") { bracket.push(c); objAtBracket.push(objAtBracket[objAtBracket.length - 1] ?? null); i += 1; continue; }
    if (c === "}" || c === "]" || c === ")") {
      bracket.pop();
      const o = objAtBracket.pop() ?? null;
      if (c === "}" && o && stack[stack.length - 1] === o) { stack.pop(); finishObj(o); }
      i += 1; continue;
    }
    i += 1;
  }
  return out;
}
