import { describe, it, expect, beforeEach } from "vitest";
import {
  REDIRECT_OPT_IN_KEY,
  SIGNIN_INTENT_KEY,
  SIGNIN_INTENT_TTL_MS,
  chooseGoogleFlow,
  clearSigninIntent,
  hasRedirectOptIn,
  hasSigninIntent,
  noteRedirectOptIn,
  readSigninIntent,
  resolveGoogleSigninMode,
  saveSigninIntent,
  type SigninIntentInput,
} from "./signinIntent";

const BASE: SigninIntentInput = {
  target: "/practice-hub",
  explicitTarget: "/practice-hub",
  from: null,
  startTrial: true,
  guestPayClaim: true,
  guestPayExisting: true,
};

beforeEach(() => sessionStorage.clear());

describe("GOOGLE-REDIRECT-1 · the build flag", () => {
  it.each([
    [undefined, "popup"],
    ["", "popup"],
    ["POPUP", "popup"],
    ["nonsense", "popup"],
    [42, "popup"],
    ["redirect-test", "redirect-test"],
    [" Redirect ", "redirect"],
  ])("%j -> %s", (raw, mode) => {
    expect(resolveGoogleSigninMode(raw)).toBe(mode);
  });
});

describe("GOOGLE-REDIRECT-1 · which flow", () => {
  it("popup mode is always the popup", () => {
    expect(chooseGoogleFlow({ mode: "popup", optedIn: true, inApp: false })).toBe("popup");
  });
  it("redirect-test redirects only an opted-in tab", () => {
    expect(chooseGoogleFlow({ mode: "redirect-test", optedIn: false, inApp: false })).toBe("popup");
    expect(chooseGoogleFlow({ mode: "redirect-test", optedIn: true, inApp: false })).toBe("redirect");
  });
  it("redirect mode redirects everyone except in-app browsers", () => {
    expect(chooseGoogleFlow({ mode: "redirect", optedIn: false, inApp: false })).toBe("redirect");
    expect(chooseGoogleFlow({ mode: "redirect", optedIn: false, inApp: true })).toBe("popup");
    expect(chooseGoogleFlow({ mode: "redirect-test", optedIn: true, inApp: true })).toBe("popup");
  });
  it("?gsignin=redirect opts the tab in (sessionStorage); ?gsignin=popup opts it out; other searches change nothing", () => {
    noteRedirectOptIn("?redirect=%2Fme");
    expect(hasRedirectOptIn()).toBe(false);
    noteRedirectOptIn("?gsignin=redirect&redirect=%2Fme");
    expect(sessionStorage.getItem(REDIRECT_OPT_IN_KEY)).toBe("1");
    expect(hasRedirectOptIn()).toBe(true);
    noteRedirectOptIn("");
    expect(hasRedirectOptIn()).toBe(true);
    noteRedirectOptIn("?gsignin=popup");
    expect(hasRedirectOptIn()).toBe(false);
  });
});

describe("GOOGLE-REDIRECT-1 · the sign-in intent", () => {
  it("round-trips the allowed fields under one key, with no phone number", () => {
    const withPhone = { ...BASE, guestPayPhone: "9714568948", phone: "+919714568948" } as unknown as SigninIntentInput;
    expect(saveSigninIntent(withPhone, 1_000)).toBe(true);
    const raw = sessionStorage.getItem(SIGNIN_INTENT_KEY) ?? "";
    expect(raw).not.toMatch(/9714568948/);
    expect(Object.keys(JSON.parse(raw)).sort()).toEqual(
      ["at", "explicitTarget", "from", "guestPayClaim", "guestPayExisting", "method", "startTrial", "target", "v"].sort(),
    );
    expect(readSigninIntent(1_000 + 60_000)).toEqual({
      v: 1,
      method: "google",
      target: "/practice-hub",
      explicitTarget: "/practice-hub",
      from: null,
      startTrial: true,
      guestPayClaim: true,
      guestPayExisting: true,
      at: 1_000,
    });
    expect(sessionStorage.length).toBe(1);
  });

  it("safe redirects always: an external target or from is never stored or returned", () => {
    saveSigninIntent({ ...BASE, target: "https://evil.example/x", explicitTarget: "//evil.example", from: "javascript:alert(1)" }, 5);
    const back = readSigninIntent(6)!;
    expect(back.target).toBe("/");
    expect(back.explicitTarget).toBe("/");
    expect(back.from).toBeNull();
    // A tampered record is sanitised on the way back too.
    sessionStorage.setItem(SIGNIN_INTENT_KEY, JSON.stringify({ ...back, target: "https://evil.example" }));
    expect(readSigninIntent(7)!.target).toBe("/");
  });

  it("expires after 15 minutes (and the stale record is removed)", () => {
    saveSigninIntent(BASE, 0);
    expect(readSigninIntent(SIGNIN_INTENT_TTL_MS)).not.toBeNull();
    expect(readSigninIntent(SIGNIN_INTENT_TTL_MS + 1)).toBeNull();
    expect(hasSigninIntent()).toBe(false);
  });

  it("garbage is ignored and removed", () => {
    sessionStorage.setItem(SIGNIN_INTENT_KEY, "{not json");
    expect(readSigninIntent()).toBeNull();
    expect(hasSigninIntent()).toBe(false);
  });

  it("clears after use", () => {
    saveSigninIntent(BASE);
    expect(hasSigninIntent()).toBe(true);
    clearSigninIntent();
    expect(hasSigninIntent()).toBe(false);
    expect(readSigninIntent()).toBeNull();
  });
});
