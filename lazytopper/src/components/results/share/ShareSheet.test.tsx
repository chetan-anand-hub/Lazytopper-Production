import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import ShareSheet from "./ShareSheet";
import { FX_FOUR_TYPES } from "../../../test/shareFixtures";

/** SHARE-CARD-1 - the share sheet: options (defaults), both sizes drawn, channel taps. */
const { makeShareImage, runShareChannel, user } = vi.hoisted(() => ({
  makeShareImage: vi.fn(async (_v: unknown, o: { size: "story" | "square" }) => ({
    model: { size: o.size },
    blob: new Blob([new Uint8Array([1])], { type: "image/png" }),
    file: new File([new Uint8Array([1])], `lazytopper-result-${o.size}.png`, { type: "image/png" }),
    text: "t",
  })),
  runShareChannel: vi.fn(async () => "downloaded"),
  user: { current: null as null | { displayName: string | null; isLocalSession?: boolean } },
}));
vi.mock("./runScoreShare", () => ({ makeShareImage, runShareChannel, shareQrDataUrl: async () => null }));
vi.mock("../../../context/AuthContext", () => ({ useAuth: () => ({ user: user.current }) }));

const origCreate = URL.createObjectURL;
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:lt-preview");
});
afterEach(() => {
  cleanup();
  makeShareImage.mockClear();
  runShareChannel.mockClear();
  user.current = null;
  URL.createObjectURL = origCreate;
  delete (navigator as unknown as { canShare?: unknown }).canShare;
  delete (navigator as unknown as { share?: unknown }).share;
});

describe("ShareSheet", () => {
  it("draws BOTH sizes up front (story first), mascots ON, no name", async () => {
    render(<ShareSheet variant={FX_FOUR_TYPES} onClose={() => {}} />);
    await waitFor(() => expect(makeShareImage).toHaveBeenCalledTimes(2));
    expect(makeShareImage.mock.calls.map((c) => (c[1] as { size: string }).size)).toEqual(["story", "square"]);
    for (const c of makeShareImage.mock.calls) expect(c[1]).toMatchObject({ showMascots: true, firstName: null });
    expect((screen.getByTestId("share-opt-mascots") as HTMLInputElement).checked).toBe(true);
    expect(await screen.findByTestId("share-preview")).toBeInTheDocument();
  });

  it("first name: offered for a signed-in account, OFF by default, only the cleaned first name when ticked", async () => {
    user.current = { displayName: "Aarav Sharma", isLocalSession: false };
    render(<ShareSheet variant={FX_FOUR_TYPES} onClose={() => {}} />);
    const box = screen.getByTestId("share-opt-name") as HTMLInputElement;
    expect(box.checked).toBe(false);
    await waitFor(() => expect(makeShareImage).toHaveBeenCalledTimes(2));
    fireEvent.click(box);
    await waitFor(() => expect(makeShareImage).toHaveBeenCalledTimes(4));
    expect(makeShareImage.mock.calls[3][1]).toMatchObject({ firstName: "Aarav" });
  });

  it("no name option for an email-like display name", () => {
    user.current = { displayName: "aarav@example.com", isLocalSession: false };
    render(<ShareSheet variant={FX_FOUR_TYPES} onClose={() => {}} />);
    expect(screen.queryByTestId("share-opt-name")).toBeNull();
  });

  it("'Show Byte & Ziggy' off redraws without mascots", async () => {
    render(<ShareSheet variant={FX_FOUR_TYPES} onClose={() => {}} />);
    await waitFor(() => expect(makeShareImage).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByTestId("share-opt-mascots"));
    await waitFor(() => expect(makeShareImage).toHaveBeenCalledTimes(4));
    expect(makeShareImage.mock.calls[2][1]).toMatchObject({ showMascots: false });
  });

  it("desktop (no file sharing): WhatsApp / Instagram / Download, no native Share button", async () => {
    render(<ShareSheet variant={FX_FOUR_TYPES} onClose={() => {}} />);
    expect(screen.queryByTestId("share-ch-native")).toBeNull();
    // Desktop cannot hand a file to Instagram: the button says what it does.
    expect(screen.getByTestId("share-ch-instagram").textContent).toBe("Save story image");
    await waitFor(() => expect((screen.getByTestId("share-ch-whatsapp") as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByTestId("share-ch-whatsapp"));
    await waitFor(() => expect(runShareChannel).toHaveBeenCalledTimes(1));
    expect(runShareChannel.mock.calls[0]).toEqual(["whatsapp", expect.objectContaining({ surface: "worksheet" })]);
  });

  it("Instagram always shares the STORY image, even from the square view", async () => {
    render(<ShareSheet variant={FX_FOUR_TYPES} onClose={() => {}} />);
    await waitFor(() => expect(makeShareImage).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByTestId("share-size-square"));
    await waitFor(() => expect((screen.getByTestId("share-ch-instagram") as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByTestId("share-ch-instagram"));
    await waitFor(() => expect(runShareChannel).toHaveBeenCalledTimes(1));
    const ctx = (runShareChannel.mock.calls[0] as unknown as [string, { image: { model: { size: string } } }])[1];
    expect(ctx.image.model.size).toBe("story");
  });

  it("mobile (files shareable): a native Share button", async () => {
    const nav = navigator as unknown as { canShare?: unknown; share?: unknown };
    nav.canShare = () => true;
    nav.share = async () => {};
    render(<ShareSheet variant={FX_FOUR_TYPES} onClose={() => {}} />);
    expect(screen.getByTestId("share-ch-native")).toBeInTheDocument();
    expect(screen.getByTestId("share-ch-instagram").textContent).toBe("Instagram story");
  });

  it("Escape closes the sheet only", () => {
    const onClose = vi.fn();
    const outer = vi.fn();
    window.addEventListener("keydown", outer);
    render(<ShareSheet variant={FX_FOUR_TYPES} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
    window.removeEventListener("keydown", outer);
  });
});
