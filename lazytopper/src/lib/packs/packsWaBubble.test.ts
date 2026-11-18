import { afterEach, describe, expect, it, vi } from "vitest";
import { WA_CLEAR_CLASS, boxesOverlap, bubbleOverlapsAnyTarget, watchWhatsAppBubble } from "./packsWaBubble";

const box = (left: number, top: number, w: number, h: number) => ({ left, top, right: left + w, bottom: top + h });
function rectOf(b: ReturnType<typeof box>) {
  return { ...b, width: b.right - b.left, height: b.bottom - b.top, x: b.left, y: b.top, toJSON: () => ({}) } as DOMRect;
}

afterEach(() => {
  document.body.innerHTML = "";
  document.body.className = "";
  vi.unstubAllEnvs();
});

describe("packs WhatsApp bubble", () => {
  it("overlap maths: touching edges do not count, a covered link does", () => {
    const fab = box(292, 600, 52, 52);
    expect(boxesOverlap(fab, box(0, 600, 292, 40))).toBe(false);
    expect(boxesOverlap(fab, box(250, 610, 100, 30))).toBe(true);
    expect(bubbleOverlapsAnyTarget(fab, [box(0, 0, 100, 20), box(300, 620, 40, 20)])).toBe(true);
    expect(bubbleOverlapsAnyTarget(fab, [])).toBe(false);
  });

  function mount(linkBox: ReturnType<typeof box>, width = 360) {
    document.body.innerHTML = `<main><a href="/sample">Free sample page</a></main><a data-testid="whatsapp-fab" href="https://wa.me/1"></a>`;
    const link = document.querySelector("main a") as HTMLElement;
    const fab = document.querySelector('[data-testid="whatsapp-fab"]') as HTMLElement;
    link.getBoundingClientRect = () => rectOf(linkBox);
    fab.getBoundingClientRect = () => rectOf(box(292, 600, 52, 52));
    const win = Object.create(window, { innerWidth: { value: width } }) as Window;
    win.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    };
    return win;
  }

  it("sets the clear class while the bubble would cover a link, and removes it on stop", () => {
    const win = mount(box(250, 610, 100, 30));
    const stop = watchWhatsAppBubble(win, document);
    expect(document.body.classList.contains(WA_CLEAR_CLASS)).toBe(true);
    stop();
    expect(document.body.classList.contains(WA_CLEAR_CLASS)).toBe(false);
  });

  it("leaves the bubble alone when nothing is under it, and on desktop widths", () => {
    const clear = mount(box(0, 100, 100, 30));
    watchWhatsAppBubble(clear, document)();
    expect(document.body.classList.contains(WA_CLEAR_CLASS)).toBe(false);
    const desktop = mount(box(250, 610, 100, 30), 1280);
    watchWhatsAppBubble(desktop, document);
    expect(document.body.classList.contains(WA_CLEAR_CLASS)).toBe(false);
  });

  it("kill switch: never sets the class", () => {
    vi.stubEnv("VITE_PACKS_MOBILE_PRELOAD_DISABLED", "1");
    const win = mount(box(250, 610, 100, 30));
    watchWhatsAppBubble(win, document);
    expect(document.body.classList.contains(WA_CLEAR_CLASS)).toBe(false);
  });
});
