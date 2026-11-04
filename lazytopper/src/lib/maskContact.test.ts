/**
 * CODE-WHERE-1 — the ONE client-side masking helper. Email: first 2 of the local part + "••••" + "@domain". Phone: country
 * code + first 2 + bullets + last 3. The guest-pay and checkout-who modules re-export these very functions.
 */
import { describe, expect, it } from "vitest";
import { maskEmail, maskIndianMobile, maskPhone, normaliseIndianMobile } from "./maskContact";
import * as guestPay from "../services/guestPay";
import * as checkoutWhoFlag from "../services/checkoutWhoFlag";

describe("maskEmail", () => {
  it("first two of the local part, four bullets, the full domain", () => {
    expect(maskEmail("rahul.verma@gmail.com")).toBe("ra••••@gmail.com");
    expect(maskEmail("  Rahul.Verma@Gmail.com ")).toBe("ra••••@gmail.com");
  });
  it("short local parts never reveal the whole local part: at most max(1, len-1) characters", () => {
    expect(maskEmail("abc@x.co")).toBe("ab••••@x.co");
    expect(maskEmail("ab@x.co")).toBe("a••••@x.co");
    expect(maskEmail("a@x.co")).toBe("a••••@x.co");
  });
  it("plus-addresses: the tag is hidden with the rest", () => {
    expect(maskEmail("ra+lazytopper@gmail.com")).toBe("ra••••@gmail.com");
    expect(maskEmail("r+t@gmail.com")).toBe("r+••••@gmail.com");
  });
  it("not an email -> empty", () => {
    expect(maskEmail("")).toBe("");
    expect(maskEmail("not-an-email")).toBe("");
    expect(maskEmail(null)).toBe("");
  });
});

describe("maskPhone", () => {
  it("+91: country code + first 2 + bullets + last 3", () => {
    expect(maskPhone("+919876543210")).toBe("+91 98•••••210");
    expect(maskPhone("+91 98765 43210")).toBe("+91 98•••••210");
    expect(maskPhone("9876543210")).toBe("+91 98•••••210");
    expect(maskPhone("09876543210")).toBe("+91 98•••••210");
  });
  it("non-+91 international numbers: first 2 + bullets + last 3, never the middle", () => {
    expect(maskPhone("+447911123456")).toBe("+44•••••••456");
    expect(maskPhone("+1 202 555 0147")).toBe("+12••••••147");
    expect(maskPhone("+971501234567")).toBe("+97•••••••567");
    expect(maskPhone("+447911123456")).not.toContain("7911123");
  });
  it("non-+91 numbers under 10 digits: the last 3 only (10+ keep the first 2)", () => {
    expect(maskPhone("+6591234567")).toBe("+65•••••567");
    expect(maskPhone("+659 123 456")).toBe("+••••••456");
    expect(maskPhone("+35312345")).toBe("+•••••345");
  });
  it("garbage -> empty", () => {
    expect(maskPhone("")).toBe("");
    expect(maskPhone("12345")).toBe("");
    expect(maskPhone("+12")).toBe("");
    expect(maskPhone("call me")).toBe("");
    expect(maskPhone(undefined)).toBe("");
  });
});

describe("one helper, not three", () => {
  it("guestPay re-exports the SAME phone functions", () => {
    expect(guestPay.maskIndianMobile).toBe(maskIndianMobile);
    expect(guestPay.normaliseIndianMobile).toBe(normaliseIndianMobile);
  });
  it("the email masker builds on checkoutWhoFlag's normaliser and agrees with its maskEmail on ordinary addresses", () => {
    for (const e of ["anaya.k@gmail.com", " Rahul.Verma@Gmail.com ", "ra+lt@x.in", "abc@x.co"]) {
      expect(maskEmail(e)).toBe(checkoutWhoFlag.maskEmail(e));
    }
    expect(maskEmail("not an email")).toBe(checkoutWhoFlag.maskEmail("not an email"));
  });
});
