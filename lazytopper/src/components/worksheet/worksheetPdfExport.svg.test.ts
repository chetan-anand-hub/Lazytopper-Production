import { describe, it, expect, afterEach } from "vitest";
import { svgsToImages, collectPrintAtoms } from "./worksheetPdfExport";

// jsdom has no layout and does not load images: both are stubbed so the DOM logic can be tested. The stub keeps a REAL
// HTMLImageElement (the code replaces an <svg> with it), only faking the load.
function stubImageLoad(ok: boolean) {
  const proto = HTMLImageElement.prototype;
  const saved = Object.getOwnPropertyDescriptor(proto, "src")!;
  Object.defineProperty(proto, "src", {
    configurable: true,
    get() {
      return this.getAttribute("src");
    },
    set(v: string) {
      this.setAttribute("src", v);
      Object.defineProperty(this, "naturalWidth", { value: ok ? 10 : 0, configurable: true });
      queueMicrotask(() => this.dispatchEvent(new Event(ok ? "load" : "error")));
    },
  });
  return () => Object.defineProperty(proto, "src", saved);
}
let restore: (() => void) | null = null;

function box(el: Element, top: number, bottom: number, w = 100) {
  (el as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect = () =>
    ({ top, bottom, height: bottom - top, width: w, left: 0, right: w, x: 0, y: top }) as DOMRect;
}

afterEach(() => {
  restore?.();
  restore = null;
});

describe("svgsToImages: only the figures are swapped", () => {
  it("a figure <svg> becomes an <img>; a KaTeX <svg> inside the text is left alone", () => {
    restore = stubImageLoad(true);
    const host = document.createElement("div");
    host.innerHTML =
      '<div class="lt-pfig"><figure class="lt-pfig__fig"><svg viewBox="0 0 10 10" aria-label="fig"></svg></figure></div>' +
      '<div class="lt-wsp__qtext"><span class="katex"><svg class="katex-svg" viewBox="0 0 10 10"></svg></span></div>';
    host.querySelectorAll("svg").forEach((s) => box(s, 0, 50));
    return svgsToImages(host).then(() => {
      expect(host.querySelectorAll(".lt-pfig__fig svg")).toHaveLength(0);
      expect(host.querySelectorAll(".lt-pfig__fig img.lt-pfig__svgimg")).toHaveLength(1);
      expect(host.querySelectorAll(".lt-wsp__qtext svg")).toHaveLength(1); // CONTROL: KaTeX's own svg is untouched
    });
  });

  it("CONTROL: a figure with no layout (0 size) or an image that fails to load stays an <svg> (the PDF is still produced)", async () => {
    restore = stubImageLoad(false);
    const host = document.createElement("div");
    host.innerHTML = '<figure class="lt-pfig__fig"><svg viewBox="0 0 10 10"></svg></figure>';
    box(host.querySelector("svg")!, 0, 50);
    await svgsToImages(host);
    expect(host.querySelectorAll(".lt-pfig__fig svg")).toHaveLength(1);
    const flat = document.createElement("div");
    flat.innerHTML = '<figure class="lt-pfig__fig"><svg viewBox="0 0 10 10"></svg></figure>';
    box(flat.querySelector("svg")!, 0, 0, 0);
    restore = stubImageLoad(true);
    await svgsToImages(flat);
    expect(flat.querySelectorAll(".lt-pfig__fig svg")).toHaveLength(1);
  });
});

describe("collectPrintAtoms: where a page may not be cut", () => {
  it("measures lines and figures relative to the host, and glues a question to its figure and a heading to its first line", () => {
    const host = document.createElement("div");
    host.innerHTML =
      '<div class="lt-wsp__sechead">Section A</div>' +
      '<div class="lt-wsp__q"><div class="lt-wsp__qbody"><div class="lt-wsp__qtext">Q1 in the figure</div><div class="lt-pfig"><figure class="lt-pfig__fig"></figure></div></div></div>';
    box(host, 100, 700);
    box(host.querySelector(".lt-wsp__sechead")!, 110, 130);
    box(host.querySelector(".lt-wsp__qtext")!, 140, 160);
    box(host.querySelector(".lt-pfig__fig")!, 165, 300);
    const atoms = collectPrintAtoms(host);
    expect(atoms).toContainEqual({ top: 10, bottom: 30 }); // heading
    expect(atoms).toContainEqual({ top: 40, bottom: 60 }); // the question line
    expect(atoms).toContainEqual({ top: 65, bottom: 200 }); // the figure
    expect(atoms).toContainEqual({ top: 40, bottom: 200 }); // question + figure glued
    expect(atoms).toContainEqual({ top: 10, bottom: 60 }); // heading + first question line glued
  });

  it("CONTROL: a document with none of the print classes has no atoms (cut exactly as before)", () => {
    const host = document.createElement("div");
    host.innerHTML = '<div class="lt-cigp__qtext">graded sheet text</div>';
    box(host, 0, 500);
    expect(collectPrintAtoms(host)).toEqual([]);
  });
});
