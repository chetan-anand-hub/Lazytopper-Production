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
    expect((await screen.findByTestId("receipt-title")).textContent).toBe("Your Board Pass is active till your boards");
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
