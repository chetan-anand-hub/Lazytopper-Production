/**
 * EMAIL-CODE-1 - the browser half: send posts only the normalised email; verify posts email + digits, then
 * signInWithCustomToken(the server's token); server refusals map to clear student words.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const fb = vi.hoisted(() => ({ signInWithCustomToken: vi.fn(async () => undefined) }));
vi.mock("firebase/auth", () => fb);
vi.mock("./firebaseClient", () => ({ authClient: { name: "auth" } }));

import {
  EMAIL_CODE_SEND_ENDPOINT,
  EMAIL_CODE_VERIFY_ENDPOINT,
  EmailCodeError,
  cleanCode,
  describeEmailCodeError,
  sendEmailCode,
  signInWithEmailCode,
} from "./emailCode";
import { isEmailCodeSigninClientEnabled } from "./emailCodeFlag";

function stubFetch(status: number, body: unknown) {
  const f = vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => body }));
  vi.stubGlobal("fetch", f);
  return f;
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  fb.signInWithCustomToken.mockClear();
});

describe("emailCode client", () => {
  it("the flag is off unless VITE_EMAIL_CODE_SIGNIN_ENABLED is on", () => {
    vi.stubEnv("VITE_EMAIL_CODE_SIGNIN_ENABLED", "");
    expect(isEmailCodeSigninClientEnabled()).toBe(false);
    vi.stubEnv("VITE_EMAIL_CODE_SIGNIN_ENABLED", "1");
    expect(isEmailCodeSigninClientEnabled()).toBe(true);
  });

  it("send: POST {email} (normalised), nothing else", async () => {
    const f = stubFetch(200, { ok: true });
    await sendEmailCode("  Asha@Gmail.com ");
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(EMAIL_CODE_SEND_ENDPOINT);
    expect(JSON.parse(String(init.body))).toEqual({ email: "asha@gmail.com" });
    await expect(sendEmailCode("nope")).rejects.toMatchObject({ kind: "invalid_email" });
  });

  it("verify: POST {email, code} -> signInWithCustomToken(the server's token)", async () => {
    const f = stubFetch(200, { ok: true, token: "tok" });
    await signInWithEmailCode("asha@gmail.com", "123 456");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(EMAIL_CODE_VERIFY_ENDPOINT);
    expect(JSON.parse(String(init.body))).toEqual({ email: "asha@gmail.com", code: "123456" });
    expect(fb.signInWithCustomToken).toHaveBeenCalledWith({ name: "auth" }, "tok");
  });

  it("refusals map to clear words (tries left, expired, locked, no account, unavailable)", async () => {
    stubFetch(200, { ok: false, error: "code_mismatch", triesLeft: 4 });
    const e = await signInWithEmailCode("a@gmail.com", "000000").catch((x) => x);
    expect(e).toBeInstanceOf(EmailCodeError);
    expect(describeEmailCodeError(e)).toBe("That code didn't match — 4 tries left.");
    expect(describeEmailCodeError(new EmailCodeError("code_mismatch", { triesLeft: 1 }))).toBe("That code didn't match — 1 try left.");
    expect(describeEmailCodeError(new EmailCodeError("code_expired"))).toBe("Code expired — send a new one.");
    expect(describeEmailCodeError(new EmailCodeError("too_many_tries"))).toBe("Too many tries — send a new code.");
    expect(describeEmailCodeError(new EmailCodeError("no_account"))).toMatch(/No LazyTopper account uses this email/);
    stubFetch(503, { ok: false, error: "unavailable" });
    expect(describeEmailCodeError(await sendEmailCode("a@gmail.com").catch((x) => x))).toMatch(/aren't available/);
    stubFetch(500, { weird: true });
    expect((await sendEmailCode("a@gmail.com").catch((x) => x)).kind).toBe("failed");
    expect(fb.signInWithCustomToken).not.toHaveBeenCalled();
  });

  it("cleanCode keeps digits only, at most 6", () => {
    expect(cleanCode("Code: 12-34-56-78")).toBe("123456");
  });
});
