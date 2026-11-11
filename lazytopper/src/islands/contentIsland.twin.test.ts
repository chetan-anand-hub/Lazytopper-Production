import { afterEach, describe, expect, it } from "vitest";
import { describe as describeControl, resolve, TWIN_ATTR } from "./contentIsland";

/**
 * PRICING-PAGES-2 F1 - `data-lt-twin`: a tap on the served copy of a control is replayed on the app's control of the same tag inside
 * the app's container with the same key, even when the two labels differ (/cbq-packs: the prerender is captured with packs dark).
 * Without the attribute, describe() is unchanged and resolve() still needs the exact text.
 */
const own = (el: Element | null) => {
  if (el) (el as unknown as Record<string, unknown>)["__reactFiber$t"] = {};
};
afterEach(() => {
  document.body.innerHTML = "";
});

describe("F1 data-lt-twin replay", () => {
  it("the served neutral button resolves to the app's Buy in the same twin container", () => {
    document.body.innerHTML = `
      <section id="cbq"><div ${TWIN_ATTR}="cq-buy-maths"><button class="lt-cbq__btn">Maths CBQ Pack · ₹199 + GST</button></div></section>
      <div id="root"><section id="cbq"><div ${TWIN_ATTR}="cq-buy-maths"><div class="lt-ptb"><button class="lt-cbq__btn">Buy Maths CBQ · ₹235</button><button class="lt-ptb__see">See inside →</button></div></div></section></div>`;
    const served = document.querySelector("section#cbq button") as Element;
    const d = describeControl(served);
    expect(d.twin).toBe("cq-buy-maths");
    const root = document.getElementById("root")!;
    own(root.querySelector("section#cbq"));
    own(root.querySelector(`[${TWIN_ATTR}]`));
    const buy = root.querySelector(".lt-cbq__btn");
    own(buy);
    expect(resolve(d)).toBe(buy);
  });

  it("waits (null) until the app's twin container and button are React's", () => {
    document.body.innerHTML = `
      <section id="cbq"><div ${TWIN_ATTR}="cq-buy-maths"><button>Maths CBQ Pack · ₹199 + GST</button></div></section>
      <div id="root"><section id="cbq"><div ${TWIN_ATTR}="cq-buy-maths"><button>Buy Maths CBQ · ₹235</button></div></section></div>`;
    const d = describeControl(document.querySelector("section#cbq button") as Element);
    own(document.querySelector("#root section#cbq"));
    expect(resolve(d)).toBeNull();
  });

  it("CONTROL: no twin attribute -> no twin key, and a different label is NOT matched (as before)", () => {
    document.body.innerHTML = `
      <section id="s"><button>Old label</button></section>
      <div id="root"><section id="s"><button>New label</button></section></div>`;
    const d = describeControl(document.querySelector("section#s button") as Element);
    expect(d.twin).toBeUndefined();
    own(document.querySelector("#root section#s"));
    own(document.querySelector("#root button"));
    expect(resolve(d)).toBeNull();
  });
});
