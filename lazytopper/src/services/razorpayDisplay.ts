/**
 * RZP-UPI-FIRST-1 - show UPI (QR / intent) first in the Razorpay sheet, every other method still shown.
 *
 * Shape verified against Razorpay's "Configure Payment Methods" docs:
 *   https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/configure-payment-methods/sample-code/
 * `config.display.blocks.<key>` = { name, instruments: [{ method }] }; `config.display.sequence` references a block as
 * `block.<key>`; `config.display.preferences.show_default_blocks: true` keeps Checkout's standard blocks (all methods).
 *
 * Kill switch: build env VITE_RZP_UPI_FIRST_DISABLED=1 -> no `config` key at all (options identical to before).
 */

export interface RazorpayDisplayConfig {
  display: {
    blocks: Record<string, { name: string; instruments: Array<{ method: string }> }>;
    sequence: string[];
    preferences: { show_default_blocks: boolean };
  };
}

function isUpiFirstDisabled(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_RZP_UPI_FIRST_DISABLED;
    return /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return false;
  }
}

/** Spread into every `new Razorpay({...})` options object. `{}` when the kill switch is on. */
export function razorpayUpiFirstOption(): { config?: RazorpayDisplayConfig } {
  if (isUpiFirstDisabled()) return {};
  return {
    config: {
      display: {
        blocks: { upi: { name: "Pay via UPI", instruments: [{ method: "upi" }] } },
        sequence: ["block.upi"],
        preferences: { show_default_blocks: true },
      },
    },
  };
}
