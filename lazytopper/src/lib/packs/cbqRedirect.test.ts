import { describe, expect, it } from "vitest";
import { cbqRedirectTarget } from "./cbqRedirect";

const at = (search: string, hash = "#cbq", pathname = "/packs") => cbqRedirectTarget({ pathname, search, hash });

describe("PACKS-TIDY-2: /packs#cbq -> /cbq-packs", () => {
  it("redirects only /packs with the #cbq hash", () => {
    expect(at("")).toBe("/cbq-packs");
    expect(at("", "#CBQ")).toBe("/cbq-packs");
    expect(at("", "")).toBeNull();
    expect(at("", "#my-packs")).toBeNull();
    expect(at("", "#cbq", "/pricing")).toBeNull();
    expect(at("", "#cbq", "/cbq-packs")).toBeNull();
  });

  it("keeps the subject, ad click ids, utm_* and from; drops everything else", () => {
    expect(at("?subject=science&utm_source=google&utm_campaign=pdf&gclid=abc&from=for_parents&buy=pack_cbq&x=1")).toBe(
      "/cbq-packs?subject=science&utm_source=google&utm_campaign=pdf&gclid=abc&from=for_parents",
    );
    expect(at("?t=science&fbclid=f1")).toBe("/cbq-packs?subject=science&fbclid=f1");
    expect(at("?subject=physics&gbraid=g&wbraid=w")).toBe("/cbq-packs?gbraid=g&wbraid=w");
  });

  it("always yields a same-site path, whatever the query holds", () => {
    const out = at("?from=https://evil.example/&utm_source=%2F%2Fevil");
    expect(out?.startsWith("/cbq-packs")).toBe(true);
    expect(out).not.toMatch(/^\/\//);
    expect(new URL(out as string, "https://www.lazytopper.com").host).toBe("www.lazytopper.com");
  });
});
