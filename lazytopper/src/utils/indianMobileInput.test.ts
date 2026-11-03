import { describe, it, expect } from "vitest";
import { normaliseTypedIndianMobile } from "./indianMobileInput";
import { normaliseIndianMobile } from "../services/guestPay";

describe("PHONE-PASTE-1 · normaliseTypedIndianMobile", () => {
  it.each(["+91 97145 68948", "919714568948", "09714568948", "97145 68948", "9714568948", "+91-97145-68948", "+919714568948"])(
    "%j -> 9714568948",
    (raw) => {
      expect(normaliseTypedIndianMobile(raw)).toBe("9714568948");
    },
  );

  it("partial typing passes through as digits", () => {
    expect(normaliseTypedIndianMobile("97")).toBe("97");
    expect(normaliseTypedIndianMobile("+91 97")).toBe("97");
    expect(normaliseTypedIndianMobile("")).toBe("");
    expect(normaliseTypedIndianMobile(undefined)).toBe("");
  });

  it("a real 10-digit number that starts with 91 is kept", () => {
    expect(normaliseTypedIndianMobile("9123456789")).toBe("9123456789");
  });

  it("never more than 10 digits", () => {
    expect(normaliseTypedIndianMobile("97145689481234")).toHaveLength(10);
  });

  it("agrees with the guest-pay server-shape normaliser on the full forms", () => {
    for (const raw of ["+91 97145 68948", "919714568948", "09714568948", "9714568948"]) {
      expect(`+91${normaliseTypedIndianMobile(raw)}`).toBe(normaliseIndianMobile(raw));
    }
  });
});
