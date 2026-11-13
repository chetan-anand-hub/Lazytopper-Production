/**
 * GST-INVOICE-BACKDATE-1 - /invoice-details: the signed-out state form. No state is suggested, the answer is validated
 * like the checkout's (state + 6-digit PIN), and the page shows the invoice once issued, or an honest expired / invalid
 * message. Admin past-sales copy is pinned at the end.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import InvoiceDetailsPage, { INVOICE_DETAILS_ENDPOINT, rupeesLabel } from "./InvoiceDetailsPage";
import { sendFormsNote, PAST_SALE_STATUS_LABEL } from "./admin/GstPastSales";

const DETAILS = { ok: true, item: "Board Pass (Premium till your boards)", amountPaise: 191700, paidOn: "1 October 2026", status: "needs_details" };
const reply = (status: number, json: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => json });

function mount(path = "/invoice-details?t=tok.mac") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <InvoiceDetailsPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("InvoiceDetailsPage", () => {
  it("shows the purchase and a form with NO state chosen (never Karnataka, never a guess)", async () => {
    const fetchSpy = vi.fn(async () => reply(200, DETAILS));
    vi.stubGlobal("fetch", fetchSpy);
    mount();
    await screen.findByTestId("invd-form");
    expect(fetchSpy).toHaveBeenCalledWith(`${INVOICE_DETAILS_ENDPOINT}?t=tok.mac`, { cache: "no-store" });
    expect(screen.getByTestId("invd-summary").textContent).toMatch(/Board Pass.*₹1,917.*1 October 2026/);
    const select = screen.getByTestId("invd-state") as HTMLSelectElement;
    expect(select.value).toBe("");
    expect(select.options).toHaveLength(37);
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex, nofollow");
  });

  it("refuses to submit without a state or a 6-digit PIN; a valid answer shows the invoice and its download", async () => {
    const posts: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: { method?: string; body?: string }) => {
        if (init?.method === "POST") {
          posts.push(JSON.parse(init.body || "{}"));
          return reply(200, { ok: true, status: "invoiced", invoice: { number: "LT/26-27/000042", url: "/api/gst/invoice?t=abc" } });
        }
        return reply(200, DETAILS);
      }),
    );
    mount();
    await screen.findByTestId("invd-form");
    fireEvent.click(screen.getByTestId("invd-submit"));
    expect(screen.getByTestId("invd-error").textContent).toMatch(/Choose your state/);
    fireEvent.change(screen.getByTestId("invd-state"), { target: { value: "29" } });
    fireEvent.click(screen.getByTestId("invd-submit"));
    expect(screen.getByTestId("invd-error").textContent).toMatch(/Enter your 6-digit PIN/);
    fireEvent.change(screen.getByTestId("invd-pin"), { target: { value: "56a0-001" } });
    expect((screen.getByTestId("invd-pin") as HTMLInputElement).value).toBe("560001");
    expect(posts).toHaveLength(0);
    fireEvent.click(screen.getByTestId("invd-submit"));
    await screen.findByTestId("invd-invoiced");
    expect(posts).toEqual([{ t: "tok.mac", stateCode: "29", pin: "560001" }]);
    expect(screen.getByTestId("invd-invoiced").textContent).toMatch(/LT\/26-27\/000042 is ready/);
    expect(screen.getByTestId("invd-download").getAttribute("href")).toBe("/api/gst/invoice?t=abc");
  });

  it("the business block: a wrong GSTIN is refused before sending; the server's field error is shown", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: { method?: string }) => (init?.method === "POST" ? reply(400, { ok: false, error: "bad_input", field: "pin" }) : reply(200, DETAILS))),
    );
    mount();
    await screen.findByTestId("invd-form");
    fireEvent.change(screen.getByTestId("invd-state"), { target: { value: "27" } });
    fireEvent.change(screen.getByTestId("invd-pin"), { target: { value: "411001" } });
    fireEvent.click(screen.getByTestId("invd-business-toggle"));
    fireEvent.change(screen.getByTestId("invd-gstin"), { target: { value: "27AAPFU0939F1ZW" } });
    fireEvent.change(screen.getByTestId("invd-legal"), { target: { value: "Test Coaching" } });
    fireEvent.change(screen.getByTestId("invd-address"), { target: { value: "12 Test Road, Pune" } });
    fireEvent.click(screen.getByTestId("invd-submit"));
    expect(screen.getByTestId("invd-error").textContent).toMatch(/does not look right/);
    fireEvent.click(screen.getByTestId("invd-business-toggle"));
    fireEvent.click(screen.getByTestId("invd-submit"));
    await waitFor(() => expect(screen.getByTestId("invd-error").textContent).toMatch(/PIN code must be 6 digits/));
  });

  it("expired (410), invalid (404) and no token: an honest message, no form", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reply(410, { ok: false, error: "expired" })));
    mount();
    await screen.findByTestId("invd-expired");
    expect(screen.queryByTestId("invd-form")).toBeNull();
    cleanup();
    vi.stubGlobal("fetch", vi.fn(async () => reply(404, { ok: false })));
    mount();
    await screen.findByTestId("invd-invalid");
    cleanup();
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    mount("/invoice-details");
    await screen.findByTestId("invd-invalid");
    expect(spy).not.toHaveBeenCalled();
  });

  it("already invoiced: the download, no form; details received: the thank-you", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reply(200, { ...DETAILS, status: "invoiced", invoice: { number: "LT/26-27/000007", url: "/api/gst/invoice?t=x" } })));
    mount();
    await screen.findByTestId("invd-download");
    expect(screen.queryByTestId("invd-form")).toBeNull();
    // GST-EMAIL-LINK-1: the buyer saved in the paid-screen box first, then opened the email's link
    expect(screen.getByTestId("invd-already").textContent).toBe("Your invoice has already been sent.");
    cleanup();
    vi.stubGlobal("fetch", vi.fn(async () => reply(200, { ...DETAILS, status: "details_received" })));
    mount();
    await screen.findByTestId("invd-saved");
  });

  it("rupees and the admin copy", () => {
    expect(rupeesLabel(191700)).toBe("₹1,917");
    expect(rupeesLabel(162458)).toBe("₹1,624.58");
    expect(sendFormsNote(null)).toMatch(/Could not send/);
    expect(sendFormsNote({ skipped: "no_link_secret" })).toMatch(/INVOICE_LINK_SECRET/);
    expect(sendFormsNote({ queued: 3, sent: 2, waiting: 1, refunded: 1 })).toBe("3 queued · 2 sent now · 1 waiting (window / one a day / daily cap) · 1 refunded (left out). The rest go out on the hourly run.");
    expect(PAST_SALE_STATUS_LABEL.reminder_sent).toBe("Reminder sent");
  });
});
