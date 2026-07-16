import { describe, it, expect } from "vitest";
import { buildTutorPath, safeInternalReturnTo } from "./tutorPath";

describe("buildTutorPath — mirrors the desktop route encoding for /tutor", () => {
  it("builds the canonical grade/subject/topic path (grade defaults to 10)", () => {
    expect(buildTutorPath({ subject: "Maths", topicKey: "trigonometry" })).toBe(
      "/tutor/10/Maths/trigonometry",
    );
    expect(buildTutorPath({ subject: "Science", topicKey: "life-processes", grade: "10" })).toBe(
      "/tutor/10/Science/life-processes",
    );
  });

  it("carries the pre-loaded concept (per-row 'Stuck?') as an encoded ?concept=", () => {
    const path = buildTutorPath({
      subject: "Maths",
      topicKey: "trigonometry",
      concept: "Heights & distances",
    });
    expect(path).toContain("/tutor/10/Maths/trigonometry?");
    expect(path).toContain("concept=Heights+%26+distances");
  });

  it("carries an optional questionId as ?q= only when present (Stage 3, additive)", () => {
    // Present → additive `q` segment, ordered after concept and before source.
    const withQ = buildTutorPath({
      subject: "Maths",
      topicKey: "trigonometry",
      concept: "Heights & distances",
      questionId: "Z3-TG-101",
      source: "practice",
    });
    expect(withQ).toContain("q=Z3-TG-101");
    expect(withQ.indexOf("concept=")).toBeLessThan(withQ.indexOf("q="));
    expect(withQ.indexOf("q=")).toBeLessThan(withQ.indexOf("source="));
  });

  it("omitting questionId is byte-identical to before the param existed", () => {
    // The QP lane's existing call omits it — its output must not change at all.
    expect(buildTutorPath({ subject: "Maths", topicKey: "trigonometry" })).toBe(
      "/tutor/10/Maths/trigonometry",
    );
    const withoutQ = buildTutorPath({
      subject: "Science",
      topicKey: "electricity",
      concept: "Ohm's law",
      source: "practice",
      returnTo: "/practice/10/Science",
    });
    expect(withoutQ).not.toContain("q=");
  });

  it("carries source + returnTo for back-nav", () => {
    const path = buildTutorPath({
      subject: "Maths",
      topicKey: "trigonometry",
      source: "topicHub",
      returnTo: "/topic-hub/10/Maths/trigonometry",
    });
    expect(path).toContain("source=topicHub");
    expect(path).toContain("returnTo=%2Ftopic-hub%2F10%2FMaths%2Ftrigonometry");
  });

  it("URL-encodes the topic segment (never emits a raw unsafe slug)", () => {
    expect(buildTutorPath({ subject: "Maths", topicKey: "a b/c" })).toBe(
      "/tutor/10/Maths/a%20b%2Fc",
    );
  });
});

describe("safeInternalReturnTo — safe-redirect doctrine (reject anything not in-app)", () => {
  it("accepts a plain in-app path", () => {
    expect(safeInternalReturnTo("/topic-hub/10/Maths/trigonometry")).toBe(
      "/topic-hub/10/Maths/trigonometry",
    );
  });

  it("rejects protocol-relative, absolute-URL, and scheme-bearing redirects", () => {
    expect(safeInternalReturnTo("//evil.example.com")).toBeNull();
    expect(safeInternalReturnTo("https://evil.example.com")).toBeNull();
    expect(safeInternalReturnTo("javascript:alert(1)")).toBeNull();
    expect(safeInternalReturnTo("mailto:x@y.z")).toBeNull();
  });

  it("rejects a non-path value and null", () => {
    expect(safeInternalReturnTo("exam-trends")).toBeNull();
    expect(safeInternalReturnTo(null)).toBeNull();
  });
});
