/**
 * UI-E2E-3 — a SIGNED-IN trial student taps Pay on /board-pass and Razorpay's checkout OPENS on the
 * server's order, and nothing is paid: the order reply is recorded here (the client's contract in
 * services/checkout.ts: `{ orderId, keyId, amountPaise, gst? }`), and Razorpay's checkout.js is a
 * stub that only records the options it was opened with. No money moves, no real order exists.
 *
 * The order's amount is read off the Pay button the page shows, so the test follows the price on any
 * date (founding price until 30 Nov 2026, list price after) without hardcoding either.
 *
 * Runs ONLY in the `e2e-desktop-signed-in` project (see signed-in.smoke.spec.ts for how to run it).
 */
import { expect, signInThroughLogin, test } from "./support/signedIn";

/** Razorpay stand-in: records each checkout's options and open() calls on window for the test to read. */
const RAZORPAY_RECORDING_STUB = `window.__uiE2eRzp=[];window.Razorpay=function UiE2eRazorpayRecorder(o){var r={options:o,opened:false};window.__uiE2eRzp.push(r);this.open=function(){r.opened=true;};this.on=function(){};};`;

const KNOWN_UNRECORDED_API = new Set([
  "GET /api/user/progress",
  "POST /api/pay/guest/claim",
  "GET /api/packs/mine",
  "GET /api/usage/me",
]);

interface RzpRecord {
  options: { key?: string; order_id?: string; amount?: number; currency?: string };
  opened: boolean;
}

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "e2e-desktop-signed-in", "signed-in spec: e2e-desktop-signed-in project only");
});

test("signed in: /board-pass Pay opens Razorpay on the server's order, unpaid", async ({ page, student, net, pageErrors }) => {
  await page.route("https://checkout.razorpay.com/v1/checkout.js", (route) =>
    route.fulfill({ contentType: "text/javascript", body: RAZORPAY_RECORDING_STUB }),
  );

  let shownRupees = 0;
  const orderCalls: Array<{ path: string; auth: boolean; body: unknown }> = [];
  await page.route(
    (url) => /^\/api\/pay\/(?:order|guest\/order)$/.test(url.pathname),
    async (route) => {
      const req = route.request();
      orderCalls.push({
        path: new URL(req.url()).pathname,
        auth: /^Bearer\s+\S+/.test(req.headers()["authorization"] ?? ""),
        body: req.postDataJSON(),
      });
      const baseInr = Math.round(shownRupees / 1.18);
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          orderId: "order_uiE2eUnpaid01",
          keyId: "rzp_test_uiE2e",
          amountPaise: shownRupees * 100,
          gst: { baseInr, gstInr: shownRupees - baseInr, totalInr: shownRupees },
        }),
      });
    },
  );

  // `/api/pay/status` serves two questions, both answered with the route's own shapes:
  //   { offer: true }  -> components/pricing/useMonthPassAvailable.ts asks on page load whether the month pass is sold
  //                       (`{ monthPassAvailable }`); it is not sold any more, so false.
  //   { orderId }      -> PAY-STATUS-1 (services/checkout.ts checkPayStatus) after Razorpay opens: `pending`, i.e. UNPAID.
  const statusAsked: Array<Record<string, unknown>> = [];
  await page.route(
    (url) => url.pathname === "/api/pay/status",
    (route) => {
      const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
      statusAsked.push(body);
      const reply = body.offer === true ? { ok: true, monthPassAvailable: false } : { ok: true, state: "pending" };
      return route.fulfill({ contentType: "application/json", body: JSON.stringify(reply) });
    },
  );

  await test.step("sign in", async () => {
    await signInThroughLogin(page, student);
  });

  const pay = page.getByRole("button", { name: /^Pay ₹[\d,]+\b/ }).first();
  await test.step("open /board-pass and read the price on Pay", async () => {
    await page.goto("/board-pass");
    await expect(pay).toBeVisible({ timeout: 15_000 });
    shownRupees = Number(/₹([\d,]+)/.exec(await pay.innerText())?.[1]?.replace(/,/g, "") ?? 0);
    expect(shownRupees, "the Pay button shows a rupee amount").toBeGreaterThan(0);
  });

  await test.step("tap Pay: Razorpay opens on the server's order, and nothing is paid", async () => {
    await pay.click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __uiE2eRzp?: unknown[] }).__uiE2eRzp?.length ?? 0), { timeout: 15_000 }).toBe(1);
    const [rzp] = await page.evaluate(() => (window as unknown as { __uiE2eRzp: RzpRecord[] }).__uiE2eRzp);
    expect(rzp.opened, "checkout.open() was called").toBe(true);
    expect(rzp.options.order_id).toBe("order_uiE2eUnpaid01");
    expect(rzp.options.key).toBe("rzp_test_uiE2e");
    expect(rzp.options.amount).toBe(shownRupees * 100);
  });

  // Every order-status question was about THIS order, and the order stayed unpaid: the trial badge is still there.
  for (const asked of statusAsked) {
    if (asked.offer !== true) expect(asked.orderId).toBe("order_uiE2eUnpaid01");
  }
  await expect(page.getByText("7d trial").first()).toBeVisible();

  // ONE order, made by the signed-in student (Bearer token), for the Board Pass.
  expect(orderCalls.map((c) => c.path)).toEqual(["/api/pay/order"]);
  expect(orderCalls[0].auth, "the order request carries the student's Bearer token").toBe(true);
  const unexpected = [...new Set(net.unmockedApi)].filter((call) => !KNOWN_UNRECORDED_API.has(call));
  expect(unexpected, "an /api call this suite has not been told about").toEqual([]);
  expect(pageErrors.errors).toEqual([]);
});
