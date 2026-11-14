// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const auth = vi.hoisted(() => ({ value: { user: null as null | { uid: string }, loading: false } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => auth.value }));

const svc = vi.hoisted(() => ({
  requestFreeLink: vi.fn(),
  startDownload: vi.fn(),
  trackFreeResourceDownload: vi.fn(),
}));
vi.mock("../../services/freeResources", async () => {
  const real = await vi.importActual<typeof import("../../services/freeResources")>("../../services/freeResources");
  return { ...real, requestFreeLink: svc.requestFreeLink, startDownload: svc.startDownload, trackFreeResourceDownload: svc.trackFreeResourceDownload };
});

import FreeResourcesBlock from "./FreeResourcesBlock";
import { EMPTY_FREE_LIST, type FreeList } from "../../services/freeResources";

const LIST: FreeList = {
  resources: [
    { id: "mcq-maths-real-numbers", kind: "mcq_bank", subject: "Maths", chapter: "Real Numbers", title: "Real Numbers · MCQ Practice Bank", bytes: 1_500_000, pages: 12, questions: 40 },
    { id: "mcq-maths-polynomials", kind: "mcq_bank", subject: "Maths", chapter: "Polynomials", title: "Polynomials · MCQ Practice Bank", bytes: 800_000, pages: 9, questions: 35 },
    { id: "mcq-science-light", kind: "mcq_bank", subject: "Science", chapter: "Light", title: "Light · MCQ Practice Bank", bytes: 900_000, pages: 9, questions: 30 },
  ],
  zips: [
    { id: "zip-maths", group: "maths", bytes: 2_300_000, count: 2 },
    { id: "zip-science", group: "science", bytes: 900_000, count: 1 },
    { id: "zip-all", group: "all", bytes: 3_200_000, count: 3 },
  ],
};

function LocationProbe() {
  const l = useLocation();
  return <output data-testid="loc">{`${l.pathname}${l.search}${l.hash}`}</output>;
}

function mount(fetchList: () => Promise<FreeList>, entry = "/cbse/class-10") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/cbse/class-10" element={<><FreeResourcesBlock fetchList={fetchList} /><LocationProbe /></>} />
        <Route path="/login" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.value = { user: null, loading: false };
  svc.requestFreeLink.mockReset();
  svc.startDownload.mockReset();
  svc.trackFreeResourceDownload.mockReset();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => cleanup());

const KIT = { id: "kit-boards-2027", kind: "kit" as const, subject: "All" as const, chapter: "Boards 2027 Excellence Kit", title: "Boards 2027 Excellence Kit", bytes: 3_000_000, pages: 30, questions: null };

describe("FreeResourcesBlock", () => {
  it("renders NOTHING for an empty list: no heading, no placeholder", async () => {
    const fetchList = vi.fn(async () => EMPTY_FREE_LIST);
    const { container } = mount(fetchList);
    await waitFor(() => expect(fetchList).toHaveBeenCalled());
    await act(async () => undefined);
    expect(screen.queryByText(/free chapter practice/i)).toBeNull();
    expect(container.querySelector("#free")).toBeNull();
    expect(container.querySelector(".lt-free")).toBeNull();
  });

  it("renders nothing before the list arrives (the first paint is the committed page)", () => {
    const { container } = mount(() => new Promise(() => undefined));
    expect(container.querySelector(".lt-free")).toBeNull();
  });

  it("renders nothing if the fetch rejects", async () => {
    const fetchList = vi.fn(async () => {
      throw new Error("x");
    });
    const { container } = mount(fetchList);
    await act(async () => undefined);
    expect(container.querySelector(".lt-free")).toBeNull();
  });

  it("lists Maths and Science groups, one row per chapter, with the owner's copy", async () => {
    mount(async () => LIST);
    const heading = await screen.findByRole("heading", { name: "Free chapter practice" });
    const section = heading.closest("section") as HTMLElement;
    expect(section.id).toBe("free");
    expect(within(section).getByText("Every question is from the 2026-27 CBSE syllabus. Free with your LazyTopper account.")).toBeTruthy();
    expect(within(section).getByRole("heading", { name: "Maths" })).toBeTruthy();
    expect(within(section).getByRole("heading", { name: "Science" })).toBeTruthy();
    expect(within(section).getAllByRole("listitem")).toHaveLength(3);
    expect(within(section).getByText("Real Numbers")).toBeTruthy();
    expect(within(section).getByText(/40 MCQs · worked solutions · 1\.4 MB/)).toBeTruthy();
  });

  it("the copy rules hold: no 'AI', no 'answer key', no 'optional'", async () => {
    mount(async () => LIST);
    const heading = await screen.findByRole("heading", { name: "Free chapter practice" });
    const text = (heading.closest("section") as HTMLElement).textContent ?? "";
    expect(text.length).toBeGreaterThan(100); // precondition: the block really rendered
    expect(text).not.toMatch(/\bAI\b/);
    expect(text).not.toMatch(/answer key/i);
    expect(text).not.toMatch(/optional/i);
  });

  it("signed OUT: the buttons read 'Sign in to download' and go to /login with a SAFE same-origin return to #free; no link is requested", async () => {
    mount(async () => LIST);
    const user = userEvent.setup();
    const btn = (await screen.findAllByRole("button", { name: /Sign in to download: Real Numbers/ }))[0];
    expect(btn.textContent).toBe("Sign in to download");
    await user.click(btn);
    expect(svc.requestFreeLink).not.toHaveBeenCalled();
    expect(svc.startDownload).not.toHaveBeenCalled();
    const loc = screen.getByTestId("loc").textContent ?? "";
    expect(loc).toBe("/login?redirect=%2Fcbse%2Fclass-10%23free");
    expect(decodeURIComponent(loc.split("redirect=")[1])).toBe("/cbse/class-10#free");
  });

  it("signed out: every zip button also reads 'Sign in to download'", async () => {
    mount(async () => LIST);
    await screen.findByRole("heading", { name: "Free chapter practice" });
    const labels = screen.getAllByRole("button").map((b) => b.textContent);
    expect(labels.filter((l) => l === "Sign in to download")).toHaveLength(6); // 3 rows + 2 subject zips + everything
    expect(labels).not.toContain("Download");
  });

  it("signed IN: a row asks for a link, starts the download and fires free_resource_download { id, kind }", async () => {
    auth.value = { user: { uid: "u1" }, loading: false };
    svc.requestFreeLink.mockResolvedValue({ ok: true, url: "https://storage.googleapis.com/x?sig=1", filename: "f.pdf" });
    mount(async () => LIST);
    const user = userEvent.setup();
    const btn = (await screen.findAllByRole("button", { name: /^Download: Real Numbers/ }))[0];
    await user.click(btn);
    await waitFor(() => expect(svc.startDownload).toHaveBeenCalledWith("https://storage.googleapis.com/x?sig=1", "f.pdf"));
    expect(svc.requestFreeLink).toHaveBeenCalledWith("mcq-maths-real-numbers");
    expect(svc.trackFreeResourceDownload).toHaveBeenCalledWith("mcq-maths-real-numbers", "mcq_bank");
  });

  it("signed in: the zips are labelled as the owner asked and track kind 'zip'", async () => {
    auth.value = { user: { uid: "u1" }, loading: false };
    svc.requestFreeLink.mockResolvedValue({ ok: true, url: "https://storage.googleapis.com/z?sig=1", filename: "z.zip" });
    mount(async () => LIST);
    const user = userEvent.setup();
    expect(await screen.findByRole("button", { name: "Download all Maths (ZIP)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Download all Science (ZIP)" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Download everything (ZIP)" }));
    await waitFor(() => expect(svc.requestFreeLink).toHaveBeenCalledWith("zip-all"));
    expect(svc.trackFreeResourceDownload).toHaveBeenCalledWith("zip-all", "zip");
  });

  it("a refused link shows an honest line, starts nothing and counts nothing", async () => {
    auth.value = { user: { uid: "u1" }, loading: false };
    svc.requestFreeLink.mockResolvedValue({ ok: false, reason: "busy" });
    mount(async () => LIST);
    const user = userEvent.setup();
    await user.click((await screen.findAllByRole("button", { name: /^Download: Light/ }))[0]);
    expect(await screen.findByText(/lot of downloads in an hour/)).toBeTruthy();
    expect(svc.startDownload).not.toHaveBeenCalled();
    expect(svc.trackFreeResourceDownload).not.toHaveBeenCalled();
  });

  it("a subject with no resources is not drawn (no empty group, no zip for it)", async () => {
    mount(async () => ({ resources: LIST.resources.filter((r) => r.subject === "Maths"), zips: LIST.zips.filter((z) => z.group !== "science") }));
    await screen.findByRole("heading", { name: "Free chapter practice" });
    expect(screen.queryByRole("heading", { name: "Science" })).toBeNull();
    expect(screen.queryByText(/all Science/)).toBeNull();
  });

  it("arriving on #free lands on the block once it exists", async () => {
    mount(async () => LIST, "/cbse/class-10#free");
    await screen.findByRole("heading", { name: "Free chapter practice" });
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
  });

  it("source guard: CSS classes only (no inline style objects), no width hook, no console.log, no localStorage", () => {
    const code = (f: string) => readFileSync(resolve(__dirname, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    const src = code("FreeResourcesBlock.tsx");
    expect(src.length).toBeGreaterThan(500); // precondition: the strip did not eat the file
    expect(src).not.toMatch(/style=\{\{/);
    expect(src).not.toMatch(/useIsDesktop|matchMedia|innerWidth/);
    expect(src).not.toMatch(/console\.log|localStorage/);
  });

  it("kit: with no kit in the manifest nothing for it renders", async () => {
    auth.value = { user: { uid: "u1" }, loading: false };
    const { container } = mount(async () => LIST);
    await screen.findByRole("heading", { name: "Free chapter practice" });
    expect(container.querySelector(".lt-free__kit")).toBeNull();
    expect(screen.queryByText(/Excellence Kit/)).toBeNull();
  });

  it("kit: a highlighted row ABOVE the Maths/Science groups, titled from the manifest; signed out it reads 'Sign up free to download' and goes to the sign-in entry", async () => {
    mount(async () => ({ ...LIST, resources: [...LIST.resources, KIT] }));
    const user = userEvent.setup();
    const btn = await screen.findByRole("button", { name: "Sign up free to download" });
    const kitRow = btn.closest(".lt-free__kit") as HTMLElement;
    expect(within(kitRow).getByText("Boards 2027 Excellence Kit")).toBeTruthy();
    const maths = screen.getByRole("heading", { name: "Maths" });
    expect(kitRow.compareDocumentPosition(maths) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(3); // the kit is not one of the chapter rows
    await user.click(btn);
    expect(svc.requestFreeLink).not.toHaveBeenCalled();
    expect(screen.getByTestId("loc").textContent).toBe("/login?redirect=%2Fcbse%2Fclass-10%23free");
  });

  it("kit: signed in it reads 'Download the Excellence Kit' and requests its link", async () => {
    auth.value = { user: { uid: "u1" }, loading: false };
    svc.requestFreeLink.mockResolvedValue({ ok: true, url: "https://storage.googleapis.com/k?sig=1", filename: "k.pdf" });
    mount(async () => ({ ...LIST, resources: [...LIST.resources, KIT] }));
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Download the Excellence Kit" }));
    await waitFor(() => expect(svc.requestFreeLink).toHaveBeenCalledWith("kit-boards-2027"));
    expect(svc.trackFreeResourceDownload).toHaveBeenCalledWith("kit-boards-2027", "kit");
  });
});
