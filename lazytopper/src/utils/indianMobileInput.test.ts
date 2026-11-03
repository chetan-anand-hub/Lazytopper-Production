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

  it("review of #1505: more than 12 digits with no explicit country code keeps the first 10, as before", () => {
    expect(normaliseTypedIndianMobile("9198765432123")).toBe("9198765432");
    expect(normaliseTypedIndianMobile("919876543210123")).toBe("9198765432");
    expect(normaliseTypedIndianMobile("097145689481")).toBe("0971456894");
  });

  it("an explicit +91 / 91-with-separator prefix is dropped even with extra digits", () => {
    expect(normaliseTypedIndianMobile("+91 97145 68948 12")).toBe("9714568948");
    expect(normaliseTypedIndianMobile("91 97145 68948")).toBe("9714568948");
    expect(normaliseTypedIndianMobile("91-9714568948-55")).toBe("9714568948");
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
