/**
 * WHATSAPP-OPTIN-1 - the UI: the checkout block (untick by default, label verbatim, Buy unaffected, pending value valid + ticked only,
 * cleared on unmount), the collapsed sample line, and no number in analytics / console.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import WhatsAppOptInCheckout from "./WhatsAppOptInCheckout";
import WhatsAppSampleOptIn from "./WhatsAppSampleOptIn";
import { waOptInOrderFields, setPendingWaOptIn } from "../../services/waOptIn";

afterEach(() => {
  cleanup();
  setPendingWaOptIn(null);
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("checkout block", () => {
  it("shows '+91', the number field and an UNTICKED box with the verbatim label; nothing pending", () => {
    render(<WhatsAppOptInCheckout />);
    expect(screen.getByText("WhatsApp number")).toBeTruthy();
    expect(screen.getByText("+91")).toBeTruthy();
    expect((screen.getByTestId("wa-consent") as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText("Send me updates on WhatsApp")).toBeTruthy();
    expect(screen.queryByText(/optional/i)).toBeNull();
    expect(waOptInOrderFields()).toEqual({});
  });

  it("pending only when the number is valid AND ticked; clears when either is undone", () => {
    render(<WhatsAppOptInCheckout />);
    fireEvent.change(screen.getByTestId("wa-number"), { target: { value: "98765 43210" } });
    expect(waOptInOrderFields()).toEqual({});
    fireEvent.click(screen.getByTestId("wa-consent"));
    expect(waOptInOrderFields()).toEqual({ waOptIn: { phone: "9876543210", consent: true } });
    fireEvent.click(screen.getByTestId("wa-consent"));
    expect(waOptInOrderFields()).toEqual({});
    fireEvent.click(screen.getByTestId("wa-consent"));
    fireEvent.change(screen.getByTestId("wa-number"), { target: { value: "12345" } });
    expect(waOptInOrderFields()).toEqual({});
    expect(screen.getByTestId("wa-number-error")).toBeTruthy();
  });

  it("Buy stays one tap with the field empty: a sibling Buy button is not disabled and the block adds no step", () => {
    const onBuy = vi.fn();
    render(
      <div>
        <WhatsAppOptInCheckout />
        <button type="button" onClick={onBuy} data-testid="buy">Buy</button>
      </div>,
    );
    fireEvent.click(screen.getByTestId("buy"));
    expect(onBuy).toHaveBeenCalledTimes(1);
    expect(waOptInOrderFields()).toEqual({});
  });

  it("unmounting clears the pending opt-in; the kill switch hides the block", () => {
    const { unmount } = render(<WhatsAppOptInCheckout />);
    fireEvent.change(screen.getByTestId("wa-number"), { target: { value: "9876543210" } });
    fireEvent.click(screen.getByTestId("wa-consent"));
    expect(waOptInOrderFields().waOptIn).toBeTruthy();
    unmount();
    expect(waOptInOrderFields()).toEqual({});
    vi.stubEnv("VITE_WA_OPTIN_DISABLED", "1");
    render(<WhatsAppOptInCheckout />);
    expect(screen.queryByTestId("wa-optin")).toBeNull();
  });
});

describe("sample block", () => {
  it("collapsed by default; expands to the field + tick + Send; Send needs a valid number AND the tick; posts once; thanks", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }) as Response);
    vi.stubGlobal("fetch", fetchMock);
    render(<WhatsAppSampleOptIn packId="pack_cbq:maths" />);
    expect(screen.queryByTestId("wa-sample-number")).toBeNull();
    fireEvent.click(screen.getByText("Get this pack's link on WhatsApp"));
    const send = screen.getByTestId("wa-sample-send") as HTMLButtonElement;
    expect((screen.getByTestId("wa-sample-consent") as HTMLInputElement).checked).toBe(false);
    expect(send.disabled).toBe(true);
    fireEvent.change(screen.getByTestId("wa-sample-number"), { target: { value: "9876543210" } });
    expect(send.disabled).toBe(true);
    fireEvent.click(screen.getByTestId("wa-sample-consent"));
    expect(send.disabled).toBe(false);
    fireEvent.click(send);
    await screen.findByTestId("wa-sample-done");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String((fetchMock.mock.calls[0] as unknown[])[1] && ((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body)))).toEqual({
      phone: "9876543210", consent: true, packId: "pack_cbq:maths", consentVersion: "wa-optin-v1",
    });
  });

  it("a failed save says so and keeps the form; it never logs the number", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 429 }) as Response));
    render(<WhatsAppSampleOptIn packId="pack_cbq:maths" />);
    fireEvent.click(screen.getByTestId("wa-sample-open"));
    fireEvent.change(screen.getByTestId("wa-sample-number"), { target: { value: "9876543210" } });
    fireEvent.click(screen.getByTestId("wa-sample-consent"));
    fireEvent.click(screen.getByTestId("wa-sample-send"));
    await waitFor(() => expect(screen.getByTestId("wa-sample-failed")).toBeTruthy());
    expect(screen.getByTestId("wa-sample-number")).toBeTruthy();
    const all = [...spy.mock.calls, ...log.mock.calls].flat().map(String).join(" ");
    expect(all.includes("9876543210")).toBe(false);
  });
});
