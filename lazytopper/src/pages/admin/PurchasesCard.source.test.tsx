import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AbandonedList } from "./PurchasesCard";

afterEach(cleanup);

describe("ORDER-SOURCE-1 abandoned row", () => {
  const base = { createdAtMs: 1_700_000_000_000, uid: "u1", email: "a@x.in", name: null, passType: "month", packTarget: null, kind: "premium" as const, amountInr: 599, channel: "student" as const, isAdminAccount: false };
  it("shows a Source line only for an order that has one", () => {
    render(
      <AbandonedList
        abandoned={{
          items: [
            { ...base, orderId: "s1", source: { utm_source: "google", utm_medium: "cpc", utm_campaign: "search_pdf_packs", utm_content: "ag99", utm_term: "class 10 question bank", landing: "/packs" } },
            { ...base, orderId: "s2" },
          ],
        }}
      />,
    );
    // SOURCE-3: the same text the Students page shows - campaign and ad group, then keyword and landing page
    expect(screen.getByTestId("pu-source-ab-s1").querySelector(".pu-source-main")?.textContent).toBe("Source: Google ad · Search · PDF Packs › ad group ag99");
    expect(screen.getByTestId("pu-source-ab-s1").querySelector(".pu-source-detail")?.textContent).toBe("\u201Cclass 10 question bank\u201D · landed /packs");
    expect(screen.queryByTestId("pu-source-ab-s2")).toBeNull();
  });

  it("INAPP-GAP-1: shows the browser class + hop chip when the order carries them", () => {
    render(<AbandonedList abandoned={{ items: [{ ...base, orderId: "s3", source: { ref: "m.facebook.com", ua: "inapp_facebook", hop: "none" } }, { ...base, orderId: "s4", source: { ref: "m.facebook.com" } }] }} />);
    expect(screen.getByTestId("pu-ua-ab-s3").textContent).toBe("Browser: inapp_facebook · hop: none");
    expect(screen.queryByTestId("pu-ua-ab-s4")).toBeNull();
  });

  it("INAPP-GAP-1 N2: a row with only ua/hop reads 'No source recorded', never 'Direct'", () => {
    render(<AbandonedList abandoned={{ items: [{ ...base, orderId: "s5", source: { ua: "desktop", hop: "none" } }] }} />);
    expect(screen.getByTestId("pu-source-ab-s5").querySelector(".pu-source-main")?.textContent).toBe("Source: No source recorded");
  });
});
