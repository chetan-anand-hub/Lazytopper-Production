// REDOWNLOAD-ENFORCE-1 - the client's re-download date (packLabels.ts) and the server's (server/services/packTerms.cjs) are ONE
// rule: same cut-off, same words, same end-of-day instants, for every kind of paid time. Plus the ended-state line My packs shows.
import { createRequire } from "node:module";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  PACK_TERMS_CUTOFF_MS,
  REDOWNLOAD_ENDS_AT,
  REDOWNLOAD_ENDS_AT_LEGACY,
  REDOWNLOAD_UNTIL,
  REDOWNLOAD_UNTIL_LEGACY,
  redownloadEndsMsFor,
  redownloadUntilFor,
} from "./packLabels";
import { endedPackMessage, readEndedPacks } from "./packEnded";
import EndedPacksNote from "./EndedPacksNote";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const server = require("../../../server/services/packTerms.cjs") as {
  PACK_TERMS_CUTOFF_MS: number;
  REDOWNLOAD_UNTIL: string;
  REDOWNLOAD_UNTIL_LEGACY: string;
  REDOWNLOAD_ENDS_MS: number;
  REDOWNLOAD_ENDS_LEGACY_MS: number;
  redownloadUntilFor: (paidAt: unknown) => string;
  redownloadEndsMsFor: (paidAt: unknown) => number;
};

describe("REDOWNLOAD-ENFORCE-1 - client and server agree on the re-download date", () => {
  it("same cut-off, same words, same end instants", () => {
    expect(server.PACK_TERMS_CUTOFF_MS).toBe(PACK_TERMS_CUTOFF_MS);
    expect(server.REDOWNLOAD_UNTIL).toBe(REDOWNLOAD_UNTIL);
    expect(server.REDOWNLOAD_UNTIL_LEGACY).toBe(REDOWNLOAD_UNTIL_LEGACY);
    expect(server.REDOWNLOAD_ENDS_MS).toBe(Date.parse(REDOWNLOAD_ENDS_AT));
    expect(server.REDOWNLOAD_ENDS_LEGACY_MS).toBe(Date.parse(REDOWNLOAD_ENDS_AT_LEGACY));
  });

  it("same answer for every paid time: before / at / after the cut-off, and unknown", () => {
    const samples: (number | null | undefined)[] = [
      PACK_TERMS_CUTOFF_MS - 1, PACK_TERMS_CUTOFF_MS, PACK_TERMS_CUTOFF_MS + 1, PACK_TERMS_CUTOFF_MS + 90 * 86400000,
      Date.parse("2026-10-01T10:00:00+05:30"), undefined, null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY,
    ];
    for (const s of samples) {
      expect(server.redownloadUntilFor(s), String(s)).toBe(redownloadUntilFor(s));
      expect(server.redownloadEndsMsFor(s), String(s)).toBe(redownloadEndsMsFor(s));
    }
    expect(redownloadEndsMsFor(PACK_TERMS_CUTOFF_MS)).toBe(Date.parse("2027-03-31T18:29:59.999Z"));
    expect(redownloadEndsMsFor(PACK_TERMS_CUTOFF_MS - 1)).toBe(Date.parse("2027-05-31T18:29:59.999Z"));
  });
});

describe("REDOWNLOAD-ENFORCE-1 - the ended line", () => {
  it("reads only well-formed server entries", () => {
    const good = { packId: "pack_mock:maths", sku: "pack_mock", target: "maths", redownloadUntil: "31 March 2027", paidAt: 1, endedAtMs: 2 };
    expect(readEndedPacks([good, good, null, 7, { ...good, packId: "" }, { ...good, packId: "x", redownloadUntil: "<b>soon</b>" }, { ...good, packId: "y", sku: 3 }])).toEqual([
      { packId: "pack_mock:maths", sku: "pack_mock", target: "maths", redownloadUntil: "31 March 2027" },
    ]);
    expect(readEndedPacks(undefined)).toEqual([]);
    expect(readEndedPacks({})).toEqual([]);
  });

  it("words the honest state with the server's date", () => {
    expect(endedPackMessage("Mock Pack · Maths", { redownloadUntil: "31 March 2027" })).toBe(
      "Your re-download window for Mock Pack · Maths ended on 31 March 2027.",
    );
  });

  it("renders one plain line per ended pack: no Download, no Retry; nothing when empty", () => {
    const { container, rerender } = render(<EndedPacksNote ended={[]} />);
    expect(container.innerHTML).toBe("");
    rerender(
      <EndedPacksNote
        ended={[
          { packId: "pack_mock:maths", sku: "pack_mock", target: "maths", redownloadUntil: "31 March 2027" },
          { packId: "pack_bundle:all", sku: "pack_bundle", target: "all", redownloadUntil: "31 May 2027" },
        ]}
      />,
    );
    const note = screen.getByTestId("packs-ended");
    expect(note.textContent).toContain("Your re-download window for Mock Pack · Maths ended on 31 March 2027.");
    expect(note.textContent).toContain("Your re-download window for Maths + Science Bundle ended on 31 May 2027.");
    expect(screen.queryByRole("button")).toBeNull();
    expect(note.textContent).not.toMatch(/Download\b|Retry/);
  });
});
