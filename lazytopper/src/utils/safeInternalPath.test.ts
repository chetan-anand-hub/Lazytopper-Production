import { describe, expect, it } from "vitest";
import { isSafeInternalPath } from "./safeInternalPath";

describe("isSafeInternalPath — the one rule for ?redirect= and state.from", () => {
  it.each(["/", "/practice-hub?cbq=1", "/check-improve", "/topic-hub/maths/triangles#x"])(
    "accepts %s",
    (p) => expect(isSafeInternalPath(p)).toBe(true),
  );
  it.each([
    "",
    null,
    undefined,
    "https://evil.example.com",
    "//evil.example.com/x",
    "/\\evil.example.com",
    "\\evil.example.com",
    "/ok?next=\\evil",
    "javascript:alert(1)",
    "relative/path",
  ])("rejects %j", (p) => expect(isSafeInternalPath(p as string | null | undefined)).toBe(false));
});
