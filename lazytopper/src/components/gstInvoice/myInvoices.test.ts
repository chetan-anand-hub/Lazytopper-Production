/** GST-INVOICE-1 - the account's invoice list (pure readers) and the admin card's config warning. */
import { describe, it, expect } from "vitest";
import { invoiceAmountLabel, readInvoices } from "./myInvoices";
import { configWarning, HELD_REASON_LABEL } from "../../pages/admin/GstInvoicesCard";

describe("My invoices", () => {
  it("formats paise with Indian grouping", () => {
    expect(invoiceAmountLabel(226200)).toBe("₹2,262.00");
    expect(invoiceAmountLabel(5800)).toBe("₹58.00");
    expect(invoiceAmountLabel(12345678)).toBe("₹1,23,456.78");
  });
  it("keeps only well-formed rows (no invented rows)", () => {
    expect(readInvoices(null)).toEqual([]);
    expect(readInvoices({ items: [{ orderId: "o1", number: "LT/26-27/000001", dateIst: "08-11-2026", totalPaise: 226200, description: "Board Pass" }, { orderId: 3 }] })).toEqual([
      { orderId: "o1", number: "LT/26-27/000001", dateIst: "08-11-2026", totalPaise: 226200, description: "Board Pass" },
    ]);
  });
});

describe("admin GST card", () => {
  it("warns when invoicing is off, and names every missing seller value when it is on", () => {
    expect(configWarning({ enabled: false, ready: false, missing: [] })).toMatch(/OFF/);
    expect(configWarning({ enabled: true, ready: false, missing: ["SELLER_GSTIN", "SAC_PACKS"] })).toMatch(/missing or invalid SELLER_GSTIN, SAC_PACKS/);
    expect(configWarning({ enabled: true, ready: true, missing: [] })).toBeNull();
  });
  it("labels every held reason the server can return", () => {
    for (const r of ["pre_cutoff", "no_state", "pack_credit", "no_sac_for_product", "amount_mismatch", "seller_config_missing", "not_yet_issued", "invoicing_off"]) {
      expect(HELD_REASON_LABEL[r]).toBeTruthy();
    }
  });
});
