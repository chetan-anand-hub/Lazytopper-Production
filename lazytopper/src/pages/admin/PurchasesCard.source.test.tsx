import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AbandonedList, sourceLine } from "./PurchasesCard";

afterEach(cleanup);

describe("ORDER-SOURCE-1 sourceLine", () => {
  it("utm_source / utm_medium · utm_campaign, else the referrer host, else direct", () => {
    expect(sourceLine({ utm_source: "google", utm_medium: "cpc", utm_campaign: "PDF Packs" })).toBe("google / cpc · PDF Packs");
    expect(sourceLine({ utm_source: "meta" })).toBe("meta");
    expect(sourceLine({ ref: "youtube.com", landing: "/" })).toBe("youtube.com");
    expect(sourceLine({ landing: "/packs" })).toBe("direct");
  });
});

describe("ORDER-SOURCE-1 abandoned row", () => {
  const base = { createdAtMs: 1_700_000_000_000, uid: "u1", email: "a@x.in", name: null, passType: "month", packTarget: null, kind: "premium" as const, amountInr: 599, channel: "student" as const, isAdminAccount: false };
  it("shows a Source line only for an order that has one", () => {
    render(
      <AbandonedList
        abandoned={{
          items: [
            { ...base, orderId: "s1", source: { utm_source: "google", utm_medium: "cpc", utm_campaign: "PDF_Packs" } },
            { ...base, orderId: "s2" },
          ],
        }}
      />,
    );
    expect(screen.getByTestId("pu-source-ab-s1").textContent).toBe("Source: google / cpc · PDF_Packs");
    expect(screen.queryByTestId("pu-source-ab-s2")).toBeNull();
  });
});
