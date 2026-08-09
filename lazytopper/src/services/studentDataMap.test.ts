/**
 * studentDataMap.test — the DRIFT GUARD.
 *
 * ★★ A data map written once is wrong within a month, and the erasure built on it then
 * reports success while leaving a child's data behind. So this suite does not trust the
 * map: it RE-DERIVES the collection set from the source tree on every run and fails if
 * the two disagree in either direction.
 *
 * ★ Every enumeration here carries a CONTROL. An absence claim from a scanner nobody
 * proved can fire is indistinguishable from a dead scanner, so each scan first proves it
 * finds something known to exist before its "nothing else found" is believed.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  STUDENT_DATA_MAP,
  adminOnlyLocations,
  unreachableLocations,
  firestoreCollectionNames,
  subcollectionsOf,
} from "./studentDataMap";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LAZYTOPPER = path.resolve(HERE, "..", ".."); // lazytopper/
const REPO = path.resolve(LAZYTOPPER, ".."); // repo root
const RULES = path.join(REPO, "firestore.rules");

function walk(dir: string, exts: readonly string[]): string[] {
  let out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry === "dist" || entry === ".git") continue;
    const full = path.join(dir, entry);
    let s;
    try {
      s = statSync(full);
    } catch {
      continue;
    }
    if (s.isDirectory()) out = out.concat(walk(full, exts));
    else if (exts.some((e) => entry.endsWith(e)) && !/\.test\./.test(entry)) out.push(full);
  }
  return out;
}

/**
 * Scan the product for Firestore top-level collection names.
 *
 * ★ Two forms must both be caught, and the second is the one a naive scan misses:
 *   doc(firestoreDb, "learnerProfiles", uid)     — a literal
 *   doc(firestoreDb, FIRESTORE_COLLECTION, uid)  — a CONSTANT
 * `subscriptions` and `qrUploadSlots` are reachable ONLY through the constant form, so a
 * literal-only scan silently under-reports by two collections — including the one holding
 * the child's entitlement.
 */
/**
 * ★ PURE. The scan is split from the file-walking on purpose.
 *
 * A parser that is only ever run over the real tree can be shown to ACCEPT something,
 * never to REJECT it — every "nothing else found" result is then unfalsifiable. Keeping
 * the text scan pure lets `collectionsInTexts` be driven with fixtures below, so the
 * guard's blind spots are demonstrated rather than assumed.
 */
function collectionsInTexts(texts: readonly string[]): Set<string> {
  const found = new Set<string>();
  const constants = new Map<string, string>();

  for (const text of texts) {
    // Resolve `const X = 'name';` so constant-named collections are not missed.
    for (const m of text.matchAll(
      /const\s+([A-Z][A-Z0-9_]*)\s*=\s*['"]([a-zA-Z][a-zA-Z0-9]*)['"]/g
    )) {
      constants.set(m[1], m[2]);
    }

    // Web SDK: collection(db, "name" | CONST, ...)
    //
    // ★ `\s*!?\s*` is load-bearing and was ADDED by USERS-1. `firestoreDb` is nullable, so
    // `doc(firestoreDb!, "x", uid)` is a legal and natural way to write a call site — and
    // the previous pattern required a comma immediately after the identifier, so the
    // non-null-assertion form slipped through the whole guard unseen. Found by a mutation
    // that was expected to go red and did not. No product call site uses that form today
    // (all 34 use the truthiness-guard style), so nothing was actually being missed — but
    // the next one written that way would have been invisible to the drift guard whose
    // entire promise is that no collection is missed.
    for (const m of text.matchAll(
      /(?:collection|doc)\(\s*(?:firestoreDb|db|firestore)\s*!?\s*,\s*(?:["'`]([a-zA-Z][a-zA-Z0-9]*)["'`]|([A-Z][A-Z0-9_]*))/g
    )) {
      if (m[1]) found.add(m[1]);
      else if (m[2] && constants.has(m[2])) found.add(constants.get(m[2])!);
    }

    // Admin SDK: adminFirestore.collection('name' | CONST)
    for (const m of text.matchAll(
      /\.collection\(\s*(?:['"`]([a-zA-Z][a-zA-Z0-9]*)['"`]|([A-Z][A-Z0-9_]*))\s*\)/g
    )) {
      if (m[1]) found.add(m[1]);
      else if (m[2] && constants.has(m[2])) found.add(constants.get(m[2])!);
    }
  }
  return found;
}

function scanCollectionsFromSource(): Set<string> {
  const files = [
    ...walk(path.join(LAZYTOPPER, "src", "services"), [".ts"]),
    ...walk(path.join(LAZYTOPPER, "server"), [".cjs"]),
  ];
  return collectionsInTexts(files.map((f) => readFileSync(f, "utf8")));
}

/** Every `match /<name>/{uid}` block declared in firestore.rules. */
function scanCollectionsFromRules(): Set<string> {
  const text = readFileSync(RULES, "utf8");
  const found = new Set<string>();
  for (const m of text.matchAll(/match\s+\/([a-zA-Z][a-zA-Z0-9]*)\/\{uid\}/g)) found.add(m[1]);
  return found;
}

describe("studentDataMap — the source scanner, driven by FIXTURES", () => {
  // ★★ Run against the real tree the scanner can only ever be shown to ACCEPT. These
  // fixtures are the only place it can be shown to REJECT, and the only place its blind
  // spots are recorded as facts instead of assumptions.

  it("★ catches the literal form", () => {
    expect([...collectionsInTexts([`doc(firestoreDb, "alpha", uid)`])]).toEqual(["alpha"]);
  });

  it("★ catches the CONSTANT form, resolving the constant", () => {
    const text = `const FIRESTORE_COLLECTION = "beta";\ndoc(firestoreDb, FIRESTORE_COLLECTION, uid)`;
    expect([...collectionsInTexts([text])]).toEqual(["beta"]);
  });

  it("★★ catches the NON-NULL-ASSERTION form — the hole USERS-1 closed", () => {
    // `firestoreDb` is nullable, so this is a legal call site. Before USERS-1 the pattern
    // demanded a comma directly after the identifier and this returned an EMPTY set, so a
    // collection written this way was invisible to the entire drift guard. A mutation that
    // failed to go red is what exposed it.
    expect([...collectionsInTexts([`doc(firestoreDb!, "gamma", uid)`])]).toEqual(["gamma"]);
    expect([...collectionsInTexts([`collection(db !, "delta")`])]).toEqual(["delta"]);
  });

  it("★ catches the Admin-SDK .collection() form", () => {
    expect([...collectionsInTexts([`adminFirestore.collection('epsilon')`])]).toEqual(["epsilon"]);
  });

  it("★★ REJECTS things that are not a top-level collection reference", () => {
    // Without a demonstrated rejection, "found nothing" is indistinguishable from a dead
    // scanner matching everything or nothing.
    expect([...collectionsInTexts([`const users = getUsers();`])]).toEqual([]);
    expect([...collectionsInTexts([`someOtherApi(firestoreDb, "zeta", uid)`])]).toEqual([]);
    expect([...collectionsInTexts([`doc(notTheDb, "eta", uid)`])]).toEqual([]);
    // An UNRESOLVED constant must not be invented as a collection name.
    expect([...collectionsInTexts([`doc(firestoreDb, UNKNOWN_CONST, uid)`])]).toEqual([]);
  });

  it("★ resolves constants across files, and finds every collection in a batch", () => {
    const found = collectionsInTexts([
      `const COLLECTION = "theta";`,
      `doc(firestoreDb, "iota", uid); adminDb.collection(COLLECTION);`,
    ]);
    expect([...found].sort()).toEqual(["iota", "theta"]);
  });
});

describe("studentDataMap — the scanners are alive (CONTROL)", () => {
  it("★ CONTROL: the source scan finds collections that certainly exist", () => {
    const found = scanCollectionsFromSource();
    // If these ever stop appearing, the scanner has died and every "no new collection"
    // result below is vacuous.
    expect(found.has("learnerProfiles")).toBe(true);
    expect(found.has("sessionRecords")).toBe(true);
    expect(found.size).toBeGreaterThanOrEqual(10);
  });

  it("★ CONTROL: the source scan resolves CONSTANT-named collections, not just literals", () => {
    const found = scanCollectionsFromSource();
    // `subscriptions` appears only as `doc(firestoreDb, FIRESTORE_COLLECTION, uid)` and
    // `qrUploadSlots` only as `.collection(COLLECTION)`. A literal-only scan misses both.
    expect(found.has("subscriptions")).toBe(true);
    expect(found.has("qrUploadSlots")).toBe(true);
  });

  it("★ CONTROL: the rules scan finds declared collections", () => {
    const declared = scanCollectionsFromRules();
    expect(declared.has("subscriptions")).toBe(true);
    expect(declared.size).toBeGreaterThanOrEqual(10);
  });
});

describe("studentDataMap — drift guard", () => {
  it("★★ every collection in the SOURCE is present in the map", () => {
    const found = scanCollectionsFromSource();
    const mapped = new Set(firestoreCollectionNames());
    const missing = [...found].filter((c) => !mapped.has(c)).sort();
    expect(
      missing,
      `Collection(s) exist in the product but are NOT in STUDENT_DATA_MAP: ${missing.join(", ")}. ` +
        `Any erasure built on this map would silently leave them behind — add them.`
    ).toEqual([]);
  });

  it("★★ every collection declared in firestore.rules is present in the map", () => {
    const declared = scanCollectionsFromRules();
    const mapped = new Set(firestoreCollectionNames());
    const missing = [...declared].filter((c) => !mapped.has(c)).sort();
    expect(missing, `Declared in firestore.rules but absent from the map: ${missing.join(", ")}`).toEqual(
      []
    );
  });

  it("★ records the collections firestore.rules does NOT declare", () => {
    const found = scanCollectionsFromSource();
    const declared = scanCollectionsFromRules();
    const undeclared = [...found].filter((c) => !declared.has(c)).sort();
    // `qrUploadSlots` falls through to the deny-all `match /{document=**}` catch-all, so
    // it is not erasable from a browser. If this set changes, the erasure architecture
    // changes.
    //
    // ★★ THIS WAS `["qrUploadSlots", "users"]` UNTIL USERS-1, and the assertion is still
    // EXACT (toEqual, not "contains") on purpose. `users` left this set because USERS-1
    // deleted the product's only `users` write — NOT because the collection became
    // declared or safe. Two consequences, both intended:
    //   1. Re-introducing a `users` write anywhere under src/services or server/ puts
    //      "users" back into `found`, and this assertion goes RED. That is the guard that
    //      keeps the identity sink closed.
    //   2. Anything else undeclared appearing here also goes RED — the general drift
    //      property is unchanged.
    // Do NOT relax this to a subset check to make a future write pass.
    expect(undeclared).toEqual(["qrUploadSlots"]);
  });

  it("★★ the map still declares `users` even though no code writes it (OWNER RULING)", () => {
    // ★★ READ BEFORE DELETING THIS TEST OR THE MAP ENTRY IT PINS.
    //
    // USERS-1 removed the product's only write to `users/{uid}`. The obvious follow-on —
    // "so drop it from the map" — is the ONE move that could make a future erasure lie
    // about its coverage: the COMMITTED firestore.rules are not the DEPLOYED rules, and
    // an erasure that never sweeps the path cannot discover it was wrong. Erasing a path
    // that was never written is a harmless no-op; failing to erase one that was is not.
    //
    // So the map deliberately holds a location no current code touches, and this test
    // exists so that is a decision rather than an oversight a later agent quietly undoes.
    const users = STUDENT_DATA_MAP.find((l) => l.id === "users");
    expect(users, "the `users` entry was removed from STUDENT_DATA_MAP — see this test").toBeDefined();
    expect(users!.path).toBe("users/{uid}");
    // Undeclared in rules => a browser delete is refused => the erasure needs the Admin SDK.
    expect(users!.mechanism).toBe("admin-sdk-required");
    // The notes must keep explaining WHY a write-less path stays mapped.
    expect(users!.notes).toMatch(/KEPT LISTED DELIBERATELY/);

    // CONTROL: `users` really is absent from the product source now, so the assertions
    // above are pinning the write-removed state and not silently passing on the old one.
    expect(scanCollectionsFromSource().has("users")).toBe(false);
  });
});

describe("studentDataMap — per-location properties", () => {
  // ★★ PER-LOCATION, not one blanket assertion. A single "everything is mapped" check
  // passes while a collection is missing — which is exactly how this fails in production.
  const REQUIRED_IDS = [
    "auth-account",
    "users",
    "learnerProfiles",
    "learnerProfiles.sessions",
    "learnerProfiles.sessions.messages",
    "learnerProfiles.mistakeLogs",
    "learnerProfiles.savedWorksheets",
    "learnerProfiles.worksheetActivity",
    "sessionRecords",
    "sessionRecords.records",
    "sessionRecords.perQuestion",
    "sessionRecords.fullMockPapers",
    "practiceInsights",
    "practiceInsights.attempts",
    "mockScoreHistory",
    "mockScoreHistory.entries",
    "weakAreaSummary",
    "topicMastery",
    "learnerProgress",
    "srSchedules",
    "learningPaths",
    "dashboardPrefs",
    "tutorSessions",
    "tutorSessions.topics",
    "subscriptions",
    "qrUploadSlots",
    "storage.qr-uploads",
    "local-storage",
    "third-party.gemini",
  ] as const;

  for (const id of REQUIRED_IDS) {
    it(`★ maps location: ${id}`, () => {
      const loc = STUDENT_DATA_MAP.find((l) => l.id === id);
      expect(loc, `${id} is missing from STUDENT_DATA_MAP`).toBeDefined();
      expect(loc!.path.length).toBeGreaterThan(0);
      expect(loc!.holds.length).toBeGreaterThan(0);
    });
  }

  it("location ids are unique", () => {
    const ids = STUDENT_DATA_MAP.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("★ every subcollection names a parent that exists — Firestore does not cascade", () => {
    const ids = new Set(STUDENT_DATA_MAP.map((l) => l.id));
    for (const loc of STUDENT_DATA_MAP) {
      if (loc.kind === "firestore-subcollection") {
        expect(loc.parentId, `${loc.id} has no parentId`).toBeDefined();
        expect(ids.has(loc.parentId!), `${loc.id} parent ${loc.parentId} missing`).toBe(true);
      }
    }
  });

  it("★ the deep tutor-message subcollection is reachable through its parent chain", () => {
    // Two levels deep: a one-level delete strands these.
    const sessions = subcollectionsOf("learnerProfiles").map((l) => l.id);
    expect(sessions).toContain("learnerProfiles.sessions");
    const messages = subcollectionsOf("learnerProfiles.sessions").map((l) => l.id);
    expect(messages).toContain("learnerProfiles.sessions.messages");
  });
});

describe("studentDataMap — erasure architecture facts", () => {
  it("★★ subscriptions is admin-only because firestore.rules REFUSES client delete", () => {
    const rules = readFileSync(RULES, "utf8");
    // The literal rule that forces an admin-credential erasure path.
    expect(rules).toContain("allow delete: if false;");
    const subs = STUDENT_DATA_MAP.find((l) => l.id === "subscriptions")!;
    expect(subs.mechanism).toBe("admin-sdk-required");
  });

  it("★★ the handwriting images are mapped and admin-only", () => {
    const storage = STUDENT_DATA_MAP.find((l) => l.id === "storage.qr-uploads")!;
    expect(storage.kind).toBe("storage-prefix");
    expect(storage.mechanism).toBe("admin-sdk-required");
    // The path really is what the server writes.
    const channel = readFileSync(
      path.join(LAZYTOPPER, "server", "services", "qrUploadChannel.cjs"),
      "utf8"
    );
    expect(channel).toContain("const STORAGE_PREFIX = 'qr-uploads'");
    expect(storage.path.startsWith("qr-uploads/")).toBe(true);
  });

  it("★ qrUploadSlots is keyed by a uid FIELD, so erasure must QUERY not get-by-id", () => {
    const channel = readFileSync(
      path.join(LAZYTOPPER, "server", "services", "qrUploadChannel.cjs"),
      "utf8"
    );
    expect(channel).toContain("where('uid', '==', uid)");
    const slots = STUDENT_DATA_MAP.find((l) => l.id === "qrUploadSlots")!;
    expect(slots.notes).toMatch(/FIELD/);
  });

  it("★★ at least one location is provably unreachable from a browser", () => {
    const adminOnly = adminOnlyLocations().map((l) => l.id);
    // Each of these individually forces the server path.
    expect(adminOnly).toContain("subscriptions");
    expect(adminOnly).toContain("qrUploadSlots");
    expect(adminOnly).toContain("storage.qr-uploads");
    expect(adminOnly).toContain("users");
    expect(adminOnly).toContain("auth-account");
  });

  it("★★ the map names what CANNOT be deleted, so an export can disclose it", () => {
    const unreachable = unreachableLocations();
    expect(unreachable.length).toBeGreaterThan(0);
    expect(unreachable.map((l) => l.id)).toContain("third-party.gemini");
    // Not exportable and not deletable — the export must say so rather than omit it.
    expect(unreachable.every((l) => l.exportable === false)).toBe(true);
  });

  it("★ localStorage is client-local — a server-only erasure cannot reach the device", () => {
    const ls = STUDENT_DATA_MAP.find((l) => l.id === "local-storage")!;
    expect(ls.mechanism).toBe("client-local");
  });
});
