/**
 * ACTIVITY-DETAIL-1 — the page-name allowlist (activityPages.ts), F1 + D4.
 *
 * Pins: (1) client and server allowlists cannot drift; (2) the chapter / legal lists
 * cannot drift from the app's own registries; (3) EVERY route in App.tsx is classified
 * — a new route turns this file red until it is given a page name (or none); (4) no id,
 * token, uid, email or query string can ever become part of a page name; (5) the "~" map
 * key encoding round-trips over a strict charset.
 *
 * Clock-free: nothing here reads a time.
 */
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ACTIVITY_LEGAL_SLUGS,
  ACTIVITY_PAGE_KEYS,
  ACTIVITY_PAGE_NAMES,
  ACTIVITY_SUBJECTS,
  ACTIVITY_TOPIC_SLUGS,
  decodePageKey,
  encodePageKey,
  pageKeyOf,
  pageNameOf,
} from "./activityPages";
import { normalisePath } from "../analytics/analytics";
import { allDesktopTopics } from "../lib/desktop/topics";
import { LEGAL_SLUGS } from "../pages/legalSlugs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const requireCjs = createRequire(import.meta.url);
const server = requireCjs("../../server/routes/studentActivity.cjs") as {
  ACTIVITY_PAGE_NAMES: readonly string[];
  ACTIVITY_PAGE_KEYS: readonly string[];
  ACTIVITY_TOPIC_SLUGS: readonly string[];
  isPageKey: (k: unknown) => boolean;
};

describe("the client and server page allowlists cannot drift", () => {
  it("★ client ACTIVITY_PAGE_NAMES === server ACTIVITY_PAGE_NAMES (same order)", () => {
    expect([...ACTIVITY_PAGE_NAMES]).toEqual([...server.ACTIVITY_PAGE_NAMES]);
    expect([...ACTIVITY_PAGE_KEYS]).toEqual([...server.ACTIVITY_PAGE_KEYS]);
  });

  it("★ the chapter list is EXACTLY the app's topic registry (src/lib/desktop/topics.ts)", () => {
    expect([...ACTIVITY_TOPIC_SLUGS]).toEqual(allDesktopTopics().map((t) => t.slug));
    expect([...server.ACTIVITY_TOPIC_SLUGS]).toEqual(allDesktopTopics().map((t) => t.slug));
  });

  it("★ the legal list is EXACTLY LEGAL_SLUGS", () => {
    expect([...ACTIVITY_LEGAL_SLUGS]).toEqual([...LEGAL_SLUGS]);
  });

  it("no chapter slug collides with a subject, 'other', or a static sub-page", () => {
    for (const s of ACTIVITY_TOPIC_SLUGS) {
      expect([...ACTIVITY_SUBJECTS, "other", "worksheets"]).not.toContain(s);
    }
    expect(new Set(ACTIVITY_PAGE_NAMES).size).toBe(ACTIVITY_PAGE_NAMES.length);
  });

  it("every key the client can produce is one the server accepts", () => {
    for (const k of ACTIVITY_PAGE_KEYS) expect(server.isPageKey(k)).toBe(true);
  });
});

describe("the map-key encoding", () => {
  it("★ every name round-trips, and every key uses only [a-z0-9-~] (no '/' or '.')", () => {
    for (const name of ACTIVITY_PAGE_NAMES) {
      const key = encodePageKey(name);
      expect(key).toMatch(/^[a-z0-9-]+(~[a-z0-9-]+)*$/);
      expect(decodePageKey(key)).toBe(name);
    }
  });
});

/**
 * ★★ EVERY ROUTE PATTERN IN App.tsx, with a real example path and the page name it must
 * record (null = no page name; the section is still counted, as before). A route added
 * to App.tsx that is not in this table turns the test below red.
 */
const ROUTES: Record<string, Array<[string, string | null]>> = {
  "/": [["/", "home"]],
  "/welcome": [["/welcome", "welcome"]],
  "/browse": [["/browse", "browse"]],
  "/login": [["/login", null]],
  "/login/*": [["/login/finish?oobCode=SECRET", null]],
  "/sign-up": [["/sign-up", null]],
  "/sign-up/*": [["/sign-up/verify", null]],
  "/legal/:slug": [["/legal/privacy", "legal/privacy"], ["/legal/refunds", "legal/other"]],
  "/pricing": [["/pricing", "pricing"], ["/pricing/", "pricing"]],
  "/cbse/class-10": [["/cbse/class-10", "cbse/class-10"]],
  // SEO-5 PR-3 — the public answer-writing guide. Records no page name (null): naming it
  // would need the server's drift-tested page list (server/** is out of that lane's scope).
  "/check-your-answer": [["/check-your-answer", null]],
  "/admin/funnel": [["/admin/funnel", null]],
  "/admin/diagram-compare": [["/admin/diagram-compare", null]],
  "/admin/diagram-quality": [["/admin/diagram-quality", null]],
  "/admin/visual-audit": [["/admin/visual-audit", null]],
  "/admin/cache-stats": [["/admin/cache-stats", null]],
  "/admin/difficulty-breakdown": [["/admin/difficulty-breakdown", null]],
  "/admin/question-reports": [["/admin/question-reports", null]],
  "/admin/students": [["/admin/students", null]],
  "/teacher": [["/teacher", "teacher"]],
  "/onboarding": [["/onboarding", "onboarding"]],
  "/topic-hub/:grade/:subject": [["/topic-hub/10/Maths", "topic-hub/maths"], ["/topic-hub/10/Physics", "topic-hub/other"]],
  "/topic-hub/:grade/:subject/:topicKey": [
    ["/topic-hub/10/Science/electricity?concept=Ohm", "topic-hub/electricity"],
    ["/topic-hub/10/Maths/Real%20Numbers", "topic-hub/real-numbers"],
    ["/topic-hub/10/Maths/Ab3dEf9GhIjKlMnOpQrStUvWxYz1", "topic-hub/other"],
  ],
  "/topic-hub": [["/topic-hub", "topic-hub"]],
  "/mock-paper/:slug": [["/mock-paper/sample-paper-2026", "mock-paper/other"]],
  "/topic-mock/:grade/:subject/:topicKey": [["/topic-mock/10/Maths/triangles", null]],
  "/chapter-test/:grade/:subject/:topicKey": [["/chapter-test/10/Maths/triangles", "chapter-test/triangles"]],
  "/full-mock/:grade/:subject": [["/full-mock/10/Science", "full-mock/science"]],
  "/tutor/:grade/:subject/:topicKey": [["/tutor/10/Maths/trigonometry?concept=x", "tutor/trigonometry"]],
  "/tutor/:grade/:subject": [["/tutor/10/Maths", "tutor/maths"]],
  "/mock-builder/:grade/:subject": [["/mock-builder/10/Maths", null]],
  "/mock-builder": [["/mock-builder", null]],
  "/highly-probable/:grade/:subject": [["/highly-probable/10/Maths", "highly-probable/maths"]],
  "/highly-probable": [["/highly-probable", "highly-probable"]],
  "/exam-simulation": [["/exam-simulation", "exam-simulation"]],
  "/practice/:grade/:subject": [["/practice/10/Maths?topic=real-numbers", "practice/maths"], ["/practice/worksheets/x", "practice/other"]],
  "/ai-mentor/:grade/:subject": [["/ai-mentor/10/Maths", null]],
  "/ai-mentor": [["/ai-mentor", null]],
  "/mentor/:grade/:subject": [["/mentor/10/Maths", null]],
  "/mentor": [["/mentor", null]],
  "/weak-area-practice": [["/weak-area-practice", "weak-area-practice"]],
  "/profile": [["/profile", null]],
  "/intent": [["/intent", "intent"]],
  "/practice-hub": [["/practice-hub", "practice-hub"]],
  "/practice/worksheets/ready": [["/practice/worksheets/ready", "practice/worksheets/ready"]],
  "/practice/worksheets": [["/practice/worksheets", "practice/worksheets"]],
  "/check-improve": [["/check-improve", "check-improve"]],
  "/exam-trends": [["/exam-trends", "exam-trends"]],
  "/topic-hub/:topicName": [["/topic-hub/quadratic-equations", "topic-hub/quadratic-equations"], ["/topic-hub/x", "topic-hub/other"]],
  "/notes/:topicSlug": [["/notes/trigonometry", "notes/trigonometry"], ["/notes/ohms-law", "notes/other"]],
  "/me": [["/me", "me"]],
  "/u/:token": [["/u/3f9a0c1b2d4e5f60718293a4b5c6d7e8", null]],
  "*": [["/something-new", null], ["/me/extra", null], ["/notes/a/b", null]],
};

describe("★★ P7 — every App.tsx route is classified", () => {
  const appSrc = readFileSync(path.join(HERE, "..", "App.tsx"), "utf8");
  const patterns = [...new Set([...appSrc.matchAll(/\bpath="([^"]+)"/g)].map((m) => m[1]))];

  it("CONTROL: the App.tsx scan finds the route table", () => {
    expect(patterns.length).toBeGreaterThan(40);
    expect(patterns).toContain("/notes/:topicSlug");
  });

  it("★ every route pattern in App.tsx has a row here (a new route turns this red)", () => {
    expect(patterns.filter((p) => !(p in ROUTES))).toEqual([]);
  });

  for (const [pattern, cases] of Object.entries(ROUTES)) {
    for (const [example, expected] of cases) {
      it(`${pattern}: ${example} -> ${expected}`, () => {
        // Exactly what analytics.ts trackPageview hands the recorder: normalisePath output.
        const routed = normalisePath(example.split("?")[0]);
        expect(pageNameOf(normalisePath(example))).toBe(expected);
        expect(pageNameOf(routed)).toBe(expected);
        const key = pageKeyOf(normalisePath(example));
        expect(key).toBe(expected === null ? null : encodePageKey(expected));
        if (key !== null) expect(ACTIVITY_PAGE_KEYS).toContain(key);
      });
    }
  }
});

describe("★★ no id, token, uid, email or query string ever becomes a page name", () => {
  const SECRETS = [
    "Ab3dEf9GhIjKlMnOpQrStUvWxYz1", // a Firebase uid
    "3f9a0c1b2d4e5f60718293a4b5c6d7e8", // a capability token
    "student@example.com",
    "attempt_9f8e7d",
    "sess-123456",
  ];
  it("a secret in ANY param position collapses to 'other' or to no page", () => {
    for (const s of SECRETS) {
      for (const p of [
        `/notes/${s}`,
        `/topic-hub/${s}`,
        `/topic-hub/10/${s}`,
        `/topic-hub/10/Maths/${s}`,
        `/chapter-test/10/Maths/${s}`,
        `/full-mock/10/${s}`,
        `/tutor/10/Maths/${s}`,
        `/practice/10/${s}`,
        `/legal/${s}`,
        `/mock-paper/${s}`,
        `/u/${s}`,
        `/me/${s}`,
        `/${s}`,
      ]) {
        const key = pageKeyOf(normalisePath(p));
        if (key !== null) {
          expect(ACTIVITY_PAGE_KEYS).toContain(key);
          expect(key.toLowerCase()).not.toContain(s.toLowerCase().slice(0, 8));
        }
      }
    }
  });

  it("a query string or hash never reaches a page name", () => {
    expect(pageKeyOf(normalisePath("/notes/trigonometry?oobCode=SECRET#x"))).toBe("notes~trigonometry");
    expect(pageKeyOf("/notes/trigonometry?oobCode=SECRET")).toBe("notes~trigonometry");
  });

  it("every key is drawn from the allowlist — exhaustively over generated paths", () => {
    const segs = ["", "10", "Maths", "trigonometry", "x", "%E0%A4", "a.b", "worksheets", "ready", "class-10"];
    const prefixes = ["notes", "topic-hub", "chapter-test", "tutor", "full-mock", "practice", "highly-probable", "legal", "cbse", "me"];
    for (const p of prefixes)
      for (const a of segs)
        for (const b of segs)
          for (const c of segs) {
            const key = pageKeyOf(`/${[p, a, b, c].filter(Boolean).join("/")}`);
            if (key !== null) expect(server.isPageKey(key)).toBe(true);
          }
  });
});
