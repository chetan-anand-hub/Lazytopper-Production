/**
 * UI-E2E-2 — a SIGNED-IN student for the real-browser suite, with no real account anywhere.
 *
 * The app is built with tests/e2e/buildEnv.signedIn.json (Phase 1's env plus
 * the emulator flag set to "1"), so services/firebaseClient.ts and services/firestoreSdk.ts
 * point Auth and Firestore at Google's local Firebase emulator on THIS machine. The emulator is
 * started by the CI job (`firebase emulators:exec --only auth,firestore`), never by this file.
 *
 *   - The test student is created through the emulator's REST API: a fresh address and a
 *     random throwaway password made at run time, kept in memory only, gone with the emulator.
 *   - Firestore is seeded through the emulator's admin bypass (`Bearer owner`), so the seed
 *     needs no rule change; every read the PAGE makes still goes through the real firestore.rules.
 *   - The page signs in through the app's own /login email form.
 *   - Our server is never called: support/network.ts answers every /api call from a recorded
 *     fixture or 404s it and records it (`net.unmockedApi`); `routeApi` adds per-test replies.
 *
 * The suite's network stays hermetic (support/network.ts): the ONLY origins added here are
 * the two emulator ports on 127.0.0.1.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BrowserContext, Page } from "@playwright/test";

import { expect, test as base } from "./fixtures";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The same values the app was built with (buildEnv.signedIn.json), so the two cannot drift. */
const BUILD_ENV = JSON.parse(readFileSync(join(HERE, "..", "buildEnv.signedIn.json"), "utf8")) as {
  env: Record<string, string>;
};
export const PROJECT_ID = BUILD_ENV.env.VITE_FIREBASE_PROJECT_ID;
const API_KEY = BUILD_ENV.env.VITE_FIREBASE_API_KEY;

/** Must match the hosts/ports in firebaseClient.ts / firestoreSdk.ts and the CI job. */
export const AUTH_EMULATOR = "http://127.0.0.1:9099";
export const FIRESTORE_EMULATOR = "http://127.0.0.1:8080";
const EMULATOR_ORIGINS = new Set([AUTH_EMULATOR, FIRESTORE_EMULATOR]);

/** The emulators' documented admin credential. It means nothing outside the local emulator. */
const EMULATOR_ADMIN = { authorization: "Bearer owner" };

export interface TestStudent {
  uid: string;
  email: string;
  /** Random, made at run time, held in memory only. */
  password: string;
  firstName: string;
  displayName: string;
}

async function emulatorFetch(url: string, init: { method: string; headers?: Record<string, string>; body?: unknown }) {
  const res = await fetch(url, {
    method: init.method,
    headers: { "content-type": "application/json", ...init.headers },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`ui-e2e emulator: ${init.method} ${url} -> ${res.status} ${text.slice(0, 300)}`);
  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
}

/** Fails fast, by name, when the emulators are not running (run the suite under emulators:exec). */
export async function assertEmulatorsUp(): Promise<void> {
  for (const origin of EMULATOR_ORIGINS) {
    try {
      await fetch(`${origin}/`);
    } catch {
      throw new Error(
        `ui-e2e: no Firebase emulator at ${origin}. Run the signed-in project under ` +
          "`firebase emulators:exec --only auth,firestore` (see .github/workflows/ui-e2e.yml, job ui-e2e-signed-in).",
      );
    }
  }
}

/** A new email/password student in the Auth emulator (email marked verified, as a returning student's is). */
export async function createTestStudent(firstName = "Asha"): Promise<TestStudent> {
  const email = `ui-e2e-${randomUUID()}@example.com`;
  const password = randomBytes(18).toString("base64url");
  const displayName = `${firstName} Tester`;
  const created = await emulatorFetch(`${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: "POST",
    body: { email, password, displayName, returnSecureToken: true },
  });
  const uid = String(created.localId || "");
  if (!uid) throw new Error("ui-e2e emulator: signUp returned no localId");
  await emulatorFetch(`${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`, {
    method: "POST",
    headers: EMULATOR_ADMIN,
    body: { localId: uid, emailVerified: true },
  });
  return { uid, email, password, firstName, displayName };
}

type FsValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { timestampValue: string }
  | { mapValue: { fields: Record<string, FsValue> } }
  | { arrayValue: { values: FsValue[] } };

/** A Firestore Timestamp (what a server write stores), for `seedDoc` fields. */
export class FsTimestamp {
  constructor(readonly date: Date) {}
}

function toFsValue(v: unknown): FsValue {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof FsTimestamp) return { timestampValue: v.date.toISOString() };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFsValue) } };
  if (typeof v === "object") return { mapValue: { fields: toFsFields(v as Record<string, unknown>) } };
  throw new Error(`ui-e2e seed: unsupported value ${String(v)}`);
}

function toFsFields(obj: Record<string, unknown>): Record<string, FsValue> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toFsValue(v)]));
}

/** Write one document in the Firestore emulator, bypassing rules (admin). `path` like "subscriptions/<uid>". */
export async function seedDoc(path: string, data: Record<string, unknown>): Promise<void> {
  await emulatorFetch(`${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`, {
    method: "PATCH",
    headers: EMULATOR_ADMIN,
    body: { fields: toFsFields(data) },
  });
}

/**
 * The minimum seed for a student on a running 7-day trial: the `subscriptions/<uid>` record the
 * app reads at sign-in (subscriptionService.ts loadCloud), in the shape a SERVER-pinned trial
 * start has (a Timestamp `trialStartDate`). Every other doc the signed-in pages read is
 * optional: absent reads as a new student's honest empty state.
 */
export async function seedTrialStudent(student: TestStudent, startedAt = new Date()): Promise<void> {
  await seedDoc(`subscriptions/${student.uid}`, {
    tier: "trial",
    plan: "trial_7day",
    trialStartDate: new FsTimestamp(startedAt),
    premiumSince: null,
    updatedAt: startedAt.toISOString(),
  });
}

/** Let the page reach the two emulator ports (registered after support/network.ts, so it wins). */
export async function allowEmulators(context: BrowserContext): Promise<void> {
  await context.route(
    (url) => EMULATOR_ORIGINS.has(url.origin),
    (route) => route.continue(),
  );
}

/** Recorded `/api` replies for one test, keyed `METHOD /path`. Unlisted calls fall through to support/network.ts. */
export type RecordedApi = Record<string, { status?: number; body: unknown }>;

export async function routeApi(page: Page, recorded: RecordedApi): Promise<void> {
  await page.route(
    (url) => /^\/(?:shared-)?api(?:\/|$)/.test(url.pathname),
    async (route) => {
      const req = route.request();
      const reply = recorded[`${req.method()} ${new URL(req.url()).pathname}`];
      if (!reply) return route.fallback();
      return route.fulfill({
        status: reply.status ?? 200,
        contentType: "application/json",
        body: JSON.stringify(reply.body),
      });
    },
  );
}

/** Sign in through the app's own /login email form, as a returning student would. */
export async function signInThroughLogin(page: Page, student: TestStudent): Promise<void> {
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue with email" }).click();
  // The email step opens on "I'm new here" (create); a returning student picks the other door.
  const returning = page.getByRole("button", { name: "Already have an account", exact: true });
  await returning.click();
  await expect(returning).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('label[for="lt-login-password"]')).toHaveText("Password");
  await page.locator("#lt-login-email").fill(student.email);
  await page.locator("#lt-login-password").fill(student.password);
  await page.locator("#lt-login-password").press("Enter");
  await expect(page).not.toHaveURL(/\/login(?:[/?#]|$)/, { timeout: 20_000 });
}

/** The suite's `test`, plus the emulator ports opened and a fresh trial student per test. */
export const test = base.extend<{ student: TestStudent }>({
  student: async ({ context, net }, provide) => {
    void net; // support/network.ts must be installed FIRST, so allowEmulators' route takes precedence.
    await assertEmulatorsUp();
    await allowEmulators(context);
    const student = await createTestStudent();
    await seedTrialStudent(student);
    await provide(student);
  },
});

export { expect };
