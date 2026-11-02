/**
 * NOTES-AUTHORED-1 — the internal "[authored prompt]" provenance marker never reaches a page, prompts LazyTopper
 * wrote are labelled as such, and the "real sourced / verbatim" claim is not shown on a section holding them.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { Note } from "./Note";
import { ensureAllNoteSpecs, getNoteSpecForTopic } from "./noteSpecRegistry";
import { allDesktopTopics } from "../../lib/desktop/topics";
import { AUTHORED_PROMPT_LABEL, displayPromptText, isAuthoredPrompt } from "./noteAuthoredPrompt";

await ensureAllNoteSpecs();

const html = (spec: NonNullable<ReturnType<typeof getNoteSpecForTopic>>) =>
  renderToStaticMarkup(
    <MemoryRouter>
      <Note spec={spec} />
    </MemoryRouter>,
  );

const slugs = allDesktopTopics().map((t) => t.slug);

describe("Note — authored worked-example prompts", () => {
  it.each(slugs.map((s) => [s]))("%s: no marker in the rendered page; labels and claims match the data", (slug) => {
    const spec = getNoteSpecForTopic(slug);
    if (!spec) return;
    const out = html(spec);
    expect(out.toLowerCase()).not.toContain("[authored prompt]");
    const authored = spec.examples.filter((e) => isAuthoredPrompt(e.problem_verbatim)).length;
    expect(out.split(AUTHORED_PROMPT_LABEL).length - 1, "one label per authored card").toBe(authored);
    if (authored > 0) {
      expect(out).not.toContain("Every problem is a real sourced item");
      expect(out).not.toContain("Solved exactly as the source does them");
      const sec = out.slice(out.indexOf("lt-note__sec-label"), out.length);
      const examplesBlock = out.slice(out.indexOf("Worked examples"), out.indexOf("Worked examples") + 400);
      expect(examplesBlock).not.toContain("NCERT VERBATIM");
      expect(sec.length).toBeGreaterThan(0);
    } else if (spec.examples.length > 0) {
      expect(out).toContain("Every problem is a real sourced item");
    }
  });

  it("covers the nine specs that carry the marker", () => {
    const hit = slugs.filter((s) => (getNoteSpecForTopic(s)?.examples ?? []).some((e) => isAuthoredPrompt(e.problem_verbatim)));
    expect(hit.length).toBe(9);
  });

  it("the reported card: marker gone, formulae subscripted, label present", () => {
    const out = html(getNoteSpecForTopic("chemical-reactions-and-equations")!);
    expect(out).toContain("Balance the skeletal equation Fe + H₂O -> Fe₃O₄ + H₂ by the hit-and-trial method");
    expect(out).toContain("Practice question written by LazyTopper");
  });

  it("displayPromptText: strips a prefix or suffix marker; leaves $...$ maths and O1-style labels alone", () => {
    expect(displayPromptText("[authored prompt] Burn CH4 in O2.")).toBe("Burn CH₄ in O₂.");
    expect(displayPromptText("Trace how an Amoeba feeds. [authored prompt]")).toBe("Trace how an Amoeba feeds.");
    expect(displayPromptText("Find $x2$ at O1 and H2O")).toBe("Find $x2$ at O1 and H₂O");
    expect(displayPromptText("A real NCERT line.")).toBe("A real NCERT line.");
  });

  it("CONTROL — a spec with a verbatim-only section keeps the verbatim claim and chip", () => {
    const spec = structuredClone(getNoteSpecForTopic("chemical-reactions-and-equations")!);
    spec.examples.forEach((e) => (e.problem_verbatim = e.problem_verbatim.replace("[authored prompt]", "").trim()));
    const out = html(spec);
    expect(out).toContain("Every problem is a real sourced item");
    expect(out).toContain("NCERT VERBATIM");
    expect(out).not.toContain(AUTHORED_PROMPT_LABEL);
  });

  it("a mixed section says so and chips only the sourced card", () => {
    const spec = structuredClone(getNoteSpecForTopic("chemical-reactions-and-equations")!);
    spec.examples[1].problem_verbatim = spec.examples[1].problem_verbatim.replace("[authored prompt]", "").trim();
    const out = html(spec);
    expect(out).toContain("plus a few practice prompts we wrote");
    expect(out).not.toContain("Every problem is a real sourced item");
    expect(out.split(AUTHORED_PROMPT_LABEL).length - 1).toBe(spec.examples.length - 1);
  });
});
