/**
 * NO-REFUND-UNIFORM-1 (owner, 2 Nov 2026, restated 3 Nov): LazyTopper gives no refunds, ever.
 * No buyer-readable source may promise one or use the retired policy names. The URL `/legal/refund`
 * and the `refund` slug are unchanged (registered with Razorpay and Google), so only PHRASES are
 * banned, not the word "refund" itself. Internal identifiers (cbqTutorTaste.refund, packCredit
 * 'refunded' flag, refundedAt) are not matched by these phrases.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

const BANNED: RegExp[] = [
  /we will refund/i,
  /refund the amount/i,
  /refund requests/i,
  /Cancellation (?:&|&amp;|and) Refunds?/i,
  /Refund Policy/,
  /non-refundable/i,
  /not refunded/i,
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const f = resolve(dir, name);
    if (statSync(f).isDirectory()) walk(f, out);
    else out.push(f);
  }
  return out;
}

describe("NO-REFUND-UNIFORM-1 — no refund promise in buyer-readable sources", () => {
  const root = process.cwd();
  const rel = (f: string) => relative(root, f).split(sep).join("/");
  const files = [
    ...walk(resolve(root, "src/pages")),
    ...walk(resolve(root, "src/components")),
    ...walk(resolve(root, "public")),
    ...walk(resolve(root, "server")).filter((f) => /email|mail|nudge|receipt/i.test(f)),
  ].filter((f) => /\.(ts|tsx|cjs|js|txt|xml|html|json)$/.test(f) && !/\.(test|spec)\./.test(f));

  it("the walk is real", () => {
    const rels = files.map(rel);
    expect(rels).toContain("src/pages/LegalPage.tsx");
    expect(rels).toContain("public/llms.txt");
    expect(rels).toContain("src/components/ux/PublicLegalFooter.tsx");
  });

  it("no source carries a refund promise or a retired policy name", () => {
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const re of BANNED) {
        const m = re.exec(text);
        if (m) hits.push(`${rel(file)}: "${text.slice(Math.max(0, m.index - 30), m.index + 40)}" (${re})`);
      }
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });

  it("the policy page states the one rule", () => {
    const text = readFileSync(resolve(root, "src/pages/LegalPage.tsx"), "utf8");
    expect(text).toContain("All payments are final. LazyTopper does not give refunds.");
    expect(text).not.toMatch(/sort it out[\s\S]{0,40}refund/i);
  });
});
