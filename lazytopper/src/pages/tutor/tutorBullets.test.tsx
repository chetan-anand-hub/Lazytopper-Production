import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { TutorText, tidyBullets } from "./TutorText";

describe("TUTOR-BULLETS-1 tidyBullets", () => {
  it("turns a leading * or - bullet into a dot", () => {
    expect(tidyBullets("Here:\n* Number of terms n = 20\n- First term a = 3")).toBe(
      "Here:\n\u2022 Number of terms n = 20\n\u2022 First term a = 3",
    );
  });
  it("keeps indentation and leaves mid-line stars, bold and products alone", () => {
    expect(tidyBullets("  * indented")).toBe("  \u2022 indented");
    expect(tidyBullets("2 * 3 = 6")).toBe("2 * 3 = 6");
    expect(tidyBullets("**Step 1:** write a")).toBe("**Step 1:** write a");
    expect(tidyBullets("-5 is negative")).toBe("-5 is negative");
  });
  it("does not touch a bullet-looking line inside a display math span", () => {
    const t = "\\[ a\n* b \\]";
    expect(tidyBullets(t)).toBe(t);
  });
  it("renders no literal asterisk bullet in the bubble", () => {
    const { container } = render(<TutorText text={"Steps:\n* Find d\n* Use the formula"} />);
    expect(container.textContent).not.toMatch(/^\* /m);
    expect(container.textContent).toContain("\u2022 Find d");
  });
});
