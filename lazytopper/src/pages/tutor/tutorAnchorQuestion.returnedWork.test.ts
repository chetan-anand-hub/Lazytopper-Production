import { describe, it, expect } from "vitest";
import { returnedWorkForAnchor } from "./tutorAnchorQuestion";

const anchor = { id: "B", questionText: "The following reaction is an example of a(n) ____ 4NH3 + 5O2" };
describe("returnedWorkForAnchor", () => {
  it("keeps returnedWork when there is no anchor", () => {
    const rw = { question: "zinc question" };
    expect(returnedWorkForAnchor(rw, null)).toBe(rw);
  });
  it("drops a returnedWork about a different question when an anchor is present", () => {
    expect(returnedWorkForAnchor({ question: "Assertion: zinc displaces copper" }, anchor)).toBeNull();
  });
  it("keeps it when it is about the same question", () => {
    const rw = { question: "The following reaction is an example of a(n) ____ 4NH3 + 5O2" };
    expect(returnedWorkForAnchor(rw, anchor)).toBe(rw);
  });
  it("drops an image-only returnedWork next to an anchor; null stays null", () => {
    expect(returnedWorkForAnchor({ hasImageQuestion: true }, anchor)).toBeNull();
    expect(returnedWorkForAnchor(null, anchor)).toBeNull();
  });
});
