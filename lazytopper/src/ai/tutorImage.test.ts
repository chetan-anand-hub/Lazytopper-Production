import { describe, it, expect } from "vitest";
import { toStoredTurns, toWireTurns } from "./tutorImage";
import type { TutorTurn } from "./tutorClient";

const img = { imageBase64: "AAAA", imageMimeType: "image/jpeg" as const };

describe("TUTOR-IMAGE-1 wire + storage shape", () => {
  const turns: TutorTurn[] = [
    { role: "user", content: "first", image: img },
    { role: "tutor", content: "reply" },
    { role: "user", content: "second", image: img },
  ];
  it("only the latest student turn keeps its bytes on the wire; earlier ones become the flag", () => {
    const w = toWireTurns(turns);
    expect(w[0].image).toBeUndefined();
    expect(w[0].hasImage).toBe(true);
    expect(w[2].image).toEqual(img);
  });
  it("a photo on an earlier turn is dropped when the last turn is text only", () => {
    const w = toWireTurns([turns[0], turns[1], { role: "user", content: "text only" }]);
    expect(JSON.stringify(w)).not.toContain("AAAA");
    expect(w[0].hasImage).toBe(true);
  });
  it("storage never holds bytes, only the flag", () => {
    const s = toStoredTurns(turns);
    expect(JSON.stringify(s)).not.toContain("AAAA");
    expect(s[0].hasImage).toBe(true);
    expect(s[2].hasImage).toBe(true);
  });
});
