/**
 * PAID-SHOWS-1 - the purchase card: what the buyer got, with working downloads, before any sign-in.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const build = vi.hoisted(() => ({ buildPackFiles: vi.fn(), fileBuild: vi.fn(async () => undefined) }));
vi.mock("../../lib/packs/buildPackFiles", async (orig) => ({
  ...(await orig<typeof import("../../lib/packs/buildPackFiles")>()),
  buildPackFiles: (...a: unknown[]) => build.buildPackFiles(...a),
}));
const zip = vi.hoisted(() => ({ download: vi.fn(async () => ({ ok: true }) as { ok: boolean; reason?: string }) }));
vi.mock("../../lib/packs/serverPdfDownload", async (orig) => ({
  ...(await orig<typeof import("../../lib/packs/serverPdfDownload")>()),
  downloadGuestZipFromServer: (...a: unknown[]) => (zip.download as (...x: unknown[]) => unknown)(...a),
}));
vi.mock("../../lib/packs/packAnalytics", () => ({ trackPackEvent: vi.fn(), trackPackPurchase: vi.fn() }));

import PurchaseCard from "./PurchaseCard";
import type { ReceiptOutcome } from "../../services/checkoutWho";

const PROOF = { orderId: "order_1", paymentId: "pay_1", signature: "ab".repeat(32) };
const PACK: ReceiptOutcome = {
  status: "ok",
  kind: "pack",
  attached: false,
  savedTo: "+91 98•••••948",
  pack: { packId: "pack_cbq:maths", sku: "pack_cbq", target: "maths", paidAt: 1, orderId: "order_1" },
  licensee: { name: "", email: "", phone: "+91 98•••••948" },
};
const files = [
  { id: "f1", label: "Real Numbers · Questions", group: "Real Numbers", filename: "a.pdf", build: build.fileBuild },
  { id: "f2", label: "Real Numbers · Solutions", group: "Real Numbers", filename: "b.pdf", build: build.fileBuild },
];

beforeEach(() => {
  vi.clearAllMocks();
  build.buildPackFiles.mockResolvedValue(files);
});
afterEach(() => cleanup());

describe("a pack", () => {
  it("shows 'Payment received', the pack name, one Download per file, and where it is saved (masked); builds with the masked licensee", async () => {
    const fetchReceiptImpl = vi.fn(async () => PACK);
    render(<PurchaseCard proof={PROOF} fetchReceiptImpl={fetchReceiptImpl} />);
    expect(fetchReceiptImpl).toHaveBeenCalledWith(PROOF);
    await screen.findByTestId("receipt-title");
    expect(screen.getByText("Payment received ✓")).toBeTruthy();
    expect(screen.getByTestId("receipt-title").textContent).toBe("Your Maths CBQ Pack");
    const buttons = await screen.findAllByTestId("receipt-download");
    expect(buttons.map((b) => b.textContent)).toEqual(["Download", "Download"]);
    // the licence line is the recipient's mask, never anything else
    const ctx = build.buildPackFiles.mock.calls[0][1] as { licensee: unknown; user: unknown };
    expect(ctx.licensee).toEqual({ name: "", email: "", phone: "+91 98•••••948" });
    expect(ctx.user).toBeNull();
    // attach still open: it says so
    expect(screen.getByTestId("receipt-saved").textContent).toBe(
      "For now it's saved to +91 98•••••948, the one you paid with. If you choose someone else below, it moves to them. Sign in with it any time to download again.",
    );
    expect(document.body.textContent).not.toMatch(/9876543948/);
  });

  it("a tap builds that file and the row says Saved; once attached the line is the plain one", async () => {
    render(<PurchaseCard proof={PROOF} fetchReceiptImpl={async () => ({ ...PACK, attached: true } as ReceiptOutcome)} />);
    const [first] = await screen.findAllByTestId("receipt-download");
    fireEvent.click(first);
    await waitFor(() => expect(build.fileBuild).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getAllByTestId("receipt-download")[0].textContent).toBe("Saved ✓"));
    expect(screen.getByTestId("receipt-saved").textContent).toBe("Saved to +91 98•••••948. Sign in with it any time to download again.");
  });

  it("a failed file says so on its row and can be retried", async () => {
    build.fileBuild.mockRejectedValueOnce(new Error("boom"));
    render(<PurchaseCard proof={PROOF} fetchReceiptImpl={async () => PACK} />);
    const [first] = await screen.findAllByTestId("receipt-download");
    fireEvent.click(first);
    await screen.findByText("That didn’t work. Try again.");
    expect(screen.getAllByTestId("receipt-download")[0].textContent).toBe("Retry");
  });

  it("someone-else / parent order (attached:true): the plain 'Saved to' line, never 'the one you paid with' / 'choose someone else below'", async () => {
    render(<PurchaseCard proof={PROOF} fetchReceiptImpl={async () => ({ ...PACK, attached: true } as ReceiptOutcome)} />);
    await screen.findAllByTestId("receipt-download");
    const line = screen.getByTestId("receipt-saved").textContent || "";
    expect(line).toBe("Saved to +91 98•••••948. Sign in with it any time to download again.");
    expect(line).not.toMatch(/paid with|below/);
  });

  it("no licensee contact: no endless 'Preparing', no files built, an honest sign-in line", async () => {
    render(<PurchaseCard proof={PROOF} fetchReceiptImpl={async () => ({ status: "ok", kind: "pack", attached: true, savedTo: "", pack: PACK.status === "ok" ? PACK.pack : undefined } as ReceiptOutcome)} />);
    expect((await screen.findByTestId("receipt-no-contact")).textContent).toBe("Sign in with the number or email you paid with to download.");
    expect(screen.queryByText("Preparing your files…")).toBeNull();
    expect(screen.queryByTestId("receipt-download")).toBeNull();
    expect(build.buildPackFiles).not.toHaveBeenCalled();
  });

  it("an email recipient: the masked email is the licence line", async () => {
    render(
      <PurchaseCard
        proof={PROOF}
        fetchReceiptImpl={async () => ({ ...PACK, savedTo: "an••••@gmail.com", licensee: { name: "", email: "an••••@gmail.com" } } as ReceiptOutcome)}
      />,
    );
    await screen.findAllByTestId("receipt-download");
    expect((build.buildPackFiles.mock.calls[0][1] as { licensee: unknown }).licensee).toEqual({ name: "", email: "an••••@gmail.com" });
  });
});

describe("a Board Pass, and the other outcomes", () => {
  it("pass: 'Your Board Pass is active till your boards', no files", async () => {
    render(<PurchaseCard proof={PROOF} fetchReceiptImpl={async () => ({ status: "ok", kind: "pass", attached: false, savedTo: "+91 98•••••948" })} />);
    expect((await screen.findByTestId("receipt-title")).textContent).toBe("Your Board Pass is active, valid till 28 Feb 2027");
    expect(screen.queryByTestId("receipt-download")).toBeNull();
    expect(build.buildPackFiles).not.toHaveBeenCalled();
  });

  it("past 24 h: 'Sign in with <masked> to download.' and no downloads", async () => {
    render(<PurchaseCard proof={PROOF} fetchReceiptImpl={async () => ({ status: "expired", savedTo: "+91 98•••••948" })} />);
    expect((await screen.findByTestId("receipt-expired")).textContent).toBe("Sign in with +91 98•••••948 to download.");
    expect(screen.queryByTestId("receipt-download")).toBeNull();
  });

  it("a failed read says the payment is safe and retries", async () => {
    const impl = vi.fn().mockResolvedValueOnce({ status: "failed" }).mockResolvedValueOnce(PACK);
    render(<PurchaseCard proof={PROOF} fetchReceiptImpl={impl} />);
    expect((await screen.findByTestId("receipt-failed")).textContent).toBe("We couldn't load it just now. Your payment is safe.");
    fireEvent.click(screen.getByText("Try again"));
    await screen.findByTestId("receipt-title");
    expect(impl).toHaveBeenCalledTimes(2);
  });

  it("Hide calls onHide", async () => {
    const onHide = vi.fn();
    render(<PurchaseCard proof={PROOF} onHide={onHide} fetchReceiptImpl={async () => ({ status: "expired", savedTo: "" })} />);
    fireEvent.click(await screen.findByTestId("receipt-hide"));
    expect(onHide).toHaveBeenCalled();
  });
});

describe("POSTPAY-WHO-FIRST-1 - folded files and the hidden payment line", () => {
  const three = [
    { id: "f1", label: "A", group: "G1", filename: "a.pdf", build: build.fileBuild },
    { id: "f2", label: "B", group: "G1", filename: "b.pdf", build: build.fileBuild },
    { id: "f3", label: "C", group: "G2", filename: "c.pdf", build: build.fileBuild },
  ];

  it("filesFolded: one 'Your files (N) · Show' summary, N counts every file across groups, 'saved to' is inside it", async () => {
    build.buildPackFiles.mockResolvedValue(three);
    render(<PurchaseCard proof={PROOF} fetchReceiptImpl={async () => PACK} filesFolded hidePaymentLine />);
    const fold = await screen.findByTestId("receipt-files-fold");
    expect(screen.getByTestId("receipt-files-summary").textContent).toBe("Your files (3) · Show");
    expect((fold as HTMLDetailsElement).open).toBe(false);
    expect(fold.contains(screen.getByTestId("receipt-saved"))).toBe(true);
    expect(screen.queryByText("Payment received ✓")).toBeNull();
  });

  it("defaults (restored cards, /packs): no fold, the payment line shows, files and saved line as before", async () => {
    build.buildPackFiles.mockResolvedValue(three);
    render(<PurchaseCard proof={PROOF} fetchReceiptImpl={async () => PACK} />);
    await screen.findAllByTestId("receipt-download");
    expect(screen.queryByTestId("receipt-files-fold")).toBeNull();
    expect(screen.getByText("Payment received ✓")).toBeTruthy();
    expect(screen.getByTestId("receipt-saved")).toBeTruthy();
  });
});

describe("GUEST-ZIP-1 - Download all (ZIP)", () => {
  const withCodes = [
    { id: "f1", label: "A", group: "G1", filename: "a.pdf", codes: ["C1"], build: build.fileBuild },
    { id: "f2", label: "B", group: "G1", filename: "b.pdf", codes: ["C2"], build: build.fileBuild },
  ];
  beforeEach(() => {
    zip.download.mockReset();
    zip.download.mockResolvedValue({ ok: true });
    build.buildPackFiles.mockResolvedValue(withCodes);
  });

  it("is the FIRST thing in the file list; a tap asks the server for the whole pack with THIS card's proof and every printed code; then 'Saved'", async () => {
    render(<PurchaseCard proof={PROOF} fetchReceiptImpl={async () => PACK} />);
    const btn = await screen.findByTestId("receipt-zip");
    const firstFile = (await screen.findAllByTestId("receipt-download"))[0];
    expect(btn.compareDocumentPosition(firstFile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(btn.textContent).toBe("Download all (ZIP)");
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByTestId("receipt-zip").textContent).toBe("Saved ✓"));
    expect(zip.download).toHaveBeenCalledWith({ proof: PROOF, expectCodes: ["C1", "C2"] });
  });

  it("a failed ZIP is quiet: 'Try again' + a line, and every single-file Download is still there and works", async () => {
    zip.download.mockResolvedValue({ ok: false, reason: "timeout" });
    render(<PurchaseCard proof={PROOF} fetchReceiptImpl={async () => PACK} />);
    fireEvent.click(await screen.findByTestId("receipt-zip"));
    await waitFor(() => expect(screen.getByTestId("receipt-zip").textContent).toBe("Try again"));
    expect(screen.getByRole("alert").textContent).toMatch(/one by one/);
    const rows = screen.getAllByTestId("receipt-download");
    expect(rows).toHaveLength(2);
    fireEvent.click(rows[0]);
    await waitFor(() => expect(build.fileBuild).toHaveBeenCalledTimes(1));
  });

  it("an expired link (403) hides the ZIP button for good and says one line; the single files stay", async () => {
    zip.download.mockResolvedValue({ ok: false, reason: "expired" });
    render(<PurchaseCard proof={PROOF} fetchReceiptImpl={async () => PACK} />);
    fireEvent.click(await screen.findByTestId("receipt-zip"));
    const line = await screen.findByTestId("receipt-zip-expired");
    expect(line.textContent).toBe("This download link has expired. Sign in with the number or email you paid with to download again.");
    expect(screen.queryByTestId("receipt-zip")).toBeNull();
    expect(screen.getAllByTestId("receipt-download")).toHaveLength(2);
  });

  it("the server saying 'unavailable' (404) removes the button; the kill switch never shows it; one file has nothing to zip", async () => {
    zip.download.mockResolvedValue({ ok: false, reason: "unavailable" });
    const { unmount } = render(<PurchaseCard proof={PROOF} fetchReceiptImpl={async () => PACK} />);
    fireEvent.click(await screen.findByTestId("receipt-zip"));
    await waitFor(() => expect(screen.queryByTestId("receipt-zip")).toBeNull());
    expect(screen.getAllByTestId("receipt-download")).toHaveLength(2);
    unmount();
    vi.stubEnv("VITE_PACK_SERVER_PDF_DISABLED", "1");
    const off = render(<PurchaseCard proof={PROOF} fetchReceiptImpl={async () => PACK} />);
    await screen.findAllByTestId("receipt-download");
    expect(screen.queryByTestId("receipt-zip")).toBeNull();
    off.unmount();
    vi.unstubAllEnvs();
    build.buildPackFiles.mockResolvedValue([withCodes[0]]);
    render(<PurchaseCard proof={PROOF} fetchReceiptImpl={async () => PACK} />);
    await screen.findAllByTestId("receipt-download");
    expect(screen.queryByTestId("receipt-zip")).toBeNull();
  });

  it("inside the folded 'Your files (N)' line the ZIP button is inside the fold, at the top", async () => {
    render(<PurchaseCard proof={PROOF} fetchReceiptImpl={async () => PACK} filesFolded hidePaymentLine />);
    const fold = await screen.findByTestId("receipt-files-fold");
    expect(fold.contains(screen.getByTestId("receipt-zip"))).toBe(true);
  });

  // PACK-PDF-SIZE-1: a multi-chapter pack = one ZIP per chapter, never the all-pack ZIP.
  describe("PACK-PDF-SIZE-1 - one ZIP per chapter", () => {
    const two = [
      { id: "f1", label: "A", group: "Real Numbers", groupId: "real-numbers", filename: "a.pdf", codes: ["C1"], build: build.fileBuild },
      { id: "f2", label: "B", group: "Real Numbers", groupId: "real-numbers", filename: "b.pdf", codes: ["C2"], build: build.fileBuild },
      { id: "f3", label: "C", group: "Polynomials", groupId: "polynomials", filename: "c.pdf", codes: ["C3"], build: build.fileBuild },
      { id: "f4", label: "D", group: "Polynomials", groupId: "polynomials", filename: "d.pdf", codes: ["C4"], build: build.fileBuild },
    ];
    beforeEach(() => build.buildPackFiles.mockResolvedValue(two));

    it("no all-pack ZIP button; each chapter has its own ZIP row asking the server for THAT group with only its codes", async () => {
      render(<PurchaseCard proof={PROOF} fetchReceiptImpl={async () => PACK} />);
      const rows = await screen.findAllByTestId("receipt-zip-group");
      expect(rows).toHaveLength(2);
      expect(screen.queryByTestId("receipt-zip")).toBeNull();
      fireEvent.click(rows[1]);
      await waitFor(() => expect(screen.getAllByTestId("receipt-zip-group")[1].textContent).toBe("Saved \u2713"));
      expect(zip.download).toHaveBeenCalledTimes(1);
      expect(zip.download).toHaveBeenCalledWith({ proof: PROOF, expectCodes: ["C3", "C4"], groupId: "polynomials" });
      expect(screen.getAllByTestId("receipt-zip-group")[0].textContent).toBe("Download");
    });

    it("a failed chapter ZIP says Try again on that row only; an expired link hides every ZIP row", async () => {
      zip.download.mockResolvedValue({ ok: false, reason: "timeout" });
      render(<PurchaseCard proof={PROOF} fetchReceiptImpl={async () => PACK} />);
      fireEvent.click((await screen.findAllByTestId("receipt-zip-group"))[0]);
      await waitFor(() => expect(screen.getAllByTestId("receipt-zip-group")[0].textContent).toBe("Try again"));
      expect(screen.getAllByTestId("receipt-zip-group")[1].textContent).toBe("Download");
      zip.download.mockResolvedValue({ ok: false, reason: "expired" });
      fireEvent.click(screen.getAllByTestId("receipt-zip-group")[1]);
      await screen.findByTestId("receipt-zip-expired");
      expect(screen.queryAllByTestId("receipt-zip-group")).toHaveLength(0);
      expect(screen.getAllByTestId("receipt-download")).toHaveLength(4);
    });
  });
});
