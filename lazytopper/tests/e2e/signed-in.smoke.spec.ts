/**
 * UI-E2E-2 — the signed-in smoke: a test student signs in through the app's own /login form,
 * Home greets them by first name, and Log out returns the browser to the signed-out site.
 *
 * Runs ONLY in the `e2e-desktop-signed-in` project (playwright.config.ts): a build made with
 * tests/e2e/buildEnv.signedIn.json and the Firebase Auth + Firestore emulators running. How to
 * run it locally (Linux; Java 21):
 *
 *   set -a; . <(node -e 'for (const [k,v] of Object.entries(require("./tests/e2e/buildEnv.signedIn.json").env)) console.log(k+"="+v)'); set +a
 *   pnpm run build
 *   # then, from the repo root, with a firebase.json naming the two emulators (the CI job writes one):
 *   pnpm exec firebase emulators:exec --config <that file> --only auth,firestore --project ui-e2e-hermetic \
 *     "pnpm --filter lazytopper exec playwright test --project=e2e-desktop-signed-in"
 *
 * The student exists only in the emulator (support/signedIn.ts). Our server is never called.
 */
import { expect, signInThroughLogin, test } from "./support/signedIn";

/**
 * The `/api` calls a signed-in trial student's sign-in and Home make (UI-E2E-2 P7, read from the
 * call sites and observed in this build). None has a recorded production reply yet, so each is
 * answered 404 by support/network.ts and the page takes its own honest failure path (nothing
 * owned, nothing restored). A call NOT in this list fails the test by name: a new server call on
 * Home is a change this suite must be told about.
 *   GET  /api/user/progress    services/dbSyncService.ts restoreFromDB (AuthContext sign-in hydration)
 *   POST /api/pay/guest/claim  services/guestPay.ts claimOncePerSession (verified-email account, CHECKOUT-WHO-1)
 *   GET  /api/packs/mine       services/packs.ts fetchMyPacks (owned packs; Home / shell)
 */
const KNOWN_UNRECORDED_API = new Set(["GET /api/user/progress", "POST /api/pay/guest/claim", "GET /api/packs/mine"]);

test.beforeEach(({}, testInfo) => {
  // tests/e2e is also the e2e-mobile/-desktop projects' testDir; this spec needs the emulator build.
  test.skip(testInfo.project.name !== "e2e-desktop-signed-in", "signed-in spec: e2e-desktop-signed-in project only");
});

test("sign in -> Home shows the student's first name -> log out", async ({ page, student, net, pageErrors }) => {
  await test.step("sign in through /login (email + password)", async () => {
    await signInThroughLogin(page, student);
  });

  await test.step("Home greets the student by first name", async () => {
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(new RegExp(`^Good (morning|afternoon|evening), ${student.firstName}$`))).toBeVisible({
      timeout: 15_000,
    });
  });

  await test.step("log out from the account menu", async () => {
    // A NEW account's Home opens Byte's "What do you want to do today?" picker as a modal overlay
    // (StartHereCard, data-testid start-here-focus) over the header. Esc is its "not now".
    const focusOverlay = page.getByTestId("start-here-focus");
    if (await focusOverlay.waitFor({ state: "visible", timeout: 5_000 }).then(() => true, () => false)) {
      await page.keyboard.press("Escape");
      await expect(focusOverlay).toBeHidden();
    }
    await page.getByRole("button", { name: "Open account menu" }).click();
    await page.getByRole("menu", { name: "Account menu" }).getByRole("menuitem", { name: "Log out" }).click();
    await expect(page.getByRole("button", { name: "Open account menu" })).toHaveCount(0, { timeout: 15_000 });
  });

  await test.step("signed out, and still signed out after a reload", async () => {
    await page.reload();
    await expect(page.locator("main").getByRole("link", { name: "Check my answer", exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: "Open account menu" })).toHaveCount(0);
  });

  const unexpected = [...new Set(net.unmockedApi)].filter((call) => !KNOWN_UNRECORDED_API.has(call));
  expect(unexpected, "an /api call this suite has not been told about").toEqual([]);
  expect(pageErrors.errors).toEqual([]);
});
